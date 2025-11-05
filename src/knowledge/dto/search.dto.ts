import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsUUID,
  IsArray,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SearchType {
  VECTOR = 'vector',
  KEYWORD = 'keyword',
  HYBRID = 'hybrid',
}

export class SearchQueryDto {
  @ApiProperty({
    description: 'Search query',
    example: 'What are the requirements for user authentication?',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'Search type',
    enum: SearchType,
    default: SearchType.HYBRID,
  })
  @IsEnum(SearchType)
  @IsOptional()
  searchType?: SearchType = SearchType.HYBRID;

  @ApiPropertyOptional({
    description: 'Number of results to return',
    example: 10,
    default: 10,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  topK?: number = 10;

  @ApiPropertyOptional({
    description: 'Minimum similarity threshold (0-1)',
    example: 0.7,
    default: 0.7,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  similarityThreshold?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Weight for vector similarity in hybrid search (0-1)',
    example: 0.7,
    default: 0.7,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  vectorWeight?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Weight for keyword matching in hybrid search (0-1)',
    example: 0.3,
    default: 0.3,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  keywordWeight?: number = 0.3;

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
    description: 'Filter by document IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  documentIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by tags',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Minimum keyword matches required (for hybrid search)',
    example: 1,
    default: 1,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  minKeywordMatches?: number = 1;
}

export class SearchResultDto {
  @ApiProperty({
    description: 'Chunk ID',
  })
  chunkId: string;

  @ApiProperty({
    description: 'Document ID',
  })
  documentId: string;

  @ApiProperty({
    description: 'Chunk content',
  })
  content: string;

  @ApiProperty({
    description: 'Similarity or relevance score (0-1)',
  })
  similarity: number;

  @ApiProperty({
    description: 'Chunk index in document',
  })
  chunkIndex: number;

  @ApiPropertyOptional({
    description: 'Chunk metadata',
  })
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Document information',
  })
  document?: {
    id: string;
    title: string;
    filename: string;
    tags: string[];
  };

  @ApiPropertyOptional({
    description: 'Vector similarity score (for hybrid search)',
  })
  vectorScore?: number;

  @ApiPropertyOptional({
    description: 'Keyword matching score (for hybrid search)',
  })
  keywordScore?: number;

  @ApiPropertyOptional({
    description: 'Combined hybrid score (for hybrid search)',
  })
  hybridScore?: number;

  @ApiPropertyOptional({
    description: 'Matched keywords (for hybrid search)',
    type: [String],
  })
  matchedKeywords?: string[];
}

export class SearchResponseDto {
  @ApiProperty({
    description: 'Search results',
    type: [SearchResultDto],
  })
  results: SearchResultDto[];

  @ApiProperty({
    description: 'Original query',
  })
  query: string;

  @ApiProperty({
    description: 'Search type used',
    enum: SearchType,
  })
  searchType: SearchType;

  @ApiProperty({
    description: 'Number of results returned',
  })
  count: number;

  @ApiProperty({
    description: 'Search execution time in milliseconds',
  })
  executionTimeMs: number;

  @ApiPropertyOptional({
    description: 'Extracted keywords from query',
    type: [String],
  })
  keywords?: string[];
}

export class EmbeddingStatisticsDto {
  @ApiProperty({
    description: 'Total number of chunks',
  })
  totalChunks: number;

  @ApiProperty({
    description: 'Number of chunks with embeddings',
  })
  chunksWithEmbeddings: number;

  @ApiProperty({
    description: 'Number of chunks without embeddings',
  })
  chunksWithoutEmbeddings: number;

  @ApiProperty({
    description: 'Percentage of chunks with embeddings',
  })
  percentageComplete: number;
}

export class GenerateEmbeddingsDto {
  @ApiPropertyOptional({
    description: 'Specific document ID to generate embeddings for',
  })
  @IsUUID()
  @IsOptional()
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Batch size for processing',
    example: 50,
    default: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  batchSize?: number = 50;

  @ApiPropertyOptional({
    description: 'Force regeneration of existing embeddings',
    example: false,
    default: false,
  })
  @IsOptional()
  forceRegenerate?: boolean = false;
}
