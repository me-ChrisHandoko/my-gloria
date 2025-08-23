import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePermissionTemplateDto } from './create-permission-template.dto';
import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePermissionTemplateDto extends PartialType(
  OmitType(CreatePermissionTemplateDto, ['code', 'isSystem'] as const)
) {
  @ApiProperty({ 
    description: 'Version number for optimistic locking',
    minimum: 0
  })
  @IsInt()
  @Min(0)
  version: number;
}