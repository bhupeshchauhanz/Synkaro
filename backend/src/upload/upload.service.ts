import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync, createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadedFile } from '@prisma/client';

// MKV (video/x-matroska) is intentionally excluded: HTML5 <video> cannot play it
// in mainstream browsers, so allowing it only leads to "failed to load" for users.
const ALLOWED_VIDEO_MIME = ['video/mp4', 'video/webm'];
const ALLOWED_IMAGE_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
const MAX_ROOM_SIZE = 4 * 1024 * 1024 * 1024; // 4GB

interface FinalizeInput {
  uploadId: string;
  roomId: string;
  userId: string;
  fileName: string;
  totalChunks: number;
  mimeType: string;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly tmpDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = config.get<string>('UPLOAD_DIR') ?? path.join(process.cwd(), 'uploads');
    this.tmpDir = path.join(this.uploadDir, '.tmp');
  }

  async writeChunk(
    uploadId: string,
    chunkIndex: number,
    buffer: Buffer,
  ): Promise<{ received: number }> {
    if (!UPLOAD_ID_PATTERN.test(uploadId)) {
      throw new BadRequestException({ message: 'Invalid upload ID', code: 'INVALID_UPLOAD_ID' });
    }
    const dir = path.join(this.tmpDir, uploadId);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, `${chunkIndex}.part`), buffer);
    const files = await fs.readdir(dir);
    return { received: files.length };
  }

  async finalize(input: FinalizeInput): Promise<UploadedFile> {
    const { uploadId, roomId, userId, fileName, totalChunks, mimeType } = input;
    if (!ALLOWED_VIDEO_MIME.includes(mimeType) && !ALLOWED_IMAGE_MIME.includes(mimeType)) {
      throw new BadRequestException({
        message: `Unsupported file type: ${mimeType}. Allowed: MP4, WebM, JPEG, PNG, GIF, WebP`,
        code: 'UNSUPPORTED_MIME',
      });
    }
    const tmpRoomDir = path.join(this.tmpDir, uploadId);
    if (!existsSync(tmpRoomDir)) {
      throw new BadRequestException({
        message: 'No chunks uploaded',
        code: 'UPLOAD_NOT_FOUND',
      });
    }

    const safeName = `${Date.now()}-${fileName.replace(/[^A-Za-z0-9._-]/g, '_')}`;
    const targetDir = path.join(this.uploadDir, roomId);
    await fs.mkdir(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, safeName);

    const roomFiles = await this.prisma.uploadedFile.aggregate({
      where: { roomId },
      _sum: { fileSize: true },
    });
    const currentRoomSize = Number(roomFiles._sum.fileSize ?? 0);

    if (currentRoomSize >= MAX_ROOM_SIZE) {
      throw new BadRequestException({
        message: 'Room has reached the 4GB storage limit. Please delete old files.',
        code: 'ROOM_STORAGE_FULL',
      });
    }

    // Stitch chunks into the final file by STREAMING (64KB at a time) instead of
    // buffering whole chunks in memory — keeps RAM low even for 3GB files and
    // several concurrent uploads.
    const write = createWriteStream(targetPath);
    try {
      let totalSize = 0;
      for (let i = 0; i < totalChunks; i += 1) {
        const partPath = path.join(tmpRoomDir, `${i}.part`);
        if (!existsSync(partPath)) {
          throw new BadRequestException({ message: `Missing chunk ${i}`, code: 'MISSING_CHUNK' });
        }
        const stat = await fs.stat(partPath);
        totalSize += stat.size;
        if (totalSize > MAX_FILE_SIZE) {
          throw new BadRequestException({ message: 'File exceeds 3GB limit', code: 'FILE_TOO_LARGE' });
        }
        if (currentRoomSize + totalSize > MAX_ROOM_SIZE) {
          throw new BadRequestException({
            message: 'Upload would exceed the room 4GB storage limit',
            code: 'ROOM_STORAGE_FULL',
          });
        }
        await pipeline(createReadStream(partPath), write, { end: false });
      }
      write.end();
      await new Promise<void>((resolve, reject) => {
        write.on('finish', () => resolve());
        write.on('error', reject);
      });
    } catch (err) {
      write.destroy();
      await fs.unlink(targetPath).catch(() => undefined);
      throw err;
    }

    const stats = await fs.stat(targetPath);
    const relativePath = `/uploads/${roomId}/${safeName}`;

    const record = await this.prisma.uploadedFile.create({
      data: {
        roomId,
        uploadedById: userId,
        filePath: relativePath,
        fileName,
        fileSize: BigInt(stats.size),
        mimeType,
      },
    });

    await fs.rm(tmpRoomDir, { recursive: true, force: true });

    return record;
  }

  /** Discard a partial (interrupted) upload — deletes its temp chunks from disk. */
  async abortUpload(uploadId: string): Promise<{ aborted: boolean }> {
    if (!UPLOAD_ID_PATTERN.test(uploadId)) return { aborted: false };
    const dir = path.join(this.tmpDir, uploadId);
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return { aborted: true };
  }

  async getFile(fileId: string): Promise<UploadedFile> {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file) {
      throw new BadRequestException({ message: 'File not found', code: 'FILE_NOT_FOUND' });
    }
    return file;
  }

  async listForRoom(roomId: string): Promise<UploadedFile[]> {
    return this.prisma.uploadedFile.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteFile(fileId: string, userId: string): Promise<{ deleted: boolean }> {
    const file = await this.prisma.uploadedFile.findUnique({ where: { id: fileId } });
    if (!file) throw new BadRequestException({ message: 'File not found', code: 'FILE_NOT_FOUND' });

    // Verify the user is a member of the room this file belongs to
    const member = await this.prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: file.roomId, userId } },
    });
    if (!member) {
      throw new BadRequestException({
        message: 'You are not a member of this room',
        code: 'NOT_ROOM_MEMBER',
      });
    }

    // Check if file is being used in active call
    const activeCall = await this.prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count FROM "WatchHistory"
      WHERE "fileId" = ${fileId} AND "updatedAt" > ${new Date(Date.now() - 6 * 60 * 60 * 1000)}
    `;
    if (Number(activeCall[0]?.count ?? 0) > 0) {
      throw new BadRequestException({
        message: 'Cannot delete file being used in active session',
        code: 'FILE_IN_USE',
      });
    }

    // Delete physical file
    const abs = path.join(this.uploadDir, file.filePath.replace(/^\/uploads\//, ''));
    await fs.unlink(abs).catch(() => undefined);

    // Delete from database
    await this.prisma.uploadedFile.delete({ where: { id: fileId } });

    return { deleted: true };
  }
}
