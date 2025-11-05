import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EditMessageDto {
  @ApiProperty({ description: 'Message ID' })
  @IsUUID()
  messageId: string;

  @ApiProperty({ description: 'New message content' })
  @IsString()
  content: string;
}
