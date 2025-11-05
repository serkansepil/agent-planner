import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  AIProvider,
  AIMessage,
  AIExecutionOptions,
  AIExecutionResult,
  AIStreamChunk,
} from '../interfaces/ai-provider.interface';

@Injectable()
export class OpenAIProvider implements AIProvider {
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.warn('OpenAI API key not configured');
    }

    this.client = new OpenAI({
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
      const completion = await this.client.chat.completions.create({
        model: options.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stopSequences,
      });

      const choice = completion.choices[0];
      const usage = completion.usage;

      return {
        content: choice.message.content || '',
        finishReason: choice.finish_reason,
        inputTokens: usage?.prompt_tokens || 0,
        outputTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        model: completion.model,
      };
    } catch (error) {
      this.logger.error('OpenAI execution error:', error);
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
      const stream = await this.client.chat.completions.create({
        model: options.model,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        temperature: options.temperature,
        max_tokens: options.maxTokens,
        top_p: options.topP,
        frequency_penalty: options.frequencyPenalty,
        presence_penalty: options.presencePenalty,
        stop: options.stopSequences,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        const finishReason = chunk.choices[0]?.finish_reason;

        if (delta?.content) {
          yield {
            content: delta.content,
            finishReason: finishReason || undefined,
            done: false,
          };
        }

        if (finishReason) {
          yield {
            content: '',
            finishReason,
            done: true,
          };
        }
      }
    } catch (error) {
      this.logger.error('OpenAI streaming error:', error);
      throw error;
    }
  }

  /**
   * Check if the provider supports a model
   */
  supportsModel(model: string): boolean {
    const supportedModels = [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4o',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ];

    return supportedModels.some((m) => model.startsWith(m));
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'OpenAI';
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const models = await this.client.models.list();
      return models.data
        .filter((m) => m.id.startsWith('gpt-'))
        .map((m) => m.id);
    } catch (error) {
      this.logger.error('Error listing OpenAI models:', error);
      return [];
    }
  }
}
