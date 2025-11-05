import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecutionStatisticsDto {
  @ApiProperty({
    description: 'Total number of executions',
    example: 1250,
  })
  totalExecutions: number;

  @ApiProperty({
    description: 'Number of successful executions',
    example: 1180,
  })
  successfulExecutions: number;

  @ApiProperty({
    description: 'Number of failed executions',
    example: 70,
  })
  failedExecutions: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 94.4,
  })
  successRate: number;

  @ApiProperty({
    description: 'Total tokens used',
    example: 1500000,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Total input tokens',
    example: 500000,
  })
  totalInputTokens: number;

  @ApiProperty({
    description: 'Total output tokens',
    example: 1000000,
  })
  totalOutputTokens: number;

  @ApiProperty({
    description: 'Total cost in USD',
    example: 45.5,
  })
  totalCost: number;

  @ApiProperty({
    description: 'Average latency in milliseconds',
    example: 1250,
  })
  averageLatency: number;

  @ApiProperty({
    description: 'Number of cached responses',
    example: 450,
  })
  cachedExecutions: number;

  @ApiProperty({
    description: 'Cache hit rate percentage',
    example: 36.0,
  })
  cacheHitRate: number;

  @ApiProperty({
    description: 'Cost savings from caching in USD',
    example: 12.3,
  })
  cacheSavings: number;

  @ApiPropertyOptional({
    description: 'Usage breakdown by provider',
    example: {
      OpenAI: { executions: 1000, cost: 40.0 },
      Anthropic: { executions: 250, cost: 5.5 },
    },
  })
  byProvider?: Record<string, { executions: number; cost: number }>;

  @ApiPropertyOptional({
    description: 'Usage breakdown by model',
    example: {
      'gpt-4o': { executions: 800, cost: 30.0 },
      'gpt-4-turbo': { executions: 200, cost: 10.0 },
    },
  })
  byModel?: Record<string, { executions: number; cost: number }>;

  @ApiPropertyOptional({
    description: 'Daily usage statistics',
    type: 'array',
  })
  dailyStats?: Array<{
    date: string;
    executions: number;
    cost: number;
  }>;
}

export class FilterExecutionDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'COMPLETED',
  })
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by provider',
    example: 'OPENAI',
  })
  provider?: string;

  @ApiPropertyOptional({
    description: 'Filter by session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by model',
    example: 'gpt-4o',
  })
  model?: string;

  @ApiPropertyOptional({
    description: 'Filter by cached status',
    example: true,
  })
  cached?: boolean;

  @ApiPropertyOptional({
    description: 'Filter executions after this date',
    example: '2024-01-01T00:00:00Z',
  })
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter executions before this date',
    example: '2024-01-31T23:59:59Z',
  })
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
  })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
    default: 20,
  })
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
  })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
