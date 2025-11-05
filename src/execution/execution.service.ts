import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ExecutionStatus, ExecutionProvider } from '@prisma/client';
import { OpenAIProvider } from './providers/openai.provider';
import { AnthropicProvider } from './providers/anthropic.provider';
import { CacheService } from './services/cache.service';
import { TokenCounterService } from './services/token-counter.service';
import { CostCalculatorService } from './services/cost-calculator.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { ExecuteAgentDto, ExecutionResponseDto, FilterExecutionDto, ExecutionStatisticsDto } from './dto';
import { AIProvider, AIMessage } from './interfaces/ai-provider.interface';

@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);
  private readonly providers: Map<string, AIProvider> = new Map();
  private readonly maxRetries = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  constructor(
    private readonly prisma: PrismaService,
    private readonly openaiProvider: OpenAIProvider,
    private readonly anthropicProvider: AnthropicProvider,
    private readonly cacheService: CacheService,
    private readonly tokenCounter: TokenCounterService,
    private readonly costCalculator: CostCalculatorService,
    private readonly rateLimiter: RateLimiterService,
  ) {
    // Register providers
    this.providers.set('openai', this.openaiProvider);
    this.providers.set('anthropic', this.anthropicProvider);
  }

  /**
   * Execute an agent with the given prompt
   */
  async execute(
    agentId: string,
    userId: string,
    dto: ExecuteAgentDto,
  ): Promise<ExecutionResponseDto> {
    const startTime = Date.now();

    // Get agent with configuration
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId, deletedAt: null },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Check rate limits
    await this.checkRateLimits(agent, userId);

    // Get model configuration
    const config = agent.config as any;
    const model = this.getModelName(config);
    const provider = this.getProvider(model);

    // Check cache if enabled
    if (dto.enableCache !== false) {
      const cacheKey = this.cacheService.generateCacheKey(
        agentId,
        dto.prompt,
        dto.context,
        config,
      );

      const cached = await this.cacheService.get<ExecutionResponseDto>(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for execution: ${cacheKey}`);
        return {
          ...cached,
          cached: true,
          cacheKey,
        };
      }
    }

    // Create execution record
    const execution = await this.prisma.agentExecution.create({
      data: {
        agentId,
        userId,
        sessionId: dto.sessionId,
        status: ExecutionStatus.PENDING,
        provider: this.mapProviderToEnum(provider.getProviderName()),
        model,
        prompt: dto.prompt,
        context: dto.context,
        metadata: dto.metadata,
      },
    });

    try {
      // Update status to RUNNING
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: { status: ExecutionStatus.RUNNING },
      });

      // Record execution start for concurrent tracking
      await this.rateLimiter.recordExecutionStart(agentId, userId);

      // Build messages
      const messages: AIMessage[] = [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: dto.prompt },
      ];

      // Execute with retry logic
      const result = await this.executeWithRetry(provider, messages, config, execution.id);

      // Calculate cost
      const cost = this.costCalculator.calculateCost(
        model,
        result.inputTokens,
        result.outputTokens,
        agent.costTrackingConfig as any,
      );

      const latencyMs = Date.now() - startTime;

      // Update execution record
      const updatedExecution = await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.COMPLETED,
          response: result.content,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          totalTokens: result.totalTokens,
          cost: cost.totalCost,
          latencyMs,
          completedAt: new Date(),
        },
      });

      // Record execution end
      await this.rateLimiter.recordExecutionEnd(agentId, userId);

      // Cache the result if enabled
      if (dto.enableCache !== false) {
        const cacheKey = this.cacheService.generateCacheKey(
          agentId,
          dto.prompt,
          dto.context,
          config,
        );
        await this.cacheService.set(
          cacheKey,
          this.mapToResponseDto(updatedExecution),
          dto.cacheTTL,
        );
      }

      return this.mapToResponseDto(updatedExecution);
    } catch (error) {
      this.logger.error(`Execution failed for agent ${agentId}:`, error);

      // Record execution end
      await this.rateLimiter.recordExecutionEnd(agentId, userId);

      // Update execution record with error
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      throw new InternalServerErrorException(
        `Agent execution failed: ${error.message}`,
      );
    }
  }

  /**
   * Execute an agent with streaming response
   */
  async *executeStream(
    agentId: string,
    userId: string,
    dto: ExecuteAgentDto,
  ): AsyncGenerator<string> {
    const startTime = Date.now();

    // Get agent with configuration
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId, deletedAt: null },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    // Check rate limits
    await this.checkRateLimits(agent, userId);

    // Get model configuration
    const config = agent.config as any;
    const model = this.getModelName(config);
    const provider = this.getProvider(model);

    // Create execution record
    const execution = await this.prisma.agentExecution.create({
      data: {
        agentId,
        userId,
        sessionId: dto.sessionId,
        status: ExecutionStatus.RUNNING,
        provider: this.mapProviderToEnum(provider.getProviderName()),
        model,
        prompt: dto.prompt,
        context: dto.context,
        metadata: dto.metadata,
      },
    });

    try {
      // Record execution start
      await this.rateLimiter.recordExecutionStart(agentId, userId);

      // Build messages
      const messages: AIMessage[] = [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: dto.prompt },
      ];

      let fullResponse = '';
      let inputTokens = 0;
      let outputTokens = 0;

      // Stream response
      for await (const chunk of provider.executeStream(messages, {
        model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        stopSequences: config.stopSequences,
        streaming: true,
      })) {
        if (chunk.content) {
          fullResponse += chunk.content;
          yield chunk.content;
        }
      }

      // Count tokens after streaming completes
      inputTokens = await this.tokenCounter.countTokens(
        messages.map((m) => m.content).join(' '),
        model,
      );
      outputTokens = await this.tokenCounter.countTokens(fullResponse, model);

      // Calculate cost
      const cost = this.costCalculator.calculateCost(
        model,
        inputTokens,
        outputTokens,
        agent.costTrackingConfig as any,
      );

      const latencyMs = Date.now() - startTime;

      // Update execution record
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.COMPLETED,
          response: fullResponse,
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens,
          cost: cost.totalCost,
          latencyMs,
          completedAt: new Date(),
        },
      });

      // Record execution end
      await this.rateLimiter.recordExecutionEnd(agentId, userId);
    } catch (error) {
      this.logger.error(`Streaming execution failed for agent ${agentId}:`, error);

      // Record execution end
      await this.rateLimiter.recordExecutionEnd(agentId, userId);

      // Update execution record with error
      await this.prisma.agentExecution.update({
        where: { id: execution.id },
        data: {
          status: ExecutionStatus.FAILED,
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Get execution history for an agent
   */
  async getExecutionHistory(
    agentId: string,
    userId: string,
    filter: FilterExecutionDto,
  ): Promise<any> {
    // Verify agent access
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        OR: [{ ownerId: userId }, { isPublic: true }],
        deletedAt: null,
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const where: any = {
      agentId,
      userId,
    };

    // Apply filters
    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.provider) {
      where.provider = filter.provider;
    }

    if (filter.sessionId) {
      where.sessionId = filter.sessionId;
    }

    if (filter.model) {
      where.model = filter.model;
    }

    if (filter.cached !== undefined) {
      where.cached = filter.cached;
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

    const [executions, total] = await Promise.all([
      this.prisma.agentExecution.findMany({
        where,
        orderBy: { [filter.sortBy || 'createdAt']: filter.sortOrder || 'desc' },
        skip: ((filter.page || 1) - 1) * (filter.limit || 20),
        take: filter.limit || 20,
      }),
      this.prisma.agentExecution.count({ where }),
    ]);

    const page = filter.page || 1;
    const limit = filter.limit || 20;

    return {
      data: executions.map((e) => this.mapToResponseDto(e)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get execution statistics for an agent
   */
  async getExecutionStatistics(
    agentId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ExecutionStatisticsDto> {
    // Verify agent access
    const agent = await this.prisma.agent.findFirst({
      where: {
        id: agentId,
        OR: [{ ownerId: userId }, { isPublic: true }],
        deletedAt: null,
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID ${agentId} not found`);
    }

    const where: any = { agentId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const executions = await this.prisma.agentExecution.findMany({
      where,
    });

    const totalExecutions = executions.length;
    const successfulExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.COMPLETED,
    ).length;
    const failedExecutions = executions.filter(
      (e) => e.status === ExecutionStatus.FAILED,
    ).length;
    const cachedExecutions = executions.filter((e) => e.cached).length;

    const totalTokens = executions.reduce(
      (sum, e) => sum + (e.totalTokens || 0),
      0,
    );
    const totalInputTokens = executions.reduce(
      (sum, e) => sum + (e.inputTokens || 0),
      0,
    );
    const totalOutputTokens = executions.reduce(
      (sum, e) => sum + (e.outputTokens || 0),
      0,
    );
    const totalCost = executions.reduce((sum, e) => sum + (e.cost || 0), 0);

    const latencies = executions
      .filter((e) => e.latencyMs)
      .map((e) => e.latencyMs!);
    const averageLatency =
      latencies.length > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length
        : 0;

    return {
      totalExecutions,
      successfulExecutions,
      failedExecutions,
      successRate:
        totalExecutions > 0
          ? (successfulExecutions / totalExecutions) * 100
          : 0,
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCost,
      averageLatency: Math.round(averageLatency),
      cachedExecutions,
      cacheHitRate:
        totalExecutions > 0 ? (cachedExecutions / totalExecutions) * 100 : 0,
      cacheSavings: 0, // Could be calculated based on cached execution costs
    };
  }

  /**
   * Execute with exponential backoff retry
   */
  private async executeWithRetry(
    provider: AIProvider,
    messages: AIMessage[],
    config: any,
    executionId: string,
    attempt: number = 0,
  ): Promise<any> {
    try {
      return await provider.execute(messages, {
        model: this.getModelName(config),
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        topP: config.topP,
        frequencyPenalty: config.frequencyPenalty,
        presencePenalty: config.presencePenalty,
        stopSequences: config.stopSequences,
      });
    } catch (error) {
      if (attempt < this.maxRetries) {
        const delay = this.baseRetryDelay * Math.pow(2, attempt);
        this.logger.warn(
          `Execution attempt ${attempt + 1} failed, retrying in ${delay}ms...`,
        );

        // Update retry count
        await this.prisma.agentExecution.update({
          where: { id: executionId },
          data: { retryCount: attempt + 1 },
        });

        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeWithRetry(provider, messages, config, executionId, attempt + 1);
      }

      throw error;
    }
  }

  /**
   * Check rate limits for agent and user
   */
  private async checkRateLimits(agent: any, userId: string): Promise<void> {
    const agentRateLimitConfig = agent.rateLimitConfig as any;

    await this.rateLimiter.checkAgentRateLimit(
      agent.id,
      userId,
      agentRateLimitConfig || { enabled: false },
    );
  }

  /**
   * Get provider for a model
   */
  private getProvider(model: string): AIProvider {
    if (this.openaiProvider.supportsModel(model)) {
      return this.openaiProvider;
    } else if (this.anthropicProvider.supportsModel(model)) {
      return this.anthropicProvider;
    }

    throw new BadRequestException(`Unsupported model: ${model}`);
  }

  /**
   * Get model name from config
   */
  private getModelName(config: any): string {
    if (config.modelType === 'CUSTOM' && config.customModelName) {
      return config.customModelName;
    }
    return config.modelType || 'gpt-4o';
  }

  /**
   * Map provider name to enum
   */
  private mapProviderToEnum(providerName: string): ExecutionProvider {
    switch (providerName.toLowerCase()) {
      case 'openai':
        return ExecutionProvider.OPENAI;
      case 'anthropic':
        return ExecutionProvider.ANTHROPIC;
      default:
        return ExecutionProvider.CUSTOM;
    }
  }

  /**
   * Map execution to response DTO
   */
  private mapToResponseDto(execution: any): ExecutionResponseDto {
    return {
      id: execution.id,
      agentId: execution.agentId,
      userId: execution.userId,
      sessionId: execution.sessionId,
      status: execution.status,
      provider: execution.provider,
      model: execution.model,
      prompt: execution.prompt,
      context: execution.context,
      response: execution.response,
      inputTokens: execution.inputTokens,
      outputTokens: execution.outputTokens,
      totalTokens: execution.totalTokens,
      cost: execution.cost,
      latencyMs: execution.latencyMs,
      cached: execution.cached,
      cacheKey: execution.cacheKey,
      retryCount: execution.retryCount,
      errorMessage: execution.errorMessage,
      metadata: execution.metadata,
      createdAt: execution.createdAt,
      completedAt: execution.completedAt,
    };
  }
}
