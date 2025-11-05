import { VectorSearchResult } from '../../knowledge/services/vector-search.service';

export interface RAGContext {
  chunks: ContextChunk[];
  totalChunks: number;
  totalTokens: number;
  relevanceScores: number[];
  averageRelevance: number;
}

export interface ContextChunk {
  chunkId: string;
  documentId: string;
  content: string;
  relevance: number;
  document: {
    id: string;
    title: string;
    filename: string;
    tags: string[];
  };
  chunkIndex: number;
}

export interface Citation {
  documentId: string;
  documentTitle: string;
  filename: string;
  chunkIds: string[];
  relevanceScore: number;
  excerpts: string[];
}

export interface RAGResponse {
  answer: string;
  context: RAGContext;
  citations: Citation[];
  confidence: ConfidenceScore;
  strategy: string;
  executionTimeMs: number;
  model: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  fallbackUsed: boolean;
  metadata?: Record<string, any>;
}

export interface ConfidenceScore {
  overall: number; // 0-1
  factors: {
    contextRelevance: number; // 0-1
    contextCoverage: number; // 0-1
    answerCoherence: number; // 0-1
    citationStrength: number; // 0-1
  };
  explanation: string;
}

export interface RAGStrategy {
  name: string;
  description: string;
  retrievalConfig: {
    topK: number;
    similarityThreshold: number;
    searchType: 'vector' | 'keyword' | 'hybrid';
    vectorWeight?: number;
    keywordWeight?: number;
  };
  contextConfig: {
    maxTokens: number;
    chunkSeparator: string;
    includeMetadata: boolean;
    deduplication: boolean;
  };
  promptConfig: {
    systemPrompt: string;
    contextTemplate: string;
    includeInstructions: boolean;
  };
  generationConfig: {
    temperature: number;
    maxTokens: number;
    topP?: number;
  };
}

export interface ABTestVariant {
  id: string;
  name: string;
  strategy: RAGStrategy;
  weight: number; // 0-1, for traffic allocation
  metrics?: {
    requests: number;
    averageConfidence: number;
    averageLatency: number;
    userSatisfaction?: number;
  };
}

export interface KnowledgeRefreshResult {
  documentsProcessed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  errors: number;
  durationMs: number;
}
