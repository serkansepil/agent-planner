import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EmbeddingService } from './embedding.service';
import { VectorSearchService, VectorSearchOptions, VectorSearchResult } from './vector-search.service';

export interface HybridSearchOptions extends VectorSearchOptions {
  vectorWeight?: number; // Weight for vector similarity (0-1)
  keywordWeight?: number; // Weight for keyword matching (0-1)
  minKeywordMatches?: number; // Minimum keyword matches required
}

export interface HybridSearchResult extends VectorSearchResult {
  vectorScore: number;
  keywordScore: number;
  hybridScore: number;
  matchedKeywords?: string[];
}

@Injectable()
export class HybridSearchService {
  private readonly logger = new Logger(HybridSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorSearchService: VectorSearchService,
  ) {}

  /**
   * Hybrid search combining vector similarity and keyword matching
   */
  async search(
    query: string,
    options: HybridSearchOptions = {},
  ): Promise<HybridSearchResult[]> {
    const {
      topK = 10,
      vectorWeight = 0.7,
      keywordWeight = 0.3,
      similarityThreshold = 0.5,
      minKeywordMatches = 1,
      ...filterOptions
    } = options;

    this.logger.log(`Performing hybrid search for query: "${query}"`);

    // Normalize weights
    const totalWeight = vectorWeight + keywordWeight;
    const normVectorWeight = vectorWeight / totalWeight;
    const normKeywordWeight = keywordWeight / totalWeight;

    // Generate query embedding
    const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);

    // Perform vector search (get more results than needed for re-ranking)
    const vectorResults = await this.vectorSearchService.searchSimilarChunks(
      queryEmbedding,
      {
        ...filterOptions,
        topK: topK * 3, // Get 3x results for hybrid re-ranking
        similarityThreshold: Math.max(similarityThreshold - 0.2, 0.3), // Lower threshold for vector search
      },
    );

    // Extract keywords from query
    const keywords = this.extractKeywords(query);

    // Calculate keyword scores for each result
    const hybridResults: HybridSearchResult[] = vectorResults.map((result) => {
      const keywordScore = this.calculateKeywordScore(result.content, keywords);
      const matchedKeywords = this.findMatchedKeywords(result.content, keywords);

      const hybridScore =
        result.similarity * normVectorWeight + keywordScore * normKeywordWeight;

      return {
        ...result,
        vectorScore: result.similarity,
        keywordScore,
        hybridScore,
        matchedKeywords,
      };
    });

    // Filter by minimum keyword matches
    const filteredResults = hybridResults.filter(
      (r) => (r.matchedKeywords?.length || 0) >= minKeywordMatches,
    );

    // Sort by hybrid score
    filteredResults.sort((a, b) => b.hybridScore - a.hybridScore);

    // Return top K results
    const topResults = filteredResults.slice(0, topK);

    this.logger.log(
      `Hybrid search returned ${topResults.length} results (filtered from ${hybridResults.length})`,
    );

    return topResults;
  }

  /**
   * Keyword-only search (no vector similarity)
   */
  async keywordSearch(
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<HybridSearchResult[]> {
    const { topK = 10, workspaceId, agentId, documentIds, tags } = options;

    const keywords = this.extractKeywords(query);
    const whereConditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Add workspace filter
    if (workspaceId) {
      whereConditions.push(`kd."workspaceId" = $${paramIndex}`);
      params.push(workspaceId);
      paramIndex++;
    }

    // Add agent filter
    if (agentId) {
      whereConditions.push(`kd."agentId" = $${paramIndex}`);
      params.push(agentId);
      paramIndex++;
    }

    // Add document IDs filter
    if (documentIds && documentIds.length > 0) {
      whereConditions.push(`dc."documentId" = ANY($${paramIndex}::uuid[])`);
      params.push(documentIds);
      paramIndex++;
    }

    // Add tags filter
    if (tags && tags.length > 0) {
      whereConditions.push(`kd.tags && $${paramIndex}::text[]`);
      params.push(tags);
      paramIndex++;
    }

    // Add full-text search condition
    const tsQuery = keywords.map((k) => k + ':*').join(' & ');
    whereConditions.push(
      `to_tsvector('english', dc.content) @@ to_tsquery('english', $${paramIndex})`,
    );
    params.push(tsQuery);
    paramIndex++;

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    const query_sql = `
      SELECT
        dc.id as "chunkId",
        dc."documentId",
        dc.content,
        dc."chunkIndex",
        dc.metadata,
        ts_rank(to_tsvector('english', dc.content), to_tsquery('english', $${paramIndex - 1})) as rank,
        kd.id as "documentId",
        kd.title,
        kd.filename,
        kd.tags
      FROM document_chunks dc
      INNER JOIN knowledge_documents kd ON dc."documentId" = kd.id
      ${whereClause}
      ORDER BY rank DESC
      LIMIT $${paramIndex}
    `;

    params.push(topK);

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(query_sql, ...params);

      return results.map((r) => {
        const keywordScore = parseFloat(r.rank);
        const matchedKeywords = this.findMatchedKeywords(r.content, keywords);

        return {
          chunkId: r.chunkId,
          documentId: r.documentId,
          content: r.content,
          similarity: keywordScore, // Use rank as similarity for consistency
          chunkIndex: r.chunkIndex,
          metadata: r.metadata,
          document: {
            id: r.documentId,
            title: r.title,
            filename: r.filename,
            tags: r.tags,
          },
          vectorScore: 0,
          keywordScore,
          hybridScore: keywordScore,
          matchedKeywords,
        };
      });
    } catch (error) {
      this.logger.error('Error performing keyword search:', error);
      throw error;
    }
  }

  /**
   * Multi-query search (search with multiple query variations)
   */
  async multiQuerySearch(
    queries: string[],
    options: HybridSearchOptions = {},
  ): Promise<HybridSearchResult[]> {
    const allResults: HybridSearchResult[] = [];
    const seenChunkIds = new Set<string>();

    for (const query of queries) {
      const results = await this.search(query, {
        ...options,
        topK: Math.ceil((options.topK || 10) / queries.length),
      });

      for (const result of results) {
        if (!seenChunkIds.has(result.chunkId)) {
          allResults.push(result);
          seenChunkIds.add(result.chunkId);
        }
      }
    }

    // Sort by hybrid score
    allResults.sort((a, b) => b.hybridScore - a.hybridScore);

    return allResults.slice(0, options.topK || 10);
  }

  /**
   * Extract keywords from query
   */
  private extractKeywords(query: string): string[] {
    // Convert to lowercase and remove punctuation
    const cleaned = query.toLowerCase().replace(/[^\w\s]/g, '');

    // Split into words
    const words = cleaned.split(/\s+/).filter((w) => w.length > 0);

    // Remove common stop words
    const stopWords = new Set([
      'the',
      'is',
      'at',
      'which',
      'on',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'with',
      'to',
      'for',
      'of',
      'as',
      'by',
      'that',
      'this',
      'it',
      'from',
      'are',
      'was',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
    ]);

    return words.filter((word) => !stopWords.has(word) && word.length > 2);
  }

  /**
   * Calculate keyword matching score (0-1)
   */
  private calculateKeywordScore(text: string, keywords: string[]): number {
    if (keywords.length === 0) {
      return 0;
    }

    const textLower = text.toLowerCase();
    let matchCount = 0;
    let totalScore = 0;

    for (const keyword of keywords) {
      // Count occurrences
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = textLower.match(regex);
      const count = matches ? matches.length : 0;

      if (count > 0) {
        matchCount++;
        // Logarithmic scoring to avoid over-weighting high frequency
        totalScore += Math.log(count + 1);
      }
    }

    // Normalize score
    const maxPossibleScore = keywords.length * Math.log(10); // Assume max 10 occurrences
    const normalizedScore = Math.min(totalScore / maxPossibleScore, 1.0);

    // Boost if most keywords are matched
    const coverageBoost = matchCount / keywords.length;

    return (normalizedScore * 0.7 + coverageBoost * 0.3);
  }

  /**
   * Find which keywords are matched in the text
   */
  private findMatchedKeywords(text: string, keywords: string[]): string[] {
    const textLower = text.toLowerCase();
    return keywords.filter((keyword) => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(textLower);
    });
  }

  /**
   * Calculate BM25 score (for future implementation)
   */
  private calculateBM25Score(
    text: string,
    keywords: string[],
    avgDocLength: number,
  ): number {
    // BM25 parameters
    const k1 = 1.5;
    const b = 0.75;

    const docLength = text.split(/\s+/).length;
    let score = 0;

    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = text.match(regex);
      const termFreq = matches ? matches.length : 0;

      if (termFreq > 0) {
        // Simplified BM25 (without IDF component)
        const numerator = termFreq * (k1 + 1);
        const denominator =
          termFreq + k1 * (1 - b + b * (docLength / avgDocLength));
        score += numerator / denominator;
      }
    }

    return score;
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(
    partialQuery: string,
    limit: number = 5,
  ): Promise<string[]> {
    // This is a simplified implementation
    // In production, you might want to use a dedicated suggestion engine

    const keywords = this.extractKeywords(partialQuery);
    if (keywords.length === 0) {
      return [];
    }

    const lastKeyword = keywords[keywords.length - 1];

    // Find chunks containing the keyword
    const query = `
      SELECT DISTINCT
        regexp_matches(content, $1, 'gi') as matches
      FROM document_chunks
      WHERE content ILIKE $2
      LIMIT $3
    `;

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        query,
        `\\b${lastKeyword}\\w*\\b`,
        `%${lastKeyword}%`,
        limit * 2,
      );

      const suggestions = new Set<string>();
      for (const result of results) {
        if (result.matches && result.matches[0]) {
          suggestions.add(result.matches[0].toLowerCase());
        }
      }

      return Array.from(suggestions).slice(0, limit);
    } catch (error) {
      this.logger.error('Error getting search suggestions:', error);
      return [];
    }
  }
}
