import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

// Filters
import {
  AllExceptionsFilter,
  PrismaExceptionFilter,
  ValidationExceptionFilter,
} from './filters';

// Interceptors
import { LoggingInterceptor, TimeoutInterceptor } from './interceptors';

// Pipes
import { ValidationPipe } from './pipes';

@Global()
@Module({
  imports: [
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  providers: [
    // Global exception filters
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
    {
      provide: APP_FILTER,
      useClass: ValidationExceptionFilter,
    },
    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TimeoutInterceptor,
    },
    // Global pipes
    {
      provide: APP_PIPE,
      useClass: ValidationPipe,
    },
  ],
  exports: [ThrottlerModule],
})
export class CommonModule {}
