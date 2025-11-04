import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(user.id, createMessageDto);
  }

  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('sessionId') sessionId: string,
  ) {
    return this.messagesService.findAllBySession(sessionId, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.findOne(id, user.id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.messagesService.remove(id, user.id);
  }
}
