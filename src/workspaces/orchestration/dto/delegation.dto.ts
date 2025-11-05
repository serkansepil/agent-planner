import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsObject,
  IsEnum,
} from 'class-validator';
import { TaskPriority } from './task.dto';

export enum DelegationStrategy {
  ROUND_ROBIN = 'round_robin',
  LEAST_BUSY = 'least_busy',
  CAPABILITY_MATCH = 'capability_match',
  PRIORITY_BASED = 'priority_based',
  MANUAL = 'manual',
}

export class DelegateTaskDto {
  @ApiProperty({ description: 'Task name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Task description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Task input' })
  @IsObject()
  @IsOptional()
  input?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Required capabilities', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Preferred agent ID' })
  @IsString()
  @IsOptional()
  preferredAgentId?: string;

  @ApiPropertyOptional({ description: 'Fallback agent IDs', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  fallbackAgentIds?: string[];

  @ApiPropertyOptional({
    description: 'Delegation strategy',
    enum: DelegationStrategy,
    default: DelegationStrategy.CAPABILITY_MATCH,
  })
  @IsEnum(DelegationStrategy)
  @IsOptional()
  strategy?: DelegationStrategy = DelegationStrategy.CAPABILITY_MATCH;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @ApiPropertyOptional({ description: 'Timeout in milliseconds' })
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Max retry attempts' })
  @IsOptional()
  maxRetries?: number;
}

export interface DelegationResult {
  taskId: string;
  assignedAgentId: string;
  strategy: DelegationStrategy;
  matchScore?: number;
  fallbacksAvailable: string[];
  estimatedStartTime?: Date;
  metadata?: Record<string, any>;
}

export interface AgentCapabilityMatch {
  agentId: string;
  agentName: string;
  role: string;
  matchScore: number;
  capabilities: string[];
  matchedCapabilities: string[];
  currentLoad: number;
  isAvailable: boolean;
}
