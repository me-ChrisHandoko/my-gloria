import { IsString, IsOptional, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetHierarchyDto {
  @ApiProperty({ description: 'Position ID to set hierarchy for' })
  @IsNotEmpty()
  @IsUUID()
  positionId: string;

  @ApiPropertyOptional({
    description: 'Position ID that this position reports to',
  })
  @IsOptional()
  @IsUUID()
  reportsToId?: string;

  @ApiPropertyOptional({
    description: 'Position ID that coordinates this position',
  })
  @IsOptional()
  @IsUUID()
  coordinatorId?: string;
}

export class HierarchyNodeDto {
  @ApiProperty()
  positionId: string;

  @ApiProperty()
  positionName: string;

  @ApiProperty()
  positionCode: string;

  @ApiProperty()
  departmentName?: string;

  @ApiProperty()
  hierarchyLevel: number;

  @ApiPropertyOptional()
  currentHolder?: {
    userProfileId: string;
    name: string;
    nip: string;
    isPlt: boolean;
  };

  @ApiPropertyOptional()
  reportsTo?: {
    positionId: string;
    positionName: string;
    holderName?: string;
  };

  @ApiPropertyOptional()
  coordinator?: {
    positionId: string;
    positionName: string;
    holderName?: string;
  };

  @ApiProperty({ type: () => [HierarchyNodeDto] })
  directReports: HierarchyNodeDto[];

  @ApiProperty()
  totalSubordinates: number;
}

export class OrgChartDto {
  @ApiProperty({ type: () => HierarchyNodeDto })
  root: HierarchyNodeDto;

  @ApiProperty()
  metadata: {
    totalPositions: number;
    totalEmployees: number;
    hierarchyLevels: number;
    departmentCount: number;
  };
}

export class ReportingChainDto {
  @ApiProperty()
  positionId: string;

  @ApiProperty()
  positionName: string;

  @ApiProperty({ type: () => [Object] })
  reportingChain: Array<{
    level: number;
    positionId: string;
    positionName: string;
    departmentName?: string;
    holderName?: string;
  }>;

  @ApiProperty()
  chainLength: number;
}

export class HierarchyValidationResultDto {
  @ApiProperty()
  valid: boolean;

  @ApiProperty({ type: [String] })
  issues: string[];

  @ApiPropertyOptional({ type: [Object] })
  circularReferences?: Array<{
    positionId: string;
    positionName: string;
    conflictWith: string;
  }>;

  @ApiPropertyOptional({ type: [Object] })
  orphanedPositions?: Array<{
    positionId: string;
    positionName: string;
    reason: string;
  }>;
}
