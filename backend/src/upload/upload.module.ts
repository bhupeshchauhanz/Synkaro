import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UploadCleanupService } from './upload.cleanup.service';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  controllers: [UploadController],
  providers: [UploadService, UploadCleanupService],
  exports: [UploadService],
})
export class UploadModule {}
