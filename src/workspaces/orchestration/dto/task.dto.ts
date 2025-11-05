import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskExecutionMode {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
}

export class CreateTaskDto {
  @ApiProperty({ description: 'Task name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Task description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Task type/category' })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: 'Required agent capabilities', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Preferred agent role' })
  @IsString()
  @IsOptional()
  preferredRole?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;

  @ApiPropertyOptional({ description: 'Task input data' })
  @IsObject()
  @IsOptional()
  input?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Task configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Task dependencies (task IDs)', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependencies?: string[];

  @ApiPropertyOptional({ description: 'Timeout in milliseconds', minimum: 1000 })
  @IsNumber()
  @Min(1000)
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Maximum retry attempts', minimum: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  maxRetries?: number = 0;

  @ApiPropertyOptional({ description: 'Fallback agent ID' })
  @IsString()
  @IsOptional()
  fallbackAgentId?: string;
}

export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  output?: any;
  error?: string;
  agentId?: string;
  startedAt?: Date;
  completedAt?: Date;
  executionTime?: number;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  assignedAt: Date;
  priority: TaskPriority;
  estimatedDuration?: number;
}
