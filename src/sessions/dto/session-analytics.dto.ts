import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export interface SessionAnalytics {
  sessionId: string;
  workspaceId: string;
  userId: string;
  title?: string;
  status: string;

  // Duration metrics
  startedAt: Date;
  endedAt?: Date;
  duration?: number; // in milliseconds

  // Message metrics
  totalMessages: number;
  messagesByRole: Record<string, number>;
  messagesByAgent: Record<string, number>;

  // Agent metrics
  agentsUsed: string[];
  agentParticipation: Array<{
    agentId: string;
    agentName: string;
    messageCount: number;
    firstMessageAt: Date;
    lastMessageAt: Date;
  }>;

  // Activity metrics
  averageResponseTime?: number;
  peakActivityTime?: Date;
  messagesPerHour?: number;

  // Token metrics (if available)
  totalTokens?: number;
  tokensByAgent?: Record<string, number>;

  // Context metrics
  contextSize: number;
  contextKeys: string[];

  metadata?: Record<string, any>;
}

export interface SessionTimeline {
  sessionId: string;
  events: SessionTimelineEvent[];
}

export interface SessionTimelineEvent {
  timestamp: Date;
  type: 'session_started' | 'session_ended' | 'session_paused' | 'session_resumed' | 'message_sent' | 'agent_joined' | 'agent_left' | 'context_updated';
  actor?: string; // user or agent id
  data?: any;
  description: string;
}

export class ExportSessionDto {
  @ApiPropertyOptional({ description: 'Export format', enum: ['json', 'markdown', 'html', 'csv'] })
  format?: 'json' | 'markdown' | 'html' | 'csv' = 'json';

  @ApiPropertyOptional({ description: 'Include messages' })
  includeMessages?: boolean = true;

  @ApiPropertyOptional({ description: 'Include context' })
  includeContext?: boolean = true;

  @ApiPropertyOptional({ description: 'Include analytics' })
  includeAnalytics?: boolean = true;

  @ApiPropertyOptional({ description: 'Include metadata' })
  includeMetadata?: boolean = true;
}

export interface SessionExport {
  session: {
    id: string;
    workspaceId: string;
    userId: string;
    title?: string;
    status: string;
    startedAt: Date;
    endedAt?: Date;
  };
  messages?: any[];
  context?: Record<string, any>;
  analytics?: SessionAnalytics;
  metadata?: Record<string, any>;
  exportedAt: Date;
  format: string;
}

export interface SessionReplayFrame {
  timestamp: Date;
  index: number;
  messageId?: string;
  content?: string;
  role?: string;
  agentId?: string;
  agentName?: string;
  contextSnapshot?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface SessionReplay {
  sessionId: string;
  frames: SessionReplayFrame[];
  duration: number;
  frameCount: number;
  playbackSpeed: number; // 1.0 = normal, 2.0 = 2x, etc.
  metadata: {
    recordedAt: Date;
    totalMessages: number;
    agentsInvolved: string[];
  };
}
