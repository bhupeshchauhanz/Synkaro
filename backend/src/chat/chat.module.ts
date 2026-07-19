import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { WsAuthService } from './ws-auth.service';
import { AuthModule } from '../auth/auth.module';
import { RoomsModule } from '../rooms/rooms.module';
import { CallModule } from '../call/call.module';

@Module({
  imports: [AuthModule, RoomsModule, CallModule],
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, WsAuthService],
  exports: [ChatService, ChatGateway, WsAuthService],
})
export class ChatModule {}
