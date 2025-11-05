import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RAGQueryDto {
  @ApiProperty({
    description: 'The question or query',
    example: 'What are the authentication requirements for the API?',
  })
  @IsString()
  @IsNotEmpty()
  query: string;

  @ApiPropertyOptional({
    description: 'RAG strategy to use (balanced, precise, comprehensive)',
    example: 'balanced',
    default: 'balanced',
  })
  @IsString()
  @IsOptional()
  strategy?: string = 'balanced';

  @ApiPropertyOptional({
    description: 'Agent ID for agent-specific knowledge',
  })
  @IsUUID()
  @IsOptional()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Workspace ID to filter knowledge',
  })
  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @ApiPropertyOptional({
    description: 'Filter by specific document IDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  documentIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by document tags',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Include conversation history',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includeHistory?: boolean = false;

  @ApiPropertyOptional({
    description: 'Conversation history (if includeHistory is true)',
    type: 'array',
  })
  @IsOptional()
  conversationHistory?: Array<{ role: string; content: string }>;

  @ApiPropertyOptional({
    description: 'Custom instructions for the AI',
    example: 'Please provide code examples where applicable',
  })
  @IsString()
  @IsOptional()
  customInstructions?: string;
}

export class RAGFeedbackDto {
  @ApiProperty({
    description: 'Was the response helpful?',
  })
  @IsBoolean()
  helpful: boolean;

  @ApiPropertyOptional({
    description: 'Rating (1-5)',
  })
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({
    description: 'Additional feedback',
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}
