import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TemplateTargetType {
  ROLE = 'role',
  USER = 'user',
}

export class ApplyPermissionTemplateDto {
  @ApiProperty({ description: 'Template ID to apply' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ 
    description: 'Target type',
    enum: TemplateTargetType
  })
  @IsEnum(TemplateTargetType)
  targetType: TemplateTargetType;

  @ApiProperty({ description: 'Target ID (Role ID or UserProfile ID)' })
  @IsString()
  @IsNotEmpty()
  targetId: string;

  @ApiPropertyOptional({ description: 'Notes about the application' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class RevokePermissionTemplateDto {
  @ApiProperty({ description: 'Template application ID' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiPropertyOptional({ description: 'Reason for revocation' })
  @IsString()
  @IsOptional()
  reason?: string;
}