import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RAGService } from './services/rag.service';
import { ABTestingService } from './services/ab-testing.service';
import {
  RAGQueryDto,
  RAGResponseDto,
  RAGFeedbackDto,
  RAGStrategyDto,
  RefreshKnowledgeResultDto,
} from './dto';

@ApiTags('RAG (Retrieval Augmented Generation)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rag')
export class RAGController {
  constructor(
    private readonly ragService: RAGService,
    private readonly abTestingService: ABTestingService,
  ) {}

  @Post('query')
  @ApiOperation({
    summary: 'Query knowledge base with RAG',
    description:
      'Retrieves relevant context from knowledge base and generates AI response with citations',
  })
  @ApiResponse({
    status: 200,
    description: 'RAG response generated successfully',
    type: RAGResponseDto,
  })
  async query(
    @CurrentUser() user: any,
    @Body() dto: RAGQueryDto,
  ): Promise<RAGResponseDto> {
    // Check if user is in A/B test
    const testVariant = this.abTestingService.selectVariant('default-rag-test', user.id);

    if (testVariant) {
      dto.strategy = testVariant.strategy.name;
    }

    const response = await this.ragService.query(dto.query, user.id, {
      strategy: dto.strategy,
      agentId: dto.agentId,
      workspaceId: dto.workspaceId,
      documentIds: dto.documentIds,
      tags: dto.tags,
      includeHistory: dto.includeHistory,
      conversationHistory: dto.conversationHistory,
      customInstructions: dto.customInstructions,
    });

    // Record A/B test result
    if (testVariant) {
      await this.abTestingService.recordTestResult(
        'default-rag-test',
        testVariant.id,
        user.id,
        response,
      );
    }

    return response as RAGResponseDto;
  }

  @Post('query/:responseId/feedback')
  @ApiOperation({ summary: 'Submit feedback for RAG response' })
  @ApiResponse({
    status: 200,
    description: 'Feedback submitted successfully',
  })
  async submitFeedback(
    @Param('responseId') responseId: string,
    @CurrentUser() user: any,
    @Body() dto: RAGFeedbackDto,
  ): Promise<{ message: string }> {
    // In production, this would store feedback in database
    // and update A/B test metrics
    return { message: 'Feedback submitted successfully' };
  }

  @Get('strategies')
  @ApiOperation({ summary: 'Get available RAG strategies' })
  @ApiResponse({
    status: 200,
    description: 'List of available strategies',
    type: [RAGStrategyDto],
  })
  getStrategies(): RAGStrategyDto[] {
    return this.ragService.getStrategies() as RAGStrategyDto[];
  }

  @Get('strategies/:name')
  @ApiOperation({ summary: 'Get strategy details' })
  @ApiResponse({
    status: 200,
    description: 'Strategy details',
    type: RAGStrategyDto,
  })
  @ApiResponse({ status: 404, description: 'Strategy not found' })
  getStrategy(@Param('name') name: string): RAGStrategyDto | null {
    const strategy = this.ragService.getStrategy(name);
    return strategy ? (strategy as RAGStrategyDto) : null;
  }

  @Post('knowledge/refresh')
  @ApiOperation({
    summary: 'Refresh knowledge base embeddings',
    description: 'Generate embeddings for documents without them',
  })
  @ApiResponse({
    status: 200,
    description: 'Knowledge refresh completed',
    type: RefreshKnowledgeResultDto,
  })
  async refreshKnowledge(
    @Query('workspaceId') workspaceId?: string,
    @Query('agentId') agentId?: string,
  ): Promise<RefreshKnowledgeResultDto> {
    return await this.ragService.refreshKnowledge(workspaceId, agentId);
  }

  @Get('ab-tests')
  @ApiOperation({ summary: 'Get active A/B tests' })
  @ApiResponse({
    status: 200,
    description: 'List of active A/B tests',
  })
  getActiveTests(): any[] {
    return this.abTestingService.getActiveTests();
  }

  @Get('ab-tests/:testId/results')
  @ApiOperation({ summary: 'Get A/B test results' })
  @ApiResponse({
    status: 200,
    description: 'A/B test results',
  })
  @ApiResponse({ status: 404, description: 'Test not found' })
  getTestResults(@Param('testId') testId: string): any {
    return this.abTestingService.exportTestResults(testId);
  }

  @Get('ab-tests/:testId/winner')
  @ApiOperation({ summary: 'Get A/B test winner' })
  @ApiResponse({
    status: 200,
    description: 'Winning variant',
  })
  @ApiResponse({ status: 404, description: 'Test not found' })
  getTestWinner(@Param('testId') testId: string): any {
    return this.abTestingService.determineWinner(testId);
  }
}
