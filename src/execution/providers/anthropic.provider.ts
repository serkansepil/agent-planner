import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import {
  AIProvider,
  AIMessage,
  AIExecutionOptions,
  AIExecutionResult,
  AIStreamChunk,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class AnthropicProvider implements AIProvider {
  private readonly logger = new Logger(AnthropicProvider.name);
  private readonly client: Anthropic;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!apiKey) {
      this.logger.warn('Anthropic API key not configured');
    }

    this.client = new Anthropic({
      apiKey: apiKey || 'dummy-key',
    });
  }

  /**
   * Execute a completion request
   */
  async execute(
    messages: AIMessage[],
    options: AIExecutionOptions,
  ): Promise<AIExecutionResult> {
    try {
      // Extract system message (Claude requires it separate)
      const systemMessage = messages.find((m) => m.role === 'system');
      const userMessages = messages.filter((m) => m.role !== 'system');

      const response = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        top_p: options.topP,
        system: systemMessage?.content,
        messages: userMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        stop_sequences: options.stopSequences,
      });

      // Extract text content from response
      const content =
        response.content
          .filter((block) => block.type === 'text')
          .map((block: any) => block.text)
          .join('') || '';

      return {
        content,
        finishReason: response.stop_reason || 'end_turn',
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        model: response.model,
      };
    } catch (error) {
      this.logger.error('Anthropic execution error:', error);
      throw error;
    }
  }

  /**
   * Execute a streaming completion request
   */
  async *executeStream(
    messages: AIMessage[],
    options: AIExecutionOptions,
  ): AsyncGenerator<AIStreamChunk> {
    try {
      // Extract system message
      const systemMessage = messages.find((m) => m.role === 'system');
      const userMessages = messages.filter((m) => m.role !== 'system');

      const stream = await this.client.messages.create({
        model: options.model,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature,
        top_p: options.topP,
        system: systemMessage?.content,
        messages: userMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        stop_sequences: options.stopSequences,
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta;
          if (delta.type === 'text_delta') {
            yield {
              content: delta.text,
              done: false,
            };
          }
        }

        if (event.type === 'message_stop') {
          yield {
            content: '',
            finishReason: 'stop',
            done: true,
          };
        }
      }
    } catch (error) {
      this.logger.error('Anthropic streaming error:', error);
      throw error;
    }
  }

  /**
   * Check if the provider supports a model
   */
  supportsModel(model: string): boolean {
    const supportedModels = [
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
      'claude-2',
    ];

    return supportedModels.some((m) => model.startsWith(m));
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'Anthropic';
  }
}
