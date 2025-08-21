import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditAction, Prisma } from '@prisma/client';
import { v7 as uuidv7 } from 'uuid';
import {
  QueryAuditLogDto,
  QueryAuditStatisticsDto,
  StatisticsGroupBy,
  ExportAuditLogDto,
  ExportFormat,
  AuditStatisticsResponseDto,
} from '../dto';

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
  private async logInternal(
    context: AuditContext,
    change: AuditableChange,
  ): Promise<void> {
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

  /**
   * Query audit logs with advanced filters
   */
  async queryAuditLogs(
    query: QueryAuditLogDto,
  ): Promise<{ data: any[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    if (query.entityId) {
      where.entityId = query.entityId;
    }

    if (query.module) {
      where.module = query.module;
    }

    if (query.actorId) {
      where.actorId = query.actorId;
    }

    if (query.actions && query.actions.length > 0) {
      where.action = { in: query.actions };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
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
          [query.sortBy || 'createdAt']: query.sortOrder || 'desc',
        },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get statistics based on grouping
   */
  async getStatistics(
    query: QueryAuditStatisticsDto,
  ): Promise<AuditStatisticsResponseDto[]> {
    const where: Prisma.AuditLogWhereInput = {
      createdAt: {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      },
    };

    if (query.module) {
      where.module = query.module;
    }

    if (query.entityType) {
      where.entityType = query.entityType;
    }

    let groupBy: any;
    switch (query.groupBy) {
      case StatisticsGroupBy.MODULE:
        groupBy = ['module'];
        break;
      case StatisticsGroupBy.ACTION:
        groupBy = ['action'];
        break;
      case StatisticsGroupBy.ACTOR:
        groupBy = ['actorId'];
        break;
      case StatisticsGroupBy.ENTITY_TYPE:
        groupBy = ['entityType'];
        break;
      default:
        groupBy = ['module'];
    }

    const result = await this.prisma.auditLog.groupBy({
      by: groupBy,
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    const total = result.reduce((sum, item) => sum + item._count.id, 0);

    return result.map((item) => ({
      label: query.groupBy,
      value: item[groupBy[0]],
      count: item._count.id,
      percentage: (item._count.id / total) * 100,
    }));
  }

  /**
   * Export audit logs in various formats
   */
  async exportAuditLogs(
    exportDto: ExportAuditLogDto,
  ): Promise<{ data: any; filename: string; mimeType: string }> {
    const where: Prisma.AuditLogWhereInput = {
      createdAt: {
        gte: new Date(exportDto.startDate),
        lte: new Date(exportDto.endDate),
      },
    };

    if (exportDto.entityType) {
      where.entityType = exportDto.entityType;
    }

    if (exportDto.entityId) {
      where.entityId = exportDto.entityId;
    }

    if (exportDto.module) {
      where.module = exportDto.module;
    }

    if (exportDto.actorId) {
      where.actorId = exportDto.actorId;
    }

    if (exportDto.actions && exportDto.actions.length > 0) {
      where.action = { in: exportDto.actions };
    }

    const logs = await this.prisma.auditLog.findMany({
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
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let data: any;
    let filename: string;
    let mimeType: string;

    switch (exportDto.format) {
      case ExportFormat.JSON:
        data = JSON.stringify(logs, null, 2);
        filename = `audit-log-${timestamp}.json`;
        mimeType = 'application/json';
        break;

      case ExportFormat.CSV:
        data = this.convertToCSV(logs, exportDto.fields);
        filename = `audit-log-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;

      case ExportFormat.EXCEL:
        // This would require additional library like exceljs
        // For now, we'll return CSV format
        data = this.convertToCSV(logs, exportDto.fields);
        filename = `audit-log-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;

      default:
        data = this.convertToCSV(logs, exportDto.fields);
        filename = `audit-log-${timestamp}.csv`;
        mimeType = 'text/csv';
    }

    return { data, filename, mimeType };
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: any[], fields?: string[]): string {
    if (logs.length === 0) {
      return '';
    }

    const defaultFields = [
      'id',
      'createdAt',
      'actorId',
      'actorName',
      'action',
      'module',
      'entityType',
      'entityId',
      'entityDisplay',
      'ipAddress',
    ];

    const fieldsToExport = fields || defaultFields;
    const headers = fieldsToExport.join(',');

    const rows = logs.map((log) => {
      return fieldsToExport
        .map((field) => {
          if (field === 'actorName') {
            return log.actorProfile?.dataKaryawan?.nama || log.actorId;
          }
          const value = log[field];
          if (value === null || value === undefined) {
            return '';
          }
          if (typeof value === 'object') {
            return JSON.stringify(value);
          }
          return String(value).includes(',') ? `"${value}"` : value;
        })
        .join(',');
    });

    return [headers, ...rows].join('\n');
  }

  /**
   * Get recent changes across the system
   */
  async getRecentChanges(limit: number = 20): Promise<any[]> {
    return this.prisma.auditLog.findMany({
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
      take: limit,
    });
  }

  /**
   * Generate compliance audit report
   */
  async generateComplianceReport(startDate: Date, endDate: Date): Promise<any> {
    const [
      totalLogs,
      actionBreakdown,
      moduleBreakdown,
      topActors,
      criticalActions,
    ] = await Promise.all([
      // Total audit logs
      this.prisma.auditLog.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),

      // Action breakdown
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
      }),

      // Module breakdown
      this.prisma.auditLog.groupBy({
        by: ['module'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
      }),

      // Top actors
      this.prisma.auditLog.groupBy({
        by: ['actorId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      }),

      // Critical actions (DELETE, APPROVE, REJECT)
      this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
          action: {
            in: [AuditAction.DELETE, AuditAction.APPROVE, AuditAction.REJECT],
          },
        },
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
        take: 50,
      }),
    ]);

    return {
      period: {
        startDate,
        endDate,
      },
      summary: {
        totalLogs,
        averagePerDay: totalLogs / this.getDaysBetween(startDate, endDate),
      },
      breakdown: {
        byAction: actionBreakdown,
        byModule: moduleBreakdown,
      },
      topActors,
      criticalActions,
      generatedAt: new Date(),
    };
  }

  /**
   * Calculate days between two dates
   */
  private getDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  }
}
