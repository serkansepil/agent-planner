import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface ThrottleConfig {
  limit: number;
  ttl: number; // Time to live in milliseconds
}

@Injectable()
export class WsThrottleGuard implements CanActivate {
  private readonly requests = new Map<string, number[]>();
  private readonly defaultConfig: ThrottleConfig = {
    limit: 10,
    ttl: 60000, // 1 minute
  };

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>();
    const userId = client.data.userId || client.id;
    const event = context.getHandler().name;

    const config = this.getThrottleConfig(context);
    const key = `${userId}:${event}`;

    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Filter out old requests
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < config.ttl,
    );

    if (validRequests.length >= config.limit) {
      throw new WsException({
        error: 'Too many requests',
        message: `Rate limit exceeded. Maximum ${config.limit} requests per ${config.ttl / 1000} seconds`,
      });
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    // Cleanup old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    return true;
  }

  private getThrottleConfig(context: ExecutionContext): ThrottleConfig {
    const limit = this.reflector.get<number>('throttle_limit', context.getHandler());
    const ttl = this.reflector.get<number>('throttle_ttl', context.getHandler());

    return {
      limit: limit || this.defaultConfig.limit,
      ttl: ttl || this.defaultConfig.ttl,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        (timestamp) => now - timestamp < this.defaultConfig.ttl * 2,
      );
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}
