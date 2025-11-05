import { IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RateLimitConfigDto {
  @ApiPropertyOptional({
    description: 'Enable rate limiting for this agent',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean = false;

  @ApiPropertyOptional({
    description: 'Maximum requests per minute',
    minimum: 1,
    example: 60,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  requestsPerMinute?: number;

  @ApiPropertyOptional({
    description: 'Maximum requests per hour',
    minimum: 1,
    example: 1000,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  requestsPerHour?: number;

  @ApiPropertyOptional({
    description: 'Maximum requests per day',
    minimum: 1,
    example: 10000,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  requestsPerDay?: number;

  @ApiPropertyOptional({
    description: 'Maximum tokens per request',
    minimum: 1,
    example: 4000,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxTokensPerRequest?: number;

  @ApiPropertyOptional({
    description: 'Maximum concurrent requests',
    minimum: 1,
    example: 5,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxConcurrentRequests?: number;
}
