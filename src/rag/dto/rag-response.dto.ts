import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ContextChunkDto {
  @ApiProperty()
  chunkId: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  relevance: number;

  @ApiProperty()
  document: {
    id: string;
    title: string;
    filename: string;
    tags: string[];
  };

  @ApiProperty()
  chunkIndex: number;
}

export class RAGContextDto {
  @ApiProperty({ type: [ContextChunkDto] })
  chunks: ContextChunkDto[];

  @ApiProperty()
  totalChunks: number;

  @ApiProperty()
  totalTokens: number;

  @ApiProperty({ type: [Number] })
  relevanceScores: number[];

  @ApiProperty()
  averageRelevance: number;
}

export class CitationDto {
  @ApiProperty()
  documentId: string;

  @ApiProperty()
  documentTitle: string;

  @ApiProperty()
  filename: string;

  @ApiProperty({ type: [String] })
  chunkIds: string[];

  @ApiProperty()
  relevanceScore: number;

  @ApiProperty({ type: [String] })
  excerpts: string[];
}

export class ConfidenceScoreDto {
  @ApiProperty({ description: 'Overall confidence (0-1)' })
  overall: number;

  @ApiProperty({
    description: 'Individual confidence factors',
    example: {
      contextRelevance: 0.8,
      contextCoverage: 0.75,
      answerCoherence: 0.85,
      citationStrength: 0.7,
    },
  })
  factors: {
    contextRelevance: number;
    contextCoverage: number;
    answerCoherence: number;
    citationStrength: number;
  };

  @ApiProperty()
  explanation: string;
}

export class RAGResponseDto {
  @ApiProperty()
  answer: string;

  @ApiProperty({ type: RAGContextDto })
  context: RAGContextDto;

  @ApiProperty({ type: [CitationDto] })
  citations: CitationDto[];

  @ApiProperty({ type: ConfidenceScoreDto })
  confidence: ConfidenceScoreDto;

  @ApiProperty()
  strategy: string;

  @ApiProperty()
  executionTimeMs: number;

  @ApiProperty()
  model: string;

  @ApiProperty({
    example: { input: 150, output: 450, total: 600 },
  })
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };

  @ApiProperty()
  fallbackUsed: boolean;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;
}

export class RAGStrategyDto {
  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  retrievalConfig: any;

  @ApiProperty()
  contextConfig: any;

  @ApiProperty()
  promptConfig: any;

  @ApiProperty()
  generationConfig: any;
}

export class RefreshKnowledgeResultDto {
  @ApiProperty()
  documentsProcessed: number;

  @ApiProperty()
  embeddingsGenerated: number;

  @ApiProperty()
  durationMs: number;
}
