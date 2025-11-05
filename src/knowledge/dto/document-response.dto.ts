import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentStatus } from '@prisma/client';

export class DocumentResponseDto {
  @ApiProperty({
    description: 'Document ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'Document title',
    example: 'Product Requirements Document',
  })
  title: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'requirements.pdf',
  })
  filename: string;

  @ApiPropertyOptional({
    description: 'Document content (may be truncated)',
  })
  content?: string;

  @ApiPropertyOptional({
    description: 'Document summary',
  })
  summary?: string;

  @ApiPropertyOptional({
    description: 'Document source',
  })
  source?: string;

  @ApiPropertyOptional({
    description: 'Source URL',
  })
  sourceUrl?: string;

  @ApiPropertyOptional({
    description: 'MIME type',
  })
  mimeType?: string;

  @ApiPropertyOptional({
    description: 'File size in bytes',
  })
  fileSize?: number;

  @ApiPropertyOptional({
    description: 'File hash for deduplication',
  })
  fileHash?: string;

  @ApiProperty({
    description: 'Processing status',
    enum: DocumentStatus,
  })
  status: DocumentStatus;

  @ApiPropertyOptional({
    description: 'Document metadata',
  })
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Processing configuration',
  })
  processingConfig?: any;

  @ApiProperty({
    description: 'Document version',
  })
  version: number;

  @ApiPropertyOptional({
    description: 'Parent document ID (for versions)',
  })
  parentDocumentId?: string;

  @ApiPropertyOptional({
    description: 'Workspace ID',
  })
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Agent ID',
  })
  agentId?: string;

  @ApiProperty({
    description: 'Owner user ID',
  })
  userId: string;

  @ApiProperty({
    description: 'Document tags',
    type: [String],
  })
  tags: string[];

  @ApiPropertyOptional({
    description: 'Number of chunks',
  })
  chunkCount?: number;

  @ApiProperty({
    description: 'Created timestamp',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated timestamp',
  })
  updatedAt: Date;
}

export class PaginatedDocumentResponseDto {
  @ApiProperty({
    description: 'Array of documents',
    type: [DocumentResponseDto],
  })
  data: DocumentResponseDto[];

  @ApiProperty({
    description: 'Total number of documents',
  })
  total: number;

  @ApiProperty({
    description: 'Current page',
  })
  page: number;

  @ApiProperty({
    description: 'Items per page',
  })
  limit: number;

  @ApiProperty({
    description: 'Total pages',
  })
  totalPages: number;
}

export class DocumentChunkResponseDto {
  @ApiProperty({
    description: 'Chunk ID',
  })
  id: string;

  @ApiProperty({
    description: 'Document ID',
  })
  documentId: string;

  @ApiProperty({
    description: 'Chunk content',
  })
  content: string;

  @ApiProperty({
    description: 'Chunk index',
  })
  chunkIndex: number;

  @ApiProperty({
    description: 'Start position in original document',
  })
  startPos: number;

  @ApiProperty({
    description: 'End position in original document',
  })
  endPos: number;

  @ApiPropertyOptional({
    description: 'Token count',
  })
  tokenCount?: number;

  @ApiPropertyOptional({
    description: 'Chunk metadata',
  })
  metadata?: any;

  @ApiProperty({
    description: 'Created timestamp',
  })
  createdAt: Date;
}

export class BulkUploadResultDto {
  @ApiProperty({
    description: 'Successfully uploaded documents',
    type: [DocumentResponseDto],
  })
  successful: DocumentResponseDto[];

  @ApiProperty({
    description: 'Failed uploads with error messages',
    type: 'array',
  })
  failed: Array<{
    filename: string;
    error: string;
  }>;

  @ApiProperty({
    description: 'Total number of documents processed',
  })
  total: number;

  @ApiProperty({
    description: 'Number of successful uploads',
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of failed uploads',
  })
  failureCount: number;
}
