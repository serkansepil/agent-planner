import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinSessionDto {
  @ApiProperty({ description: 'Session ID to join' })
  @IsUUID()
  sessionId: string;
}
