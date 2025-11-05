import { Injectable, Logger } from '@nestjs/common';

export interface ModelPricing {
  inputCostPer1MTokens: number; // Cost per 1M input tokens
  outputCostPer1MTokens: number; // Cost per 1M output tokens
  currency: string;
}

export interface ExecutionCost {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
}

@Injectable()
export class CostCalculatorService {
  private readonly logger = new Logger(CostCalculatorService.name);

  // Pricing data (as of 2024, prices in USD per 1M tokens)
  private readonly modelPricing: Record<string, ModelPricing> = {
    // OpenAI GPT-4 models
    'gpt-4': {
      inputCostPer1MTokens: 30.0,
      outputCostPer1MTokens: 60.0,
      currency: 'USD',
    },
    'gpt-4-32k': {
      inputCostPer1MTokens: 60.0,
      outputCostPer1MTokens: 120.0,
      currency: 'USD',
    },
    'gpt-4-turbo': {
      inputCostPer1MTokens: 10.0,
      outputCostPer1MTokens: 30.0,
      currency: 'USD',
    },
    'gpt-4o': {
      inputCostPer1MTokens: 5.0,
      outputCostPer1MTokens: 15.0,
      currency: 'USD',
    },

    // OpenAI GPT-3.5 models
    'gpt-3.5-turbo': {
      inputCostPer1MTokens: 0.5,
      outputCostPer1MTokens: 1.5,
      currency: 'USD',
    },
    'gpt-3.5-turbo-16k': {
      inputCostPer1MTokens: 3.0,
      outputCostPer1MTokens: 4.0,
      currency: 'USD',
    },

    // Anthropic Claude 3 models
    'claude-3-opus': {
      inputCostPer1MTokens: 15.0,
      outputCostPer1MTokens: 75.0,
      currency: 'USD',
    },
    'claude-3-sonnet': {
      inputCostPer1MTokens: 3.0,
      outputCostPer1MTokens: 15.0,
      currency: 'USD',
    },
    'claude-3-haiku': {
      inputCostPer1MTokens: 0.25,
      outputCostPer1MTokens: 1.25,
      currency: 'USD',
    },

    // Google Gemini models
    'gemini-pro': {
      inputCostPer1MTokens: 0.5,
      outputCostPer1MTokens: 1.5,
      currency: 'USD',
    },
  };

  /**
   * Calculate cost for an execution
   */
  calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
    customPricing?: { costPerInputToken?: number; costPerOutputToken?: number },
  ): ExecutionCost {
    let pricing: ModelPricing;

    // Use custom pricing if provided
    if (customPricing?.costPerInputToken || customPricing?.costPerOutputToken) {
      pricing = {
        inputCostPer1MTokens: (customPricing.costPerInputToken || 0) * 1_000_000,
        outputCostPer1MTokens: (customPricing.costPerOutputToken || 0) * 1_000_000,
        currency: 'USD',
      };
    } else {
      pricing = this.getModelPricing(model);
    }

    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1MTokens;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1MTokens;
    const totalCost = inputCost + outputCost;

    return {
      inputCost: this.roundCost(inputCost),
      outputCost: this.roundCost(outputCost),
      totalCost: this.roundCost(totalCost),
      currency: pricing.currency,
    };
  }

  /**
   * Get pricing for a model
   */
  getModelPricing(model: string): ModelPricing {
    // Check for exact match
    if (this.modelPricing[model]) {
      return this.modelPricing[model];
    }

    // Check for partial match (e.g., "gpt-4-0613" -> "gpt-4")
    for (const [key, value] of Object.entries(this.modelPricing)) {
      if (model.startsWith(key)) {
        return value;
      }
    }

    // Default fallback pricing
    this.logger.warn(`No pricing found for model ${model}, using default pricing`);
    return {
      inputCostPer1MTokens: 1.0,
      outputCostPer1MTokens: 2.0,
      currency: 'USD',
    };
  }

  /**
   * Estimate cost before execution
   */
  estimateCost(
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number,
  ): ExecutionCost {
    return this.calculateCost(model, estimatedInputTokens, estimatedOutputTokens);
  }

  /**
   * Check if execution would exceed budget
   */
  wouldExceedBudget(
    executionCost: number,
    currentSpend: number,
    budgetLimit: number,
  ): boolean {
    return currentSpend + executionCost > budgetLimit;
  }

  /**
   * Calculate budget usage percentage
   */
  calculateBudgetUsage(currentSpend: number, budgetLimit: number): number {
    if (budgetLimit <= 0) {
      return 0;
    }
    return (currentSpend / budgetLimit) * 100;
  }

  /**
   * Get remaining budget
   */
  getRemainingBudget(currentSpend: number, budgetLimit: number): number {
    return Math.max(0, budgetLimit - currentSpend);
  }

  /**
   * Calculate cost savings from caching
   */
  calculateCacheSavings(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): ExecutionCost {
    return this.calculateCost(model, inputTokens, outputTokens);
  }

  /**
   * Get cost breakdown by provider
   */
  getProviderCosts(
    executions: Array<{
      model: string;
      inputTokens: number;
      outputTokens: number;
    }>,
  ): Record<string, ExecutionCost> {
    const providerCosts: Record<string, ExecutionCost> = {};

    for (const execution of executions) {
      const provider = this.getProvider(execution.model);
      const cost = this.calculateCost(
        execution.model,
        execution.inputTokens,
        execution.outputTokens,
      );

      if (!providerCosts[provider]) {
        providerCosts[provider] = {
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
          currency: 'USD',
        };
      }

      providerCosts[provider].inputCost += cost.inputCost;
      providerCosts[provider].outputCost += cost.outputCost;
      providerCosts[provider].totalCost += cost.totalCost;
    }

    // Round all costs
    for (const provider in providerCosts) {
      providerCosts[provider].inputCost = this.roundCost(
        providerCosts[provider].inputCost,
      );
      providerCosts[provider].outputCost = this.roundCost(
        providerCosts[provider].outputCost,
      );
      providerCosts[provider].totalCost = this.roundCost(
        providerCosts[provider].totalCost,
      );
    }

    return providerCosts;
  }

  /**
   * Get provider from model name
   */
  private getProvider(model: string): string {
    if (model.startsWith('gpt-')) {
      return 'OpenAI';
    } else if (model.startsWith('claude-')) {
      return 'Anthropic';
    } else if (model.startsWith('gemini-')) {
      return 'Google';
    }
    return 'Custom';
  }

  /**
   * Round cost to 6 decimal places
   */
  private roundCost(cost: number): number {
    return Math.round(cost * 1_000_000) / 1_000_000;
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 6,
      maximumFractionDigits: 6,
    }).format(cost);
  }

  /**
   * Get all available model pricing
   */
  getAllModelPricing(): Record<string, ModelPricing> {
    return { ...this.modelPricing };
  }
}
