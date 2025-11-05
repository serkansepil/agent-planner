import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class WorkspaceTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Template description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Agent IDs to include in template', type: [String] })
  @IsArray()
  @IsOptional()
  agentIds?: string[];
}

export enum WorkspaceTemplateType {
  RESEARCH = 'research',
  DEVELOPMENT = 'development',
  CUSTOMER_SUPPORT = 'customer_support',
  DATA_ANALYSIS = 'data_analysis',
  CONTENT_CREATION = 'content_creation',
  CUSTOM = 'custom',
}

export interface WorkspaceTemplate {
  id: string;
  name: string;
  description: string;
  type: WorkspaceTemplateType;
  config: {
    suggestedAgentRoles: Array<{
      role: string;
      description: string;
      capabilities: string[];
    }>;
    defaultConfig?: Record<string, any>;
  };
}
