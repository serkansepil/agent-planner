import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StreamRequestDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'User prompt' })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ description: 'Agent ID for processing' })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Stream configuration' })
  @IsOptional()
  @IsObject()
  config?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  };
}
