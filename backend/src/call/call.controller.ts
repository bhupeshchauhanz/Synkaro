import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomMemberGuard } from '../rooms/guards/room-member.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { CallService } from './call.service';

@ApiTags('call')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoomMemberGuard)
@Controller('rooms/:id/call')
export class CallController {
  constructor(private readonly call: CallService) {}

  @Get('token')
  async token(
    @CurrentUser() user: AuthUser,
    @Param('id') roomId: string,
  ): Promise<{ token: string; url: string }> {
    // Joining an existing call is always allowed; only starting a fresh call is
    // gated (couple/friend online requirements). This mirrors the socket gate so
    // the REST token endpoint can't be used to bypass it.
    const state = await this.call.getActive(roomId);
    const hasActiveCall =
      !!state && (state.participants.length > 0 || Date.now() - state.lastSeenAt < 120_000);
    if (!hasActiveCall) {
      const gate = await this.call.canStartCall(roomId, user.id);
      if (!gate.allowed) {
        throw new ForbiddenException({ message: gate.reason, code: 'CALL_NOT_ALLOWED' });
      }
    }
    return this.call.generateToken(user.id, user.username, roomId);
  }

  @Get('active')
  async active(
    @Param('id') roomId: string,
  ): Promise<{
    active: boolean;
    startedAt?: number;
    startedByName?: string;
    participantCount?: number;
  }> {
    const state = await this.call.getActive(roomId);
    if (!state) return { active: false };
    return {
      active: state.participants.length > 0 || Date.now() - state.lastSeenAt < 120_000,
      startedAt: state.startedAt,
      startedByName: state.startedByName,
      participantCount: state.participants.length,
    };
  }
}
