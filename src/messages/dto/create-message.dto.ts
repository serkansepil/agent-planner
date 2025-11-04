import { IsString, IsNotEmpty, IsEnum, IsUUID, IsOptional } from 'class-validator';

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export class CreateMessageDto {
  @IsUUID()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(MessageRole)
  @IsNotEmpty()
  role: MessageRole;

  @IsUUID()
  @IsOptional()
  agentId?: string;
}
