import { Module } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { RoomsController } from './rooms.controller';
import { RoomMemberGuard } from './guards/room-member.guard';

@Module({
  providers: [RoomsService, RoomMemberGuard],
  controllers: [RoomsController],
  exports: [RoomsService, RoomMemberGuard],
})
export class RoomsModule {}
