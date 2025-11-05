import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Workspace ID' })
  @IsUUID()
  @IsNotEmpty()
  workspaceId: string;

  @ApiPropertyOptional({ description: 'Session title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Session timeout in milliseconds', minimum: 60000 })
  @IsNumber()
  @Min(60000)
  @IsOptional()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Initial context data' })
  @IsObject()
  @IsOptional()
  initialContext?: Record<string, any>;
}
