import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTaskDto,
  TaskStatus,
  TaskResult,
  TaskAssignment,
  CreateWorkflowDto,
  ExecuteWorkflowDto,
  WorkflowExecution,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowStepDto,
  TaskExecutionMode,
  ExecutionContext,
  AgentMessage,
  SendMessageDto,
  DelegateTaskDto,
  DelegationStrategy,
  DelegationResult,
  AgentCapabilityMatch,
} from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  // In-memory stores (in production, use Redis or similar)
  private executionContexts = new Map<string, ExecutionContext>();
  private taskQueue = new Map<string, CreateTaskDto & { id: string }>();
  private taskResults = new Map<string, TaskResult>();
  private agentMessages = new Map<string, AgentMessage[]>();
  private workflowDefinitions = new Map<string, WorkflowDefinition>();
  private workflowExecutions = new Map<string, WorkflowExecution>();
  private agentLoad = new Map<string, number>(); // Track agent workload

  constructor(private readonly prisma: PrismaService) {}

  // ==================== Context Management ====================

  async createExecutionContext(
    workspaceId: string,
    sessionId?: string,
  ): Promise<ExecutionContext> {
    const contextId = `${workspaceId}-${sessionId || 'default'}`;

    const context: ExecutionContext = {
      workspaceId,
      sessionId,
      sharedData: new Map(),
      agentContexts: new Map(),
      globalVariables: {},
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.executionContexts.set(contextId, context);
    return context;
  }

  async getExecutionContext(
    workspaceId: string,
    sessionId?: string,
  ): Promise<ExecutionContext> {
    const contextId = `${workspaceId}-${sessionId || 'default'}`;
    let context = this.executionContexts.get(contextId);

    if (!context) {
      context = await this.createExecutionContext(workspaceId, sessionId);
    }

    return context;
  }

  async updateContextValue(
    workspaceId: string,
    key: string,
    value: any,
    sessionId?: string,
  ): Promise<void> {
    const context = await this.getExecutionContext(workspaceId, sessionId);
    context.sharedData.set(key, value);
    context.updatedAt = new Date();
  }

  async getContextValue(
    workspaceId: string,
    key: string,
    sessionId?: string,
  ): Promise<any> {
    const context = await this.getExecutionContext(workspaceId, sessionId);
    return context.sharedData.get(key);
  }

  async updateAgentContext(
    workspaceId: string,
    agentId: string,
    agentContext: Record<string, any>,
    sessionId?: string,
  ): Promise<void> {
    const context = await this.getExecutionContext(workspaceId, sessionId);
    context.agentContexts.set(agentId, {
      ...context.agentContexts.get(agentId),
      ...agentContext,
    });
    context.updatedAt = new Date();
  }

  async getAgentContext(
    workspaceId: string,
    agentId: string,
    sessionId?: string,
  ): Promise<Record<string, any>> {
    const context = await this.getExecutionContext(workspaceId, sessionId);
    return context.agentContexts.get(agentId) || {};
  }

  // ==================== Agent Communication ====================

  async sendMessage(
    workspaceId: string,
    fromAgentId: string,
    messageDto: SendMessageDto,
  ): Promise<AgentMessage> {
    const message: AgentMessage = {
      id: uuidv4(),
      fromAgentId,
      toAgentId: messageDto.toAgentId,
      messageType: messageDto.messageType,
      content: messageDto.content,
      context: messageDto.context,
      priority: 'medium',
      timestamp: new Date(),
      correlationId: messageDto.correlationId,
      requiresResponse: messageDto.requiresResponse,
    };

    // Store message for retrieval
    const workspaceMessages = this.agentMessages.get(workspaceId) || [];
    workspaceMessages.push(message);
    this.agentMessages.set(workspaceId, workspaceMessages);

    this.logger.debug(
      `Message sent from ${fromAgentId} to ${messageDto.toAgentId || 'all'}: ${message.id}`,
    );

    return message;
  }

  async getMessages(
    workspaceId: string,
    agentId?: string,
    since?: Date,
  ): Promise<AgentMessage[]> {
    const messages = this.agentMessages.get(workspaceId) || [];

    return messages.filter((msg) => {
      const matchesAgent = !agentId || msg.toAgentId === agentId || !msg.toAgentId;
      const matchesTime = !since || msg.timestamp >= since;
      return matchesAgent && matchesTime;
    });
  }

  // ==================== Agent Selection & Delegation ====================

  async selectAgent(
    workspaceId: string,
    userId: string,
    requiredCapabilities?: string[],
    preferredRole?: string,
    strategy: DelegationStrategy = DelegationStrategy.CAPABILITY_MATCH,
  ): Promise<AgentCapabilityMatch> {
    // Get workspace agents
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        workspaceAgents: {
          where: { isActive: true },
          include: { agent: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.ownerId !== userId) {
      throw new BadRequestException('Unauthorized access to workspace');
    }

    const agents = workspace.workspaceAgents.map((wa) => ({
      id: wa.agent.id,
      name: wa.agent.name,
      role: wa.role,
      config: wa.agent.config as any,
      currentLoad: this.agentLoad.get(wa.agent.id) || 0,
    }));

    if (agents.length === 0) {
      throw new BadRequestException('No active agents in workspace');
    }

    let selectedAgent: any;

    switch (strategy) {
      case DelegationStrategy.CAPABILITY_MATCH:
        selectedAgent = this.selectByCapabilityMatch(
          agents,
          requiredCapabilities,
        );
        break;

      case DelegationStrategy.LEAST_BUSY:
        selectedAgent = this.selectLeastBusy(agents);
        break;

      case DelegationStrategy.PRIORITY_BASED:
        selectedAgent = this.selectByRole(agents, preferredRole);
        break;

      case DelegationStrategy.ROUND_ROBIN:
        selectedAgent = this.selectRoundRobin(agents);
        break;

      default:
        selectedAgent = agents[0];
    }

    // Calculate match score
    const capabilities = (selectedAgent.config?.capabilities as string[]) || [];
    const matchedCapabilities = requiredCapabilities
      ? capabilities.filter((c) => requiredCapabilities.includes(c))
      : capabilities;

    const matchScore = requiredCapabilities
      ? (matchedCapabilities.length / requiredCapabilities.length) * 100
      : 100;

    return {
      agentId: selectedAgent.id,
      agentName: selectedAgent.name,
      role: selectedAgent.role,
      matchScore,
      capabilities,
      matchedCapabilities,
      currentLoad: selectedAgent.currentLoad,
      isAvailable: selectedAgent.currentLoad < 10, // Max 10 concurrent tasks
    };
  }

  private selectByCapabilityMatch(
    agents: any[],
    requiredCapabilities?: string[],
  ): any {
    if (!requiredCapabilities || requiredCapabilities.length === 0) {
      return agents[0];
    }

    let bestMatch = agents[0];
    let bestScore = 0;

    for (const agent of agents) {
      const capabilities = (agent.config?.capabilities as string[]) || [];
      const matchCount = requiredCapabilities.filter((rc) =>
        capabilities.includes(rc),
      ).length;
      const score = matchCount / requiredCapabilities.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = agent;
      }
    }

    return bestMatch;
  }

  private selectLeastBusy(agents: any[]): any {
    return agents.reduce((least, current) =>
      current.currentLoad < least.currentLoad ? current : least,
    );
  }

  private selectByRole(agents: any[], preferredRole?: string): any {
    if (!preferredRole) {
      return agents[0];
    }

    const roleMatch = agents.find((a) => a.role === preferredRole);
    return roleMatch || agents[0];
  }

  private selectRoundRobin(agents: any[]): any {
    // Simple round-robin based on total load
    const totalLoad = agents.reduce((sum, a) => sum + a.currentLoad, 0);
    const index = totalLoad % agents.length;
    return agents[index];
  }

  async delegateTask(
    workspaceId: string,
    userId: string,
    delegateDto: DelegateTaskDto,
  ): Promise<DelegationResult> {
    const taskId = uuidv4();

    // Select agent based on strategy
    let selectedAgent: AgentCapabilityMatch;

    if (delegateDto.preferredAgentId) {
      // Verify agent exists in workspace
      const workspaceAgent = await this.prisma.workspaceAgent.findFirst({
        where: {
          workspaceId,
          agentId: delegateDto.preferredAgentId,
          isActive: true,
        },
        include: { agent: true },
      });

      if (!workspaceAgent) {
        throw new BadRequestException('Preferred agent not found in workspace');
      }

      selectedAgent = {
        agentId: workspaceAgent.agent.id,
        agentName: workspaceAgent.agent.name,
        role: workspaceAgent.role,
        matchScore: 100,
        capabilities: [],
        matchedCapabilities: [],
        currentLoad: this.agentLoad.get(workspaceAgent.agent.id) || 0,
        isAvailable: true,
      };
    } else {
      selectedAgent = await this.selectAgent(
        workspaceId,
        userId,
        delegateDto.requiredCapabilities,
        undefined,
        delegateDto.strategy,
      );
    }

    // Create task
    const task: CreateTaskDto & { id: string } = {
      id: taskId,
      name: delegateDto.name,
      description: delegateDto.description,
      input: delegateDto.input,
      requiredCapabilities: delegateDto.requiredCapabilities,
      priority: delegateDto.priority,
      timeout: delegateDto.timeout,
      maxRetries: delegateDto.maxRetries,
      fallbackAgentId: delegateDto.fallbackAgentIds?.[0],
    };

    this.taskQueue.set(taskId, task);

    // Increment agent load
    const currentLoad = this.agentLoad.get(selectedAgent.agentId) || 0;
    this.agentLoad.set(selectedAgent.agentId, currentLoad + 1);

    // Store task assignment
    const taskResult: TaskResult = {
      taskId,
      status: TaskStatus.ASSIGNED,
      agentId: selectedAgent.agentId,
      startedAt: new Date(),
    };
    this.taskResults.set(taskId, taskResult);

    return {
      taskId,
      assignedAgentId: selectedAgent.agentId,
      strategy: delegateDto.strategy || DelegationStrategy.CAPABILITY_MATCH,
      matchScore: selectedAgent.matchScore,
      fallbacksAvailable: delegateDto.fallbackAgentIds || [],
      estimatedStartTime: new Date(),
    };
  }

  // ==================== Task Management ====================

  async executeTask(
    taskId: string,
    agentId: string,
    input?: any,
  ): Promise<TaskResult> {
    const task = this.taskQueue.get(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const result = this.taskResults.get(taskId);
    if (!result) {
      throw new NotFoundException('Task result not found');
    }

    // Update status
    result.status = TaskStatus.IN_PROGRESS;
    result.startedAt = new Date();

    try {
      // Simulate task execution (in real implementation, this would call agent)
      this.logger.log(`Executing task ${taskId} with agent ${agentId}`);

      // Here you would integrate with actual agent execution
      const output = {
        success: true,
        data: `Task ${task.name} executed successfully`,
        input: input || task.input,
      };

      result.status = TaskStatus.COMPLETED;
      result.output = output;
      result.completedAt = new Date();
      result.executionTime = result.completedAt.getTime() - result.startedAt!.getTime();

      // Decrement agent load
      const currentLoad = this.agentLoad.get(agentId) || 0;
      this.agentLoad.set(agentId, Math.max(0, currentLoad - 1));

      this.taskResults.set(taskId, result);
      return result;
    } catch (error) {
      return this.handleTaskFailure(taskId, agentId, error);
    }
  }

  private async handleTaskFailure(
    taskId: string,
    agentId: string,
    error: any,
  ): Promise<TaskResult> {
    const task = this.taskQueue.get(taskId);
    const result = this.taskResults.get(taskId)!;

    result.retryCount = (result.retryCount || 0) + 1;
    result.error = error.message;

    // Check if we should retry
    if (task && result.retryCount < (task.maxRetries || 0)) {
      this.logger.warn(
        `Task ${taskId} failed, retrying (${result.retryCount}/${task.maxRetries})`,
      );
      result.status = TaskStatus.QUEUED;
      this.taskResults.set(taskId, result);

      // Retry with same agent
      return this.executeTask(taskId, agentId, task.input);
    }

    // Check for fallback agent
    if (task?.fallbackAgentId) {
      this.logger.warn(`Task ${taskId} failed, trying fallback agent`);
      result.status = TaskStatus.QUEUED;
      result.agentId = task.fallbackAgentId;
      this.taskResults.set(taskId, result);

      return this.executeTask(taskId, task.fallbackAgentId, task.input);
    }

    // Task failed completely
    result.status = TaskStatus.FAILED;
    result.completedAt = new Date();
    result.executionTime = result.completedAt.getTime() - result.startedAt!.getTime();

    // Decrement agent load
    const currentLoad = this.agentLoad.get(agentId) || 0;
    this.agentLoad.set(agentId, Math.max(0, currentLoad - 1));

    this.taskResults.set(taskId, result);
    return result;
  }

  async getTaskResult(taskId: string): Promise<TaskResult> {
    const result = this.taskResults.get(taskId);
    if (!result) {
      throw new NotFoundException('Task result not found');
    }
    return result;
  }

  // ==================== Workflow Management ====================

  async createWorkflow(
    workspaceId: string,
    userId: string,
    createDto: CreateWorkflowDto,
  ): Promise<WorkflowDefinition> {
    const workflowId = uuidv4();

    const workflow: WorkflowDefinition = {
      id: workflowId,
      name: createDto.name,
      description: createDto.description,
      version: createDto.version || '1.0.0',
      steps: createDto.steps,
      executionMode: createDto.executionMode || TaskExecutionMode.SEQUENTIAL,
      config: createDto.config || {},
      metadata: {
        ...createDto.metadata,
        workspaceId,
        createdBy: userId,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflowDefinitions.set(workflowId, workflow);
    return workflow;
  }

  async getWorkflow(workflowId: string): Promise<WorkflowDefinition> {
    const workflow = this.workflowDefinitions.get(workflowId);
    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }
    return workflow;
  }

  async listWorkflows(workspaceId: string): Promise<WorkflowDefinition[]> {
    return Array.from(this.workflowDefinitions.values()).filter(
      (w) => w.metadata.workspaceId === workspaceId,
    );
  }

  async executeWorkflow(
    workspaceId: string,
    userId: string,
    executeDto: ExecuteWorkflowDto,
  ): Promise<WorkflowExecution> {
    const workflow = await this.getWorkflow(executeDto.workflowId);
    const executionId = uuidv4();

    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      workspaceId,
      status: WorkflowStatus.ACTIVE,
      input: executeDto.input || {},
      completedSteps: [],
      failedSteps: [],
      stepResults: {},
      startedAt: new Date(),
      metadata: {
        executedBy: userId,
        priority: executeDto.priority,
      },
    };

    this.workflowExecutions.set(executionId, execution);

    // Start workflow execution
    this.processWorkflow(workspaceId, userId, executionId).catch((error) => {
      this.logger.error(`Workflow execution failed: ${error.message}`);
      execution.status = WorkflowStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
    });

    return execution;
  }

  private async processWorkflow(
    workspaceId: string,
    userId: string,
    executionId: string,
  ): Promise<void> {
    const execution = this.workflowExecutions.get(executionId)!;
    const workflow = await this.getWorkflow(execution.workflowId);

    try {
      if (workflow.executionMode === TaskExecutionMode.SEQUENTIAL) {
        await this.executeSequential(workspaceId, userId, execution, workflow);
      } else {
        await this.executeParallel(workspaceId, userId, execution, workflow);
      }

      execution.status = WorkflowStatus.COMPLETED;
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = WorkflowStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();
      throw error;
    }
  }

  private async executeSequential(
    workspaceId: string,
    userId: string,
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
  ): Promise<void> {
    const sortedSteps = this.sortStepsByDependencies(workflow.steps);

    for (const step of sortedSteps) {
      await this.executeWorkflowStep(workspaceId, userId, execution, step);

      if (execution.failedSteps.includes(step.id)) {
        throw new Error(`Step ${step.name} failed`);
      }
    }
  }

  private async executeParallel(
    workspaceId: string,
    userId: string,
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
  ): Promise<void> {
    const stepGroups = this.groupStepsByDependencies(workflow.steps);

    for (const group of stepGroups) {
      const promises = group.map((step) =>
        this.executeWorkflowStep(workspaceId, userId, execution, step),
      );

      await Promise.all(promises);

      // Check for failures
      const hasFailures = group.some((step) =>
        execution.failedSteps.includes(step.id),
      );
      if (hasFailures) {
        throw new Error('One or more parallel steps failed');
      }
    }
  }

  private async executeWorkflowStep(
    workspaceId: string,
    userId: string,
    execution: WorkflowExecution,
    step: WorkflowStepDto,
  ): Promise<void> {
    this.logger.log(`Executing workflow step: ${step.name}`);
    execution.currentStep = step.id;

    try {
      // Delegate step as task
      const delegationResult = await this.delegateTask(workspaceId, userId, {
        name: step.name,
        description: step.description,
        input: this.resolveStepInput(step, execution),
        requiredCapabilities: step.requiredCapabilities,
        preferredAgentId: undefined,
        fallbackAgentIds: step.fallbackAgentId ? [step.fallbackAgentId] : [],
        strategy: DelegationStrategy.CAPABILITY_MATCH,
        timeout: step.timeout,
        maxRetries: step.retryAttempts,
      });

      // Execute the task
      const result = await this.executeTask(
        delegationResult.taskId,
        delegationResult.assignedAgentId,
      );

      if (result.status === TaskStatus.COMPLETED) {
        execution.completedSteps.push(step.id);
        execution.stepResults[step.id] = result.output;
      } else {
        execution.failedSteps.push(step.id);
        execution.stepResults[step.id] = result.error;
        throw new Error(`Step ${step.name} failed: ${result.error}`);
      }
    } catch (error) {
      execution.failedSteps.push(step.id);
      throw error;
    }
  }

  private resolveStepInput(
    step: WorkflowStepDto,
    execution: WorkflowExecution,
  ): any {
    if (!step.inputMapping) {
      return execution.input;
    }

    const resolved: any = {};
    for (const [key, value] of Object.entries(step.inputMapping)) {
      if (typeof value === 'string' && value.startsWith('$')) {
        // Reference to previous step output
        const stepId = value.substring(1);
        resolved[key] = execution.stepResults[stepId];
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  private sortStepsByDependencies(steps: WorkflowStepDto[]): WorkflowStepDto[] {
    const sorted: WorkflowStepDto[] = [];
    const visited = new Set<string>();

    const visit = (step: WorkflowStepDto) => {
      if (visited.has(step.id)) return;

      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          const depStep = steps.find((s) => s.id === depId);
          if (depStep) visit(depStep);
        }
      }

      visited.add(step.id);
      sorted.push(step);
    };

    steps.forEach(visit);
    return sorted;
  }

  private groupStepsByDependencies(
    steps: WorkflowStepDto[],
  ): WorkflowStepDto[][] {
    const groups: WorkflowStepDto[][] = [];
    const visited = new Set<string>();

    while (visited.size < steps.length) {
      const group = steps.filter((step) => {
        if (visited.has(step.id)) return false;
        if (!step.dependsOn || step.dependsOn.length === 0) return true;
        return step.dependsOn.every((dep) => visited.has(dep));
      });

      if (group.length === 0) {
        throw new Error('Circular dependency detected in workflow');
      }

      group.forEach((step) => visited.add(step.id));
      groups.push(group);
    }

    return groups;
  }

  async getWorkflowExecution(executionId: string): Promise<WorkflowExecution> {
    const execution = this.workflowExecutions.get(executionId);
    if (!execution) {
      throw new NotFoundException('Workflow execution not found');
    }
    return execution;
  }

  // ==================== Result Aggregation ====================

  async aggregateResults(
    taskIds: string[],
    aggregationStrategy: 'merge' | 'array' | 'first' | 'last' = 'array',
  ): Promise<any> {
    const results = await Promise.all(
      taskIds.map((id) => this.getTaskResult(id)),
    );

    const successfulResults = results.filter(
      (r) => r.status === TaskStatus.COMPLETED,
    );

    if (successfulResults.length === 0) {
      throw new BadRequestException('No successful results to aggregate');
    }

    switch (aggregationStrategy) {
      case 'merge':
        return successfulResults.reduce(
          (acc, r) => ({ ...acc, ...r.output }),
          {},
        );

      case 'array':
        return successfulResults.map((r) => r.output);

      case 'first':
        return successfulResults[0].output;

      case 'last':
        return successfulResults[successfulResults.length - 1].output;

      default:
        return successfulResults.map((r) => r.output);
    }
  }

  // ==================== Utility Methods ====================

  async getWorkspaceStats(workspaceId: string): Promise<any> {
    const executions = Array.from(this.workflowExecutions.values()).filter(
      (e) => e.workspaceId === workspaceId,
    );

    const tasks = Array.from(this.taskResults.values());

    return {
      totalWorkflowExecutions: executions.length,
      activeExecutions: executions.filter((e) => e.status === WorkflowStatus.ACTIVE)
        .length,
      completedExecutions: executions.filter(
        (e) => e.status === WorkflowStatus.COMPLETED,
      ).length,
      failedExecutions: executions.filter(
        (e) => e.status === WorkflowStatus.FAILED,
      ).length,
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.status === TaskStatus.COMPLETED)
        .length,
      failedTasks: tasks.filter((t) => t.status === TaskStatus.FAILED).length,
      agentLoad: Object.fromEntries(this.agentLoad),
    };
  }
}
