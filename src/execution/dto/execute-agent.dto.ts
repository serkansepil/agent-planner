import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecuteAgentDto {
  @ApiProperty({
    description: 'The prompt to send to the agent',
    example: 'Analyze the customer feedback and provide insights',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiPropertyOptional({
    description: 'Additional context for the execution',
    example: {
      customerId: '123',
      previousConversation: 'User asked about pricing',
    },
  })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Session ID to associate this execution with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  sessionId?: string;

  @ApiPropertyOptional({
    description: 'Enable streaming response (Server-Sent Events)',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  streaming?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable response caching',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  enableCache?: boolean = true;

  @ApiPropertyOptional({
    description: 'Custom cache TTL in seconds (overrides default)',
    example: 3600,
  })
  @IsOptional()
  cacheTTL?: number;

  @ApiPropertyOptional({
    description: 'Additional metadata for the execution',
    example: { source: 'api', version: '1.0' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
