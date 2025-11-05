import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  IsObject,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AgentRole {
  HOST = 'host',
  SPECIALIST = 'specialist',
  SUPPORT = 'support',
  MEMBER = 'member',
}

export class AddAgentDto {
  @ApiProperty({ description: 'Agent ID to add' })
  @IsUUID()
  @IsNotEmpty()
  agentId: string;

  @ApiProperty({
    description: 'Role of the agent in workspace',
    enum: AgentRole,
    default: AgentRole.MEMBER,
  })
  @IsEnum(AgentRole)
  @IsOptional()
  role?: AgentRole = AgentRole.MEMBER;

  @ApiPropertyOptional({ description: 'Agent order in workspace' })
  @IsInt()
  @IsOptional()
  order?: number;

  @ApiPropertyOptional({ description: 'Agent configuration' })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
