import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskExecutionMode, TaskPriority } from './task.dto';

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export class WorkflowStepDto {
  @ApiProperty({ description: 'Step ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Step name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Step description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Task type' })
  @IsString()
  @IsOptional()
  taskType?: string;

  @ApiPropertyOptional({ description: 'Required capabilities', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCapabilities?: string[];

  @ApiPropertyOptional({ description: 'Preferred agent role' })
  @IsString()
  @IsOptional()
  preferredRole?: string;

  @ApiPropertyOptional({ description: 'Step dependencies', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  dependsOn?: string[];

  @ApiPropertyOptional({ description: 'Step input mapping' })
  @IsObject()
  @IsOptional()
  inputMapping?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Step configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Execution mode',
    enum: TaskExecutionMode,
    default: TaskExecutionMode.SEQUENTIAL,
  })
  @IsEnum(TaskExecutionMode)
  @IsOptional()
  executionMode?: TaskExecutionMode = TaskExecutionMode.SEQUENTIAL;

  @ApiPropertyOptional({ description: 'Timeout in milliseconds' })
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Retry attempts' })
  @IsOptional()
  retryAttempts?: number;

  @ApiPropertyOptional({ description: 'Fallback agent ID' })
  @IsString()
  @IsOptional()
  fallbackAgentId?: string;

  @ApiPropertyOptional({ description: 'Condition to execute step' })
  @IsString()
  @IsOptional()
  condition?: string;
}

export class CreateWorkflowDto {
  @ApiProperty({ description: 'Workflow name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Workflow description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ description: 'Workflow version' })
  @IsString()
  @IsOptional()
  version?: string = '1.0.0';

  @ApiProperty({ description: 'Workflow steps', type: [WorkflowStepDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps: WorkflowStepDto[];

  @ApiPropertyOptional({
    description: 'Global execution mode',
    enum: TaskExecutionMode,
    default: TaskExecutionMode.SEQUENTIAL,
  })
  @IsEnum(TaskExecutionMode)
  @IsOptional()
  executionMode?: TaskExecutionMode = TaskExecutionMode.SEQUENTIAL;

  @ApiPropertyOptional({ description: 'Workflow configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Workflow metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ExecuteWorkflowDto {
  @ApiProperty({ description: 'Workflow ID' })
  @IsString()
  @IsNotEmpty()
  workflowId: string;

  @ApiPropertyOptional({ description: 'Workflow input data' })
  @IsObject()
  @IsOptional()
  input?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Execution configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Priority',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority = TaskPriority.MEDIUM;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workspaceId: string;
  status: WorkflowStatus;
  input: Record<string, any>;
  output?: Record<string, any>;
  currentStep?: string;
  completedSteps: string[];
  failedSteps: string[];
  stepResults: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  steps: WorkflowStepDto[];
  executionMode: TaskExecutionMode;
  config: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
