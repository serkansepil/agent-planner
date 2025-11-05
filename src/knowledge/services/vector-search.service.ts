import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

export interface VectorSearchOptions {
  topK?: number;
  similarityThreshold?: number;
  workspaceId?: string;
  agentId?: string;
  documentIds?: string[];
  tags?: string[];
}

export interface VectorSearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  chunkIndex: number;
  metadata?: any;
  document?: {
    id: string;
    title: string;
    filename: string;
    tags: string[];
  };
}

@Injectable()
export class VectorSearchService {
  private readonly logger = new Logger(VectorSearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search for similar chunks using vector similarity (cosine distance)
   */
  async searchSimilarChunks(
    queryEmbedding: number[],
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    const {
      topK = 10,
      similarityThreshold = 0.7,
      workspaceId,
      agentId,
      documentIds,
      tags,
    } = options;

    this.logger.debug(`Searching for top ${topK} similar chunks`);

    // Build WHERE clause for filtering
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

    const whereClause =
      whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Convert embedding to pgvector format
    const embeddingStr = `[${queryEmbedding.join(',')}]`;

    // Raw SQL query using pgvector cosine distance operator (<=>)
    // Note: cosine distance is 1 - cosine similarity
    // So similarity = 1 - distance
    const query = `
      SELECT
        dc.id as "chunkId",
        dc."documentId",
        dc.content,
        1 - (dc.embedding <=> $${paramIndex}::vector) as similarity,
        dc."chunkIndex",
        dc.metadata,
        kd.id as "documentId",
        kd.title,
        kd.filename,
        kd.tags
      FROM document_chunks dc
      INNER JOIN knowledge_documents kd ON dc."documentId" = kd.id
      ${whereClause}
      AND dc.embedding IS NOT NULL
      ORDER BY dc.embedding <=> $${paramIndex}::vector
      LIMIT $${paramIndex + 1}
    `;

    params.push(embeddingStr);
    params.push(topK);

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(query, ...params);

      // Filter by similarity threshold
      const filteredResults = results.filter(
        (r) => r.similarity >= similarityThreshold,
      );

      this.logger.log(
        `Found ${filteredResults.length} chunks above similarity threshold ${similarityThreshold}`,
      );

      return filteredResults.map((r) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        content: r.content,
        similarity: parseFloat(r.similarity),
        chunkIndex: r.chunkIndex,
        metadata: r.metadata,
        document: {
          id: r.documentId,
          title: r.title,
          filename: r.filename,
          tags: r.tags,
        },
      }));
    } catch (error) {
      this.logger.error('Error performing vector search:', error);
      throw error;
    }
  }

  /**
   * Search with re-ranking using cross-encoder (placeholder for future implementation)
   */
  async searchWithReranking(
    queryEmbedding: number[],
    query: string,
    options: VectorSearchOptions = {},
  ): Promise<VectorSearchResult[]> {
    // First, get initial results using vector search
    const initialResults = await this.searchSimilarChunks(queryEmbedding, {
      ...options,
      topK: (options.topK || 10) * 2, // Get more results for re-ranking
    });

    // For now, just return the vector search results
    // In the future, implement cross-encoder re-ranking here
    return initialResults.slice(0, options.topK || 10);
  }

  /**
   * Find chunks by document ID
   */
  async findChunksByDocument(
    documentId: string,
    limit: number = 100,
  ): Promise<VectorSearchResult[]> {
    // Use raw SQL since embedding is an Unsupported type
    const chunks: any[] = await this.prisma.$queryRaw`
      SELECT
        dc.id,
        dc."documentId",
        dc.content,
        dc."chunkIndex",
        dc.metadata,
        kd.id as "doc_id",
        kd.title,
        kd.filename,
        kd.tags
      FROM document_chunks dc
      JOIN knowledge_documents kd ON dc."documentId" = kd.id
      WHERE dc."documentId" = ${documentId}::uuid
        AND dc.embedding IS NOT NULL
      ORDER BY dc."chunkIndex" ASC
      LIMIT ${limit}
    `;

    return chunks.map((chunk) => ({
      chunkId: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      similarity: 1.0, // No similarity calculation for direct retrieval
      chunkIndex: chunk.chunkIndex,
      metadata: chunk.metadata,
      document: {
        id: chunk.doc_id,
        title: chunk.title,
        filename: chunk.filename,
        tags: chunk.tags,
      },
    }));
  }

  /**
   * Get statistics about vector embeddings
   */
  async getEmbeddingStatistics(): Promise<{
    totalChunks: number;
    chunksWithEmbeddings: number;
    chunksWithoutEmbeddings: number;
    percentageComplete: number;
  }> {
    const totalChunks = await this.prisma.documentChunk.count();

    // Use raw SQL to count chunks with embeddings since embedding is Unsupported type
    const result: any[] = await this.prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM document_chunks
      WHERE embedding IS NOT NULL
    `;
    const chunksWithEmbeddings = Number(result[0]?.count || 0);

    const chunksWithoutEmbeddings = totalChunks - chunksWithEmbeddings;
    const percentageComplete =
      totalChunks > 0 ? (chunksWithEmbeddings / totalChunks) * 100 : 0;

    return {
      totalChunks,
      chunksWithEmbeddings,
      chunksWithoutEmbeddings,
      percentageComplete,
    };
  }

  /**
   * Find duplicate or very similar chunks
   */
  async findSimilarChunks(
    chunkId: string,
    similarityThreshold: number = 0.95,
    limit: number = 10,
  ): Promise<VectorSearchResult[]> {
    // Get the chunk's embedding using raw SQL since it's an Unsupported type
    const chunkResult: any[] = await this.prisma.$queryRaw`
      SELECT embedding
      FROM document_chunks
      WHERE id = ${chunkId}::uuid
        AND embedding IS NOT NULL
    `;

    if (!chunkResult.length || !chunkResult[0].embedding) {
      return [];
    }

    // Search for similar chunks (excluding the original)
    const embeddingStr = `[${(chunkResult[0].embedding as any).join(',')}]`;

    const query = `
      SELECT
        dc.id as "chunkId",
        dc."documentId",
        dc.content,
        1 - (dc.embedding <=> $1::vector) as similarity,
        dc."chunkIndex",
        dc.metadata,
        kd.id as "documentId",
        kd.title,
        kd.filename,
        kd.tags
      FROM document_chunks dc
      INNER JOIN knowledge_documents kd ON dc."documentId" = kd.id
      WHERE dc.id != $2
        AND dc.embedding IS NOT NULL
        AND 1 - (dc.embedding <=> $1::vector) >= $3
      ORDER BY dc.embedding <=> $1::vector
      LIMIT $4
    `;

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(
        query,
        embeddingStr,
        chunkId,
        similarityThreshold,
        limit,
      );

      return results.map((r) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        content: r.content,
        similarity: parseFloat(r.similarity),
        chunkIndex: r.chunkIndex,
        metadata: r.metadata,
        document: {
          id: r.documentId,
          title: r.title,
          filename: r.filename,
          tags: r.tags,
        },
      }));
    } catch (error) {
      this.logger.error('Error finding similar chunks:', error);
      throw error;
    }
  }

  /**
   * Batch update chunk embeddings
   */
  async updateChunkEmbeddings(
    updates: Array<{ chunkId: string; embedding: number[] }>,
  ): Promise<number> {
    let updatedCount = 0;

    for (const update of updates) {
      try {
        // Convert embedding to pgvector format
        const embeddingStr = `[${update.embedding.join(',')}]`;

        await this.prisma.$executeRawUnsafe(
          `UPDATE document_chunks SET embedding = $1::vector WHERE id = $2`,
          embeddingStr,
          update.chunkId,
        );

        updatedCount++;
      } catch (error) {
        this.logger.error(
          `Error updating embedding for chunk ${update.chunkId}:`,
          error,
        );
      }
    }

    this.logger.log(`Updated ${updatedCount}/${updates.length} chunk embeddings`);
    return updatedCount;
  }
}
