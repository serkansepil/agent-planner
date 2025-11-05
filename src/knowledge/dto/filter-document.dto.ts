import { IsString, IsOptional, IsArray, IsUUID, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';

export class FilterDocumentDto {
  @ApiPropertyOptional({
    description: 'Search query (searches in title and content)',
    example: 'requirements',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: DocumentStatus,
  })
  @IsEnum(DocumentStatus)
  @IsOptional()
  status?: DocumentStatus;

  @ApiPropertyOptional({
    description: 'Filter by workspace ID',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by agent ID',
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Filter by tags',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Filter by source',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Filter by MIME type',
  })
  @IsString()
  @IsOptional()
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'Filter documents created after this date',
  })
  @IsOptional()
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter documents created before this date',
  })
  @IsOptional()
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
  })
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort by field',
    example: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
