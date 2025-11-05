import { ApiProperty } from '@nestjs/swagger';

export class AgentStatisticsDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  agentId: string;

  @ApiProperty({ example: 'Customer Support Bot' })
  agentName: string;

  @ApiProperty({
    description: 'Total number of messages processed by this agent',
    example: 150,
  })
  totalMessages: number;

  @ApiProperty({
    description: 'Number of sessions this agent participated in',
    example: 25,
  })
  totalSessions: number;

  @ApiProperty({
    description: 'Number of workspaces this agent is part of',
    example: 3,
  })
  totalWorkspaces: number;

  @ApiProperty({
    description: 'Number of knowledge documents associated with this agent',
    example: 10,
  })
  totalKnowledgeDocs: number;

  @ApiProperty({
    description: 'Success rate (percentage of active sessions)',
    example: 85.5,
  })
  successRate: number;

  @ApiProperty({
    description: 'Average messages per session',
    example: 6.0,
  })
  avgMessagesPerSession: number;

  @ApiProperty({
    description: 'Date of last activity',
    example: '2024-01-01T00:00:00.000Z',
  })
  lastActivityAt?: Date;

  @ApiProperty({
    description: 'Date when the agent was created',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;
}
