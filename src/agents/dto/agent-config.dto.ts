import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ModelType {
  GPT_4 = 'gpt-4',
  GPT_4_TURBO = 'gpt-4-turbo',
  GPT_4O = 'gpt-4o',
  GPT_35_TURBO = 'gpt-3.5-turbo',
  CLAUDE_3_OPUS = 'claude-3-opus',
  CLAUDE_3_SONNET = 'claude-3-sonnet',
  CLAUDE_3_HAIKU = 'claude-3-haiku',
  GEMINI_PRO = 'gemini-pro',
  CUSTOM = 'custom',
}

export class AgentConfigDto {
  @ApiProperty({
    description: 'AI model to use',
    enum: ModelType,
    example: ModelType.GPT_4O,
  })
  @IsEnum(ModelType)
  modelType: ModelType;

  @ApiPropertyOptional({
    description: 'Custom model name (when modelType is CUSTOM)',
    example: 'custom-model-v1',
  })
  @IsString()
  @IsOptional()
  customModelName?: string;

  @ApiPropertyOptional({
    description: 'Temperature (0-2). Higher values make output more random',
    minimum: 0,
    maximum: 2,
    default: 0.7,
    example: 0.7,
  })
  @IsNumber()
  @Min(0)
  @Max(2)
  @IsOptional()
  temperature?: number = 0.7;

  @ApiPropertyOptional({
    description: 'Maximum tokens to generate',
    minimum: 1,
    maximum: 128000,
    default: 2000,
    example: 2000,
  })
  @IsNumber()
  @Min(1)
  @Max(128000)
  @IsOptional()
  maxTokens?: number = 2000;

  @ApiPropertyOptional({
    description: 'Top P (nucleus sampling) - 0 to 1',
    minimum: 0,
    maximum: 1,
    default: 1,
    example: 0.9,
  })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  topP?: number = 1;

  @ApiPropertyOptional({
    description: 'Frequency penalty (-2 to 2)',
    minimum: -2,
    maximum: 2,
    default: 0,
    example: 0,
  })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  frequencyPenalty?: number = 0;

  @ApiPropertyOptional({
    description: 'Presence penalty (-2 to 2)',
    minimum: -2,
    maximum: 2,
    default: 0,
    example: 0,
  })
  @IsNumber()
  @Min(-2)
  @Max(2)
  @IsOptional()
  presencePenalty?: number = 0;

  @ApiPropertyOptional({
    description: 'Enable streaming responses',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  streaming?: boolean = false;

  @ApiPropertyOptional({
    description: 'Stop sequences',
    example: ['\\n\\n', 'END'],
  })
  @IsOptional()
  stopSequences?: string[];

  @ApiPropertyOptional({
    description: 'Additional model-specific parameters',
    example: { responseFormat: 'json_object' },
  })
  @IsOptional()
  additionalParams?: Record<string, any>;
}
