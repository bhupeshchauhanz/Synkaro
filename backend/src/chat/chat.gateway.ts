import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { WsAuthService, type AuthedSocketUser } from './ws-auth.service';
import { RedisService } from '../redis/redis.service';
import { RoomsService } from '../rooms/rooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { CallService } from '../call/call.service';

interface JoinPayload {
  roomId: string;
}

interface SendMessagePayload {
  roomId: string;
  content?: string;
  type?: 'text' | 'image' | 'sticker' | 'gif';
  fileUrl?: string;
  metadata?: Record<string, unknown>;
}

interface ReactionPayload {
  roomId: string;
  emoji: string;
}

interface TypingPayload {
  roomId: string;
}

interface ThemePayload {
  roomId: string;
  theme: string;
}

interface WatchControlPayload {
  roomId: string;
  timestamp: number;
}

interface WatchSyncRequest {
  roomId: string;
}

type AuthedSocket = Socket & {
  data: { user?: AuthedSocketUser; callRooms?: string[]; uploadLockRoom?: string };
};

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return cb(null, true);
      const allowed =
        [
          process.env.WEB_URL ?? 'http://localhost:3000',
          'http://localhost:3000',
          'http://localhost:8081',
        ].includes(origin) ||
        // Allow any LAN IP in dev so phones on the same WiFi can connect
        (process.env.NODE_ENV !== 'production' &&
          (/^http:\/\/localhost:\d+$/.test(origin) ||
            /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) ||
            /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
            /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
            /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:\d+$/.test(origin)));
      if (allowed) cb(null, true);
      else cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly chat: ChatService,
    private readonly wsAuth: WsAuthService,
    private readonly redis: RedisService,
    private readonly rooms: RoomsService,
    private readonly prisma: PrismaService,
    private readonly call: CallService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const user = await this.wsAuth.authenticate(client);
    if (!user) {
      client.emit('error', { code: 'UNAUTHORIZED', message: 'Invalid token' });
      client.disconnect(true);
      return;
    }
    client.data.user = user;
    this.logger.log(`WS connected: ${user.username} (${client.id})`);

    // Mark the user online — powers the "is online" check used by call gating
    await this.touchLastSeen(user.id);

    // Auto-join all room channels the user is a member of so they receive notifications/unseen status on Dashboard
    try {
      const memberships = await this.prisma.roomMember.findMany({
        where: { userId: user.id },
        select: { roomId: true },
      });
      for (const m of memberships) {
        await client.join(m.roomId);
      }
    } catch (err) {
      this.logger.error(`Failed to auto-join rooms for ${user.username}: ${err}`);
    }
  }

  async handleDisconnect(client: AuthedSocket): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    for (const roomId of rooms) {
      this.server.to(roomId).emit('user:left', { userId: user.id, username: user.username });
    }
    // Auto-leave any active call rooms
    const callRooms = (client.data.callRooms ?? []) as string[];
    for (const roomId of callRooms) {
      await this.handleCallLeave(roomId, user);
    }

    // Free a held upload lock if the user closed the tab / dropped mid-upload,
    // so it doesn't stay locked for others until the TTL expires.
    if (client.data.uploadLockRoom) {
      await this.releaseUploadLock(client.data.uploadLockRoom, user.id);
    }
  }

  /**
   * Shared logic for a participant leaving a call. When the LAST participant
   * leaves, the call is finalized: a call record is saved to chat, everyone is
   * notified via `call:ended` (with roomId), and the active state is cleared.
   */
  private async handleCallLeave(roomId: string, user: AuthedSocketUser): Promise<void> {
    const state = await this.call.markLeft(roomId, user.id);
    if (!state) return;
    this.server.to(roomId).emit('call:participant-left', {
      userId: user.id,
      username: user.username,
      remaining: state.participants.length,
    });
    // End the call when nobody's left, OR in a two-party room where either side
    // leaving/dropping should hang up for both (no lingering wait).
    const twoParty = await this.call.isTwoPartyRoom(roomId);
    if (state.participants.length === 0 || twoParty) {
      try {
        const record = await this.call.saveCallRecord(
          roomId,
          state.startedBy,
          state.startedByName,
          user.id,
          state.startedAt,
          Date.now(),
          state.peakParticipants ?? 1,
        );
        this.server.to(roomId).emit('message:new', record);
      } catch (err) {
        this.logger.error(`Failed to save call record for ${roomId}: ${err}`);
      }
      await this.call.forceEnd(roomId);
      this.server.to(roomId).emit('call:ended', { roomId, endedByName: user.username });
    }
  }

  @SubscribeMessage('room:join')
  async onJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: JoinPayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) {
      client.emit('error', { code: 'NOT_ROOM_MEMBER', message: 'Not a member' });
      return;
    }
    await client.join(body.roomId);
    this.server.to(body.roomId).emit('user:joined', {
      userId: user.id,
      username: user.username,
    });
  }

  @SubscribeMessage('room:leave')
  async onLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: JoinPayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    await client.leave(body.roomId);
    this.server.to(body.roomId).emit('user:left', {
      userId: user.id,
      username: user.username,
    });
  }

  @SubscribeMessage('message:send')
  async onMessage(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: SendMessagePayload,
  ): Promise<{ ok: boolean; message?: unknown; error?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false, error: 'Not authenticated' };
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) {
      client.emit('error', { code: 'NOT_ROOM_MEMBER', message: 'Not a member' });
      return { ok: false, error: 'Not a room member' };
    }
    try {
      const message = await this.chat.createMessage({
        roomId: body.roomId,
        senderId: user.id,
        content: body.content,
        type: body.type ?? 'text',
        fileUrl: body.fileUrl,
        metadata: body.metadata,
      });
      // Persisted successfully — broadcast to everyone in the room (incl. sender).
      // Offline members will fetch it via getRecent on next load; it is already saved.
      this.server.to(body.roomId).emit('message:new', message);
      // Returned value becomes the socket.io ACK so the client knows it was saved.
      return { ok: true, message };
    } catch (err) {
      this.logger.error(`message:send failed for ${user.username}: ${(err as Error).message}`);
      client.emit('message:failed', {
        roomId: body.roomId,
        error: (err as Error).message || 'Failed to send message',
      });
      return { ok: false, error: (err as Error).message || 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:delete')
  async onDelete(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string; messageId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    try {
      const result = await this.chat.deleteMessage(user.id, body.messageId);
      this.server.to(body.roomId).emit('message:deleted', result);
    } catch (err) {
      client.emit('error', { code: 'DELETE_FAILED', message: (err as Error).message });
    }
  }

  @SubscribeMessage('message:read')
  async onMessageRead(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string; messageId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    
    const message = await this.prisma.message.findUnique({ where: { id: body.messageId } });
    if (!message || message.roomId !== body.roomId) return;
    
    // Don't mark own messages as read by self
    if (message.senderId === user.id) return;
    
    let meta = message.metadata as { readBy?: string[] } | null;
    if (!meta) meta = {};
    if (!meta.readBy) meta.readBy = [];
    
    if (!meta.readBy.includes(user.id)) {
      meta.readBy.push(user.id);
      await this.prisma.message.update({
        where: { id: body.messageId },
        data: { metadata: meta as any },
      });
      this.server.to(body.roomId).emit('message:read:update', {
        messageId: body.messageId,
        readBy: meta.readBy,
      });
    }
  }

  @SubscribeMessage('reaction:send')
  async onReaction(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: ReactionPayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    // Verify membership before broadcasting
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) return;
    this.server.to(body.roomId).emit('reaction:new', {
      userId: user.id,
      username: user.username,
      emoji: body.emoji,
      timestamp: Date.now(),
    });
  }

  /** Toggle a persistent emoji reaction on a specific message (WhatsApp-style). */
  @SubscribeMessage('message:react')
  async onMessageReact(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string; messageId: string; emoji: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) return;
    const msg = await this.prisma.message.findUnique({ where: { id: body.messageId } });
    if (!msg || msg.roomId !== body.roomId) return;

    const meta = (msg.metadata as Record<string, unknown> | null) ?? {};
    const reactions = (meta.reactions as Record<string, string[]>) ?? {};
    const list = reactions[body.emoji] ?? [];
    const idx = list.indexOf(user.id);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(user.id);
    if (list.length === 0) delete reactions[body.emoji];
    else reactions[body.emoji] = list;
    meta.reactions = reactions;

    await this.prisma.message.update({
      where: { id: body.messageId },
      data: { metadata: meta as never },
    });
    this.server.to(body.roomId).emit('message:reaction:update', {
      messageId: body.messageId,
      reactions,
    });
  }

  @SubscribeMessage('typing:start')
  async onTypingStart(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: TypingPayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) return;
    client
      .to(body.roomId)
      .emit('typing:update', { userId: user.id, username: user.username, isTyping: true });
  }

  @SubscribeMessage('typing:stop')
  async onTypingStop(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: TypingPayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) return;
    client
      .to(body.roomId)
      .emit('typing:update', { userId: user.id, username: user.username, isTyping: false });
  }

  @SubscribeMessage('theme:change')
  async onThemeChange(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: ThemePayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    // Only room host can change theme
    const room = await this.prisma.room.findUnique({ where: { id: body.roomId } });
    if (!room || room.ownerId !== user.id) {
      client.emit('error', { code: 'NOT_HOST', message: 'Only the host can change the theme' });
      return;
    }
    await this.rooms.setTheme(body.roomId, body.theme);
    this.server.to(body.roomId).emit('theme:updated', { theme: body.theme, by: user.username });
  }

  @SubscribeMessage('presence:update')
  async onPresence(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { status: 'online' | 'away' },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    // Refresh online heartbeat so call gating (couple/friend online checks) stays accurate
    if (body.status === 'online') await this.touchLastSeen(user.id);
    const rooms = Array.from(client.rooms).filter((r) => r !== client.id);
    for (const roomId of rooms) {
      this.server.to(roomId).emit('presence:updated', { userId: user.id, status: body.status });
    }
  }

  /** Update the user's lastSeenAt timestamp. Failures are non-fatal. */
  private async touchLastSeen(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
      });
    } catch (err) {
      this.logger.debug(`Failed to update lastSeenAt for ${userId}: ${err}`);
    }
  }

  // Watch sync — Phase 3 ──────────────────────────────────────

  @SubscribeMessage('watch:play')
  async onPlay(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: WatchControlPayload,
  ): Promise<void> {
    await this.broadcastWatch(client, body, true);
  }

  @SubscribeMessage('watch:pause')
  async onPause(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: WatchControlPayload,
  ): Promise<void> {
    await this.broadcastWatch(client, body, false);
  }

  @SubscribeMessage('watch:seek')
  async onSeek(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: WatchControlPayload,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const state = await this.redis.getJson<{ isPlaying: boolean }>(`room:${body.roomId}:watch`);
    await this.broadcastWatch(client, body, state?.isPlaying ?? false);
  }

  // Buffering coordination — if one viewer stalls, everyone else waits for them
  // (rather than the slow viewer being force-skipped forward).
  @SubscribeMessage('watch:buffering')
  async onBuffering(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string; buffering: boolean },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    client.to(body.roomId).emit('watch:buffering', {
      userId: user.id,
      username: user.username,
      buffering: body.buffering,
    });
  }

  // In-call Watch mode: when one participant opens Watch, everyone in the call
  // switches to it together (and back when closed).
  @SubscribeMessage('watch:open')
  async onWatchOpen(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    this.server.to(body.roomId).emit('watch:opened', { byName: user.username });
  }

  @SubscribeMessage('watch:close')
  async onWatchClose(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    this.server.to(body.roomId).emit('watch:closed', { byName: user.username });
  }

  // Single-uploader lock — only one person can upload to a room at a time.
  @SubscribeMessage('upload:claim')
  async onUploadClaim(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<{ ok: boolean; byName?: string }> {
    const user = client.data.user;
    if (!user) return { ok: false };
    const key = `upload:lock:${body.roomId}`;
    const existing = await this.redis.getJson<{ userId: string; username: string }>(key);
    if (existing && existing.userId !== user.id) {
      return { ok: false, byName: existing.username };
    }
    await this.redis.setJson(key, { userId: user.id, username: user.username }, 1800);
    client.data.uploadLockRoom = body.roomId; // so we can free it if they disconnect
    this.server.to(body.roomId).emit('upload:locked', { byName: user.username });
    return { ok: true };
  }

  @SubscribeMessage('upload:release')
  async onUploadRelease(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    await this.releaseUploadLock(body.roomId, user.id);
    client.data.uploadLockRoom = undefined;
  }

  /** Free a room's upload lock if it's held by this user, and tell the room. */
  private async releaseUploadLock(roomId: string, userId: string): Promise<void> {
    const key = `upload:lock:${roomId}`;
    const existing = await this.redis.getJson<{ userId: string }>(key);
    if (existing && existing.userId === userId) {
      await this.redis.del(key);
      this.server.to(roomId).emit('upload:unlocked', {});
    }
  }

  @SubscribeMessage('watch:sync')
  async onSyncRequest(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: WatchSyncRequest,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    // Verify membership before returning watch state
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) {
      client.emit('error', { code: 'NOT_ROOM_MEMBER', message: 'Not a member' });
      return;
    }
    const state = await this.redis.getJson(`room:${body.roomId}:watch`);
    if (state) client.emit('watch:state', state);
  }

  private async broadcastWatch(
    client: AuthedSocket,
    body: WatchControlPayload,
    isPlaying: boolean,
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) return;
    const payload = {
      isPlaying,
      timestamp: body.timestamp,
      updatedBy: user.username,
      updatedAt: Date.now(),
    };
    await this.redis.setJson(`room:${body.roomId}:watch`, payload, 86_400);
    this.server.to(body.roomId).emit('watch:state', payload);
  }

  // Call presence — Phase 4 ──────────────────────────────────

  @SubscribeMessage('call:join')
  async onCallJoin(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    const ok = await this.wsAuth.assertRoomMember(user.id, body.roomId);
    if (!ok) return;

    // Check if call can be started based on room type
    const canCall = await this.call.canStartCall(body.roomId, user.id);
    if (!canCall.allowed) {
      client.emit('error', { code: 'CALL_NOT_ALLOWED', message: canCall.reason });
      return;
    }

    const { state, isNew } = await this.call.markJoined(body.roomId, user.id, user.username);
    client.data.callRooms = Array.from(
      new Set([...(client.data.callRooms ?? []), body.roomId]),
    );
    if (isNew) {
      // Notify all room members about incoming call
      const room = await this.prisma.room.findUnique({ where: { id: body.roomId } });
      this.server.to(body.roomId).emit('call:incoming', {
        roomId: body.roomId,
        startedByName: user.username,
        roomName: room?.name ?? 'Room',
        startedAt: state.startedAt,
      });
      this.server.to(body.roomId).emit('call:started', {
        roomId: body.roomId,
        startedByName: user.username,
        startedAt: state.startedAt,
      });
    }
    this.server.to(body.roomId).emit('call:participant-joined', {
      userId: user.id,
      username: user.username,
      participantCount: state.participants.length,
    });
  }

  @SubscribeMessage('call:leave')
  async onCallLeave(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    client.data.callRooms = (client.data.callRooms ?? []).filter((r: string) => r !== body.roomId);
    await this.handleCallLeave(body.roomId, user);
  }

  @SubscribeMessage('call:decline')
  async onCallDecline(
    @ConnectedSocket() client: AuthedSocket,
    @MessageBody() body: { roomId: string },
  ): Promise<void> {
    const user = client.data.user;
    if (!user) return;
    // Let the room know (for a toast). In a two-party room a decline immediately
    // hangs up the waiting caller too — save a "missed call" and end it.
    this.server.to(body.roomId).emit('call:declined', {
      roomId: body.roomId,
      byName: user.username,
    });
    const twoParty = await this.call.isTwoPartyRoom(body.roomId);
    if (!twoParty) return;
    const state = await this.call.getActive(body.roomId);
    if (!state) return;
    try {
      const record = await this.call.saveCallRecord(
        body.roomId,
        state.startedBy,
        state.startedByName,
        user.id,
        state.startedAt,
        Date.now(),
        1, // declined before the callee joined → missed call
      );
      this.server.to(body.roomId).emit('message:new', record);
    } catch (err) {
      this.logger.error(`Failed to save declined-call record for ${body.roomId}: ${err}`);
    }
    await this.call.forceEnd(body.roomId);
    this.server.to(body.roomId).emit('call:ended', { roomId: body.roomId, endedByName: user.username });
  }

}
