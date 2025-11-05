import { Injectable, Logger } from '@nestjs/common';
import { VectorSearchResult } from '../../knowledge/services/vector-search.service';
import { TokenCounterService } from '../../execution/services/token-counter.service';
import { RAGContext, ContextChunk } from '../interfaces/rag.interface';

export interface ContextBuildConfig {
  maxTokens: number;
  chunkSeparator: string;
  includeMetadata: boolean;
  deduplication: boolean;
  reranking: boolean;
}

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(private readonly tokenCounter: TokenCounterService) {}

  /**
   * Build context from search results
   */
  async buildContext(
    searchResults: VectorSearchResult[],
    config: ContextBuildConfig,
    model: string = 'gpt-4o',
  ): Promise<RAGContext> {
    this.logger.debug(`Building context from ${searchResults.length} chunks`);

    // Deduplicate if enabled
    let chunks = searchResults;
    if (config.deduplication) {
      chunks = this.deduplicateChunks(searchResults);
      this.logger.debug(`After deduplication: ${chunks.length} chunks`);
    }

    // Rerank if enabled
    if (config.reranking) {
      chunks = this.rerankChunks(chunks);
      this.logger.debug('Chunks reranked');
    }

    // Select chunks that fit within token limit
    const selectedChunks = await this.selectChunksWithinLimit(
      chunks,
      config.maxTokens,
      model,
    );

    this.logger.debug(`Selected ${selectedChunks.length} chunks within token limit`);

    // Calculate statistics
    const relevanceScores = selectedChunks.map((c) => c.relevance);
    const averageRelevance =
      relevanceScores.reduce((sum, score) => sum + score, 0) /
      relevanceScores.length;

    // Calculate total tokens
    const totalText = selectedChunks.map((c) => c.content).join(config.chunkSeparator);
    const totalTokens = await this.tokenCounter.countTokens(totalText, model);

    return {
      chunks: selectedChunks.map((chunk) => ({
        chunkId: chunk.chunkId,
        documentId: chunk.documentId,
        content: chunk.content,
        relevance: chunk.similarity,
        document: chunk.document!,
        chunkIndex: chunk.chunkIndex,
      })),
      totalChunks: selectedChunks.length,
      totalTokens,
      relevanceScores,
      averageRelevance,
    };
  }

  /**
   * Format context as text
   */
  formatContext(context: RAGContext, config: ContextBuildConfig): string {
    const parts: string[] = [];

    for (const chunk of context.chunks) {
      let chunkText = chunk.content;

      if (config.includeMetadata) {
        chunkText = this.addMetadata(chunk, chunkText);
      }

      parts.push(chunkText);
    }

    return parts.join(config.chunkSeparator);
  }

  /**
   * Deduplicate similar chunks
   */
  private deduplicateChunks(chunks: VectorSearchResult[]): VectorSearchResult[] {
    const deduplicated: VectorSearchResult[] = [];
    const seenContent = new Set<string>();

    for (const chunk of chunks) {
      // Create a normalized version for comparison
      const normalized = chunk.content.toLowerCase().trim();
      const signature = this.generateSignature(normalized);

      if (!seenContent.has(signature)) {
        deduplicated.push(chunk);
        seenContent.add(signature);
      }
    }

    return deduplicated;
  }

  /**
   * Generate signature for chunk (first 100 chars)
   */
  private generateSignature(text: string): string {
    return text.substring(0, 100);
  }

  /**
   * Rerank chunks (placeholder for advanced reranking)
   */
  private rerankChunks(chunks: VectorSearchResult[]): VectorSearchResult[] {
    // For now, just sort by similarity
    // In the future, implement cross-encoder reranking
    return [...chunks].sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Select chunks that fit within token limit
   */
  private async selectChunksWithinLimit(
    chunks: VectorSearchResult[],
    maxTokens: number,
    model: string,
  ): Promise<VectorSearchResult[]> {
    const selected: VectorSearchResult[] = [];
    let currentTokens = 0;

    for (const chunk of chunks) {
      const chunkTokens = await this.tokenCounter.countTokens(chunk.content, model);

      if (currentTokens + chunkTokens <= maxTokens) {
        selected.push(chunk);
        currentTokens += chunkTokens;
      } else {
        // If we still have room but chunk is too large, truncate it
        const remainingTokens = maxTokens - currentTokens;
        if (remainingTokens > 100) {
          // Only truncate if we have meaningful space
          const truncated = this.truncateChunk(chunk, remainingTokens, model);
          selected.push(truncated);
        }
        break;
      }
    }

    return selected;
  }

  /**
   * Truncate chunk to fit token limit
   */
  private truncateChunk(
    chunk: VectorSearchResult,
    maxTokens: number,
    model: string,
  ): VectorSearchResult {
    // Rough approximation: 1 token ≈ 4 characters
    const maxChars = maxTokens * 4;
    const truncatedContent = chunk.content.substring(0, maxChars) + '...';

    return {
      ...chunk,
      content: truncatedContent,
    };
  }

  /**
   * Add metadata to chunk text
   */
  private addMetadata(chunk: ContextChunk, content: string): string {
    const metadata = [
      `[Document: ${chunk.document.title}]`,
      `[Relevance: ${(chunk.relevance * 100).toFixed(1)}%]`,
    ];

    if (chunk.document.tags.length > 0) {
      metadata.push(`[Tags: ${chunk.document.tags.join(', ')}]`);
    }

    return `${metadata.join(' ')}\n${content}`;
  }

  /**
   * Merge consecutive chunks from same document
   */
  mergeConsecutiveChunks(chunks: ContextChunk[]): ContextChunk[] {
    const merged: ContextChunk[] = [];
    let currentMerge: ContextChunk | null = null;

    for (const chunk of chunks) {
      if (
        currentMerge &&
        currentMerge.documentId === chunk.documentId &&
        currentMerge.chunkIndex + 1 === chunk.chunkIndex
      ) {
        // Merge with current
        currentMerge.content += '\n\n' + chunk.content;
        currentMerge.relevance = Math.max(currentMerge.relevance, chunk.relevance);
      } else {
        if (currentMerge) {
          merged.push(currentMerge);
        }
        currentMerge = { ...chunk };
      }
    }

    if (currentMerge) {
      merged.push(currentMerge);
    }

    return merged;
  }

  /**
   * Extract key sentences from context
   */
  extractKeySentences(context: RAGContext, maxSentences: number = 5): string[] {
    const sentences: Array<{ text: string; relevance: number }> = [];

    for (const chunk of context.chunks) {
      const chunkSentences = chunk.content
        .split(/[.!?]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20);

      for (const sentence of chunkSentences) {
        sentences.push({
          text: sentence,
          relevance: chunk.relevance,
        });
      }
    }

    // Sort by relevance and take top N
    return sentences
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxSentences)
      .map((s) => s.text);
  }

  /**
   * Calculate context diversity (how many different documents)
   */
  calculateContextDiversity(context: RAGContext): number {
    const uniqueDocuments = new Set(context.chunks.map((c) => c.documentId));
    return uniqueDocuments.size / context.chunks.length;
  }

  /**
   * Get context summary statistics
   */
  getContextStats(context: RAGContext): {
    totalChunks: number;
    totalTokens: number;
    avgRelevance: number;
    uniqueDocuments: number;
    diversity: number;
  } {
    const uniqueDocuments = new Set(context.chunks.map((c) => c.documentId));

    return {
      totalChunks: context.totalChunks,
      totalTokens: context.totalTokens,
      avgRelevance: context.averageRelevance,
      uniqueDocuments: uniqueDocuments.size,
      diversity: this.calculateContextDiversity(context),
    };
  }
}
