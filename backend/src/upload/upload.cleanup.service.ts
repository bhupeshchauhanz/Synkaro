import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';

const FILE_TTL_HOURS = 6;
const CLEANUP_INTERVAL_MS = 30 * 60 * 1000; // every 30 min

/**
 * Scheduled cleanup: deletes uploaded files where the last activity (updatedAt
 * on UploadedFile, or referenced WatchHistory.updatedAt) is older than 6 hours.
 *
 * Runs every 30 minutes. Safe to restart — uses DB as source of truth.
 */
@Injectable()
export class UploadCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UploadCleanupService.name);
  private readonly uploadDir: string;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.uploadDir = config.get<string>('UPLOAD_DIR') ?? path.join(process.cwd(), 'uploads');
  }

  onModuleInit(): void {
    // First run after 1 min to let the app stabilize
    setTimeout(() => void this.runCleanup(), 60_000);
    this.timer = setInterval(() => void this.runCleanup(), CLEANUP_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runCleanup(): Promise<void> {
    const cutoff = new Date(Date.now() - FILE_TTL_HOURS * 60 * 60 * 1000);
    try {
      const stale = await this.prisma.uploadedFile.findMany({
        where: {
          // Only video files expire (room background images are referenced by Room.background)
          mimeType: { startsWith: 'video/' },
          createdAt: { lt: cutoff },
          // No watch-history activity in the last TTL
          NOT: {
            room: {
              watchHistory: {
                some: {
                  fileId: { not: null },
                  updatedAt: { gte: cutoff },
                },
              },
            },
          },
        },
        select: { id: true, filePath: true, fileName: true },
      });

      if (stale.length === 0) return;

      for (const file of stale) {
        try {
          const abs = path.join(this.uploadDir, file.filePath.replace(/^\/uploads\//, ''));
          await fs.unlink(abs).catch(() => undefined);
          await this.prisma.uploadedFile.delete({ where: { id: file.id } });
          this.logger.log(`Deleted stale upload: ${file.fileName} (${file.id})`);
        } catch (err) {
          this.logger.warn(
            `Failed to delete ${file.fileName}: ${(err as Error).message}`,
          );
        }
      }

      this.logger.log(`Cleanup pass: removed ${stale.length} stale upload(s)`);
    } catch (err) {
      this.logger.error(`Cleanup failed: ${(err as Error).message}`);
    }
  }
}
