import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CloneWorkspaceDto {
  @ApiProperty({ description: 'Name for the cloned workspace' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Description for the cloned workspace' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Include workspace agents',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  includeAgents?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include workspace configuration',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  includeConfig?: boolean = true;

  @ApiPropertyOptional({
    description: 'Include workspace integrations',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeIntegrations?: boolean = false;
}
