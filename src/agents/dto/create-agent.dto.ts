import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  systemPrompt: string;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
