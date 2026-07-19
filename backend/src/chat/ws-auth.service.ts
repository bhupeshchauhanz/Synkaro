import { Injectable, Logger } from '@nestjs/common';
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
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

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
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    return !!member;
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
