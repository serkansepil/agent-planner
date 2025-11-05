import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { DocumentStatus } from '@prisma/client';
import { DocumentProcessorService } from './services/document-processor.service';
import { DocumentChunkerService } from './services/document-chunker.service';
import { MetadataExtractorService } from './services/metadata-extractor.service';
import { EmbeddingService } from './services/embedding.service';
import { VectorSearchService } from './services/vector-search.service';
import { HybridSearchService } from './services/hybrid-search.service';
import {
  UploadDocumentDto,
  DocumentResponseDto,
  FilterDocumentDto,
  PaginatedDocumentResponseDto,
  DocumentChunkResponseDto,
  BulkUploadResultDto,
  SearchQueryDto,
  SearchResponseDto,
  SearchType,
  GenerateEmbeddingsDto,
  EmbeddingStatisticsDto,
} from './dto';

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentProcessor: DocumentProcessorService,
    private readonly documentChunker: DocumentChunkerService,
    private readonly metadataExtractor: MetadataExtractorService,
    private readonly embeddingService: EmbeddingService,
    private readonly vectorSearchService: VectorSearchService,
    private readonly hybridSearchService: HybridSearchService,
  ) {}

  /**
   * Upload and process a single document
   */
  async uploadDocument(
    file: Express.Multer.File,
    userId: string,
    dto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    this.logger.log(`Uploading document: ${file.originalname}`);

    // Validate file size
    this.documentProcessor.validateFileSize(file.size);

    // Detect MIME type
    const mimeType = await this.documentProcessor.detectMimeType(
      file.buffer,
      file.originalname,
    );

    // Check if file type is supported
    if (!this.documentProcessor.isSupported(mimeType)) {
      throw new BadRequestException(
        `Unsupported file type: ${mimeType}. Supported types: ${this.documentProcessor.getSupportedMimeTypes().join(', ')}`,
      );
    }

    // Generate file hash for deduplication
    const fileHash = this.documentProcessor.generateHash(file.buffer);

    // Check if document already exists
    const existing = await this.prisma.knowledgeDocument.findUnique({
      where: { fileHash },
    });

    if (existing) {
      this.logger.warn(`Document with hash ${fileHash} already exists`);
      throw new ConflictException(
        'Document already exists. Use update or create new version instead.',
      );
    }

    // Create initial document record
    const document = await this.prisma.knowledgeDocument.create({
      data: {
        title: dto.title || file.originalname,
        filename: file.originalname,
        content: '', // Will be updated after processing
        source: dto.source,
        sourceUrl: dto.sourceUrl,
        mimeType,
        fileSize: file.size,
        fileHash,
        status: DocumentStatus.PROCESSING,
        metadata: dto.metadata || {},
        processingConfig: {
          chunkSize: dto.chunkSize,
          chunkOverlap: dto.chunkOverlap,
          extractMetadata: dto.extractMetadata,
        },
        workspaceId: dto.workspaceId,
        agentId: dto.agentId,
        userId,
        tags: dto.tags || [],
      },
    });

    // Process document asynchronously
    this.processDocumentAsync(document.id, file.buffer, mimeType, dto).catch(
      (error) => {
        this.logger.error(
          `Error processing document ${document.id}:`,
          error,
        );
        // Update status to FAILED
        this.prisma.knowledgeDocument
          .update({
            where: { id: document.id },
            data: {
              status: DocumentStatus.FAILED,
              metadata: {
                ...(document.metadata as any),
                error: error.message,
              },
            },
          })
          .catch((e) => this.logger.error('Error updating failed status:', e));
      },
    );

    return this.mapToResponseDto(document);
  }

  /**
   * Process document asynchronously
   */
  private async processDocumentAsync(
    documentId: string,
    buffer: Buffer,
    mimeType: string,
    dto: UploadDocumentDto,
  ): Promise<void> {
    try {
      // Extract text and metadata
      const extracted = await this.documentProcessor.extractDocument(
        buffer,
        mimeType,
        dto.title || 'document',
      );

      // Extract additional metadata if enabled
      let fullMetadata = extracted.metadata;
      if (dto.extractMetadata !== false) {
        fullMetadata = this.metadataExtractor.extractMetadata(
          extracted.content,
          extracted.metadata,
          dto.title || 'document',
        );
      }

      // Chunk the document
      const chunks = this.documentChunker.chunkDocument(extracted.content, {
        chunkSize: dto.chunkSize,
        chunkOverlap: dto.chunkOverlap,
      });

      // Update document with content and metadata
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          content: extracted.content,
          summary: fullMetadata.summary,
          metadata: {
            ...(dto.metadata || {}),
            ...fullMetadata,
          },
          status: DocumentStatus.COMPLETED,
        },
      });

      // Save chunks
      await this.saveChunks(documentId, chunks);

      this.logger.log(
        `Document ${documentId} processed successfully with ${chunks.length} chunks`,
      );
    } catch (error) {
      this.logger.error(`Error in processDocumentAsync:`, error);
      throw error;
    }
  }

  /**
   * Save document chunks to database
   */
  private async saveChunks(
    documentId: string,
    chunks: any[],
  ): Promise<void> {
    await this.prisma.documentChunk.createMany({
      data: chunks.map((chunk) => ({
        documentId,
        content: chunk.content,
        chunkIndex: chunk.chunkIndex,
        startPos: chunk.startPos,
        endPos: chunk.endPos,
        metadata: chunk.metadata,
      })),
    });
  }

  /**
   * Bulk upload documents
   */
  async bulkUpload(
    files: Express.Multer.File[],
    userId: string,
    dto: UploadDocumentDto,
  ): Promise<BulkUploadResultDto> {
    const successful: DocumentResponseDto[] = [];
    const failed: Array<{ filename: string; error: string }> = [];

    for (const file of files) {
      try {
        const result = await this.uploadDocument(file, userId, dto);
        successful.push(result);
      } catch (error) {
        this.logger.error(`Failed to upload ${file.originalname}:`, error);
        failed.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    return {
      successful,
      failed,
      total: files.length,
      successCount: successful.length,
      failureCount: failed.length,
    };
  }

  /**
   * Get document by ID
   */
  async findOne(id: string, userId: string): Promise<DocumentResponseDto> {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        chunks: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    return this.mapToResponseDto(document);
  }

  /**
   * Get all documents with filtering and pagination
   */
  async findAll(
    userId: string,
    filter: FilterDocumentDto,
  ): Promise<PaginatedDocumentResponseDto> {
    const where: any = {
      userId,
    };

    // Apply filters
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { content: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.workspaceId) {
      where.workspaceId = filter.workspaceId;
    }

    if (filter.agentId) {
      where.agentId = filter.agentId;
    }

    if (filter.tags && filter.tags.length > 0) {
      where.tags = {
        hasSome: filter.tags,
      };
    }

    if (filter.source) {
      where.source = filter.source;
    }

    if (filter.mimeType) {
      where.mimeType = filter.mimeType;
    }

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) {
        where.createdAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.createdAt.lte = filter.endDate;
      }
    }

    const [documents, total] = await Promise.all([
      this.prisma.knowledgeDocument.findMany({
        where,
        orderBy: { [filter.sortBy || 'createdAt']: filter.sortOrder || 'desc' },
        skip: ((filter.page || 1) - 1) * (filter.limit || 20),
        take: filter.limit || 20,
        include: {
          chunks: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.knowledgeDocument.count({ where }),
    ]);

    const page = filter.page || 1;
    const limit = filter.limit || 20;

    return {
      data: documents.map((doc) => this.mapToResponseDto(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete document (cascade to chunks)
   */
  async delete(id: string, userId: string): Promise<void> {
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id, userId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Delete document (chunks will be cascade deleted)
    await this.prisma.knowledgeDocument.delete({
      where: { id },
    });

    this.logger.log(`Document ${id} deleted with all chunks`);
  }

  /**
   * Get document chunks
   */
  async getChunks(
    documentId: string,
    userId: string,
  ): Promise<DocumentChunkResponseDto[]> {
    // Verify document belongs to user
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    const chunks = await this.prisma.documentChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    return chunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      startPos: chunk.startPos,
      endPos: chunk.endPos,
      tokenCount: chunk.tokenCount,
      metadata: chunk.metadata,
      createdAt: chunk.createdAt,
    }));
  }

  /**
   * Create a new version of a document
   */
  async createVersion(
    documentId: string,
    file: Express.Multer.File,
    userId: string,
    dto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    // Get original document
    const original = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!original) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Upload new version
    const newVersion = await this.uploadDocument(file, userId, dto);

    // Update to link to parent
    await this.prisma.knowledgeDocument.update({
      where: { id: newVersion.id },
      data: {
        parentDocumentId: documentId,
        version: original.version + 1,
      },
    });

    this.logger.log(
      `Created version ${original.version + 1} for document ${documentId}`,
    );

    return newVersion;
  }

  /**
   * Get document versions
   */
  async getVersions(
    documentId: string,
    userId: string,
  ): Promise<DocumentResponseDto[]> {
    // Verify document belongs to user
    const document = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    // Get all versions (including the original)
    const versions = await this.prisma.knowledgeDocument.findMany({
      where: {
        OR: [
          { id: documentId },
          { parentDocumentId: documentId },
        ],
      },
      orderBy: { version: 'asc' },
    });

    return versions.map((v) => this.mapToResponseDto(v));
  }

  /**
   * Search documents
   */
  async search(
    userId: string,
    dto: SearchQueryDto,
  ): Promise<SearchResponseDto> {
    const startTime = Date.now();

    this.logger.log(`Performing ${dto.searchType} search: "${dto.query}"`);

    let results;

    switch (dto.searchType) {
      case SearchType.VECTOR:
        const queryEmbedding = await this.embeddingService.generateQueryEmbedding(
          dto.query,
        );
        results = await this.vectorSearchService.searchSimilarChunks(
          queryEmbedding,
          {
            topK: dto.topK,
            similarityThreshold: dto.similarityThreshold,
            workspaceId: dto.workspaceId,
            agentId: dto.agentId,
            documentIds: dto.documentIds,
            tags: dto.tags,
          },
        );
        break;

      case SearchType.KEYWORD:
        results = await this.hybridSearchService.keywordSearch(dto.query, {
          topK: dto.topK,
          workspaceId: dto.workspaceId,
          agentId: dto.agentId,
          documentIds: dto.documentIds,
          tags: dto.tags,
        });
        break;

      case SearchType.HYBRID:
      default:
        results = await this.hybridSearchService.search(dto.query, {
          topK: dto.topK,
          vectorWeight: dto.vectorWeight,
          keywordWeight: dto.keywordWeight,
          similarityThreshold: dto.similarityThreshold,
          minKeywordMatches: dto.minKeywordMatches,
          workspaceId: dto.workspaceId,
          agentId: dto.agentId,
          documentIds: dto.documentIds,
          tags: dto.tags,
        });
        break;
    }

    const executionTimeMs = Date.now() - startTime;

    return {
      results: results.map((r) => ({
        chunkId: r.chunkId,
        documentId: r.documentId,
        content: r.content,
        similarity: r.similarity,
        chunkIndex: r.chunkIndex,
        metadata: r.metadata,
        document: r.document,
        vectorScore: r.vectorScore,
        keywordScore: r.keywordScore,
        hybridScore: r.hybridScore,
        matchedKeywords: r.matchedKeywords,
      })),
      query: dto.query,
      searchType: dto.searchType || SearchType.HYBRID,
      count: results.length,
      executionTimeMs,
    };
  }

  /**
   * Generate embeddings for document chunks
   */
  async generateEmbeddings(
    userId: string,
    dto: GenerateEmbeddingsDto,
  ): Promise<{ processed: number; failed: number }> {
    this.logger.log(`Generating embeddings (batchSize: ${dto.batchSize})`);

    // Get chunks that need embeddings
    const where: any = {
      document: { userId },
    };

    if (dto.documentId) {
      where.documentId = dto.documentId;
    }

    if (!dto.forceRegenerate) {
      where.embedding = null;
    }

    const chunks = await this.prisma.documentChunk.findMany({
      where,
      take: dto.batchSize,
      select: {
        id: true,
        content: true,
      },
    });

    if (chunks.length === 0) {
      this.logger.log('No chunks need embeddings');
      return { processed: 0, failed: 0 };
    }

    this.logger.log(`Generating embeddings for ${chunks.length} chunks`);

    // Generate embeddings in batch
    const texts = chunks.map((c) => c.content);
    const batchResult = await this.embeddingService.generateBatchEmbeddings(texts);

    // Update chunks with embeddings
    const updates = chunks.map((chunk, index) => ({
      chunkId: chunk.id,
      embedding: batchResult.embeddings[index].embedding,
    }));

    const processed = await this.vectorSearchService.updateChunkEmbeddings(updates);
    const failed = chunks.length - processed;

    this.logger.log(
      `Embedding generation complete: ${processed} processed, ${failed} failed`,
    );

    return { processed, failed };
  }

  /**
   * Get embedding statistics
   */
  async getEmbeddingStatistics(): Promise<EmbeddingStatisticsDto> {
    return await this.vectorSearchService.getEmbeddingStatistics();
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToResponseDto(document: any): DocumentResponseDto {
    return {
      id: document.id,
      title: document.title,
      filename: document.filename,
      content: document.content?.substring(0, 500), // Truncate for response
      summary: document.summary,
      source: document.source,
      sourceUrl: document.sourceUrl,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      fileHash: document.fileHash,
      status: document.status,
      metadata: document.metadata,
      processingConfig: document.processingConfig,
      version: document.version,
      parentDocumentId: document.parentDocumentId,
      workspaceId: document.workspaceId,
      agentId: document.agentId,
      userId: document.userId,
      tags: document.tags,
      chunkCount: document.chunks?.length,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }
}
