import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class RoomMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = req.user;
    if (!user) {
      throw new ForbiddenException({ message: 'Not authenticated', code: 'UNAUTHENTICATED' });
    }
    const roomId =
      (req.params.roomId as string) ?? (req.params.id as string) ?? (req.body?.roomId as string);
    if (!roomId) {
      throw new ForbiddenException({ message: 'Room not specified', code: 'ROOM_REQUIRED' });
    }
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: user.id } },
    });
    if (!member) {
      throw new ForbiddenException({
        message: 'You are not a member of this room',
        code: 'NOT_ROOM_MEMBER',
      });
    }
    return true;
  }
}
