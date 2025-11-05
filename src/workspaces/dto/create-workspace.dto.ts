import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsObject,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Workspace description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Workspace avatar URL' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ description: 'Host agent ID' })
  @IsUUID()
  @IsNotEmpty()
  hostAgentId: string;

  @ApiPropertyOptional({ description: 'Additional agent IDs to add to workspace', type: [String] })
  @IsUUID('4', { each: true })
  @IsOptional()
  agentIds?: string[];

  @ApiPropertyOptional({ description: 'Workspace configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Workspace metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Template ID to clone from' })
  @IsString()
  @IsOptional()
  templateId?: string;
}
