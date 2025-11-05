import { IsString, IsOptional, IsUUID, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MessageAttachmentDto {
  @ApiProperty({ description: 'File name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'File URL' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ description: 'MIME type' })
  @IsString()
  mimeType: string;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class SendMessageDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Agent ID (if message from agent)' })
  @IsOptional()
  @IsUUID()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Parent message ID for threading' })
  @IsOptional()
  @IsUUID()
  parentMessageId?: string;

  @ApiPropertyOptional({ description: 'Message attachments', type: [MessageAttachmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsOptional()
  metadata?: Record<string, any>;
}
