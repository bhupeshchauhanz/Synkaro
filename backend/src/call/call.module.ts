import { Module } from '@nestjs/common';
import { CallController } from './call.controller';
import { CallService } from './call.service';
import { RoomsModule } from '../rooms/rooms.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [RoomsModule, RedisModule],
  controllers: [CallController],
  providers: [CallService],
  exports: [CallService],
})
export class CallModule {}
