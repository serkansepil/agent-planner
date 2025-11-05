import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  SendMessageDto,
  EditMessageDto,
  MessageReactionDto,
  TypingIndicatorDto,
  MessageSeenDto,
  JoinSessionDto,
  StreamRequestDto,
} from './dto';
import { WsThrottleGuard } from './guards/ws-throttle.guard';
import { WsThrottle } from './decorators/ws-throttle.decorator';

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
  namespace: '/chat',
})
@UseGuards(WsThrottleGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly typingTimeouts = new Map<string, NodeJS.Timeout>();
  private readonly userSessions = new Map<string, Set<string>>(); // userId -> Set of sessionIds
  private readonly messageQueue = new Map<string, any[]>(); // socketId -> queued messages

  constructor(private readonly chatService: ChatService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);

    // Extract user information from handshake
    const userId = client.handshake.auth.userId || client.handshake.query.userId;
    const token = client.handshake.auth.token || client.handshake.query.token;

    if (!userId) {
      this.logger.warn(`Client ${client.id} connected without userId`);
      client.disconnect();
      return;
    }

    // Store user data
    client.data.userId = userId;
    client.data.token = token;
    client.data.connectedAt = new Date();

    // Handle reconnection - send queued messages
    const queuedMessages = this.messageQueue.get(client.id);
    if (queuedMessages && queuedMessages.length > 0) {
      this.logger.log(`Sending ${queuedMessages.length} queued messages to ${client.id}`);
      queuedMessages.forEach((message) => {
        client.emit(message.event, message.data);
      });
      this.messageQueue.delete(client.id);
    }

    // Notify user is online
    client.emit('connection:success', {
      message: 'Connected to chat gateway',
      timestamp: new Date(),
    });
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    this.logger.log(`Client disconnected: ${client.id} (User: ${userId})`);

    // Clear typing indicators
    const typingKey = `${userId}:*`;
    for (const [key, timeout] of this.typingTimeouts.entries()) {
      if (key.startsWith(`${userId}:`)) {
        clearTimeout(timeout);
        this.typingTimeouts.delete(key);
      }
    }

    // Update presence status
    if (userId) {
      const sessions = this.userSessions.get(userId);
      if (sessions) {
        sessions.forEach((sessionId) => {
          this.chatService.updatePresence(userId, sessionId, 'offline');
          this.server.to(sessionId).emit('presence:update', {
            userId,
            sessionId,
            status: 'offline',
            lastSeen: new Date(),
          });
        });
        this.userSessions.delete(userId);
      }
    }
  }

  @SubscribeMessage('session:join')
  @WsThrottle(5, 60000) // 5 requests per minute
  async handleJoinSession(
    @MessageBody() data: JoinSessionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { sessionId } = data;

    try {
      // Validate session access
      const hasAccess = await this.chatService.validateSessionAccess(userId, sessionId);
      if (!hasAccess) {
        client.emit('error', {
          event: 'session:join',
          message: 'Access denied to session',
        });
        return;
      }

      // Join Socket.io room
      await client.join(sessionId);

      // Track user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(sessionId);

      // Update presence
      await this.chatService.updatePresence(userId, sessionId, 'online');

      // Notify room
      this.server.to(sessionId).emit('user:joined', {
        userId,
        sessionId,
        timestamp: new Date(),
      });

      // Send confirmation to client
      client.emit('session:joined', {
        sessionId,
        timestamp: new Date(),
      });

      this.logger.log(`User ${userId} joined session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error joining session: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'session:join',
        message: 'Failed to join session',
      });
    }
  }

  @SubscribeMessage('session:leave')
  @WsThrottle(10, 60000)
  async handleLeaveSession(
    @MessageBody() data: JoinSessionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const { sessionId } = data;

    try {
      // Leave Socket.io room
      await client.leave(sessionId);

      // Update tracking
      const sessions = this.userSessions.get(userId);
      if (sessions) {
        sessions.delete(sessionId);
      }

      // Update presence
      await this.chatService.updatePresence(userId, sessionId, 'offline');

      // Notify room
      this.server.to(sessionId).emit('user:left', {
        userId,
        sessionId,
        timestamp: new Date(),
      });

      client.emit('session:left', {
        sessionId,
        timestamp: new Date(),
      });

      this.logger.log(`User ${userId} left session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Error leaving session: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('message:send')
  @WsThrottle(30, 60000) // 30 messages per minute
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    try {
      // Process and save message
      const message = await this.chatService.createMessage({
        ...data,
        userId,
      });

      // Broadcast to session room
      this.server.to(data.sessionId).emit('message:new', message);

      // Send delivery confirmation
      client.emit('message:delivered', {
        messageId: message.id,
        timestamp: new Date(),
      });

      this.logger.log(`Message sent by user ${userId} in session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'message:send',
        message: 'Failed to send message',
      });
    }
  }

  @SubscribeMessage('message:edit')
  @WsThrottle(20, 60000)
  async handleEditMessage(
    @MessageBody() data: EditMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    try {
      const message = await this.chatService.editMessage(
        data.messageId,
        data.content,
        userId,
      );

      // Broadcast to session room
      this.server.to(message.sessionId).emit('message:edited', message);

      this.logger.log(`Message ${data.messageId} edited by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error editing message: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'message:edit',
        message: 'Failed to edit message',
      });
    }
  }

  @SubscribeMessage('message:delete')
  @WsThrottle(20, 60000)
  async handleDeleteMessage(
    @MessageBody() data: { messageId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    try {
      const message = await this.chatService.deleteMessage(data.messageId, userId);

      // Broadcast to session room
      this.server.to(message.sessionId).emit('message:deleted', {
        messageId: data.messageId,
        sessionId: message.sessionId,
        timestamp: new Date(),
      });

      this.logger.log(`Message ${data.messageId} deleted by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'message:delete',
        message: 'Failed to delete message',
      });
    }
  }

  @SubscribeMessage('message:reaction')
  @WsThrottle(50, 60000)
  async handleMessageReaction(
    @MessageBody() data: MessageReactionDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    try {
      const reaction = await this.chatService.toggleReaction(
        data.messageId,
        userId,
        data.emoji,
      );

      // Get message to find session
      const message = await this.chatService.getMessageById(data.messageId);

      // Broadcast to session room
      this.server.to(message.sessionId).emit('message:reaction:update', {
        messageId: data.messageId,
        reaction,
        timestamp: new Date(),
      });

      this.logger.log(`Reaction on message ${data.messageId} by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error handling reaction: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'message:reaction',
        message: 'Failed to add reaction',
      });
    }
  }

  @SubscribeMessage('message:seen')
  @WsThrottle(100, 60000)
  async handleMessageSeen(
    @MessageBody() data: MessageSeenDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    try {
      await this.chatService.markMessageAsSeen(data.messageId, userId);

      // Broadcast to session room
      this.server.to(data.sessionId).emit('message:seen:update', {
        messageId: data.messageId,
        userId,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error marking message as seen: ${error.message}`, error.stack);
    }
  }

  @SubscribeMessage('typing:start')
  @WsThrottle(100, 60000)
  async handleTypingStart(
    @MessageBody() data: { sessionId: string; userName: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const typingKey = `${userId}:${data.sessionId}`;

    // Clear existing timeout
    const existingTimeout = this.typingTimeouts.get(typingKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Broadcast typing indicator
    client.to(data.sessionId).emit('typing:start', {
      userId,
      userName: data.userName,
      sessionId: data.sessionId,
      timestamp: new Date(),
    });

    // Auto-stop typing after 3 seconds
    const timeout = setTimeout(() => {
      this.handleTypingStop(data, client);
    }, 3000);

    this.typingTimeouts.set(typingKey, timeout);
  }

  @SubscribeMessage('typing:stop')
  @WsThrottle(100, 60000)
  async handleTypingStop(
    @MessageBody() data: { sessionId: string; userName?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const typingKey = `${userId}:${data.sessionId}`;

    // Clear timeout
    const timeout = this.typingTimeouts.get(typingKey);
    if (timeout) {
      clearTimeout(timeout);
      this.typingTimeouts.delete(typingKey);
    }

    // Broadcast typing stopped
    client.to(data.sessionId).emit('typing:stop', {
      userId,
      sessionId: data.sessionId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('stream:request')
  @WsThrottle(10, 60000)
  async handleStreamRequest(
    @MessageBody() data: StreamRequestDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;

    try {
      // Start streaming
      await this.chatService.startStream(
        data.sessionId,
        data.prompt,
        userId,
        data.agentId,
        data.config,
        (chunk) => {
          // Send chunk to client
          client.emit('stream:chunk', chunk);

          // Optionally broadcast to session room
          // this.server.to(data.sessionId).emit('stream:chunk', chunk);
        },
        (error) => {
          // Stream error
          client.emit('stream:error', {
            streamId: error.streamId,
            error: error.message,
            timestamp: new Date(),
          });
        },
        () => {
          // Stream complete
          client.emit('stream:complete', {
            sessionId: data.sessionId,
            timestamp: new Date(),
          });
        },
      );

      this.logger.log(`Stream started for user ${userId} in session ${data.sessionId}`);
    } catch (error) {
      this.logger.error(`Error starting stream: ${error.message}`, error.stack);
      client.emit('error', {
        event: 'stream:request',
        message: 'Failed to start stream',
      });
    }
  }

  @SubscribeMessage('stream:stop')
  @WsThrottle(20, 60000)
  async handleStreamStop(
    @MessageBody() data: { streamId: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this.chatService.stopStream(data.streamId);

      client.emit('stream:stopped', {
        streamId: data.streamId,
        timestamp: new Date(),
      });

      this.logger.log(`Stream ${data.streamId} stopped`);
    } catch (error) {
      this.logger.error(`Error stopping stream: ${error.message}`, error.stack);
    }
  }

  // Helper method to queue messages for offline users
  private queueMessage(socketId: string, event: string, data: any) {
    if (!this.messageQueue.has(socketId)) {
      this.messageQueue.set(socketId, []);
    }
    this.messageQueue.get(socketId)!.push({ event, data });

    // Limit queue size to prevent memory issues
    const queue = this.messageQueue.get(socketId);
    if (queue && queue.length > 100) {
      queue.shift(); // Remove oldest message
    }
  }

  // Broadcast message to session with queue support
  async broadcastToSession(sessionId: string, event: string, data: any) {
    const room = this.server.in(sessionId);
    const sockets = await room.fetchSockets();

    sockets.forEach((socket) => {
      // RemoteSocket doesn't have connected property, assume connected if in room
      socket.emit(event, data);
    });
  }
}
