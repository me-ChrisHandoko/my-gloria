import { IsString, IsInt, IsBoolean, IsOptional, IsEnum, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApproverType } from '@prisma/client';

export class CreateApprovalMatrixDto {
  @ApiProperty({ description: 'Module name for the approval workflow' })
  @IsString()
  module: string;

  @ApiPropertyOptional({ description: 'Requester role (optional)' })
  @IsOptional()
  @IsString()
  requesterRole?: string;

  @ApiPropertyOptional({ description: 'Requester position (optional)' })
  @IsOptional()
  @IsString()
  requesterPosition?: string;

  @ApiProperty({ description: 'Approval sequence order' })
  @IsInt()
  @Min(1)
  approvalSequence: number;

  @ApiProperty({ enum: ApproverType, description: 'Type of approver' })
  @IsEnum(ApproverType)
  approverType: ApproverType;

  @ApiProperty({ description: 'Approver value (position_code, department_code, or user_id)' })
  @IsString()
  approverValue: string;

  @ApiPropertyOptional({ description: 'Conditions for approval (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is the matrix active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateApprovalMatrixDto {
  @ApiPropertyOptional({ description: 'Module name for the approval workflow' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Requester role (optional)' })
  @IsOptional()
  @IsString()
  requesterRole?: string;

  @ApiPropertyOptional({ description: 'Requester position (optional)' })
  @IsOptional()
  @IsString()
  requesterPosition?: string;

  @ApiPropertyOptional({ description: 'Approval sequence order' })
  @IsOptional()
  @IsInt()
  @Min(1)
  approvalSequence?: number;

  @ApiPropertyOptional({ enum: ApproverType, description: 'Type of approver' })
  @IsOptional()
  @IsEnum(ApproverType)
  approverType?: ApproverType;

  @ApiPropertyOptional({ description: 'Approver value (position_code, department_code, or user_id)' })
  @IsOptional()
  @IsString()
  approverValue?: string;

  @ApiPropertyOptional({ description: 'Conditions for approval (JSON)' })
  @IsOptional()
  @IsObject()
  conditions?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Is the matrix active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ApprovalMatrixFilterDto {
  @ApiPropertyOptional({ description: 'Filter by module' })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiPropertyOptional({ description: 'Filter by requester role' })
  @IsOptional()
  @IsString()
  requesterRole?: string;

  @ApiPropertyOptional({ description: 'Filter by requester position' })
  @IsOptional()
  @IsString()
  requesterPosition?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}