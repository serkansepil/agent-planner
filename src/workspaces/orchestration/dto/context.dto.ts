import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateContextDto {
  @ApiProperty({ description: 'Context key' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ description: 'Context value' })
  value: any;

  @ApiPropertyOptional({ description: 'Context scope (workspace, session, task)' })
  @IsString()
  @IsOptional()
  scope?: string = 'workspace';

  @ApiPropertyOptional({ description: 'Context metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateContextDto {
  @ApiProperty({ description: 'Context value' })
  value: any;

  @ApiPropertyOptional({ description: 'Context metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export interface ExecutionContext {
  workspaceId: string;
  sessionId?: string;
  executionId?: string;
  sharedData: Map<string, any>;
  agentContexts: Map<string, Record<string, any>>;
  globalVariables: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMessage {
  id: string;
  fromAgentId: string;
  toAgentId?: string; // undefined means broadcast
  messageType: 'request' | 'response' | 'notification' | 'broadcast';
  content: any;
  context?: Record<string, any>;
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
  correlationId?: string;
  requiresResponse?: boolean;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Target agent ID (omit for broadcast)' })
  @IsString()
  @IsOptional()
  toAgentId?: string;

  @ApiProperty({ description: 'Message type' })
  @IsString()
  @IsNotEmpty()
  messageType: 'request' | 'response' | 'notification' | 'broadcast';

  @ApiProperty({ description: 'Message content' })
  @IsNotEmpty()
  content: any;

  @ApiPropertyOptional({ description: 'Message context' })
  @IsObject()
  @IsOptional()
  context?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Correlation ID for request-response' })
  @IsString()
  @IsOptional()
  correlationId?: string;

  @ApiPropertyOptional({ description: 'Requires response' })
  @IsOptional()
  requiresResponse?: boolean;
}
