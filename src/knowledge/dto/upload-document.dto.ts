import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadDocumentDto {
  @ApiPropertyOptional({
    description: 'Document title (auto-extracted if not provided)',
    example: 'Product Requirements Document',
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    description: 'Document source',
    example: 'Confluence',
  })
  @IsString()
  @IsOptional()
  source?: string;

  @ApiPropertyOptional({
    description: 'Source URL',
    example: 'https://confluence.company.com/doc/123',
  })
  @IsString()
  @IsOptional()
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'Workspace ID to associate the document with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Agent ID to associate the document with',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Tags for document categorization',
    example: ['requirements', 'product', 'v1.0'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Chunk size for document chunking',
    example: 1000,
    default: 1000,
  })
  @IsNumber()
  @Min(100)
  @Max(5000)
  @IsOptional()
  chunkSize?: number = 1000;

  @ApiPropertyOptional({
    description: 'Chunk overlap size',
    example: 200,
    default: 200,
  })
  @IsNumber()
  @Min(0)
  @Max(1000)
  @IsOptional()
  chunkOverlap?: number = 200;

  @ApiPropertyOptional({
    description: 'Enable automatic metadata extraction',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  extractMetadata?: boolean = true;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { department: 'Engineering', priority: 'high' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkUploadDocumentDto {
  @ApiProperty({
    description: 'Array of upload configurations',
    type: [UploadDocumentDto],
  })
  documents: UploadDocumentDto[];

  @ApiPropertyOptional({
    description: 'Continue on error (don\'t fail entire batch)',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  continueOnError?: boolean = true;
}
