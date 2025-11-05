import { IsArray, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AgentCapabilitiesDto {
  @ApiPropertyOptional({
    description: 'Available tools/functions the agent can use',
    example: ['web_search', 'calculator', 'code_interpreter'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tools?: string[];

  @ApiPropertyOptional({
    description: 'Enable web search capability',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  webSearch?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable code interpreter capability',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  codeInterpreter?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable image generation capability',
    default: false,
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  imageGeneration?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable file upload capability',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  fileUpload?: boolean = false;

  @ApiPropertyOptional({
    description: 'Enable knowledge base access',
    default: false,
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  knowledgeBase?: boolean = false;

  @ApiPropertyOptional({
    description: 'Allowed file types for upload',
    example: ['pdf', 'txt', 'doc', 'docx'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedFileTypes?: string[];

  @ApiPropertyOptional({
    description: 'Maximum file size in MB',
    example: 10,
  })
  @IsOptional()
  maxFileSize?: number;

  @ApiPropertyOptional({
    description: 'Custom capabilities (key-value pairs)',
    example: { apiIntegration: true, customTool: 'enabled' },
  })
  @IsOptional()
  customCapabilities?: Record<string, any>;
}
