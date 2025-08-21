import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsJSON,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PolicyType } from '@prisma/client';

export class CreatePolicyDto {
  @ApiProperty({
    example: 'WORKING_HOURS_POLICY',
    description: 'Unique policy code',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: 'Working Hours Access Policy',
    description: 'Policy display name',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Policy description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: PolicyType,
    example: PolicyType.TIME_BASED,
    description: 'Type of policy',
  })
  @IsEnum(PolicyType)
  policyType: PolicyType;

  @ApiProperty({
    description: 'Policy rules in JSON format',
    example: {
      schedule: {
        daysOfWeek: [1, 2, 3, 4, 5],
        startTime: '08:00',
        endTime: '17:00',
        timezone: 'Asia/Jakarta',
      },
    },
  })
  @IsJSON()
  rules: any;

  @ApiPropertyOptional({
    description:
      'Priority for policy evaluation (lower number = higher priority)',
    default: 100,
    minimum: 1,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Permission codes to grant when policy applies',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  grantPermissions?: string[];

  @ApiPropertyOptional({
    description: 'Permission codes to deny when policy applies',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  denyPermissions?: string[];
}

export class UpdatePolicyDto extends CreatePolicyDto {
  @ApiPropertyOptional({
    description: 'Set policy active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AssignPolicyDto {
  @ApiProperty({
    enum: ['ROLE', 'USER', 'DEPARTMENT', 'POSITION'],
    description: 'Type of assignee',
  })
  @IsEnum(['ROLE', 'USER', 'DEPARTMENT', 'POSITION'])
  assigneeType: 'ROLE' | 'USER' | 'DEPARTMENT' | 'POSITION';

  @ApiProperty({
    description: 'ID of the assignee (role ID, user ID, etc.)',
  })
  @IsString()
  assigneeId: string;

  @ApiPropertyOptional({
    description: 'Additional conditions for this assignment',
  })
  @IsOptional()
  @IsJSON()
  conditions?: any;

  @ApiPropertyOptional({
    description: 'When the assignment becomes valid',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  validFrom?: Date;

  @ApiPropertyOptional({
    description: 'When the assignment expires',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  validUntil?: Date;
}

export class EvaluatePolicyDto {
  @ApiProperty({
    description: 'User ID to evaluate policy for',
  })
  @IsString()
  userId: string;

  @ApiPropertyOptional({
    description: 'Context for policy evaluation',
    example: {
      timestamp: '2024-01-15T10:30:00Z',
      location: {
        ipAddress: '192.168.1.1',
        country: 'Indonesia',
        city: 'Jakarta',
      },
      attributes: {
        department: 'IT',
        isRemote: true,
      },
    },
  })
  @IsOptional()
  @IsJSON()
  context?: any;
}
