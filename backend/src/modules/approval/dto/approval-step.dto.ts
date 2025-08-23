import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApprovalAction } from '@prisma/client';

export class ProcessApprovalDto {
  @ApiProperty({
    enum: ApprovalAction,
    description: 'Action to take on the approval',
  })
  @IsEnum(ApprovalAction)
  action: ApprovalAction;

  @ApiPropertyOptional({ description: 'Notes for the approval' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Version number for optimistic locking' })
  @IsNumber()
  version: number;
}

export class ApprovalStepFilterDto {
  @ApiPropertyOptional({ description: 'Filter by request ID' })
  @IsOptional()
  @IsString()
  requestId?: string;

  @ApiPropertyOptional({ description: 'Filter by approver profile ID' })
  @IsOptional()
  @IsString()
  approverProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;
}
