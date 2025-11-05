import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma } from '@prisma/client';
import * as Filter from 'bad-words';
import { IMessage, IStreamChunk, IStreamConfig, IStreamStatus, IStreamMetrics, MessageRole } from './interfaces';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly profanityFilter = new (Filter as any)();
  private readonly activeStreams = new Map<string, any>();
  private readonly streamMetrics = new Map<string, IStreamMetrics>();
  private readonly presenceCache = new Map<string, any>();

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Message CRUD Operations ====================

  async createMessage(data: {
    sessionId: string;
    userId: string;
    content: string;
    agentId?: string;
    parentMessageId?: string;
    attachments?: any[];
    metadata?: Record<string, any>;
  }): Promise<IMessage> {
    try {
      // Validate session exists and user has access
      const session = await this.prisma.session.findUnique({
        where: { id: data.sessionId },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      if (session.userId !== data.userId) {
        throw new ForbiddenException('Access denied to session');
      }

      // Process content through profanity filter
      const filteredContent = this.filterProfanity(data.content);

      // Determine message role
      const role: MessageRole = data.agentId ? MessageRole.ASSISTANT : MessageRole.USER;

      // Create message
      const message = await this.prisma.message.create({
        data: {
          sessionId: data.sessionId,
          agentId: data.agentId,
          content: filteredContent,
          role,
          parentMessageId: data.parentMessageId,
          metadata: data.metadata || {},
          attachments: data.attachments
            ? {
                create: data.attachments.map((att) => ({
                  fileName: att.fileName,
                  fileUrl: att.fileUrl,
                  mimeType: att.mimeType,
                  fileSize: att.fileSize,
                  metadata: att.metadata || {},
                })),
              }
            : undefined,
        },
        include: {
          attachments: true,
          reactions: true,
          replies: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      this.logger.log(`Message created: ${message.id}`);
      return message as IMessage;
    } catch (error) {
      this.logger.error(`Error creating message: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getMessageById(messageId: string): Promise<IMessage> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        attachments: true,
        reactions: true,
        replies: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message as IMessage;
  }

  async getMessageHistory(
    sessionId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      parentMessageId?: string;
    } = {},
  ): Promise<{ messages: IMessage[]; total: number }> {
    const { limit = 50, offset = 0, parentMessageId } = options;

    // Validate access
    await this.validateSessionAccess(userId, sessionId);

    const where: any = {
      sessionId,
      isDeleted: false,
      parentMessageId: parentMessageId || null,
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          attachments: true,
          reactions: true,
          replies: {
            take: 5,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { messages: messages as IMessage[], total };
  }

  async editMessage(
    messageId: string,
    content: string,
    userId: string,
  ): Promise<IMessage> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify ownership (only user messages can be edited by users)
    if (message.session.userId !== userId || message.role !== MessageRole.USER) {
      throw new ForbiddenException('Cannot edit this message');
    }

    const filteredContent = this.filterProfanity(content);

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: filteredContent,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        attachments: true,
        reactions: true,
        replies: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    this.logger.log(`Message edited: ${messageId}`);
    return updatedMessage as IMessage;
  }

  async deleteMessage(messageId: string, userId: string): Promise<IMessage> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { session: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify ownership
    if (message.session.userId !== userId) {
      throw new ForbiddenException('Cannot delete this message');
    }

    const deletedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        content: '[Deleted]',
      },
      include: {
        attachments: true,
        reactions: true,
      },
    });

    this.logger.log(`Message deleted: ${messageId}`);
    return deletedMessage as IMessage;
  }

  // ==================== Reactions ====================

  async toggleReaction(
    messageId: string,
    userId: string,
    emoji: string,
  ): Promise<any> {
    const existing = await this.prisma.messageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      // Remove reaction
      await this.prisma.messageReaction.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', emoji };
    } else {
      // Add reaction
      const reaction = await this.prisma.messageReaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });
      return { action: 'added', reaction };
    }
  }

  async getMessageReactions(messageId: string): Promise<any[]> {
    return this.prisma.messageReaction.findMany({
      where: { messageId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==================== Threading ====================

  async getThreadMessages(
    parentMessageId: string,
    userId: string,
  ): Promise<IMessage[]> {
    const parentMessage = await this.prisma.message.findUnique({
      where: { id: parentMessageId },
      include: { session: true },
    });

    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }

    // Validate access
    await this.validateSessionAccess(userId, parentMessage.sessionId);

    const replies = await this.prisma.message.findMany({
      where: {
        parentMessageId,
        isDeleted: false,
      },
      include: {
        attachments: true,
        reactions: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return replies as IMessage[];
  }

  // ==================== Search ====================

  async searchMessages(
    sessionId: string,
    userId: string,
    query: string,
    options: {
      limit?: number;
      offset?: number;
    } = {},
  ): Promise<{ messages: IMessage[]; total: number }> {
    const { limit = 20, offset = 0 } = options;

    // Validate access
    await this.validateSessionAccess(userId, sessionId);

    const where: any = {
      sessionId,
      isDeleted: false,
      content: {
        contains: query,
        mode: 'insensitive',
      },
    };

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: {
          attachments: true,
          reactions: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.message.count({ where }),
    ]);

    return { messages: messages as IMessage[], total };
  }

  // ==================== Presence & Seen ====================

  async updatePresence(
    userId: string,
    sessionId: string,
    status: 'online' | 'offline' | 'away',
  ): Promise<void> {
    const key = `${userId}:${sessionId}`;
    this.presenceCache.set(key, {
      userId,
      sessionId,
      status,
      lastSeen: new Date(),
    });
  }

  async getPresence(sessionId: string): Promise<any[]> {
    const presence: any[] = [];
    for (const [key, value] of this.presenceCache.entries()) {
      if (value.sessionId === sessionId) {
        presence.push(value);
      }
    }
    return presence;
  }

  async markMessageAsSeen(messageId: string, userId: string): Promise<void> {
    // In a production app, you'd store this in the database
    // For now, we'll just log it
    this.logger.debug(`Message ${messageId} seen by user ${userId}`);
  }

  // ==================== Access Control ====================

  async validateSessionAccess(userId: string, sessionId: string): Promise<boolean> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('Access denied to session');
    }

    return true;
  }

  // ==================== Streaming ====================

  async startStream(
    sessionId: string,
    prompt: string,
    userId: string,
    agentId?: string,
    config?: IStreamConfig,
    onChunk?: (chunk: IStreamChunk) => void,
    onError?: (error: any) => void,
    onComplete?: () => void,
  ): Promise<string> {
    const streamId = uuidv4();

    try {
      // Validate access
      await this.validateSessionAccess(userId, sessionId);

      // Create initial message
      const message = await this.createMessage({
        sessionId,
        userId,
        content: prompt,
        metadata: { streamId },
      });

      // Initialize stream status
      const streamStatus: IStreamStatus = {
        streamId,
        sessionId,
        status: 'active',
        progress: 0,
        tokensGenerated: 0,
        startedAt: new Date(),
      };

      this.activeStreams.set(streamId, { status: streamStatus, abortController: new AbortController() });

      // Initialize metrics
      const metrics: IStreamMetrics = {
        streamId,
        totalTokens: 0,
        tokensPerSecond: 0,
        latency: 0,
        bandwidth: 0,
        errors: 0,
      };
      this.streamMetrics.set(streamId, metrics);

      // Start streaming (simulated for now - integrate with actual LLM)
      this.simulateStream(
        streamId,
        sessionId,
        message.id,
        prompt,
        config,
        onChunk,
        onError,
        onComplete,
      );

      return streamId;
    } catch (error) {
      this.logger.error(`Error starting stream: ${error.message}`, error.stack);
      if (onError) {
        onError({ streamId, message: error.message });
      }
      throw error;
    }
  }

  async stopStream(streamId: string): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (stream) {
      stream.abortController.abort();
      stream.status.status = 'completed';
      stream.status.completedAt = new Date();
      this.activeStreams.delete(streamId);
      this.logger.log(`Stream stopped: ${streamId}`);
    }
  }

  private async simulateStream(
    streamId: string,
    sessionId: string,
    messageId: string,
    prompt: string,
    config: IStreamConfig = {},
    onChunk?: (chunk: IStreamChunk) => void,
    onError?: (error: any) => void,
    onComplete?: () => void,
  ): Promise<void> {
    const stream = this.activeStreams.get(streamId);
    if (!stream) return;

    const startTime = Date.now();
    let accumulatedContent = '';
    let tokensGenerated = 0;

    // Simulated response (in production, integrate with OpenAI, Anthropic, etc.)
    const simulatedResponse = `This is a simulated streaming response to: "${prompt}". ` +
      'In a production environment, this would be replaced with actual LLM integration. ' +
      'The streaming would come from services like OpenAI GPT-4, Anthropic Claude, or other LLMs. ' +
      'Each token would be streamed in real-time, providing a smooth user experience.';

    const words = simulatedResponse.split(' ');
    const delay = config.streamDelay || 50; // ms between words

    try {
      for (let i = 0; i < words.length; i++) {
        // Check if stream was aborted
        if (stream.abortController.signal.aborted) {
          this.logger.log(`Stream aborted: ${streamId}`);
          return;
        }

        const word = words[i] + ' ';
        accumulatedContent += word;
        tokensGenerated++;

        const chunk: IStreamChunk = {
          id: uuidv4(),
          sessionId,
          messageId,
          content: accumulatedContent,
          delta: word,
          tokens: tokensGenerated,
          isComplete: i === words.length - 1,
          metadata: {
            streamId,
            progress: ((i + 1) / words.length) * 100,
          },
        };

        // Update metrics
        const metrics = this.streamMetrics.get(streamId);
        if (metrics) {
          metrics.totalTokens = tokensGenerated;
          metrics.latency = Date.now() - startTime;
          metrics.tokensPerSecond = tokensGenerated / (metrics.latency / 1000);
        }

        // Send chunk
        if (onChunk) {
          onChunk(chunk);
        }

        // Update stream status
        stream.status.progress = ((i + 1) / words.length) * 100;
        stream.status.tokensGenerated = tokensGenerated;

        // Delay before next chunk
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Mark stream as complete
      stream.status.status = 'completed';
      stream.status.completedAt = new Date();

      // Save assistant message
      await this.prisma.message.create({
        data: {
          sessionId,
          content: accumulatedContent.trim(),
          role: MessageRole.ASSISTANT,
          tokens: tokensGenerated,
          metadata: { streamId },
        },
      });

      if (onComplete) {
        onComplete();
      }

      this.activeStreams.delete(streamId);
      this.logger.log(`Stream completed: ${streamId}`);
    } catch (error) {
      this.logger.error(`Stream error: ${error.message}`, error.stack);
      stream.status.status = 'error';
      stream.status.error = error.message;

      const metrics = this.streamMetrics.get(streamId);
      if (metrics) {
        metrics.errors++;
      }

      if (onError) {
        onError({ streamId, message: error.message });
      }

      this.activeStreams.delete(streamId);
    }
  }

  async getStreamStatus(streamId: string): Promise<IStreamStatus | null> {
    const stream = this.activeStreams.get(streamId);
    return stream ? stream.status : null;
  }

  async getStreamMetrics(streamId: string): Promise<IStreamMetrics | null> {
    return this.streamMetrics.get(streamId) || null;
  }

  // ==================== Utilities ====================

  private filterProfanity(content: string): string {
    try {
      return this.profanityFilter.clean(content);
    } catch (error) {
      this.logger.warn(`Error filtering profanity: ${error.message}`);
      return content;
    }
  }

  // ==================== File Attachments ====================

  async addAttachment(
    messageId: string,
    attachment: {
      fileName: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
      metadata?: Record<string, any>;
    },
  ): Promise<any> {
    return this.prisma.messageAttachment.create({
      data: {
        messageId,
        ...attachment,
      },
    });
  }

  async getAttachments(messageId: string): Promise<any[]> {
    return this.prisma.messageAttachment.findMany({
      where: { messageId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async deleteAttachment(attachmentId: string, userId: string): Promise<void> {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          include: { session: true },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    if (attachment.message.session.userId !== userId) {
      throw new ForbiddenException('Cannot delete this attachment');
    }

    await this.prisma.messageAttachment.delete({
      where: { id: attachmentId },
    });

    this.logger.log(`Attachment deleted: ${attachmentId}`);
  }
}
