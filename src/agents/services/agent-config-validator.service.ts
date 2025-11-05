import { Injectable, BadRequestException } from '@nestjs/common';
import {
  AgentConfigDto,
  RateLimitConfigDto,
  CostTrackingConfigDto,
  AgentCapabilitiesDto,
  ModelType,
} from '../dto';

@Injectable()
export class AgentConfigValidatorService {
  /**
   * Validate agent configuration
   */
  validateConfig(config: AgentConfigDto): void {
    // Validate model type
    if (!Object.values(ModelType).includes(config.modelType)) {
      throw new BadRequestException(`Invalid model type: ${config.modelType}`);
    }

    // If custom model, require custom model name
    if (config.modelType === ModelType.CUSTOM && !config.customModelName) {
      throw new BadRequestException(
        'Custom model name is required when using CUSTOM model type',
      );
    }

    // Validate temperature
    if (config.temperature !== undefined) {
      if (config.temperature < 0 || config.temperature > 2) {
        throw new BadRequestException(
          'Temperature must be between 0 and 2',
        );
      }
    }

    // Validate maxTokens
    if (config.maxTokens !== undefined) {
      if (config.maxTokens < 1 || config.maxTokens > 128000) {
        throw new BadRequestException(
          'Max tokens must be between 1 and 128000',
        );
      }

      // Model-specific token limits
      const tokenLimits: Record<string, number> = {
        [ModelType.GPT_35_TURBO]: 16385,
        [ModelType.GPT_4]: 8192,
        [ModelType.GPT_4_TURBO]: 128000,
        [ModelType.GPT_4O]: 128000,
        [ModelType.CLAUDE_3_HAIKU]: 200000,
        [ModelType.CLAUDE_3_SONNET]: 200000,
        [ModelType.CLAUDE_3_OPUS]: 200000,
        [ModelType.GEMINI_PRO]: 32768,
      };

      const limit = tokenLimits[config.modelType];
      if (limit && config.maxTokens > limit) {
        throw new BadRequestException(
          `Max tokens for ${config.modelType} cannot exceed ${limit}`,
        );
      }
    }

    // Validate topP
    if (config.topP !== undefined) {
      if (config.topP < 0 || config.topP > 1) {
        throw new BadRequestException('Top P must be between 0 and 1');
      }
    }

    // Validate penalties
    if (config.frequencyPenalty !== undefined) {
      if (config.frequencyPenalty < -2 || config.frequencyPenalty > 2) {
        throw new BadRequestException(
          'Frequency penalty must be between -2 and 2',
        );
      }
    }

    if (config.presencePenalty !== undefined) {
      if (config.presencePenalty < -2 || config.presencePenalty > 2) {
        throw new BadRequestException(
          'Presence penalty must be between -2 and 2',
        );
      }
    }

    // Validate stop sequences
    if (config.stopSequences !== undefined) {
      if (!Array.isArray(config.stopSequences)) {
        throw new BadRequestException('Stop sequences must be an array');
      }
      if (config.stopSequences.length > 4) {
        throw new BadRequestException(
          'Maximum 4 stop sequences allowed',
        );
      }
    }
  }

  /**
   * Validate rate limit configuration
   */
  validateRateLimitConfig(config: RateLimitConfigDto): void {
    if (!config.enabled) {
      return;
    }

    // At least one limit must be specified
    if (
      !config.requestsPerMinute &&
      !config.requestsPerHour &&
      !config.requestsPerDay
    ) {
      throw new BadRequestException(
        'At least one rate limit must be specified when rate limiting is enabled',
      );
    }

    // Validate logical consistency
    if (config.requestsPerMinute && config.requestsPerHour) {
      if (config.requestsPerMinute * 60 > config.requestsPerHour) {
        throw new BadRequestException(
          'Requests per minute * 60 cannot exceed requests per hour',
        );
      }
    }

    if (config.requestsPerHour && config.requestsPerDay) {
      if (config.requestsPerHour * 24 > config.requestsPerDay) {
        throw new BadRequestException(
          'Requests per hour * 24 cannot exceed requests per day',
        );
      }
    }

    if (config.maxConcurrentRequests !== undefined) {
      if (config.maxConcurrentRequests < 1) {
        throw new BadRequestException(
          'Max concurrent requests must be at least 1',
        );
      }
    }
  }

  /**
   * Validate cost tracking configuration
   */
  validateCostTrackingConfig(config: CostTrackingConfigDto): void {
    if (!config.enabled) {
      return;
    }

    // Validate costs are specified
    if (
      config.costPerInputToken === undefined &&
      config.costPerOutputToken === undefined
    ) {
      throw new BadRequestException(
        'At least one cost metric must be specified when cost tracking is enabled',
      );
    }

    // Validate budget and threshold
    if (config.monthlyBudgetLimit !== undefined) {
      if (config.monthlyBudgetLimit < 0) {
        throw new BadRequestException(
          'Monthly budget limit cannot be negative',
        );
      }
    }

    if (config.alertThreshold !== undefined) {
      if (config.alertThreshold < 0 || config.alertThreshold > 100) {
        throw new BadRequestException(
          'Alert threshold must be between 0 and 100',
        );
      }
    }

    // Validate alert email format if provided
    if (config.alertEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.alertEmail)) {
        throw new BadRequestException('Invalid alert email format');
      }
    }
  }

  /**
   * Validate agent capabilities
   */
  validateCapabilities(capabilities: AgentCapabilitiesDto): void {
    // Validate file types
    if (capabilities.allowedFileTypes) {
      const validFileTypes = [
        'pdf',
        'txt',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'csv',
        'json',
        'xml',
        'md',
        'html',
      ];

      for (const fileType of capabilities.allowedFileTypes) {
        if (!validFileTypes.includes(fileType.toLowerCase())) {
          throw new BadRequestException(
            `Invalid file type: ${fileType}. Allowed types: ${validFileTypes.join(', ')}`,
          );
        }
      }
    }

    // Validate max file size
    if (capabilities.maxFileSize !== undefined) {
      if (capabilities.maxFileSize < 1 || capabilities.maxFileSize > 100) {
        throw new BadRequestException(
          'Max file size must be between 1 and 100 MB',
        );
      }
    }

    // If file upload is enabled, ensure file constraints are set
    if (capabilities.fileUpload) {
      if (!capabilities.allowedFileTypes || capabilities.allowedFileTypes.length === 0) {
        throw new BadRequestException(
          'Allowed file types must be specified when file upload is enabled',
        );
      }
      if (!capabilities.maxFileSize) {
        throw new BadRequestException(
          'Max file size must be specified when file upload is enabled',
        );
      }
    }

    // Validate tools
    if (capabilities.tools) {
      const validTools = [
        'web_search',
        'calculator',
        'code_interpreter',
        'image_generator',
        'file_reader',
        'sql_executor',
        'api_caller',
        'email_sender',
        'calendar',
        'translator',
      ];

      for (const tool of capabilities.tools) {
        if (!validTools.includes(tool)) {
          throw new BadRequestException(
            `Invalid tool: ${tool}. Valid tools: ${validTools.join(', ')}`,
          );
        }
      }
    }
  }

  /**
   * Validate complete agent configuration
   */
  validateAgentConfiguration(agent: {
    config?: any;
    rateLimitConfig?: any;
    costTrackingConfig?: any;
    capabilities?: any;
  }): void {
    if (agent.config) {
      this.validateConfig(agent.config);
    }

    if (agent.rateLimitConfig) {
      this.validateRateLimitConfig(agent.rateLimitConfig);
    }

    if (agent.costTrackingConfig) {
      this.validateCostTrackingConfig(agent.costTrackingConfig);
    }

    if (agent.capabilities) {
      this.validateCapabilities(agent.capabilities);
    }
  }
}
