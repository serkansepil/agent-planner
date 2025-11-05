import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrchestrationService } from './orchestration.service';
import {
  DelegateTaskDto,
  CreateWorkflowDto,
  ExecuteWorkflowDto,
  SendMessageDto,
} from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orchestration')
@Controller('workspaces/:workspaceId/orchestration')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrchestrationController {
  constructor(private readonly orchestrationService: OrchestrationService) {}

  // ==================== Context Management ====================

  @Post('context')
  @ApiOperation({ summary: 'Create or update execution context' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Context created/updated successfully' })
  async createContext(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { sessionId?: string; key: string; value: any },
  ) {
    await this.orchestrationService.updateContextValue(
      workspaceId,
      body.key,
      body.value,
      body.sessionId,
    );
    return { message: 'Context updated successfully' };
  }

  @Get('context/:key')
  @ApiOperation({ summary: 'Get context value' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'key', description: 'Context key' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 200, description: 'Context value retrieved' })
  async getContextValue(
    @Param('workspaceId') workspaceId: string,
    @Param('key') key: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const value = await this.orchestrationService.getContextValue(
      workspaceId,
      key,
      sessionId,
    );
    return { key, value };
  }

  @Get('context')
  @ApiOperation({ summary: 'Get full execution context' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 200, description: 'Execution context retrieved' })
  async getContext(
    @Param('workspaceId') workspaceId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const context = await this.orchestrationService.getExecutionContext(
      workspaceId,
      sessionId,
    );

    // Convert Maps to objects for JSON serialization
    return {
      workspaceId: context.workspaceId,
      sessionId: context.sessionId,
      sharedData: Object.fromEntries(context.sharedData),
      agentContexts: Object.fromEntries(context.agentContexts),
      globalVariables: context.globalVariables,
      metadata: context.metadata,
      createdAt: context.createdAt,
      updatedAt: context.updatedAt,
    };
  }

  @Post('context/agents/:agentId')
  @ApiOperation({ summary: 'Update agent-specific context' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiResponse({ status: 200, description: 'Agent context updated' })
  async updateAgentContext(
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Body() body: { context: Record<string, any>; sessionId?: string },
  ) {
    await this.orchestrationService.updateAgentContext(
      workspaceId,
      agentId,
      body.context,
      body.sessionId,
    );
    return { message: 'Agent context updated successfully' };
  }

  @Get('context/agents/:agentId')
  @ApiOperation({ summary: 'Get agent-specific context' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'agentId', description: 'Agent ID' })
  @ApiQuery({ name: 'sessionId', required: false })
  @ApiResponse({ status: 200, description: 'Agent context retrieved' })
  async getAgentContext(
    @Param('workspaceId') workspaceId: string,
    @Param('agentId') agentId: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const context = await this.orchestrationService.getAgentContext(
      workspaceId,
      agentId,
      sessionId,
    );
    return { agentId, context };
  }

  // ==================== Agent Communication ====================

  @Post('messages')
  @ApiOperation({ summary: 'Send message between agents' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { fromAgentId: string; message: SendMessageDto },
  ) {
    const message = await this.orchestrationService.sendMessage(
      workspaceId,
      body.fromAgentId,
      body.message,
    );
    return message;
  }

  @Get('messages')
  @ApiOperation({ summary: 'Get messages for agent or workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'agentId', required: false })
  @ApiQuery({ name: 'since', required: false, type: Date })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getMessages(
    @Param('workspaceId') workspaceId: string,
    @Query('agentId') agentId?: string,
    @Query('since') since?: string,
  ) {
    const messages = await this.orchestrationService.getMessages(
      workspaceId,
      agentId,
      since ? new Date(since) : undefined,
    );
    return { messages };
  }

  // ==================== Task Delegation ====================

  @Post('delegate')
  @ApiOperation({ summary: 'Delegate task to appropriate agent' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Task delegated successfully' })
  async delegateTask(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
    @Body() delegateDto: DelegateTaskDto,
  ) {
    return this.orchestrationService.delegateTask(
      workspaceId,
      user.id,
      delegateDto,
    );
  }

  @Post('agents/select')
  @ApiOperation({ summary: 'Select best agent for task' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Agent selected' })
  async selectAgent(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
    @Body()
    body: {
      requiredCapabilities?: string[];
      preferredRole?: string;
      strategy?: string;
    },
  ) {
    return this.orchestrationService.selectAgent(
      workspaceId,
      user.id,
      body.requiredCapabilities,
      body.preferredRole,
      body.strategy as any,
    );
  }

  @Post('tasks/:taskId/execute')
  @ApiOperation({ summary: 'Execute a delegated task' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task executed' })
  async executeTask(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
    @Body() body: { agentId: string; input?: any },
  ) {
    return this.orchestrationService.executeTask(
      taskId,
      body.agentId,
      body.input,
    );
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get task result' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'taskId', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task result retrieved' })
  async getTaskResult(
    @Param('workspaceId') workspaceId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.orchestrationService.getTaskResult(taskId);
  }

  // ==================== Workflow Management ====================

  @Post('workflows')
  @ApiOperation({ summary: 'Create workflow definition' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createWorkflow(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
    @Body() createDto: CreateWorkflowDto,
  ) {
    return this.orchestrationService.createWorkflow(
      workspaceId,
      user.id,
      createDto,
    );
  }

  @Get('workflows')
  @ApiOperation({ summary: 'List workflows in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved' })
  async listWorkflows(@Param('workspaceId') workspaceId: string) {
    return this.orchestrationService.listWorkflows(workspaceId);
  }

  @Get('workflows/:workflowId')
  @ApiOperation({ summary: 'Get workflow definition' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'workflowId', description: 'Workflow ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved' })
  async getWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    return this.orchestrationService.getWorkflow(workflowId);
  }

  @Post('workflows/execute')
  @ApiOperation({ summary: 'Execute workflow' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Workflow execution started' })
  async executeWorkflow(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: any,
    @Body() executeDto: ExecuteWorkflowDto,
  ) {
    return this.orchestrationService.executeWorkflow(
      workspaceId,
      user.id,
      executeDto,
    );
  }

  @Get('executions/:executionId')
  @ApiOperation({ summary: 'Get workflow execution status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'executionId', description: 'Execution ID' })
  @ApiResponse({ status: 200, description: 'Execution status retrieved' })
  async getExecution(
    @Param('workspaceId') workspaceId: string,
    @Param('executionId') executionId: string,
  ) {
    return this.orchestrationService.getWorkflowExecution(executionId);
  }

  // ==================== Result Aggregation ====================

  @Post('results/aggregate')
  @ApiOperation({ summary: 'Aggregate results from multiple tasks' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Results aggregated' })
  async aggregateResults(
    @Param('workspaceId') workspaceId: string,
    @Body()
    body: {
      taskIds: string[];
      strategy?: 'merge' | 'array' | 'first' | 'last';
    },
  ) {
    const result = await this.orchestrationService.aggregateResults(
      body.taskIds,
      body.strategy,
    );
    return { result };
  }

  // ==================== Statistics ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get orchestration statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getStats(@Param('workspaceId') workspaceId: string) {
    return this.orchestrationService.getWorkspaceStats(workspaceId);
  }
}
