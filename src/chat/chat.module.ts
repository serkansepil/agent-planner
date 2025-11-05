import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { PrismaModule } from '../database/prisma.module';
import { WsThrottleGuard } from './guards/ws-throttle.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, WsThrottleGuard],
  exports: [ChatService],
})
export class ChatModule {}
