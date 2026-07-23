import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Socket } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthedSocketUser {
  id: string;
  username: string;
  email: string;
}

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class WsAuthService implements OnModuleDestroy {
  private readonly logger = new Logger(WsAuthService.name);
  // In-memory membership cache: Map<"userId:roomId", expireTimestamp>
  // Entries auto-expire after 60s to pick up membership changes reasonably fast.
  private readonly memberCache = new Map<string, number>();
  private static readonly CACHE_MAX = 10_000;
  private readonly cleanupInterval: ReturnType<typeof setInterval>;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    // Evict expired entries every 5 minutes to prevent unbounded growth
    this.cleanupInterval = setInterval(() => this.cleanupCache(), 5 * 60 * 1000);
  }

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, expires] of this.memberCache) {
      if (expires <= now) this.memberCache.delete(key);
    }
    // Hard cap to prevent memory leak even if timestamps are stale
    if (this.memberCache.size > WsAuthService.CACHE_MAX) {
      const excess = this.memberCache.size - WsAuthService.CACHE_MAX;
      let deleted = 0;
      for (const key of this.memberCache.keys()) {
        if (deleted >= excess) break;
        this.memberCache.delete(key);
        deleted++;
      }
    }
  }

  async authenticate(socket: Socket): Promise<AuthedSocketUser | null> {
    const token = this.extractToken(socket);
    if (!token) return null;
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) return null;
      return {
        id: user.id,
        username: user.username,
        email: user.email,
      };
    } catch (err) {
      this.logger.debug(`WS auth failed: ${(err as Error).message}`);
      return null;
    }
  }

  async assertRoomMember(userId: string, roomId: string): Promise<boolean> {
    const key = `${userId}:${roomId}`;
    const cached = this.memberCache.get(key);
    if (cached && cached > Date.now()) return true;

    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (member) {
      // Cache positive result for 60s — reduces DB hits on hot paths (typing, reactions, messages)
      this.memberCache.set(key, Date.now() + 60_000);
      return true;
    }
    // Remove stale positive cache if member was removed
    this.memberCache.delete(key);
    return false;
  }

  /** Invalidate cache when a member leaves or is removed. */
  invalidateMember(userId: string, roomId: string): void {
    this.memberCache.delete(`${userId}:${roomId}`);
  }

  private extractToken(socket: Socket): string | null {
    const authHeader = (socket.handshake.headers['authorization'] as string) ?? '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    const fromAuth = socket.handshake.auth?.token;
    if (typeof fromAuth === 'string') return fromAuth;
    const fromQuery = socket.handshake.query?.token;
    if (typeof fromQuery === 'string') return fromQuery;
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
      const match = /access_token=([^;]+)/.exec(cookieHeader);
      if (match) return decodeURIComponent(match[1]);
    }
    return null;
  }
}
