import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { RoomsService } from './rooms.service';
import {
  CreateRoomDto,
  JoinRoomDto,
  UpdateMyNicknameDto,
  UpdateRoomDto,
} from './dto/room.dto';
import { RoomMemberGuard } from './guards/room-member.guard';

const ALLOWED_BG_MIME = ['image/jpeg', 'image/png'];
const MAX_BG_SIZE = 4 * 1024 * 1024;

@ApiTags('rooms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  private readonly uploadDir: string;

  constructor(private readonly rooms: RoomsService, config: ConfigService) {
    this.uploadDir = config.get<string>('UPLOAD_DIR') ?? path.join(process.cwd(), 'uploads');
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<unknown[]> {
    return this.rooms.getMyRooms(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRoomDto): Promise<unknown> {
    return this.rooms.createRoom(user.id, dto.name, dto.type, dto.theme);
  }

  @Post('join')
  join(@CurrentUser() user: AuthUser, @Body() dto: JoinRoomDto): Promise<{ roomId: string }> {
    return this.rooms.joinByCode(user.id, dto.inviteCode);
  }

  @Get(':id')
  @UseGuards(RoomMemberGuard)
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<unknown> {
    return this.rooms.getRoom(id, user.id);
  }

  @Patch(':id')
  @UseGuards(RoomMemberGuard)
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRoomDto,
  ): Promise<unknown> {
    return this.rooms.updateRoom(user.id, id, dto);
  }

  @Patch(':id/nickname')
  @UseGuards(RoomMemberGuard)
  updateMyNickname(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMyNicknameDto,
  ): Promise<{ nickname: string | null }> {
    return this.rooms.updateMyNickname(user.id, id, dto.nickname);
  }

  @Post(':id/background')
  @UseGuards(RoomMemberGuard)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_BG_SIZE } }))
  async uploadBackground(
    @CurrentUser() user: AuthUser,
    @Param('id') roomId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ background: string }> {
    if (!file) {
      throw new BadRequestException({ message: 'No image provided', code: 'IMAGE_MISSING' });
    }
    if (!ALLOWED_BG_MIME.includes(file.mimetype)) {
      throw new BadRequestException({
        message: 'Only JPG and PNG images are allowed',
        code: 'INVALID_IMAGE_TYPE',
      });
    }
    const ext = file.mimetype === 'image/png' ? 'png' : 'jpg';
    const dir = path.join(this.uploadDir, roomId, 'backgrounds');
    await fs.mkdir(dir, { recursive: true });
    const fname = `bg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    try {
      await fs.writeFile(path.join(dir, fname), file.buffer);
    } catch {
      throw new BadRequestException({ message: 'Failed to save image', code: 'SAVE_FAILED' });
    }
    const publicPath = `/uploads/${roomId}/backgrounds/${fname}`;
    return this.rooms.setBackground(user.id, roomId, publicPath);
  }

  @Post(':id/leave')
  @UseGuards(RoomMemberGuard)
  async leave(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.rooms.leaveRoom(user.id, id);
    return { ok: true };
  }

  @Post(':id/regenerate-invite')
  @UseGuards(RoomMemberGuard)
  regenerate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<{ inviteCode: string }> {
    return this.rooms.regenerateInvite(user.id, id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(RoomMemberGuard)
  async kick(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ): Promise<{ ok: true }> {
    await this.rooms.kickMember(user.id, id, memberId);
    return { ok: true };
  }

  @Delete(':id')
  @UseGuards(RoomMemberGuard)
  async remove(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<{ ok: true }> {
    await this.rooms.deleteRoom(user.id, id);
    return { ok: true };
  }
}
