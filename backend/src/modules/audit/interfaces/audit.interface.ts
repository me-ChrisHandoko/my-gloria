export interface AuditableChange {
  id?: string;
  actorId: string;
  actorProfileId?: string | null;
  action: any; // AuditAction enum
  module: string;
  entityType: string;
  entityId: string;
  entityDisplay?: string | null;
  oldValues?: any;
  newValues?: any;
  changedFields?: string[] | null;
  targetUserId?: string | null;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: Date;
}
