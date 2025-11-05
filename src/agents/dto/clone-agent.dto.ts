import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CloneAgentDto {
  @ApiProperty({
    description: 'Name for the cloned agent',
    example: 'Customer Support Bot (Clone)',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description for the cloned agent',
    example: 'Clone of the original customer support bot',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether to clone the configuration',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  cloneConfig?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether to clone capabilities',
    default: true,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  cloneCapabilities?: boolean = true;

  @ApiPropertyOptional({
    description: 'Whether to clone rate limit settings',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  cloneRateLimits?: boolean = false;

  @ApiPropertyOptional({
    description: 'Whether to clone cost tracking settings',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  cloneCostTracking?: boolean = false;

  @ApiPropertyOptional({
    description: 'Make the cloned agent public',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}
