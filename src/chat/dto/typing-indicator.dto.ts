import { IsString, IsUUID, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TypingIndicatorDto {
  @ApiProperty({ description: 'Session ID' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Is user typing' })
  @IsBoolean()
  isTyping: boolean;

  @ApiProperty({ description: 'User name' })
  @IsString()
  userName: string;
}
