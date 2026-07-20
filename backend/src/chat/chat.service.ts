import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeRichText } from '../common/utils/sanitize.util';
import { encryptText, decryptText, ENC_PREFIX } from '../common/utils/crypto.util';
import type { Message } from '@prisma/client';

const MAX_ROOM_CHAT_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per room
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB per image

interface CreateMessageInput {
  roomId: string;
  senderId: string;
  content?: string;
  type?: 'text' | 'image' | 'sticker' | 'gif';
  fileUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface MessageDto {
  id: string;
  roomId: string;
  senderId: string;
  username: string;
  avatar: string | null;
  content: string | null;
  type: string;
  fileUrl: string | null;
  metadata: unknown;
  createdAt: Date;
}

@Injectable()
export class ChatService {
  private readonly secret: string;
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    const encKey = config.get<string>('CHAT_ENCRYPTION_KEY') ?? config.get<string>('JWT_SECRET');
    if (!encKey) throw new Error('CHAT_ENCRYPTION_KEY or JWT_SECRET env var is required');
    this.secret = encKey;
    this.uploadDir = config.get<string>('UPLOAD_DIR') ?? path.join(process.cwd(), 'uploads');
  }

  /** If a message's fileUrl points to a stored file, remove it from disk. */
  private async deleteFileUrlFromDisk(fileUrl: string | null): Promise<void> {
    if (!fileUrl || !fileUrl.startsWith('/uploads/')) return; // base64 data URLs need no disk cleanup
    try {
      const abs = path.join(this.uploadDir, fileUrl.replace(/^\/uploads\//, ''));
      await fs.unlink(abs);
    } catch {
      /* file already gone — ignore */
    }
  }

  async createMessage(input: CreateMessageInput): Promise<MessageDto> {
    // Check image size limit (base64 data URLs are ~33% larger than raw)
    if (input.type === 'image' && input.fileUrl) {
      const estimatedRawSize = Math.floor((input.fileUrl.length * 3) / 4);
      if (estimatedRawSize > MAX_IMAGE_SIZE_BYTES) {
        throw new BadRequestException({
          message: 'Image must be under 5MB',
          code: 'IMAGE_TOO_LARGE',
        });
      }
    }

    // Check room chat size limit (25MB). This is a best-effort housekeeping step —
    // it must NEVER prevent a message from being saved, so any failure is swallowed.
    try {
      const currentSize = await this.prisma.$queryRaw<[{total: bigint}]>`
        SELECT COALESCE(SUM(LENGTH(COALESCE(content, '')) + LENGTH(COALESCE("fileUrl", ''))), 0) as total
        FROM "Message"
        WHERE "roomId" = ${input.roomId} AND "deletedAt" IS NULL
      `;
      const currentBytes = Number(currentSize[0]?.total ?? 0);

      if (currentBytes > MAX_ROOM_CHAT_SIZE_BYTES) {
        // Auto-cleanup: delete oldest 20% of messages
        const deleteCount = Math.max(1, Math.floor(await this.prisma.message.count({
          where: { roomId: input.roomId, deletedAt: null },
        }) * 0.2));

        const oldestMessages = await this.prisma.message.findMany({
          where: { roomId: input.roomId, deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: deleteCount,
          select: { id: true },
        });

        await this.prisma.message.updateMany({
          where: { id: { in: oldestMessages.map(m => m.id) } },
          data: { deletedAt: new Date(), content: null, fileUrl: null },
        });
      }
    } catch {
      // ignore housekeeping errors — saving the message below is what matters
    }

    let storedContent: string | null = null;
    if (input.content) {
      // Limit message length to prevent abuse (10KB is very generous for chat)
      if (input.content.length > 10_000) {
        throw new BadRequestException({ message: 'Message too long', code: 'MESSAGE_TOO_LONG' });
      }
      const sanitized = sanitizeRichText(input.content);
      if ((input.type ?? 'text') === 'text') {
        storedContent = ENC_PREFIX + encryptText(sanitized, this.secret);
      } else {
        storedContent = sanitized;
      }
    }

    const message = await this.prisma.message.create({
      data: {
        roomId: input.roomId,
        senderId: input.senderId,
        content: storedContent,
        type: input.type ?? 'text',
        fileUrl: input.fileUrl ?? null,
        metadata: (input.metadata as never) ?? null,
      },
      include: { sender: { select: { username: true, avatar: true } } },
    });
    return this.toDto(message);
  }

  async deleteMessage(userId: string, messageId: string): Promise<{ messageId: string }> {
    const msg = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) {
      throw new NotFoundException({ message: 'Message not found', code: 'MESSAGE_NOT_FOUND' });
    }
    if (msg.senderId !== userId) {
      throw new ForbiddenException({ message: 'Cannot delete others messages', code: 'NOT_OWNER' });
    }
    // Remove any attached image/file from disk before clearing the record
    await this.deleteFileUrlFromDisk(msg.fileUrl);
    await this.prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: null, fileUrl: null },
    });
    return { messageId };
  }

  async getRecent(roomId: string, limit = 100, before?: Date): Promise<MessageDto[]> {
    const rows = await this.prisma.message.findMany({
      where: { roomId, deletedAt: null, ...(before ? { createdAt: { lt: before } } : {}) },
      include: { sender: { select: { username: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map((r) => this.toDto(r));
  }

  private toDto(
    msg: Message & { sender: { username: string; avatar: string | null } },
  ): MessageDto {
    let content = msg.content;
    if (content && content.startsWith(ENC_PREFIX)) {
      content = decryptText(content.slice(ENC_PREFIX.length), this.secret);
    }
    return {
      id: msg.id,
      roomId: msg.roomId,
      senderId: msg.senderId,
      username: msg.sender.username,
      avatar: msg.sender.avatar,
      content,
      type: msg.type,
      fileUrl: msg.fileUrl,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    };
  }
}
