import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExecutionService } from './execution.service';
import {
  ExecuteAgentDto,
  ExecutionResponseDto,
  FilterExecutionDto,
  ExecutionStatisticsDto,
  PaginatedExecutionResponseDto,
} from './dto';

@ApiTags('Agent Execution')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents/:agentId/execute')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post()
  @ApiOperation({ summary: 'Execute an agent with a prompt' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({
    status: 201,
    description: 'Agent executed successfully',
    type: ExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async execute(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Body() dto: ExecuteAgentDto,
  ): Promise<ExecutionResponseDto> {
    // If streaming is requested, use SSE endpoint instead
    if (dto.streaming) {
      throw new Error(
        'For streaming responses, use the /stream endpoint with Server-Sent Events',
      );
    }

    return await this.executionService.execute(agentId, user.id, dto);
  }

  @Post('stream')
  @Sse()
  @ApiOperation({
    summary: 'Execute an agent with streaming response (Server-Sent Events)',
  })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({
    status: 200,
    description: 'Streaming response started',
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async executeStream(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Body() dto: ExecuteAgentDto,
  ): Promise<Observable<MessageEvent>> {
    return new Observable<MessageEvent>((observer) => {
      (async () => {
        try {
          for await (const chunk of this.executionService.executeStream(
            agentId,
            user.id,
            dto,
          )) {
            observer.next({
              data: chunk,
            });
          }
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }

  @Get('history')
  @ApiOperation({ summary: 'Get execution history for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'provider', required: false })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiQuery({ name: 'model', required: false })
  @ApiQuery({ name: 'cached', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sortBy', required: false })
  @ApiQuery({ name: 'sortOrder', required: false })
  @ApiResponse({
    status: 200,
    description: 'Execution history retrieved successfully',
    type: PaginatedExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getHistory(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Query() filter: FilterExecutionDto,
  ): Promise<PaginatedExecutionResponseDto> {
    return await this.executionService.getExecutionHistory(
      agentId,
      user.id,
      filter,
    );
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get execution statistics for an agent' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date for statistics',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date for statistics',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: ExecutionStatisticsDto,
  })
  @ApiResponse({ status: 404, description: 'Agent not found' })
  async getStatistics(
    @Param('agentId') agentId: string,
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ExecutionStatisticsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return await this.executionService.getExecutionStatistics(
      agentId,
      user.id,
      start,
      end,
    );
  }

  @Get(':executionId')
  @ApiOperation({ summary: 'Get a specific execution by ID' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({
    status: 200,
    description: 'Execution retrieved successfully',
    type: ExecutionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Execution not found' })
  async getExecution(
    @Param('agentId') agentId: string,
    @Param('executionId') executionId: string,
    @CurrentUser() user: any,
  ): Promise<ExecutionResponseDto> {
    // This would be implemented to get a single execution
    // For now, just a placeholder
    throw new Error('Not implemented');
  }
}
