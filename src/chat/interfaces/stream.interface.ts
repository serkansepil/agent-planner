export interface IStreamChunk {
  id: string;
  sessionId: string;
  messageId: string;
  content: string;
  delta: string;
  tokens: number;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

export interface IStreamConfig {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  streamDelay?: number; // Artificial delay for testing
}

export interface IStreamStatus {
  streamId: string;
  sessionId: string;
  status: 'active' | 'paused' | 'completed' | 'error';
  progress: number; // 0-100
  tokensGenerated: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface IStreamMetrics {
  streamId: string;
  totalTokens: number;
  tokensPerSecond: number;
  latency: number;
  bandwidth: number;
  errors: number;
}
