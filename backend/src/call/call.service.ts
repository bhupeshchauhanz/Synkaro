import { Injectable, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';

interface ActiveCallState {
  roomId: string;
  startedAt: number;
  startedBy: string;
  startedByName: string;
  participants: { userId: string; username: string; joinedAt: number }[];
  peakParticipants: number;
  lastSeenAt: number;
}

const ACTIVE_CALL_TTL_SECONDS = 60 * 60 * 3; // 3 hours max per user request
const ACTIVE_CALL_KEY = (roomId: string) => `call:active:${roomId}`;

@Injectable()
export class CallService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly url: string;

  constructor(
    config: ConfigService,
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = config.get<string>('LIVEKIT_API_KEY') ?? '';
    this.apiSecret = config.get<string>('LIVEKIT_API_SECRET') ?? '';
    this.url =
      config.get<string>('LIVEKIT_URL') ?? 'wss://synkaro.bhupeshchauhan.in/livekit';
  }

  async generateToken(
    userId: string,
    username: string,
    roomId: string,
  ): Promise<{ token: string; url: string }> {
    if (!this.apiKey || !this.apiSecret) {
      throw new InternalServerErrorException({
        message: 'LiveKit not configured',
        code: 'LIVEKIT_NOT_CONFIGURED',
      });
    }
    const at = new AccessToken(this.apiKey, this.apiSecret, {
      identity: userId,
      name: username,
      ttl: '3h',
    });
    at.addGrant({
      roomJoin: true,
      room: roomId,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      // Quality grants for better audio/video
      canPublishSources: undefined, // allow all sources
    });
    const token = await at.toJwt();
    return { token, url: this.url };
  }

  /**
   * Check if a call can be started/joined.
   *
   * By design a user can ALWAYS start a call and wait — the caller sees a
   * "Waiting for <partner>" screen with an outgoing ring, and other members get
   * an incoming ring + notification (if their app is open) or can join later.
   * We only block if the room has no one else to call at all.
   */
  async canStartCall(roomId: string, userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { select: { userId: true } } },
    });
    if (!room) return { allowed: false, reason: 'Room not found' };

    const others = room.members.filter((m) => m.userId !== userId);
    if (others.length === 0) {
      return { allowed: false, reason: 'There is no one else in this room to call yet.' };
    }
    return { allowed: true };
  }

  /** A "two-party" call ends the moment either side leaves (couple, or a friend
   * room that currently has ≤2 members). Bigger rooms keep the call going. */
  async isTwoPartyRoom(roomId: string): Promise<boolean> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: { _count: { select: { members: true } } },
    });
    if (!room) return false;
    return room.type === 'couple' || room._count.members <= 2;
  }

  async getActive(roomId: string): Promise<ActiveCallState | null> {
    return this.redis.getJson<ActiveCallState>(ACTIVE_CALL_KEY(roomId));
  }

  async markJoined(
    roomId: string,
    userId: string,
    username: string,
  ): Promise<{ state: ActiveCallState; isNew: boolean }> {
    const existing = await this.getActive(roomId);
    const now = Date.now();
    if (existing) {
      const others = existing.participants.filter((p) => p.userId !== userId);
      const participants = [...others, { userId, username, joinedAt: now }];
      const updated: ActiveCallState = {
        ...existing,
        participants,
        peakParticipants: Math.max(existing.peakParticipants ?? 1, participants.length),
        lastSeenAt: now,
      };
      await this.redis.setJson(ACTIVE_CALL_KEY(roomId), updated, ACTIVE_CALL_TTL_SECONDS);
      return { state: updated, isNew: false };
    }
    const fresh: ActiveCallState = {
      roomId,
      startedAt: now,
      startedBy: userId,
      startedByName: username,
      participants: [{ userId, username, joinedAt: now }],
      peakParticipants: 1,
      lastSeenAt: now,
    };
    await this.redis.setJson(ACTIVE_CALL_KEY(roomId), fresh, ACTIVE_CALL_TTL_SECONDS);
    return { state: fresh, isNew: true };
  }

  async markLeft(roomId: string, userId: string): Promise<ActiveCallState | null> {
    const existing = await this.getActive(roomId);
    if (!existing) return null;
    const remaining = existing.participants.filter((p) => p.userId !== userId);
    const now = Date.now();
    if (remaining.length === 0) {
      // Keep state for 2 minutes — let last user rejoin or others see "active"
      const tail: ActiveCallState = {
        ...existing,
        participants: [],
        lastSeenAt: now,
      };
      await this.redis.setJson(ACTIVE_CALL_KEY(roomId), tail, 120);
      return tail;
    }
    const updated: ActiveCallState = {
      ...existing,
      participants: remaining,
      lastSeenAt: now,
    };
    await this.redis.setJson(ACTIVE_CALL_KEY(roomId), updated, ACTIVE_CALL_TTL_SECONDS);
    return updated;
  }

  async forceEnd(roomId: string): Promise<void> {
    await this.redis.del(ACTIVE_CALL_KEY(roomId));
  }

  /**
   * Save a call record to chat (duration, missed call, etc.) and return a
   * message DTO so the gateway can broadcast it live.
   */
  async saveCallRecord(
    roomId: string,
    startedBy: string,
    startedByName: string,
    endedBy: string,
    startedAt: number,
    endedAt: number,
    participantCount: number,
  ): Promise<{
    id: string;
    roomId: string;
    senderId: string;
    username: string;
    avatar: string | null;
    content: string;
    type: string;
    fileUrl: null;
    metadata: unknown;
    createdAt: Date;
  }> {
    const durationSec = Math.max(0, Math.round((endedAt - startedAt) / 1000));
    const durationMin = Math.max(1, Math.round(durationSec / 60));
    const missed = participantCount <= 1;

    const recordContent = missed
      ? `📞 Missed call from ${startedByName}`
      : `📞 Call ended · ${durationMin} min · ${participantCount} joined`;

    const msg = await this.prisma.message.create({
      data: {
        roomId,
        senderId: startedBy,
        content: recordContent,
        type: 'text',
        metadata: {
          callRecord: true,
          duration: durationSec,
          participants: participantCount,
          missed,
        },
      },
      include: { sender: { select: { username: true, avatar: true } } },
    });

    return {
      id: msg.id,
      roomId,
      senderId: startedBy,
      username: msg.sender.username,
      avatar: msg.sender.avatar,
      content: recordContent,
      type: 'text',
      fileUrl: null,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    };
  }
}
