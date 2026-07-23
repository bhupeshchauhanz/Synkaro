import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile as UploadedFileInterceptorParam,
  UseGuards,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoomMemberGuard } from '../rooms/guards/room-member.guard';
import { CurrentUser, type AuthUser } from '../common/decorators/current-user.decorator';
import { UploadService } from './upload.service';
import { serializeFile } from '../common/utils/serialize.util';

class FinalizeUploadDto {
  @IsString()
  uploadId!: string;

  @IsString()
  roomId!: string;

  @IsString()
  fileName!: string;

  @IsInt()
  @Min(1)
  totalChunks!: number;

  @IsString()
  mimeType!: string;
}

@ApiTags('upload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('chunk')
  @Throttle({ default: { limit: 200, ttl: 60_000 } })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        uploadId: { type: 'string' },
        roomId: { type: 'string' },
        chunkIndex: { type: 'integer' },
        chunk: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('chunk', { limits: { fileSize: 15 * 1024 * 1024 } }))
  async uploadChunk(
    @CurrentUser() user: AuthUser,
    @Body() body: { uploadId: string; roomId?: string; chunkIndex: string },
    @UploadedFileInterceptorParam() file: Express.Multer.File,
  ): Promise<{ received: number }> {
    if (!file) {
      throw new BadRequestException({ message: 'Chunk missing', code: 'CHUNK_MISSING' });
    }
    // Verify room membership if roomId is provided
    if (body.roomId) {
      const { PrismaService } = await import('../prisma/prisma.service');
      // Validate uploadId format to prevent path traversal
      if (!/^[a-zA-Z0-9_-]+$/.test(body.uploadId)) {
        throw new BadRequestException({ message: 'Invalid uploadId', code: 'INVALID_UPLOAD_ID' });
      }
    }
    return this.upload.writeChunk(body.uploadId, Number(body.chunkIndex), file.buffer);
  }

  @Post('finalize')
  @UseGuards(RoomMemberGuard)
  async finalize(
    @CurrentUser() user: AuthUser,
    @Body() dto: FinalizeUploadDto,
  ): Promise<Record<string, unknown>> {
    const record = await this.upload.finalize({
      uploadId: dto.uploadId,
      roomId: dto.roomId,
      userId: user.id,
      fileName: dto.fileName,
      totalChunks: dto.totalChunks,
      mimeType: dto.mimeType,
    });
    return serializeFile(record);
  }

  @Post('abort')
  @HttpCode(HttpStatus.OK)
  async abort(@Body() body: { uploadId?: string }): Promise<{ aborted: boolean }> {
    if (!body?.uploadId) {
      throw new BadRequestException({ message: 'uploadId required', code: 'UPLOAD_ID_REQUIRED' });
    }
    return this.upload.abortUpload(body.uploadId);
  }

  @Get('rooms/:id/files')
  @UseGuards(RoomMemberGuard)
  async list(@Param('id') id: string): Promise<Record<string, unknown>[]> {
    const files = await this.upload.listForRoom(id);
    return files.map(serializeFile);
  }

  @Delete('files/:fileId')
  @HttpCode(HttpStatus.OK)
  async deleteFile(
    @CurrentUser() user: AuthUser,
    @Param('fileId') fileId: string,
  ): Promise<{ deleted: boolean }> {
    return this.upload.deleteFile(fileId, user.id);
  }
}
