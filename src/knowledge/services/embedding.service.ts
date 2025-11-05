import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { createHash } from 'crypto';
import { CacheService } from '../../execution/services/cache.service';

export interface EmbeddingResult {
  embedding: number[];
  text: string;
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface BatchEmbeddingResult {
  embeddings: Array<{
    index: number;
    embedding: number[];
  }>;
  model: string;
  totalTokens: number;
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI;
  private readonly model = 'text-embedding-ada-002';
  private readonly dimensions = 1536;
  private readonly maxBatchSize = 100; // OpenAI limit
  private readonly maxTokensPerRequest = 8191; // OpenAI limit

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured');
    }

    this.client = new OpenAI({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string, useCache: boolean = true): Promise<EmbeddingResult> {
    // Check cache if enabled
    if (useCache) {
      const cacheKey = this.generateCacheKey(text);
      const cached = await this.cacheService.get<EmbeddingResult>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for embedding: ${text.substring(0, 50)}...`);
        return cached;
      }
    }

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      const result: EmbeddingResult = {
        embedding: response.data[0].embedding,
        text,
        model: response.model,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          totalTokens: response.usage.total_tokens,
        },
      };

      // Cache the result
      if (useCache) {
        const cacheKey = this.generateCacheKey(text);
        await this.cacheService.set(cacheKey, result, 7 * 24 * 3600); // Cache for 7 days
      }

      this.logger.debug(`Generated embedding for text: ${text.substring(0, 50)}...`);
      return result;
    } catch (error) {
      this.logger.error(`Error generating embedding:`, error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batches
   */
  async generateBatchEmbeddings(
    texts: string[],
    useCache: boolean = true,
  ): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return {
        embeddings: [],
        model: this.model,
        totalTokens: 0,
      };
    }

    const embeddings: Array<{ index: number; embedding: number[] }> = [];
    let totalTokens = 0;

    // Check cache for all texts
    const uncachedIndices: number[] = [];
    const uncachedTexts: string[] = [];

    if (useCache) {
      for (let i = 0; i < texts.length; i++) {
        const cacheKey = this.generateCacheKey(texts[i]);
        const cached = await this.cacheService.get<EmbeddingResult>(cacheKey);

        if (cached) {
          embeddings.push({
            index: i,
            embedding: cached.embedding,
          });
          totalTokens += cached.usage.totalTokens;
        } else {
          uncachedIndices.push(i);
          uncachedTexts.push(texts[i]);
        }
      }

      this.logger.debug(
        `Cache hits: ${texts.length - uncachedTexts.length}/${texts.length}`,
      );
    } else {
      uncachedIndices.push(...texts.map((_, i) => i));
      uncachedTexts.push(...texts);
    }

    // Process uncached texts in batches
    if (uncachedTexts.length > 0) {
      const batches = this.createBatches(uncachedTexts, this.maxBatchSize);

      for (const batch of batches) {
        try {
          const response = await this.client.embeddings.create({
            model: this.model,
            input: batch.texts,
          });

          for (let i = 0; i < batch.texts.length; i++) {
            const originalIndex = uncachedIndices[batch.startIndex + i];
            const embedding = response.data[i].embedding;

            embeddings.push({
              index: originalIndex,
              embedding,
            });

            // Cache individual results
            if (useCache) {
              const cacheKey = this.generateCacheKey(batch.texts[i]);
              await this.cacheService.set(
                cacheKey,
                {
                  embedding,
                  text: batch.texts[i],
                  model: response.model,
                  usage: {
                    promptTokens: Math.floor(
                      response.usage.prompt_tokens / batch.texts.length,
                    ),
                    totalTokens: Math.floor(
                      response.usage.total_tokens / batch.texts.length,
                    ),
                  },
                },
                7 * 24 * 3600, // Cache for 7 days
              );
            }
          }

          totalTokens += response.usage.total_tokens;
        } catch (error) {
          this.logger.error(`Error generating batch embeddings:`, error);
          throw error;
        }
      }
    }

    // Sort by index to maintain original order
    embeddings.sort((a, b) => a.index - b.index);

    this.logger.log(`Generated ${embeddings.length} embeddings`);

    return {
      embeddings,
      model: this.model,
      totalTokens,
    };
  }

  /**
   * Generate embedding for a query (same as document embedding for ada-002)
   */
  async generateQueryEmbedding(query: string): Promise<number[]> {
    const result = await this.generateEmbedding(query);
    return result.embedding;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  cosineSimilarity(embedding1: number[], embedding2: number[]): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same length');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Get embedding dimensions for the current model
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Get model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Validate embedding vector
   */
  validateEmbedding(embedding: number[]): boolean {
    if (!Array.isArray(embedding)) {
      return false;
    }

    if (embedding.length !== this.dimensions) {
      return false;
    }

    return embedding.every((val) => typeof val === 'number' && !isNaN(val));
  }

  /**
   * Create batches from texts
   */
  private createBatches(
    texts: string[],
    batchSize: number,
  ): Array<{ texts: string[]; startIndex: number }> {
    const batches: Array<{ texts: string[]; startIndex: number }> = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push({
        texts: texts.slice(i, i + batchSize),
        startIndex: i,
      });
    }

    return batches;
  }

  /**
   * Generate cache key for text
   */
  private generateCacheKey(text: string): string {
    const hash = createHash('sha256').update(text).digest('hex');
    return `embedding:${this.model}:${hash}`;
  }

  /**
   * Estimate tokens for text (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Truncate text to fit within token limit
   */
  truncateText(text: string, maxTokens?: number): string {
    const limit = maxTokens || this.maxTokensPerRequest;
    const estimatedTokens = this.estimateTokens(text);

    if (estimatedTokens <= limit) {
      return text;
    }

    // Truncate to approximate character limit
    const maxChars = limit * 4;
    return text.substring(0, maxChars);
  }

  /**
   * Clear embedding cache for a specific text
   */
  async clearCache(text: string): Promise<void> {
    const cacheKey = this.generateCacheKey(text);
    await this.cacheService.delete(cacheKey);
  }

  /**
   * Clear all embedding caches
   */
  async clearAllCaches(): Promise<void> {
    await this.cacheService.deletePattern('embedding:*');
  }
}
