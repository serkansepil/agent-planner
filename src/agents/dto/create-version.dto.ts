import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVersionDto {
  @ApiPropertyOptional({
    description: 'Change log describing what changed in this version',
    example: 'Updated system prompt to be more concise, reduced temperature to 0.5',
  })
  @IsString()
  @IsOptional()
  changeLog?: string;
}

export class RestoreVersionDto {
  @ApiProperty({
    description: 'Version number to restore',
    example: 2,
  })
  version: number;

  @ApiPropertyOptional({
    description: 'Change log for this restoration',
    example: 'Restored to version 2 due to better performance',
  })
  @IsString()
  @IsOptional()
  changeLog?: string;
}
