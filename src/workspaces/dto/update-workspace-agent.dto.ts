import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsBoolean, IsInt, IsObject } from 'class-validator';
import { AgentRole } from './add-agent.dto';

export class UpdateWorkspaceAgentDto {
  @ApiPropertyOptional({
    description: 'Role of the agent in workspace',
    enum: AgentRole,
  })
  @IsEnum(AgentRole)
  @IsOptional()
  role?: AgentRole;

  @ApiPropertyOptional({ description: 'Agent order in workspace' })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Agent configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Active status' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
