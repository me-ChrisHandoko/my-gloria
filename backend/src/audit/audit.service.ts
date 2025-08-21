import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';

interface AuditContext {
  actorId: string; // Clerk user ID
  actorProfileId?: string;
  module: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuditableChange {
  entityType: string;
  entityId: string;
  entityDisplay?: string;
  action: AuditAction;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs an audit entry - supports both two-parameter and single-parameter formats
   */
  async log(
    contextOrCombined: AuditContext | (AuditContext & AuditableChange),
    change?: AuditableChange,
  ): Promise<void> {
    // Support both formats - if change is not provided, assume first param has everything
    let context: AuditContext;
    let auditChange: AuditableChange;
    
    if (change) {
      // Two-parameter format
      context = contextOrCombined as AuditContext;
      auditChange = change;
    } else {
      // Single-parameter format - extract context and change from combined object
      const combined = contextOrCombined as AuditContext & AuditableChange;
      context = {
        actorId: combined.actorId,
        actorProfileId: combined.actorProfileId,
        module: combined.module,
        ipAddress: combined.ipAddress,
        userAgent: combined.userAgent,
      };
      auditChange = {
        entityType: combined.entityType,
        entityId: combined.entityId,
        entityDisplay: combined.entityDisplay,
        action: combined.action,
        oldValues: combined.oldValues,
        newValues: combined.newValues,
        metadata: combined.metadata,
      };
    }
    
    await this.logInternal(context, auditChange);
  }

  /**
   * Internal log method that does the actual work
   */
  private async logInternal(context: AuditContext, change: AuditableChange): Promise<void> {
    try {
      // Get actor profile if not provided
      let actorProfileId = context.actorProfileId;
      if (!actorProfileId && context.actorId) {
        const profile = await this.prisma.userProfile.findUnique({
          where: { clerkUserId: context.actorId },
          select: { id: true },
        });
        actorProfileId = profile?.id;
      }

      // Calculate changed fields
      const changedFields = this.calculateChangedFields(
        change.oldValues,
        change.newValues,
      );

      // Create audit log entry
      await this.prisma.auditLog.create({
        data: {
          id: uuidv7(),
          actorId: context.actorId,
          actorProfileId,
          action: change.action,
          module: context.module,
          entityType: change.entityType,
          entityId: change.entityId,
          entityDisplay: change.entityDisplay,
          oldValues: change.oldValues ? change.oldValues : Prisma.JsonNull,
          newValues: change.newValues ? change.newValues : Prisma.JsonNull,
          changedFields:
            changedFields.length > 0 ? changedFields : Prisma.JsonNull,
          metadata: change.metadata ? change.metadata : Prisma.JsonNull,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
    } catch (error) {
      // Log audit failures but don't break the main operation
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Logs a CREATE action
   */
  async logCreate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    newValues: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.log(context, {
      entityType,
      entityId,
      entityDisplay,
      action: AuditAction.CREATE,
      newValues,
    });
  }

  /**
   * Logs an UPDATE action
   */
  async logUpdate(
    context: AuditContext,
    entityType: string,
    entityId: string,
    oldValues: any,
    newValues: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.log(context, {
      entityType,
      entityId,
      entityDisplay,
      action: AuditAction.UPDATE,
      oldValues,
      newValues,
    });
  }

  /**
   * Logs a DELETE action
   */
  async logDelete(
    context: AuditContext,
    entityType: string,
    entityId: string,
    oldValues: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.log(context, {
      entityType,
      entityId,
      entityDisplay,
      action: AuditAction.DELETE,
      oldValues,
    });
  }

  /**
   * Logs an APPROVE action
   */
  async logApprove(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.log(context, {
      entityType,
      entityId,
      entityDisplay,
      action: AuditAction.APPROVE,
      metadata,
    });
  }

  /**
   * Logs a REJECT action
   */
  async logReject(
    context: AuditContext,
    entityType: string,
    entityId: string,
    metadata: any,
    entityDisplay?: string,
  ): Promise<void> {
    await this.log(context, {
      entityType,
      entityId,
      entityDisplay,
      action: AuditAction.REJECT,
      metadata,
    });
  }

  /**
   * Logs organizational structure changes
   */
  async logOrganizationalChange(
    context: AuditContext,
    change: {
      type:
        | 'POSITION_ASSIGNMENT'
        | 'HIERARCHY_CHANGE'
        | 'DEPARTMENT_MOVE'
        | 'SCHOOL_UPDATE';
      entityId: string;
      entityName: string;
      details: any;
    },
  ): Promise<void> {
    const action =
      change.type === 'POSITION_ASSIGNMENT'
        ? AuditAction.ASSIGN
        : AuditAction.UPDATE;

    await this.log(context, {
      entityType: 'ORGANIZATIONAL_STRUCTURE',
      entityId: change.entityId,
      entityDisplay: change.entityName,
      action,
      metadata: {
        changeType: change.type,
        ...change.details,
      },
    });
  }

  /**
   * Calculates which fields changed between old and new values
   */
  private calculateChangedFields(oldValues: any, newValues: any): string[] {
    if (!oldValues || !newValues) {
      return [];
    }

    const changedFields: string[] = [];
    const allKeys = new Set([
      ...Object.keys(oldValues),
      ...Object.keys(newValues),
    ]);

    allKeys.forEach((key) => {
      // Skip system fields
      if (['id', 'createdAt', 'updatedAt'].includes(key)) {
        return;
      }

      const oldValue = oldValues[key];
      const newValue = newValues[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  /**
   * Gets audit trail for an entity
   */
  async getAuditTrail(
    entityType: string,
    entityId: string,
    options?: {
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any[]> {
    const where: Prisma.AuditLogWhereInput = {
      entityType,
      entityId,
    };

    if (options?.startDate || options?.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    return this.prisma.auditLog.findMany({
      where,
      include: {
        actorProfile: {
          include: {
            dataKaryawan: {
              select: {
                nama: true,
                nip: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Gets user activity audit trail
   */
  async getUserActivity(
    clerkUserId: string,
    options?: {
      limit?: number;
      offset?: number;
      modules?: string[];
      actions?: AuditAction[];
    },
  ): Promise<any[]> {
    const where: Prisma.AuditLogWhereInput = {
      actorId: clerkUserId,
    };

    if (options?.modules) {
      where.module = { in: options.modules };
    }

    if (options?.actions) {
      where.action = { in: options.actions };
    }

    return this.prisma.auditLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    });
  }

  /**
   * Creates audit context from request
   */
  createContextFromRequest(req: any): AuditContext {
    return {
      actorId: req.user?.clerkUserId || 'SYSTEM',
      actorProfileId: req.user?.profileId,
      module: req.route?.path?.split('/')[2] || 'UNKNOWN',
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers?.['user-agent'],
    };
  }

  /**
   * Audits position assignment
   */
  async auditPositionAssignment(
    context: AuditContext,
    assignment: {
      userProfileId: string;
      positionId: string;
      positionName: string;
      userName: string;
      isPlt: boolean;
      startDate: Date;
      endDate?: Date;
    },
  ): Promise<void> {
    await this.logOrganizationalChange(context, {
      type: 'POSITION_ASSIGNMENT',
      entityId: assignment.userProfileId,
      entityName: assignment.userName,
      details: {
        positionId: assignment.positionId,
        positionName: assignment.positionName,
        isPlt: assignment.isPlt,
        startDate: assignment.startDate,
        endDate: assignment.endDate,
      },
    });
  }

  /**
   * Audits hierarchy changes
   */
  async auditHierarchyChange(
    context: AuditContext,
    change: {
      positionId: string;
      positionName: string;
      oldReportsTo?: string;
      newReportsTo?: string;
      oldCoordinator?: string;
      newCoordinator?: string;
    },
  ): Promise<void> {
    const oldValues: any = {};
    const newValues: any = {};

    if (change.oldReportsTo !== change.newReportsTo) {
      oldValues.reportsToId = change.oldReportsTo;
      newValues.reportsToId = change.newReportsTo;
    }

    if (change.oldCoordinator !== change.newCoordinator) {
      oldValues.coordinatorId = change.oldCoordinator;
      newValues.coordinatorId = change.newCoordinator;
    }

    await this.logUpdate(
      context,
      'PositionHierarchy',
      change.positionId,
      oldValues,
      newValues,
      change.positionName,
    );
  }

  /**
   * Gets audit statistics
   */
  async getAuditStatistics(
    startDate: Date,
    endDate: Date,
    groupBy: 'module' | 'action' | 'actor',
  ): Promise<any[]> {
    const result = await this.prisma.auditLog.groupBy({
      by: [groupBy === 'actor' ? 'actorId' : groupBy],
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    return result.map((item) => ({
      [groupBy]: item[groupBy === 'actor' ? 'actorId' : groupBy],
      count: item._count.id,
    }));
  }

  /**
   * Cleans up old audit logs
   */
  async cleanupOldLogs(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
