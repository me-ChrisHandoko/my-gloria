import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '@prisma/client';

export class ActorProfileDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  nama?: string;

  @ApiPropertyOptional()
  nip?: string;
}

export class AuditLogResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  actorId: string;

  @ApiPropertyOptional()
  actorProfileId?: string;

  @ApiPropertyOptional({ type: () => ActorProfileDto })
  actorProfile?: ActorProfileDto;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  @ApiProperty()
  module: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  entityId: string;

  @ApiPropertyOptional()
  entityDisplay?: string;

  @ApiPropertyOptional()
  oldValues?: any;

  @ApiPropertyOptional()
  newValues?: any;

  @ApiPropertyOptional()
  changedFields?: string[];

  @ApiPropertyOptional()
  metadata?: any;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  userAgent?: string;

  @ApiProperty()
  createdAt: Date;
}

export class PaginatedAuditLogResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] })
  data: AuditLogResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  offset: number;

  @ApiProperty()
  hasMore: boolean;
}
