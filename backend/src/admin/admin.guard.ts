import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_ADMIN_KEY } from './admin.controller';
import { PrismaService } from '../prisma/prisma.service';

const ADMIN_CACHE_TTL_MS = 60_000;
const adminCache = new Map<string, { isAdmin: boolean; expiry: number }>();

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAdminRequired = this.reflector.getAllAndOverride<boolean>(IS_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isAdminRequired) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({ message: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    // Check in-memory cache first
    const cached = adminCache.get(user.id);
    if (cached && cached.expiry > Date.now()) {
      if (!cached.isAdmin) {
        throw new ForbiddenException({ message: 'Admin access required', code: 'NOT_ADMIN' });
      }
      return true;
    }

    // Cache miss or expired — query DB
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { isAdmin: true },
    });

    const isAdmin = dbUser?.isAdmin ?? false;
    adminCache.set(user.id, { isAdmin, expiry: Date.now() + ADMIN_CACHE_TTL_MS });

    if (!isAdmin) {
      throw new ForbiddenException({ message: 'Admin access required', code: 'NOT_ADMIN' });
    }

    return true;
  }
}
