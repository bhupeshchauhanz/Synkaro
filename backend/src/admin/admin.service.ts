import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getDashboard() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      usersToday,
      activeUsers,
      totalRooms,
      totalMessages,
      totalFiles,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { lastSeenAt: { gte: new Date(now.getTime() - 15 * 60 * 1000) } } }),
      this.prisma.room.count(),
      this.prisma.message.count({ where: { deletedAt: null } }),
      this.prisma.uploadedFile.count(),
    ]);

    // Storage usage
    const files = await this.prisma.uploadedFile.findMany({ select: { fileSize: true } });
    const storageUsed = files.reduce((sum, f) => sum + Number(f.fileSize), 0);

    // Trends over the last 7 days
    const [signupsPerDay, messagesPerDay, roomsPerDay] = await Promise.all([
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "User" WHERE "createdAt" >= ${weekAgo}
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "Message" WHERE "createdAt" >= ${weekAgo} AND "deletedAt" IS NULL
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
      this.prisma.$queryRaw<{ date: string; count: bigint }[]>`
        SELECT DATE("createdAt") as date, COUNT(*) as count
        FROM "Room" WHERE "createdAt" >= ${weekAgo}
        GROUP BY DATE("createdAt") ORDER BY date ASC
      `,
    ]);

    const toSeries = (rows: { date: string; count: bigint }[]) =>
      rows.map((r) => ({ date: String(r.date), count: Number(r.count) }));

    // Room type split
    const [coupleRooms, friendRooms] = await Promise.all([
      this.prisma.room.count({ where: { type: 'couple' } }),
      this.prisma.room.count({ where: { type: 'friend' } }),
    ]);

    return {
      totalUsers,
      usersToday,
      activeUsers,
      totalRooms,
      totalMessages,
      totalFiles,
      storageUsed,
      storageUsedMB: Math.round(storageUsed / 1024 / 1024),
      storageLimitMB: Math.round((totalFiles > 0 ? storageUsed : 0) / 1024 / 1024),
      roomTypeSplit: { couple: coupleRooms, friend: friendRooms },
      signupsPerDay: toSeries(signupsPerDay),
      messagesPerDay: toSeries(messagesPerDay),
      roomsPerDay: toSeries(roomsPerDay),
    };
  }

  /** Export every user as a CSV string (for admin download). */
  async exportUsersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        emailVerified: true,
        phone: true,
        isAdmin: true,
        createdAt: true,
        lastSeenAt: true,
        _count: { select: { rooms: true, messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = ['id', 'username', 'email', 'emailVerified', 'phone', 'isAdmin', 'rooms', 'messages', 'createdAt', 'lastSeenAt'];
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const u of users) {
      lines.push([
        u.id, u.username, u.email, u.emailVerified, u.phone ?? '', u.isAdmin,
        u._count.rooms, u._count.messages, u.createdAt.toISOString(), u.lastSeenAt.toISOString(),
      ].map(esc).join(','));
    }
    return lines.join('\n');
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          emailVerified: true,
          createdAt: true,
          lastSeenAt: true,
          _count: { select: { rooms: true, messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(u => ({
        ...u,
        roomCount: u._count.rooms,
        messageCount: u._count.messages,
        _count: undefined,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        phone: true,
        emailVerified: true,
        createdAt: true,
        lastSeenAt: true,
        rooms: {
          select: {
            room: {
              select: { id: true, name: true, type: true, inviteCode: true },
            },
            role: true,
          },
        },
        _count: { select: { messages: true, uploadedFiles: true } },
      },
    });
    if (!user) return null;
    return {
      ...user,
      roomCount: user.rooms.length,
      messageCount: user._count.messages,
      fileCount: user._count.uploadedFiles,
      rooms: user.rooms.map(r => ({
        ...r.room,
        role: r.role,
      })),
      _count: undefined,
    };
  }

  async getRooms(page = 1, limit = 20) {
    const [rooms, total] = await Promise.all([
      this.prisma.room.findMany({
        include: {
          members: {
            include: { user: { select: { id: true, username: true, avatar: true } } },
          },
          _count: { select: { messages: true, files: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.room.count(),
    ]);

    return {
      rooms: rooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        inviteCode: r.inviteCode,
        memberCount: r.members.length,
        members: r.members.map(m => ({
          id: m.user.id,
          username: m.user.username,
          avatar: m.user.avatar,
          role: m.role,
        })),
        messageCount: r._count.messages,
        fileCount: r._count.files,
        createdAt: r.createdAt,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getRoomById(id: string) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, avatar: true, email: true, lastSeenAt: true } } },
        },
        _count: { select: { messages: true, files: true } },
      },
    });
    if (!room) return null;

    const files = await this.prisma.uploadedFile.findMany({
      where: { roomId: id },
      select: { id: true, fileName: true, fileSize: true, mimeType: true, createdAt: true },
    });

    return {
      ...room,
      members: room.members.map(m => ({
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
        email: m.user.email,
        role: m.role,
        lastSeenAt: m.user.lastSeenAt,
      })),
      files: files.map(f => ({
        ...f,
        fileSizeMB: Math.round(Number(f.fileSize) / 1024 / 1024 * 10) / 10,
      })),
      totalStorage: files.reduce((sum, f) => sum + Number(f.fileSize), 0),
      messageCount: room._count.messages,
    };
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return { deleted: false, error: 'User not found' };

    // Delete user's messages first
    await this.prisma.message.deleteMany({ where: { senderId: id } });
    // Delete user's room memberships
    await this.prisma.roomMember.deleteMany({ where: { userId: id } });
    // Delete user's uploaded files
    await this.prisma.uploadedFile.deleteMany({ where: { uploadedById: id } });
    // Delete user's watch history
    await this.prisma.watchHistory.deleteMany({ where: { userId: id } });
    // Delete refresh tokens
    await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    // Delete the user
    await this.prisma.user.delete({ where: { id } });

    return { deleted: true, message: `User ${user.username} deleted` };
  }

  async deleteRoom(id: string) {
    const room = await this.prisma.room.findUnique({ where: { id } });
    if (!room) return { deleted: false, error: 'Room not found' };

    // Delete room's messages
    await this.prisma.message.deleteMany({ where: { roomId: id } });
    // Delete room's members
    await this.prisma.roomMember.deleteMany({ where: { roomId: id } });
    // Delete room's files
    await this.prisma.uploadedFile.deleteMany({ where: { roomId: id } });
    // Delete room's watch history
    await this.prisma.watchHistory.deleteMany({ where: { roomId: id } });
    // Delete room's watchlist
    await this.prisma.watchlistItem.deleteMany({ where: { roomId: id } });
    // Delete the room
    await this.prisma.room.delete({ where: { id } });

    return { deleted: true, message: `Room ${room.name} deleted` };
  }
}
