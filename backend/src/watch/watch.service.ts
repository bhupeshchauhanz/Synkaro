import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface UpsertHistoryInput {
  userId: string;
  roomId: string;
  fileId?: string;

  timestamp: number;
  duration?: number;
}

interface WatchStateRedis {
  isPlaying: boolean;
  timestamp: number;
  updatedBy: string;
  updatedAt: number;
}

@Injectable()
export class WatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async upsertHistory(input: UpsertHistoryInput): Promise<void> {
    await this.prisma.watchHistory.upsert({
      where: { userId_roomId: { userId: input.userId, roomId: input.roomId } },
      update: {
        fileId: input.fileId,

        timestamp: input.timestamp,
        duration: input.duration,
      },
      create: {
        userId: input.userId,
        roomId: input.roomId,
        fileId: input.fileId,

        timestamp: input.timestamp,
        duration: input.duration,
      },
    });
  }

  async getResume(userId: string, roomId: string): Promise<unknown | null> {
    return this.prisma.watchHistory.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
  }

  async getState(roomId: string): Promise<WatchStateRedis | null> {
    return this.redis.getJson<WatchStateRedis>(`room:${roomId}:watch`);
  }

  async setState(roomId: string, state: WatchStateRedis): Promise<void> {
    await this.redis.setJson(`room:${roomId}:watch`, state, 86_400);
  }

  async addWatchlistItem(
    roomId: string,
    addedById: string,
    title: string,
    source: 'upload' | 'external',
    url?: string,
  ): Promise<unknown> {
    return this.prisma.watchlistItem.create({
      data: { roomId, addedById, title, source, url },
    });
  }

  async getWatchlist(roomId: string): Promise<unknown[]> {
    return this.prisma.watchlistItem.findMany({
      where: { roomId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
