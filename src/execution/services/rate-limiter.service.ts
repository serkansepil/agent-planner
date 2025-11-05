import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RateLimitConfig {
  enabled: boolean;
  requestsPerMinute?: number;
  requestsPerHour?: number;
  requestsPerDay?: number;
  maxTokensPerRequest?: number;
  maxConcurrentRequests?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis: Redis | null;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      this.redis = new Redis(redisUrl);
      this.logger.log('Rate limiter connected to Redis');
    } else {
      this.redis = null;
      this.logger.warn('Redis URL not configured, rate limiting will use in-memory fallback');
    }
  }

  /**
   * Check if request is allowed based on rate limits
   */
  async checkRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    if (!config.enabled) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(Date.now() + 60000),
      };
    }

    // Check per-minute limit
    if (config.requestsPerMinute) {
      const minuteResult = await this.checkLimit(
        `${key}:minute`,
        config.requestsPerMinute,
        60,
      );
      if (!minuteResult.allowed) {
        return minuteResult;
      }
    }

    // Check per-hour limit
    if (config.requestsPerHour) {
      const hourResult = await this.checkLimit(
        `${key}:hour`,
        config.requestsPerHour,
        3600,
      );
      if (!hourResult.allowed) {
        return hourResult;
      }
    }

    // Check per-day limit
    if (config.requestsPerDay) {
      const dayResult = await this.checkLimit(
        `${key}:day`,
        config.requestsPerDay,
        86400,
      );
      if (!dayResult.allowed) {
        return dayResult;
      }
    }

    return {
      allowed: true,
      remaining: config.requestsPerMinute || Infinity,
      resetAt: new Date(Date.now() + 60000),
    };
  }

  /**
   * Check concurrent request limit
   */
  async checkConcurrentLimit(
    key: string,
    maxConcurrent: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      // In-memory fallback - always allow
      return {
        allowed: true,
        remaining: maxConcurrent,
        resetAt: new Date(),
      };
    }

    const concurrentKey = `${key}:concurrent`;
    const current = await this.redis.get(concurrentKey);
    const currentCount = current ? parseInt(current, 10) : 0;

    if (currentCount >= maxConcurrent) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        reason: `Maximum ${maxConcurrent} concurrent requests exceeded`,
      };
    }

    return {
      allowed: true,
      remaining: maxConcurrent - currentCount - 1,
      resetAt: new Date(),
    };
  }

  /**
   * Increment concurrent request counter
   */
  async incrementConcurrent(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const concurrentKey = `${key}:concurrent`;
    await this.redis.incr(concurrentKey);
    await this.redis.expire(concurrentKey, 300); // 5 minute expiry
  }

  /**
   * Decrement concurrent request counter
   */
  async decrementConcurrent(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    const concurrentKey = `${key}:concurrent`;
    const current = await this.redis.get(concurrentKey);

    if (current && parseInt(current, 10) > 0) {
      await this.redis.decr(concurrentKey);
    }
  }

  /**
   * Check token limit for a request
   */
  async checkTokenLimit(
    tokens: number,
    maxTokens?: number,
  ): Promise<RateLimitResult> {
    if (!maxTokens) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: new Date(),
      };
    }

    if (tokens > maxTokens) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(),
        reason: `Request tokens (${tokens}) exceed maximum allowed (${maxTokens})`,
      };
    }

    return {
      allowed: true,
      remaining: maxTokens - tokens,
      resetAt: new Date(),
    };
  }

  /**
   * Check rate limit for agent execution
   */
  async checkAgentRateLimit(
    agentId: string,
    userId: string,
    agentConfig: RateLimitConfig,
    userConfig?: RateLimitConfig,
  ): Promise<void> {
    // Check agent-level rate limits
    if (agentConfig.enabled) {
      const agentKey = `ratelimit:agent:${agentId}`;
      const agentResult = await this.checkRateLimit(agentKey, agentConfig);

      if (!agentResult.allowed) {
        throw new HttpException(
          agentResult.reason ||
            `Agent rate limit exceeded. Try again at ${agentResult.resetAt.toISOString()}`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check concurrent requests for agent
      if (agentConfig.maxConcurrentRequests) {
        const concurrentResult = await this.checkConcurrentLimit(
          agentKey,
          agentConfig.maxConcurrentRequests,
        );

        if (!concurrentResult.allowed) {
          throw new HttpException(
            concurrentResult.reason || 'Agent concurrent request limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    // Check user-level rate limits
    if (userConfig?.enabled) {
      const userKey = `ratelimit:user:${userId}`;
      const userResult = await this.checkRateLimit(userKey, userConfig);

      if (!userResult.allowed) {
        throw new HttpException(
          userResult.reason ||
            `User rate limit exceeded. Try again at ${userResult.resetAt.toISOString()}`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Check concurrent requests for user
      if (userConfig.maxConcurrentRequests) {
        const concurrentResult = await this.checkConcurrentLimit(
          userKey,
          userConfig.maxConcurrentRequests,
        );

        if (!concurrentResult.allowed) {
          throw new HttpException(
            concurrentResult.reason || 'User concurrent request limit exceeded',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }
  }

  /**
   * Record execution start (for concurrent tracking)
   */
  async recordExecutionStart(agentId: string, userId: string): Promise<void> {
    await this.incrementConcurrent(`ratelimit:agent:${agentId}`);
    await this.incrementConcurrent(`ratelimit:user:${userId}`);
  }

  /**
   * Record execution end (for concurrent tracking)
   */
  async recordExecutionEnd(agentId: string, userId: string): Promise<void> {
    await this.decrementConcurrent(`ratelimit:agent:${agentId}`);
    await this.decrementConcurrent(`ratelimit:user:${userId}`);
  }

  /**
   * Check limit using sliding window algorithm
   */
  private async checkLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    if (!this.redis) {
      // In-memory fallback - always allow
      return {
        allowed: true,
        remaining: limit,
        resetAt: new Date(Date.now() + windowSeconds * 1000),
      };
    }

    const now = Date.now();
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count requests in window
    const count = await this.redis.zcard(key);

    if (count >= limit) {
      // Get oldest entry to calculate reset time
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const resetAt = oldest[1]
        ? new Date(parseInt(oldest[1]) + windowSeconds * 1000)
        : new Date(now + windowSeconds * 1000);

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        reason: `Rate limit of ${limit} requests per ${windowSeconds}s exceeded`,
      };
    }

    // Add current request
    await this.redis.zadd(key, now, `${now}-${Math.random()}`);
    await this.redis.expire(key, windowSeconds);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: new Date(now + windowSeconds * 1000),
    };
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    minute?: { used: number; limit: number; remaining: number };
    hour?: { used: number; limit: number; remaining: number };
    day?: { used: number; limit: number; remaining: number };
  }> {
    const status: any = {};

    if (config.requestsPerMinute) {
      const count = await this.getRequestCount(`${key}:minute`);
      status.minute = {
        used: count,
        limit: config.requestsPerMinute,
        remaining: Math.max(0, config.requestsPerMinute - count),
      };
    }

    if (config.requestsPerHour) {
      const count = await this.getRequestCount(`${key}:hour`);
      status.hour = {
        used: count,
        limit: config.requestsPerHour,
        remaining: Math.max(0, config.requestsPerHour - count),
      };
    }

    if (config.requestsPerDay) {
      const count = await this.getRequestCount(`${key}:day`);
      status.day = {
        used: count,
        limit: config.requestsPerDay,
        remaining: Math.max(0, config.requestsPerDay - count),
      };
    }

    return status;
  }

  /**
   * Get request count for a key
   */
  private async getRequestCount(key: string): Promise<number> {
    if (!this.redis) {
      return 0;
    }

    return await this.redis.zcard(key);
  }

  /**
   * Reset rate limit for a key
   */
  async resetRateLimit(key: string): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.del(
      `${key}:minute`,
      `${key}:hour`,
      `${key}:day`,
      `${key}:concurrent`,
    );

    this.logger.log(`Rate limit reset for key: ${key}`);
  }
}
