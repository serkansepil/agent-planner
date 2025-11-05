export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIExecutionOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  streaming?: boolean;
}

export interface AIExecutionResult {
  content: string;
  finishReason: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  model: string;
  cached?: boolean;
}

export interface AIStreamChunk {
  content: string;
  finishReason?: string;
  done: boolean;
}

export interface AIProvider {
  /**
   * Execute a completion request
   */
  execute(
    messages: AIMessage[],
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult>;

  /**
   * Execute a streaming completion request
   */
  executeStream(
    messages: AIMessage[],
    options: AIExecutionOptions,
  ): AsyncGenerator<AIStreamChunk>;

  /**
   * Check if the provider supports a model
   */
  supportsModel(model: string): boolean;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
