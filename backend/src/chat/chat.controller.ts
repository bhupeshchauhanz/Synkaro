import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomMemberGuard } from '../rooms/guards/room-member.guard';
import { ChatService, type MessageDto } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoomMemberGuard)
@Controller('rooms/:id/messages')
export class ChatController {
  constructor(private readonly chat: ChatService) {}

  @Get()
  async list(
    @Param('id') id: string,
    @Query('limit') limit?: string,
    @Query('before') before?: string,
  ): Promise<MessageDto[]> {
    return this.chat.getRecent(
      id,
      Math.min(Number(limit ?? 100), 200),
      before ? new Date(before) : undefined,
    );
  }
}
