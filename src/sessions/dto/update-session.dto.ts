import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsObject } from 'class-validator';

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PAUSED = 'PAUSED',
}

export class UpdateSessionDto {
  @ApiPropertyOptional({ description: 'Session title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Session status', enum: SessionStatus })
  @IsEnum(SessionStatus)
  @IsOptional()
  status?: SessionStatus;

  @ApiPropertyOptional({ description: 'Session metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class PauseSessionDto {
  @ApiPropertyOptional({ description: 'Reason for pausing' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ResumeSessionDto {
  @ApiPropertyOptional({ description: 'Resume notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
