import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ServerOptions } from 'socket.io';
import { PrismaService } from '../../database/prisma.service';

export class SocketIOAdapter extends IoAdapter {
  private jwtService: JwtService;
  private configService: ConfigService;
  private prismaService: PrismaService;

  constructor(app: INestApplicationContext) {
    super(app);
    this.jwtService = app.get(JwtService);
    this.configService = app.get(ConfigService);
    this.prismaService = app.get(PrismaService);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.configService.get<string>('CORS_ORIGIN') || '*',
        credentials: true,
      },
    });

    // Authentication middleware
    server.use(async (socket, next) => {
      try {
        // Extract token from authorization header
        const token = this.extractToken(socket);

        if (!token) {
          return next(new Error('Authentication error: Token not found'));
        }

        // Verify token
        const payload = await this.jwtService.verifyAsync(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });

        // Get user from database
        const user = await this.prismaService.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
          },
        });

        if (!user) {
          return next(new Error('Authentication error: User not found'));
        }

        // Attach user to socket
        socket.data.user = user;

        // Log connection
        console.log(
          `[WebSocket] User connected: ${user.email} (${socket.id})`,
        );

        next();
      } catch (error) {
        console.error('[WebSocket] Authentication error:', error.message);
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    // Handle disconnections
    server.on('connection', (socket) => {
      socket.on('disconnect', () => {
        const user = socket.data.user;
        if (user) {
          console.log(
            `[WebSocket] User disconnected: ${user.email} (${socket.id})`,
          );
        }
      });

      socket.on('error', (error) => {
        console.error(`[WebSocket] Socket error (${socket.id}):`, error);
      });
    });

    return server;
  }

  private extractToken(socket: any): string | null {
    // Try to extract from authorization header
    const authHeader = socket.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to extract from auth object (Socket.IO client auth)
    const authToken = socket.handshake.auth?.token;
    if (authToken && typeof authToken === 'string') {
      return authToken;
    }

    // Try to extract from query parameter (fallback)
    const queryToken = socket.handshake.query?.token;
    if (queryToken && typeof queryToken === 'string') {
      return queryToken;
    }

    return null;
  }
}
