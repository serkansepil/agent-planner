# Workspace Orchestration Service

A comprehensive orchestration system for managing multiple agents in a workspace, including task delegation, workflow execution, and agent communication.

## Features

### 1. **Shared Context Management**
- Workspace-level shared data storage
- Agent-specific context management
- Session-scoped contexts
- Real-time context updates

### 2. **Agent Communication Protocol**
- Message passing between agents
- Broadcast messages to all agents
- Request-response patterns with correlation IDs
- Message filtering by agent and timestamp

### 3. **Task Delegation**
- Intelligent agent selection based on capabilities
- Multiple delegation strategies:
  - `CAPABILITY_MATCH`: Select agent based on required capabilities
  - `LEAST_BUSY`: Select agent with lowest workload
  - `PRIORITY_BASED`: Select based on agent role
  - `ROUND_ROBIN`: Distribute tasks evenly
- Automatic retry and fallback handling
- Task priority management

### 4. **Workflow Execution**
- Define multi-step workflows with dependencies
- Sequential and parallel execution modes
- Step-level configuration and retries
- Dynamic input mapping between steps
- Conditional step execution
- Workflow versioning

### 5. **Result Aggregation**
- Combine results from multiple tasks
- Multiple aggregation strategies:
  - `merge`: Merge all outputs into single object
  - `array`: Return array of all outputs
  - `first`: Return first successful result
  - `last`: Return last successful result

### 6. **Failure Handling**
- Automatic task retries with configurable attempts
- Fallback agent assignment on failures
- Error tracking and reporting
- Graceful degradation

## API Endpoints

### Context Management

#### Create/Update Context
```http
POST /workspaces/:workspaceId/orchestration/context
Body: {
  "sessionId": "optional-session-id",
  "key": "context-key",
  "value": any
}
```

#### Get Context Value
```http
GET /workspaces/:workspaceId/orchestration/context/:key?sessionId=optional
```

#### Get Full Context
```http
GET /workspaces/:workspaceId/orchestration/context?sessionId=optional
```

#### Update Agent Context
```http
POST /workspaces/:workspaceId/orchestration/context/agents/:agentId
Body: {
  "sessionId": "optional",
  "context": { "key": "value" }
}
```

#### Get Agent Context
```http
GET /workspaces/:workspaceId/orchestration/context/agents/:agentId?sessionId=optional
```

### Agent Communication

#### Send Message
```http
POST /workspaces/:workspaceId/orchestration/messages
Body: {
  "fromAgentId": "agent-uuid",
  "message": {
    "toAgentId": "target-agent-uuid", // optional, omit for broadcast
    "messageType": "request|response|notification|broadcast",
    "content": any,
    "context": { "key": "value" },
    "correlationId": "optional-correlation-id",
    "requiresResponse": true
  }
}
```

#### Get Messages
```http
GET /workspaces/:workspaceId/orchestration/messages?agentId=optional&since=ISO-date
```

### Task Delegation

#### Delegate Task
```http
POST /workspaces/:workspaceId/orchestration/delegate
Body: {
  "name": "Task Name",
  "description": "Task Description",
  "input": { "key": "value" },
  "requiredCapabilities": ["capability1", "capability2"],
  "preferredAgentId": "optional-agent-uuid",
  "fallbackAgentIds": ["agent-uuid-1", "agent-uuid-2"],
  "strategy": "capability_match|least_busy|priority_based|round_robin",
  "priority": "low|medium|high|critical",
  "timeout": 30000,
  "maxRetries": 3
}
```

#### Select Agent
```http
POST /workspaces/:workspaceId/orchestration/agents/select
Body: {
  "requiredCapabilities": ["capability1"],
  "preferredRole": "specialist",
  "strategy": "capability_match"
}
```

#### Execute Task
```http
POST /workspaces/:workspaceId/orchestration/tasks/:taskId/execute
Body: {
  "agentId": "agent-uuid",
  "input": { "key": "value" }
}
```

#### Get Task Result
```http
GET /workspaces/:workspaceId/orchestration/tasks/:taskId
```

### Workflow Management

#### Create Workflow
```http
POST /workspaces/:workspaceId/orchestration/workflows
Body: {
  "name": "Workflow Name",
  "description": "Workflow Description",
  "version": "1.0.0",
  "executionMode": "sequential|parallel",
  "steps": [
    {
      "id": "step1",
      "name": "Step 1",
      "description": "First step",
      "taskType": "analysis",
      "requiredCapabilities": ["data_analysis"],
      "preferredRole": "specialist",
      "dependsOn": [],
      "inputMapping": { "input": "$workflow.input" },
      "config": {},
      "executionMode": "sequential",
      "timeout": 60000,
      "retryAttempts": 2,
      "fallbackAgentId": "optional-agent-uuid",
      "condition": "optional-condition-expression"
    }
  ],
  "config": {},
  "metadata": {}
}
```

#### List Workflows
```http
GET /workspaces/:workspaceId/orchestration/workflows
```

#### Get Workflow
```http
GET /workspaces/:workspaceId/orchestration/workflows/:workflowId
```

#### Execute Workflow
```http
POST /workspaces/:workspaceId/orchestration/workflows/execute
Body: {
  "workflowId": "workflow-uuid",
  "input": { "key": "value" },
  "config": {},
  "priority": "medium"
}
```

#### Get Execution Status
```http
GET /workspaces/:workspaceId/orchestration/executions/:executionId
```

### Result Aggregation

#### Aggregate Results
```http
POST /workspaces/:workspaceId/orchestration/results/aggregate
Body: {
  "taskIds": ["task-uuid-1", "task-uuid-2"],
  "strategy": "merge|array|first|last"
}
```

### Statistics

#### Get Orchestration Stats
```http
GET /workspaces/:workspaceId/orchestration/stats
```

## Usage Examples

### Example 1: Simple Task Delegation

```typescript
// Delegate a task to the most capable agent
const delegation = await fetch('/workspaces/workspace-id/orchestration/delegate', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Analyze Dataset',
    description: 'Perform statistical analysis on sales data',
    input: { dataset: 'sales_2024.csv' },
    requiredCapabilities: ['data_analysis', 'statistics'],
    strategy: 'capability_match',
    priority: 'high',
    maxRetries: 2
  })
});

// Execute the task
const result = await fetch(`/workspaces/workspace-id/orchestration/tasks/${delegation.taskId}/execute`, {
  method: 'POST',
  body: JSON.stringify({
    agentId: delegation.assignedAgentId,
    input: { dataset: 'sales_2024.csv' }
  })
});
```

### Example 2: Multi-Step Workflow

```typescript
// Create a workflow
const workflow = await fetch('/workspaces/workspace-id/orchestration/workflows', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Research & Report Generation',
    description: 'Gather data, analyze, and generate report',
    executionMode: 'sequential',
    steps: [
      {
        id: 'gather',
        name: 'Gather Data',
        description: 'Collect research data',
        requiredCapabilities: ['research', 'web_search'],
        inputMapping: { topic: '$workflow.input.topic' }
      },
      {
        id: 'analyze',
        name: 'Analyze Data',
        description: 'Perform analysis',
        requiredCapabilities: ['data_analysis'],
        dependsOn: ['gather'],
        inputMapping: { data: '$gather' }
      },
      {
        id: 'report',
        name: 'Generate Report',
        description: 'Create final report',
        requiredCapabilities: ['writing', 'formatting'],
        dependsOn: ['analyze'],
        inputMapping: {
          data: '$gather',
          analysis: '$analyze'
        }
      }
    ]
  })
});

// Execute the workflow
const execution = await fetch('/workspaces/workspace-id/orchestration/workflows/execute', {
  method: 'POST',
  body: JSON.stringify({
    workflowId: workflow.id,
    input: { topic: 'AI Market Trends 2024' }
  })
});

// Check execution status
const status = await fetch(`/workspaces/workspace-id/orchestration/executions/${execution.id}`);
```

### Example 3: Agent Communication

```typescript
// Host agent sends request to specialist
const message = await fetch('/workspaces/workspace-id/orchestration/messages', {
  method: 'POST',
  body: JSON.stringify({
    fromAgentId: 'host-agent-id',
    message: {
      toAgentId: 'specialist-agent-id',
      messageType: 'request',
      content: {
        task: 'analyze_sentiment',
        data: ['review1', 'review2']
      },
      correlationId: 'req-123',
      requiresResponse: true
    }
  })
});

// Specialist retrieves messages
const messages = await fetch('/workspaces/workspace-id/orchestration/messages?agentId=specialist-agent-id');

// Specialist responds
await fetch('/workspaces/workspace-id/orchestration/messages', {
  method: 'POST',
  body: JSON.stringify({
    fromAgentId: 'specialist-agent-id',
    message: {
      toAgentId: 'host-agent-id',
      messageType: 'response',
      content: { sentiment: 'positive', confidence: 0.85 },
      correlationId: 'req-123'
    }
  })
});
```

### Example 4: Parallel Task Execution

```typescript
// Create workflow with parallel steps
const workflow = await fetch('/workspaces/workspace-id/orchestration/workflows', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Parallel Data Processing',
    executionMode: 'parallel',
    steps: [
      {
        id: 'process1',
        name: 'Process Dataset 1',
        requiredCapabilities: ['data_processing']
      },
      {
        id: 'process2',
        name: 'Process Dataset 2',
        requiredCapabilities: ['data_processing']
      },
      {
        id: 'process3',
        name: 'Process Dataset 3',
        requiredCapabilities: ['data_processing']
      },
      {
        id: 'merge',
        name: 'Merge Results',
        dependsOn: ['process1', 'process2', 'process3'],
        inputMapping: {
          data1: '$process1',
          data2: '$process2',
          data3: '$process3'
        }
      }
    ]
  })
});
```

## Delegation Strategies

### CAPABILITY_MATCH (Default)
Selects the agent with the best match for required capabilities.

```typescript
{
  "strategy": "capability_match",
  "requiredCapabilities": ["nlp", "sentiment_analysis"]
}
```

### LEAST_BUSY
Selects the agent with the lowest current workload.

```typescript
{
  "strategy": "least_busy"
}
```

### PRIORITY_BASED
Selects based on agent role preference (host > specialist > support > member).

```typescript
{
  "strategy": "priority_based",
  "preferredRole": "specialist"
}
```

### ROUND_ROBIN
Distributes tasks evenly across all available agents.

```typescript
{
  "strategy": "round_robin"
}
```

## Best Practices

1. **Use Capabilities**: Always specify required capabilities for better agent matching
2. **Set Timeouts**: Configure appropriate timeouts for long-running tasks
3. **Enable Retries**: Set maxRetries for critical tasks
4. **Use Fallbacks**: Specify fallback agents for important tasks
5. **Manage Context**: Store shared data in context for agent collaboration
6. **Monitor Stats**: Regularly check orchestration statistics
7. **Version Workflows**: Use semantic versioning for workflow definitions
8. **Handle Failures**: Implement proper error handling in your application

## Implementation Notes

- Context and messages are stored in-memory (use Redis in production)
- Workflows support both sequential and parallel execution
- Tasks can depend on previous task outputs using `$stepId` notation
- Agent load tracking prevents overloading individual agents
- All operations are workspace-scoped for proper isolation
