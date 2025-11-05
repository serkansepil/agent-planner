import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto, EditMessageDto, MessageReactionDto } from './dto';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('messages')
  @ApiOperation({ summary: 'Send a new message' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(@Body() dto: SendMessageDto, @Request() req) {
    return this.chatService.createMessage({
      ...dto,
      userId: req.user.id,
    });
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: 'Get message history for a session' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiQuery({ name: 'parentMessageId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Message history retrieved' })
  async getMessageHistory(
    @Param('sessionId') sessionId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('parentMessageId') parentMessageId?: string,
    @Request() req?,
  ) {
    return this.chatService.getMessageHistory(req.user.id, sessionId, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      parentMessageId,
    });
  }

  @Get('messages/:messageId')
  @ApiOperation({ summary: 'Get a specific message' })
  @ApiResponse({ status: 200, description: 'Message retrieved' })
  async getMessage(@Param('messageId') messageId: string) {
    return this.chatService.getMessageById(messageId);
  }

  @Put('messages/:messageId')
  @ApiOperation({ summary: 'Edit a message' })
  @ApiResponse({ status: 200, description: 'Message edited successfully' })
  async editMessage(
    @Param('messageId') messageId: string,
    @Body() dto: EditMessageDto,
    @Request() req,
  ) {
    return this.chatService.editMessage(messageId, dto.content, req.user.id);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: 200, description: 'Message deleted successfully' })
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    return this.chatService.deleteMessage(messageId, req.user.id);
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Toggle a reaction on a message' })
  @ApiResponse({ status: 200, description: 'Reaction toggled' })
  async toggleReaction(
    @Param('messageId') messageId: string,
    @Body() dto: MessageReactionDto,
    @Request() req,
  ) {
    return this.chatService.toggleReaction(messageId, req.user.id, dto.emoji);
  }

  @Get('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Get reactions for a message' })
  @ApiResponse({ status: 200, description: 'Reactions retrieved' })
  async getReactions(@Param('messageId') messageId: string) {
    return this.chatService.getMessageReactions(messageId);
  }

  @Get('messages/:messageId/thread')
  @ApiOperation({ summary: 'Get thread messages (replies)' })
  @ApiResponse({ status: 200, description: 'Thread messages retrieved' })
  async getThreadMessages(
    @Param('messageId') messageId: string,
    @Request() req,
  ) {
    return this.chatService.getThreadMessages(messageId, req.user.id);
  }

  @Get('sessions/:sessionId/search')
  @ApiOperation({ summary: 'Search messages in a session' })
  @ApiQuery({ name: 'query', required: true, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Search results retrieved' })
  async searchMessages(
    @Param('sessionId') sessionId: string,
    @Query('query') query: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?,
  ) {
    return this.chatService.searchMessages(req.user.id, sessionId, query, {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get('sessions/:sessionId/presence')
  @ApiOperation({ summary: 'Get presence information for a session' })
  @ApiResponse({ status: 200, description: 'Presence information retrieved' })
  async getPresence(@Param('sessionId') sessionId: string) {
    return this.chatService.getPresence(sessionId);
  }

  @Post('messages/:messageId/attachments')
  @ApiOperation({ summary: 'Add an attachment to a message' })
  @ApiResponse({ status: 201, description: 'Attachment added' })
  async addAttachment(
    @Param('messageId') messageId: string,
    @Body() attachment: {
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
      metadata?: Record<string, any>;
    },
  ) {
    return this.chatService.addAttachment(messageId, attachment);
  }

  @Get('messages/:messageId/attachments')
  @ApiOperation({ summary: 'Get attachments for a message' })
  @ApiResponse({ status: 200, description: 'Attachments retrieved' })
  async getAttachments(@Param('messageId') messageId: string) {
    return this.chatService.getAttachments(messageId);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: 'Delete an attachment' })
  @ApiResponse({ status: 200, description: 'Attachment deleted' })
  async deleteAttachment(
    @Param('attachmentId') attachmentId: string,
    @Request() req,
  ) {
    return this.chatService.deleteAttachment(attachmentId, req.user.id);
  }

  @Get('streams/:streamId/status')
  @ApiOperation({ summary: 'Get stream status' })
  @ApiResponse({ status: 200, description: 'Stream status retrieved' })
  async getStreamStatus(@Param('streamId') streamId: string) {
    return this.chatService.getStreamStatus(streamId);
  }

  @Get('streams/:streamId/metrics')
  @ApiOperation({ summary: 'Get stream metrics' })
  @ApiResponse({ status: 200, description: 'Stream metrics retrieved' })
  async getStreamMetrics(@Param('streamId') streamId: string) {
    return this.chatService.getStreamMetrics(streamId);
  }
}
