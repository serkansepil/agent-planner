import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExecutionStatus, ExecutionProvider } from '@prisma/client';

export class ExecutionResponseDto {
  @ApiProperty({
    description: 'Execution ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Agent ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  agentId: string;

  @ApiProperty({
    description: 'User ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  userId: string;

  @ApiPropertyOptional({
    description: 'Session ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  sessionId?: string;

  @ApiProperty({
    description: 'Execution status',
    enum: ExecutionStatus,
    example: ExecutionStatus.COMPLETED,
  })
  status: ExecutionStatus;

  @ApiProperty({
    description: 'AI provider used',
    enum: ExecutionProvider,
    example: ExecutionProvider.OPENAI,
  })
  provider: ExecutionProvider;

  @ApiProperty({
    description: 'Model used for execution',
    example: 'gpt-4o',
  })
  model: string;

  @ApiProperty({
    description: 'Input prompt',
    example: 'Analyze the customer feedback',
  })
  prompt: string;

  @ApiPropertyOptional({
    description: 'Execution context',
  })
  context?: any;

  @ApiPropertyOptional({
    description: 'Agent response',
    example: 'Based on the feedback analysis...',
  })
  response?: string;

  @ApiPropertyOptional({
    description: 'Input tokens used',
    example: 150,
  })
  inputTokens?: number;

  @ApiPropertyOptional({
    description: 'Output tokens generated',
    example: 450,
  })
  outputTokens?: number;

  @ApiPropertyOptional({
    description: 'Total tokens used',
    example: 600,
  })
  totalTokens?: number;

  @ApiPropertyOptional({
    description: 'Execution cost in USD',
    example: 0.012,
  })
  cost?: number;

  @ApiPropertyOptional({
    description: 'Execution latency in milliseconds',
    example: 1250,
  })
  latencyMs?: number;

  @ApiPropertyOptional({
    description: 'Whether response was served from cache',
    example: false,
  })
  cached?: boolean;

  @ApiPropertyOptional({
    description: 'Cache key used (if cached)',
  })
  cacheKey?: string;

  @ApiPropertyOptional({
    description: 'Number of retry attempts',
    example: 0,
  })
  retryCount?: number;

  @ApiPropertyOptional({
    description: 'Error message (if failed)',
  })
  errorMessage?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata',
  })
  metadata?: any;

  @ApiProperty({
    description: 'Execution creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Execution completion timestamp',
    example: '2024-01-15T10:30:01Z',
  })
  completedAt?: Date;
}

export class PaginatedExecutionResponseDto {
  @ApiProperty({
    description: 'Array of executions',
    type: [ExecutionResponseDto],
  })
  data: ExecutionResponseDto[];

  @ApiProperty({
    description: 'Total number of executions',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Total number of pages',
    example: 5,
  })
  totalPages: number;
}
