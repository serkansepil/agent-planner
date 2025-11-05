import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MessageSeenDto {
  @ApiProperty({ description: 'Message ID' })
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;
}
