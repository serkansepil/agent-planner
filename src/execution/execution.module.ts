import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../common/prisma/prisma.module';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { CacheService } from './services/cache.service';
import { TokenCounterService } from './services/token-counter.service';
import { CostCalculatorService } from './services/cost-calculator.service';
import { RateLimiterService } from './services/rate-limiter.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ExecutionController],
  providers: [
    ExecutionService,
    OpenAIProvider,
    AnthropicProvider,
    CacheService,
    TokenCounterService,
    CostCalculatorService,
    RateLimiterService,
  ],
  exports: [ExecutionService],
})
export class ExecutionModule {}
