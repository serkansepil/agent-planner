import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { HybridSearchService } from '../../knowledge/services/hybrid-search.service';
import { EmbeddingService } from '../../knowledge/services/embedding.service';
import { ExecutionService } from '../../execution/execution.service';
import { ContextBuilderService } from './context-builder.service';
import { PromptEngineerService } from './prompt-engineer.service';
import { CitationTrackerService } from './citation-tracker.service';
import { ConfidenceScorerService } from './confidence-scorer.service';
import { RAGResponse, RAGStrategy, RAGContext } from '../interfaces/rag.interface';

export interface RAGQueryOptions {
  strategy?: string;
  agentId?: string;
  workspaceId?: string;
  documentIds?: string[];
  tags?: string[];
  includeHistory?: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
  customInstructions?: string;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private readonly strategies: Map<string, RAGStrategy> = new Map();
  private readonly defaultStrategy: string = 'balanced';

  constructor(
    private readonly prisma: PrismaService,
    private readonly hybridSearch: HybridSearchService,
    private readonly embeddingService: EmbeddingService,
    private readonly executionService: ExecutionService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly promptEngineer: PromptEngineerService,
    private readonly citationTracker: CitationTrackerService,
    private readonly confidenceScorer: ConfidenceScorerService,
  ) {
    this.initializeStrategies();
  }

  /**
   * Main RAG query method
   */
  async query(
    query: string,
    userId: string,
    options: RAGQueryOptions = {},
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    this.logger.log(`RAG query: "${query.substring(0, 100)}..."`);

    // Get strategy
    const strategyName = options.strategy || this.defaultStrategy;
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(`Strategy ${strategyName} not found`);
    }

    try {
      // Step 1: Retrieve relevant context
      const searchResults = await this.hybridSearch.search(query, {
        topK: strategy.retrievalConfig.topK,
        similarityThreshold: strategy.retrievalConfig.similarityThreshold,
        vectorWeight: strategy.retrievalConfig.vectorWeight,
        keywordWeight: strategy.retrievalConfig.keywordWeight,
        workspaceId: options.workspaceId,
        agentId: options.agentId,
        documentIds: options.documentIds,
        tags: options.tags,
      });

      this.logger.debug(`Retrieved ${searchResults.length} search results`);

      // Check if we have relevant context
      if (searchResults.length === 0 || searchResults[0].similarity < 0.5) {
        return await this.handleFallback(query, userId, strategy, startTime);
      }

      // Step 2: Build context
      const context = await this.contextBuilder.buildContext(
        searchResults,
        strategy.contextConfig,
      );

      this.logger.debug(`Built context with ${context.totalChunks} chunks`);

      // Step 3: Generate prompt
      const prompt = this.promptEngineer.buildPrompt(
        query,
        context,
        strategyName,
        options.customInstructions,
      );

      // Step 4: Generate response using LLM
      const llmResponse = await this.generateLLMResponse(
        prompt,
        userId,
        strategy,
        options,
      );

      // Step 5: Track citations
      const citations = this.citationTracker.generateCitations(context, llmResponse.response);

      // Step 6: Calculate confidence
      const confidence = this.confidenceScorer.calculateConfidence(
        query,
        context,
        llmResponse.response,
        citations,
      );

      const executionTimeMs = Date.now() - startTime;

      const ragResponse: RAGResponse = {
        answer: llmResponse.response,
        context,
        citations,
        confidence,
        strategy: strategyName,
        executionTimeMs,
        model: llmResponse.model,
        tokensUsed: {
          input: llmResponse.inputTokens,
          output: llmResponse.outputTokens,
          total: llmResponse.totalTokens,
        },
        fallbackUsed: false,
      };

      this.logger.log(
        `RAG query completed in ${executionTimeMs}ms (confidence: ${(confidence.overall * 100).toFixed(1)}%)`,
      );

      return ragResponse;
    } catch (error) {
      this.logger.error('RAG query error:', error);
      return await this.handleFallback(query, userId, strategy, startTime);
    }
  }

  /**
   * Handle fallback when no relevant knowledge found
   */
  private async handleFallback(
    query: string,
    userId: string,
    strategy: RAGStrategy,
    startTime: number,
  ): Promise<RAGResponse> {
    this.logger.warn('No relevant context found, using fallback');

    const fallbackPrompt = this.promptEngineer.buildFallbackPrompt(query);

    const llmResponse = await this.generateLLMResponse(
      fallbackPrompt,
      userId,
      strategy,
      {},
    );

    const executionTimeMs = Date.now() - startTime;

    return {
      answer: llmResponse.response,
      context: {
        chunks: [],
        totalChunks: 0,
        totalTokens: 0,
        relevanceScores: [],
        averageRelevance: 0,
      },
      citations: [],
      confidence: {
        overall: 0.3, // Low confidence for fallback
        factors: {
          contextRelevance: 0,
          contextCoverage: 0,
          answerCoherence: 0.6,
          citationStrength: 0,
        },
        explanation:
          'No relevant knowledge found in database. Response based on general knowledge only.',
      },
      strategy: 'fallback',
      executionTimeMs,
      model: llmResponse.model,
      tokensUsed: {
        input: llmResponse.inputTokens,
        output: llmResponse.outputTokens,
        total: llmResponse.totalTokens,
      },
      fallbackUsed: true,
    };
  }

  /**
   * Generate LLM response
   */
  private async generateLLMResponse(
    prompt: { systemPrompt: string; userPrompt: string },
    userId: string,
    strategy: RAGStrategy,
    options: RAGQueryOptions,
  ): Promise<{
    response: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  }> {
    // For now, we'll use a simplified approach
    // In a full implementation, this would call the ExecutionService
    // with proper agent configuration

    // Placeholder: Would integrate with ExecutionService here
    return {
      response: 'This is a placeholder response. Integration with ExecutionService needed.',
      model: 'gpt-4o',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  /**
   * Refresh knowledge base
   */
  async refreshKnowledge(
    workspaceId?: string,
    agentId?: string,
  ): Promise<{
    documentsProcessed: number;
    embeddingsGenerated: number;
    durationMs: number;
  }> {
    const startTime = Date.now();

    this.logger.log('Starting knowledge base refresh');

    // Get documents that need embedding updates
    const where: any = {
      status: 'COMPLETED',
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    const documents = await this.prisma.knowledgeDocument.findMany({
      where,
    });

    let embeddingsGenerated = 0;

    // Process each document - use raw SQL to find chunks without embeddings
    for (const document of documents) {
      try {
        const chunks: any[] = await this.prisma.$queryRaw`
          SELECT id, content
          FROM document_chunks
          WHERE "documentId" = ${document.id}::uuid
            AND embedding IS NULL
        `;

        if (chunks.length > 0) {
          const texts = chunks.map((c) => c.content);
          const result = await this.embeddingService.generateBatchEmbeddings(texts);

          // Update chunks with embeddings (would need vector search service)
          embeddingsGenerated += result.embeddings.length;
        }
      } catch (error) {
        this.logger.error(`Error processing document ${document.id}:`, error);
      }
    }

    const durationMs = Date.now() - startTime;

    this.logger.log(
      `Knowledge refresh complete: ${documents.length} documents, ${embeddingsGenerated} embeddings in ${durationMs}ms`,
    );

    return {
      documentsProcessed: documents.length,
      embeddingsGenerated,
      durationMs,
    };
  }

  /**
   * Initialize default strategies
   */
  private initializeStrategies(): void {
    // Balanced strategy (default)
    this.strategies.set('balanced', {
      name: 'Balanced',
      description: 'Balanced approach with hybrid search and detailed responses',
      retrievalConfig: {
        topK: 5,
        similarityThreshold: 0.7,
        searchType: 'hybrid',
        vectorWeight: 0.7,
        keywordWeight: 0.3,
      },
      contextConfig: {
        maxTokens: 3000,
        chunkSeparator: '\n\n---\n\n',
        includeMetadata: true,
        deduplication: true,
        reranking: false,
      },
      promptConfig: {
        systemPrompt: 'You are a helpful AI assistant with access to a knowledge base.',
        contextTemplate: '# Context\n\n{context}\n\n',
        includeInstructions: true,
      },
      generationConfig: {
        temperature: 0.7,
        maxTokens: 1000,
        topP: 0.9,
      },
    });

    // Precise strategy (focus on accuracy)
    this.strategies.set('precise', {
      name: 'Precise',
      description: 'Emphasizes accuracy with stricter retrieval',
      retrievalConfig: {
        topK: 3,
        similarityThreshold: 0.8,
        searchType: 'vector',
      },
      contextConfig: {
        maxTokens: 2000,
        chunkSeparator: '\n\n---\n\n',
        includeMetadata: true,
        deduplication: true,
        reranking: false,
      },
      promptConfig: {
        systemPrompt: 'You are a precise AI assistant. Only provide information from the given context.',
        contextTemplate: '# Context\n\n{context}\n\n',
        includeInstructions: true,
      },
      generationConfig: {
        temperature: 0.3,
        maxTokens: 800,
        topP: 0.9,
      },
    });

    // Comprehensive strategy (more context)
    this.strategies.set('comprehensive', {
      name: 'Comprehensive',
      description: 'Provides detailed answers with more context',
      retrievalConfig: {
        topK: 10,
        similarityThreshold: 0.6,
        searchType: 'hybrid',
        vectorWeight: 0.6,
        keywordWeight: 0.4,
      },
      contextConfig: {
        maxTokens: 5000,
        chunkSeparator: '\n\n---\n\n',
        includeMetadata: true,
        deduplication: true,
        reranking: false,
      },
      promptConfig: {
        systemPrompt: 'You are a comprehensive AI assistant. Provide detailed, well-researched answers.',
        contextTemplate: '# Context\n\n{context}\n\n',
        includeInstructions: true,
      },
      generationConfig: {
        temperature: 0.7,
        maxTokens: 1500,
        topP: 0.9,
      },
    });

    this.logger.log(`Initialized ${this.strategies.size} RAG strategies`);
  }

  /**
   * Get available strategies
   */
  getStrategies(): RAGStrategy[] {
    return Array.from(this.strategies.values());
  }

  /**
   * Register custom strategy
   */
  registerStrategy(name: string, strategy: RAGStrategy): void {
    this.strategies.set(name, strategy);
    this.logger.log(`Registered custom strategy: ${name}`);
  }

  /**
   * Get strategy by name
   */
  getStrategy(name: string): RAGStrategy | undefined {
    return this.strategies.get(name);
  }
}
