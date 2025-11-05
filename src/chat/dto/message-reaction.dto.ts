import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MessageReactionDto {
  @ApiProperty({ description: 'Message ID' })
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'Emoji reaction' })
  @IsString()
  emoji: string;
}
