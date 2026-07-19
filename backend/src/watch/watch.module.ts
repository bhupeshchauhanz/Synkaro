import { Module } from '@nestjs/common';
import { WatchController } from './watch.controller';
import { WatchService } from './watch.service';

import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  controllers: [WatchController],
  providers: [WatchService],
  exports: [WatchService],
})
export class WatchModule {}
