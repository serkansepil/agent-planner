import { PartialType } from '@nestjs/mapped-types';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateWorkspaceDto extends PartialType(
  CreateWorkspaceDto,
) {
  @ApiPropertyOptional({ description: 'Active status of workspace' })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
