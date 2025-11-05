import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Customer Support Bot' })
  name: string;

  @ApiPropertyOptional({ example: 'A helpful customer support assistant' })
  description?: string;

  @ApiProperty({
    example: 'You are a helpful customer support assistant...',
  })
  systemPrompt: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  avatar?: string;

  @ApiProperty({ example: { temperature: 0.7, maxTokens: 2000 } })
  config: Record<string, any>;

  @ApiPropertyOptional({ example: { tags: ['support', 'customer-service'] } })
  metadata?: Record<string, any>;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  isPublic: boolean;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  ownerId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  deletedAt?: Date;
}

export class PaginatedAgentResponseDto {
  @ApiProperty({ type: [AgentResponseDto] })
  data: AgentResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}
