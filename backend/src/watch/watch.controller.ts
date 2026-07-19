import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomMemberGuard } from '../rooms/guards/room-member.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { WatchService } from './watch.service';

class HistoryDto {
  @IsOptional()
  @IsString()
  fileId?: string;


  @IsNumber()
  timestamp!: number;

  @IsOptional()
  @IsNumber()
  duration?: number;
}

class WatchlistDto {
  @IsString()
  title!: string;

  @IsIn(['upload', 'external'])
  source!: 'upload' | 'external';

  @IsOptional()
  @IsString()
  url?: string;
}

@ApiTags('watch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RoomMemberGuard)
@Controller('rooms/:id/watch')
export class WatchController {
  constructor(private readonly watch: WatchService) {}

  @Post('history')
  async upsert(
    @CurrentUser() user: AuthUser,
    @Param('id') roomId: string,
    @Body() body: HistoryDto,
  ): Promise<{ ok: true }> {
    await this.watch.upsertHistory({
      userId: user.id,
      roomId,
      fileId: body.fileId,

      timestamp: body.timestamp,
      duration: body.duration,
    });
    return { ok: true };
  }

  @Get('resume')
  resume(@CurrentUser() user: AuthUser, @Param('id') roomId: string): Promise<unknown | null> {
    return this.watch.getResume(user.id, roomId);
  }

  @Get('state')
  state(@Param('id') roomId: string): Promise<unknown> {
    return this.watch.getState(roomId) as unknown as Promise<unknown>;
  }

  @Post('watchlist')
  addWatchlist(
    @CurrentUser() user: AuthUser,
    @Param('id') roomId: string,
    @Body() body: WatchlistDto,
  ): Promise<unknown> {
    return this.watch.addWatchlistItem(roomId, user.id, body.title, body.source, body.url);
  }

  @Get('watchlist')
  getWatchlist(@Param('id') roomId: string): Promise<unknown[]> {
    return this.watch.getWatchlist(roomId);
  }
}
