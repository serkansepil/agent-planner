import { Injectable, Logger } from '@nestjs/common';
import { encoding_for_model, get_encoding, TiktokenModel } from 'tiktoken';

@Injectable()
export class TokenCounterService {
  private readonly logger = new Logger(TokenCounterService.name);

  /**
   * Count tokens in text using tiktoken
   */
  async countTokens(text: string, model: string): Promise<number> {
    try {
      // Map model names to tiktoken models
      const tiktokenModel = this.mapToTiktokenModel(model);

      if (tiktokenModel) {
        const encoding = encoding_for_model(tiktokenModel);
        const tokens = encoding.encode(text);
        const count = tokens.length;
        encoding.free();
        return count;
      } else {
        // Fallback to cl100k_base encoding (used by GPT-4, GPT-3.5-turbo)
        const encoding = get_encoding('cl100k_base');
        const tokens = encoding.encode(text);
        const count = tokens.length;
        encoding.free();
        return count;
      }
    } catch (error) {
      this.logger.error(`Error counting tokens for model ${model}:`, error);
      // Fallback to rough estimation: ~4 characters per token
      return Math.ceil(text.length / 4);
    }
  }

  /**
   * Count tokens for messages (chat format)
   */
  async countMessageTokens(
    messages: Array<{ role: string; content: string }>,
    model: string,
  ): Promise<number> {
    try {
      const tiktokenModel = this.mapToTiktokenModel(model);
      const encoding = tiktokenModel
        ? encoding_for_model(tiktokenModel)
        : get_encoding('cl100k_base');

      let totalTokens = 0;

      // Format overhead per message varies by model
      const tokensPerMessage = model.startsWith('gpt-4') ? 3 : 4;
      const tokensPerName = model.startsWith('gpt-4') ? 1 : -1;

      for (const message of messages) {
        totalTokens += tokensPerMessage;
        totalTokens += encoding.encode(message.content).length;
        totalTokens += encoding.encode(message.role).length;
      }

      // Every reply is primed with assistant
      totalTokens += 3;

      encoding.free();
      return totalTokens;
    } catch (error) {
      this.logger.error(`Error counting message tokens for model ${model}:`, error);
      // Fallback estimation
      const totalText = messages.map((m) => m.content).join(' ');
      return Math.ceil(totalText.length / 4);
    }
  }

  /**
   * Estimate tokens for prompt + context
   */
  async estimateExecutionTokens(
    prompt: string,
    context: any,
    systemPrompt: string,
    model: string,
  ): Promise<{ inputTokens: number; estimatedMaxTokens: number }> {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ];

    // Add context if provided
    if (context && Object.keys(context).length > 0) {
      const contextStr = JSON.stringify(context);
      messages.splice(1, 0, {
        role: 'system',
        content: `Context: ${contextStr}`,
      });
    }

    const inputTokens = await this.countMessageTokens(messages, model);

    // Get model's max token limit
    const maxModelTokens = this.getModelMaxTokens(model);
    const estimatedMaxTokens = Math.max(0, maxModelTokens - inputTokens - 100); // Reserve 100 tokens as buffer

    return {
      inputTokens,
      estimatedMaxTokens,
    };
  }

  /**
   * Map model name to tiktoken model
   */
  private mapToTiktokenModel(model: string): TiktokenModel | null {
    const modelMap: Record<string, TiktokenModel> = {
      'gpt-4': 'gpt-4',
      'gpt-4-turbo': 'gpt-4-turbo',
      'gpt-4o': 'gpt-4o',
      'gpt-4-32k': 'gpt-4-32k',
      'gpt-3.5-turbo': 'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k': 'gpt-3.5-turbo-16k',
    };

    // Check for exact match
    if (modelMap[model]) {
      return modelMap[model];
    }

    // Check for partial match (e.g., "gpt-4-0613" -> "gpt-4")
    for (const [key, value] of Object.entries(modelMap)) {
      if (model.startsWith(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Get maximum tokens for a model
   */
  private getModelMaxTokens(model: string): number {
    const limits: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 16385,
      'gpt-3.5-turbo-16k': 16385,
      'claude-3-opus': 200000,
      'claude-3-sonnet': 200000,
      'claude-3-haiku': 200000,
      'gemini-pro': 32768,
    };

    // Check for exact match
    if (limits[model]) {
      return limits[model];
    }

    // Check for partial match
    for (const [key, value] of Object.entries(limits)) {
      if (model.startsWith(key)) {
        return value;
      }
    }

    // Default fallback
    return 4096;
  }

  /**
   * Validate if text fits within token limit
   */
  async validateTokenLimit(
    text: string,
    model: string,
    maxTokens: number,
  ): Promise<{ valid: boolean; actualTokens: number; maxTokens: number }> {
    const actualTokens = await this.countTokens(text, model);
    return {
      valid: actualTokens <= maxTokens,
      actualTokens,
      maxTokens,
    };
  }
}
