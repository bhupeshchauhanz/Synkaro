import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateInviteCode } from '../common/utils/invite-code.util';
import { sanitizeText } from '../common/utils/sanitize.util';
import type { Room } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  /** A room can only be created/joined once the user has filled their profile
   * (bio, phone, date of birth). Avatar is intentionally NOT required. */
  private async assertProfileComplete(userId: string): Promise<void> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bio: true, phone: true, dateOfBirth: true },
    });
    if (!u || !u.bio?.trim() || !u.phone?.trim() || !u.dateOfBirth) {
      throw new ForbiddenException({
        message: 'Complete your profile (bio, phone, date of birth) before creating or joining a room.',
        code: 'PROFILE_INCOMPLETE',
      });
    }
  }

  async createRoom(
    userId: string,
    name: string,
    type: 'couple' | 'friend',
    theme?: string,
  ): Promise<Room> {
    await this.assertProfileComplete(userId);
    const inviteCode = await this.uniqueInviteCode();
    const maxMembers = type === 'couple' ? 2 : 4;

    return this.prisma.room.create({
      data: {
        name: sanitizeText(name),
        type,
        inviteCode,
        ownerId: userId,
        currentTheme: theme ?? (type === 'couple' ? 'soft-pink' : 'midnight'),
        background: 'preset:aurora',
        maxMembers,
        members: {
          create: { userId, role: 'host' },
        },
      },
    });
  }

  async getMyRooms(userId: string): Promise<unknown[]> {
    const rows = await this.prisma.roomMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            members: {
              include: { user: { select: { id: true, username: true, avatar: true } } },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            _count: { select: { messages: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return rows.map((row) => {
      const lastMsg = row.room.messages[0] || null;
      let hasUnseen = false;
      if (lastMsg && lastMsg.senderId !== userId) {
        const meta = lastMsg.metadata as { readBy?: string[] } | null;
        if (!meta?.readBy?.includes(userId)) {
          hasUnseen = true;
        }
      }

      return {
        id: row.room.id,
        name: row.room.name,
        nickname: row.room.nickname,
        type: row.room.type,
        inviteCode: row.room.inviteCode,
        currentTheme: row.room.currentTheme,
        background: row.room.background,
        maxMembers: row.room.maxMembers,
        members: row.room.members.map((m) => ({
          id: m.user.id,
          username: m.user.username,
          avatar: m.user.avatar,
          role: m.role,
        })),
        messageCount: row.room._count.messages,
        role: row.role,
        joinedAt: row.joinedAt,
        hasUnseen,
      };
    });
  }

  async getRoom(roomId: string, userId: string): Promise<unknown> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });
    if (!room) {
      throw new NotFoundException({ message: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    const isMember = room.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException({ message: 'Not a member', code: 'NOT_ROOM_MEMBER' });
    }

    return {
      id: room.id,
      name: room.name,
      nickname: room.nickname,
      type: room.type,
      inviteCode: room.inviteCode,
      currentTheme: room.currentTheme,
      background: room.background,
      maxMembers: room.maxMembers,
      ownerId: room.ownerId,
      members: room.members.map((m) => ({
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
        nickname: m.nickname,
        role: m.role,
      })),
    };
  }

  async joinByCode(userId: string, inviteCode: string): Promise<{ roomId: string }> {
    await this.assertProfileComplete(userId);
    const code = inviteCode.toUpperCase().trim();
    const room = await this.prisma.room.findUnique({
      where: { inviteCode: code },
      include: { _count: { select: { members: true } } },
    });
    if (!room) {
      throw new NotFoundException({
        message: 'Invite code not found',
        code: 'INVITE_NOT_FOUND',
      });
    }
    const existing = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } },
    });
    if (existing) return { roomId: room.id };

    if (room._count.members >= room.maxMembers) {
      throw new BadRequestException({ message: 'Room is full', code: 'ROOM_FULL' });
    }
    await this.prisma.roomMember.create({
      data: { roomId: room.id, userId, role: 'member' },
    });
    return { roomId: room.id };
  }

  async leaveRoom(userId: string, roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({ message: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) {
      throw new NotFoundException({ message: 'Not a member of this room', code: 'NOT_ROOM_MEMBER' });
    }
    if (room.ownerId === userId) {
      const otherMembers = await this.prisma.roomMember.findMany({
        where: { roomId, userId: { not: userId } },
        orderBy: { joinedAt: 'asc' },
      });
      if (otherMembers.length > 0) {
        // Transfer ownership to the first other member
        const newOwner = otherMembers[0];
        await this.prisma.$transaction([
          this.prisma.room.update({
            where: { id: roomId },
            data: { ownerId: newOwner.userId },
          }),
          this.prisma.roomMember.update({
            where: { roomId_userId: { roomId, userId: newOwner.userId } },
            data: { role: 'host' },
          }),
          this.prisma.roomMember.delete({
            where: { roomId_userId: { roomId, userId } },
          }),
        ]);
      } else {
        // Last member — safe to delete
        await this.prisma.room.delete({ where: { id: roomId } });
      }
      return;
    }
    await this.prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } },
    });
  }

  async updateRoom(
    userId: string,
    roomId: string,
    data: {
      name?: string;
      nickname?: string;
      theme?: string;
      background?: string;
    },
  ): Promise<Room> {
    await this.assertHost(roomId, userId);

    // Validate theme against allowlist
    const ALLOWED_THEMES = ['midnight', 'soft-pink', 'lavender', 'sky-blue', 'peach'];
    if (data.theme && !ALLOWED_THEMES.includes(data.theme)) {
      throw new BadRequestException({ message: 'Invalid theme', code: 'INVALID_THEME' });
    }

    // Validate background — must be a preset ID or a safe relative upload path
    if (data.background) {
      const isPreset = data.background.startsWith('preset:');
      const isUpload = /^\/uploads\/[a-zA-Z0-9_/-]+\.(jpg|jpeg|png)$/.test(data.background);
      if (!isPreset && !isUpload) {
        throw new BadRequestException({
          message: 'Invalid background value',
          code: 'INVALID_BACKGROUND',
        });
      }
    }

    return this.prisma.room.update({
      where: { id: roomId },
      data: {
        name: data.name ? sanitizeText(data.name) : undefined,
        nickname: data.nickname !== undefined ? sanitizeText(data.nickname) : undefined,
        currentTheme: data.theme,
        background: data.background,
      },
    });
  }

  async updateMyNickname(
    userId: string,
    roomId: string,
    nickname: string,
  ): Promise<{ nickname: string | null }> {
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) {
      throw new ForbiddenException({
        message: 'Not a member of this room',
        code: 'NOT_ROOM_MEMBER',
      });
    }
    const trimmed = sanitizeText(nickname).slice(0, 24) || null;
    const updated = await this.prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { nickname: trimmed },
    });
    return { nickname: updated.nickname };
  }

  async regenerateInvite(userId: string, roomId: string): Promise<{ inviteCode: string }> {
    await this.assertHost(roomId, userId);
    const inviteCode = await this.uniqueInviteCode();
    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: { inviteCode },
    });
    return { inviteCode: room.inviteCode };
  }

  async kickMember(actingUserId: string, roomId: string, targetUserId: string): Promise<void> {
    await this.assertHost(roomId, actingUserId);
    if (actingUserId === targetUserId) {
      throw new BadRequestException({ message: 'Cannot kick yourself', code: 'CANNOT_KICK_SELF' });
    }
    const target = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
    if (!target) {
      throw new NotFoundException({ message: 'User is not a member of this room', code: 'NOT_ROOM_MEMBER' });
    }
    await this.prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId: targetUserId } },
    });
  }

  async deleteRoom(userId: string, roomId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({ message: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    if (room.ownerId !== userId) {
      throw new ForbiddenException({ message: 'Only the host can delete', code: 'NOT_HOST' });
    }
    await this.prisma.room.delete({ where: { id: roomId } });
  }

  async setTheme(roomId: string, theme: string): Promise<void> {
    const ALLOWED_THEMES = ['midnight', 'soft-pink', 'lavender', 'sky-blue', 'peach', 'ocean', 'forest', 'aurora', 'sunset', 'candy'];
    if (!ALLOWED_THEMES.includes(theme)) return;
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) return;
    await this.prisma.room.update({ where: { id: roomId }, data: { currentTheme: theme } });
  }

  async setBackground(
    userId: string,
    roomId: string,
    background: string,
  ): Promise<{ background: string }> {
    await this.assertHost(roomId, userId);
    const isPreset = background.startsWith('preset:');
    const isUpload = /^\/uploads\/[a-zA-Z0-9_/-]+\.(jpg|jpeg|png)$/i.test(background);
    if (!isPreset && !isUpload) {
      throw new BadRequestException({ message: 'Invalid background value', code: 'INVALID_BACKGROUND' });
    }
    const room = await this.prisma.room.update({
      where: { id: roomId },
      data: { background },
    });
    return { background: room.background ?? '' };
  }

  private async assertHost(roomId: string, userId: string): Promise<void> {
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room) {
      throw new NotFoundException({ message: 'Room not found', code: 'ROOM_NOT_FOUND' });
    }
    if (room.ownerId !== userId) {
      throw new ForbiddenException({ message: 'Only the host can do that', code: 'NOT_HOST' });
    }
  }

  private async uniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateInviteCode(6);
      const exists = await this.prisma.room.findUnique({ where: { inviteCode: code } });
      if (!exists) return code;
    }
    throw new BadRequestException({
      message: 'Could not generate invite code',
      code: 'INVITE_GEN_FAILED',
    });
  }
}
