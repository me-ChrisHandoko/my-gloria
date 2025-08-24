import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { PermissionChangeHistoryService } from './permission-change-history.service';
import {
  BulkGrantPermissionsDto,
  BulkRevokePermissionsDto,
  BulkTargetType,
} from '../dto/bulk';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';

export interface BulkOperationResult {
  success: boolean;
  totalTargets: number;
  totalPermissions: number;
  processed: number;
  failed: number;
  errors: { targetId: string; permissionCode: string; error: string }[];
  summary: {
    created?: number;
    updated?: number;
    skipped?: number;
    deleted?: number;
  };
}

@Injectable()
export class PermissionBulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly changeHistoryService: PermissionChangeHistoryService,
  ) {}

  async bulkGrant(
    dto: BulkGrantPermissionsDto,
    actorId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      totalTargets: dto.targetIds.length,
      totalPermissions: dto.permissions.length,
      processed: 0,
      failed: 0,
      errors: [],
      summary: {
        created: 0,
        updated: 0,
        skipped: 0,
      },
    };

    // Validate all permission codes exist
    const permissionCodes = dto.permissions.map((p) => p.permissionCode);
    const existingPermissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    const existingPermissionCodes = new Set(
      existingPermissions.map((p) => p.code),
    );
    const invalidPermissions = permissionCodes.filter(
      (code) => !existingPermissionCodes.has(code),
    );

    if (invalidPermissions.length > 0) {
      throw new BadRequestException(
        `Invalid permission codes: ${invalidPermissions.join(', ')}`,
      );
    }

    // Create permission map for quick lookup
    const permissionMap = new Map(existingPermissions.map((p) => [p.code, p]));

    // Execute bulk operation in transaction
    await this.prisma.$transaction(
      async (tx) => {
        for (const targetId of dto.targetIds) {
          for (const permItem of dto.permissions) {
            try {
              const permission = permissionMap.get(permItem.permissionCode)!;

              if (dto.targetType === BulkTargetType.USERS) {
                await this.grantToUser(
                  tx,
                  targetId,
                  permission.id,
                  permItem,
                  actorId,
                  dto.skipExistingCheck,
                  result,
                );
              } else if (dto.targetType === BulkTargetType.ROLES) {
                await this.grantToRole(
                  tx,
                  targetId,
                  permission.id,
                  permItem,
                  actorId,
                  dto.skipExistingCheck,
                  result,
                );
              }

              result.processed++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                targetId,
                permissionCode: permItem.permissionCode,
                error: error.message,
              });
            }
          }
        }

        // Record bulk operation in audit log
        await this.auditService.log({
          actorId,
          action: 'CREATE',
          module: 'permission',
          entityType: 'BulkPermissionGrant',
          entityId: uuidv7(),
          entityDisplay: `Bulk grant to ${dto.targetIds.length} ${dto.targetType}`,
          newValues: {
            targetType: dto.targetType,
            targetCount: dto.targetIds.length,
            permissionCount: dto.permissions.length,
            reason: dto.reason,
          },
          metadata: result.summary,
        });

        // Record in change history
        await this.changeHistoryService.recordChange({
          entityType: 'bulk_permission_grant',
          entityId: uuidv7(),
          operation: 'bulk_grant',
          newState: {
            targetType: dto.targetType,
            targetIds: dto.targetIds,
            permissions: dto.permissions,
            summary: result.summary,
          },
          performedBy: actorId,
          metadata: { reason: dto.reason },
        });
      },
      {
        timeout: 30000, // 30 second timeout for large operations
      },
    );

    result.success = result.failed === 0;
    return result;
  }

  async bulkRevoke(
    dto: BulkRevokePermissionsDto,
    actorId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      success: true,
      totalTargets: dto.targetIds.length,
      totalPermissions: dto.permissionCodes.length,
      processed: 0,
      failed: 0,
      errors: [],
      summary: {
        deleted: 0,
        skipped: 0,
      },
    };

    // Get permission IDs
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });

    const permissionMap = new Map(permissions.map((p) => [p.code, p.id]));

    // Execute bulk operation in transaction
    await this.prisma.$transaction(
      async (tx) => {
        for (const targetId of dto.targetIds) {
          for (const permissionCode of dto.permissionCodes) {
            try {
              const permissionId = permissionMap.get(permissionCode);

              if (!permissionId) {
                result.failed++;
                result.errors.push({
                  targetId,
                  permissionCode,
                  error: 'Permission code not found',
                });
                continue;
              }

              if (dto.targetType === BulkTargetType.USERS) {
                await this.revokeFromUser(
                  tx,
                  targetId,
                  permissionId,
                  actorId,
                  dto.forceRevoke,
                  result,
                );
              } else if (dto.targetType === BulkTargetType.ROLES) {
                await this.revokeFromRole(
                  tx,
                  targetId,
                  permissionId,
                  actorId,
                  dto.forceRevoke,
                  result,
                );
              }

              result.processed++;
            } catch (error: any) {
              result.failed++;
              result.errors.push({
                targetId,
                permissionCode,
                error: error.message,
              });
            }
          }
        }

        // Record bulk operation in audit log
        await this.auditService.log({
          actorId,
          action: 'DELETE',
          module: 'permission',
          entityType: 'BulkPermissionRevoke',
          entityId: uuidv7(),
          entityDisplay: `Bulk revoke from ${dto.targetIds.length} ${dto.targetType}`,
          oldValues: {
            targetType: dto.targetType,
            targetCount: dto.targetIds.length,
            permissionCount: dto.permissionCodes.length,
            reason: dto.reason,
          },
          metadata: result.summary,
        });

        // Record in change history
        await this.changeHistoryService.recordChange({
          entityType: 'bulk_permission_revoke',
          entityId: uuidv7(),
          operation: 'bulk_revoke',
          newState: {
            targetType: dto.targetType,
            targetIds: dto.targetIds,
            permissionCodes: dto.permissionCodes,
            summary: result.summary,
          },
          performedBy: actorId,
          metadata: { reason: dto.reason, forceRevoke: dto.forceRevoke },
        });
      },
      {
        timeout: 30000, // 30 second timeout
      },
    );

    result.success = result.failed === 0;
    return result;
  }

  private async grantToUser(
    tx: Prisma.TransactionClient,
    userProfileId: string,
    permissionId: string,
    permItem: any,
    actorId: string,
    skipExistingCheck: boolean | undefined,
    result: BulkOperationResult,
  ) {
    // Check if user exists
    const user = await tx.userProfile.findUnique({
      where: { id: userProfileId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check existing permission
    if (!skipExistingCheck) {
      const existing = await tx.userPermission.findFirst({
        where: {
          userProfileId,
          permissionId,
        },
      });

      if (existing) {
        result.summary.skipped!++;
        return;
      }
    }

    // Create user permission
    await tx.userPermission.create({
      data: {
        id: uuidv7(),
        userProfileId,
        permissionId,
        conditions: permItem.conditions || null,
        grantedBy: actorId,
        grantReason: 'Bulk grant operation',
      },
    });

    result.summary.created!++;
  }

  private async grantToRole(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissionId: string,
    permItem: any,
    actorId: string,
    skipExistingCheck: boolean | undefined,
    result: BulkOperationResult,
  ) {
    // Check if role exists
    const role = await tx.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      throw new Error('Role not found');
    }

    // Check existing permission
    if (!skipExistingCheck) {
      const existing = await tx.rolePermission.findFirst({
        where: {
          roleId,
          permissionId,
        },
      });

      if (existing) {
        result.summary.skipped!++;
        return;
      }
    }

    // Create role permission
    await tx.rolePermission.create({
      data: {
        id: uuidv7(),
        roleId,
        permissionId,
        conditions: permItem.conditions || null,
        grantedBy: actorId,
        grantReason: 'Bulk grant operation',
      },
    });

    result.summary.created!++;
  }

  private async revokeFromUser(
    tx: Prisma.TransactionClient,
    userProfileId: string,
    permissionId: string,
    actorId: string,
    forceRevoke: boolean | undefined,
    result: BulkOperationResult,
  ) {
    const existing = await tx.userPermission.findFirst({
      where: {
        userProfileId,
        permissionId,
      },
    });

    if (!existing) {
      result.summary.skipped!++;
      return;
    }

    // Check if permission is critical and force revoke is not set
    if (!forceRevoke) {
      const permission = await tx.permission.findUnique({
        where: { id: permissionId },
      });

      const criticalPermissions = [
        'system.admin',
        'permission.grant',
        'permission.revoke',
      ];
      if (permission && criticalPermissions.includes(permission.code)) {
        throw new Error('Cannot revoke critical permission without force flag');
      }
    }

    // Delete user permission
    await tx.userPermission.delete({
      where: { id: existing.id },
    });

    result.summary.deleted!++;
  }

  private async revokeFromRole(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissionId: string,
    actorId: string,
    forceRevoke: boolean | undefined,
    result: BulkOperationResult,
  ) {
    const existing = await tx.rolePermission.findFirst({
      where: {
        roleId,
        permissionId,
      },
    });

    if (!existing) {
      result.summary.skipped!++;
      return;
    }

    // Check if permission is critical and force revoke is not set
    if (!forceRevoke) {
      const permission = await tx.permission.findUnique({
        where: { id: permissionId },
      });

      const criticalPermissions = [
        'system.admin',
        'permission.grant',
        'permission.revoke',
      ];
      if (permission && criticalPermissions.includes(permission.code)) {
        throw new Error('Cannot revoke critical permission without force flag');
      }
    }

    // Delete role permission
    await tx.rolePermission.delete({
      where: { id: existing.id },
    });

    result.summary.deleted!++;
  }

  async previewBulkGrant(dto: BulkGrantPermissionsDto): Promise<{
    targets: any[];
    permissions: any[];
    estimatedChanges: number;
    warnings: string[];
  }> {
    const warnings: string[] = [];

    // Validate targets exist
    let targets: any[] = [];

    if (dto.targetType === BulkTargetType.USERS) {
      targets = await this.prisma.userProfile.findMany({
        where: { id: { in: dto.targetIds } },
        select: { id: true, nip: true },
      });
    } else {
      targets = await this.prisma.role.findMany({
        where: { id: { in: dto.targetIds } },
        select: { id: true, code: true, name: true },
      });
    }

    const foundIds = new Set(targets.map((t) => t.id));
    const missingIds = dto.targetIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      warnings.push(
        `${missingIds.length} target(s) not found: ${missingIds.join(', ')}`,
      );
    }

    // Validate permissions
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissions.map((p) => p.permissionCode) } },
      select: { id: true, code: true, name: true },
    });

    const foundCodes = new Set(permissions.map((p) => p.code));
    const missingCodes = dto.permissions
      .map((p) => p.permissionCode)
      .filter((code) => !foundCodes.has(code));

    if (missingCodes.length > 0) {
      warnings.push(
        `${missingCodes.length} permission(s) not found: ${missingCodes.join(', ')}`,
      );
    }

    // Estimate changes
    const estimatedChanges = targets.length * permissions.length;

    return {
      targets,
      permissions,
      estimatedChanges,
      warnings,
    };
  }
}
