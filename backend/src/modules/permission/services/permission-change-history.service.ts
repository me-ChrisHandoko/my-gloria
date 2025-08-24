import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';

export interface RecordChangeDto {
  entityType: string;
  entityId: string;
  operation: string;
  previousState?: any;
  newState: any;
  metadata?: any;
  performedBy: string;
  isRollbackable?: boolean;
}

export interface RollbackChangeDto {
  changeId: string;
  performedBy: string;
  reason?: string;
}

@Injectable()
export class PermissionChangeHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async recordChange(dto: RecordChangeDto) {
    return this.prisma.permissionChangeHistory.create({
      data: {
        id: uuidv7(),
        entityType: dto.entityType,
        entityId: dto.entityId,
        operation: dto.operation,
        previousState: dto.previousState || Prisma.JsonNull,
        newState: dto.newState,
        metadata: dto.metadata || Prisma.JsonNull,
        performedBy: dto.performedBy,
        isRollbackable: dto.isRollbackable ?? true,
      },
    });
  }

  async getHistory(params: {
    entityType?: string;
    entityId?: string;
    performedBy?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.PermissionChangeHistoryWhereInput = {};

    if (params.entityType) {
      where.entityType = params.entityType;
    }

    if (params.entityId) {
      where.entityId = params.entityId;
    }

    if (params.performedBy) {
      where.performedBy = params.performedBy;
    }

    if (params.startDate || params.endDate) {
      where.performedAt = {};
      if (params.startDate) {
        where.performedAt.gte = params.startDate;
      }
      if (params.endDate) {
        where.performedAt.lte = params.endDate;
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: params.limit || 50,
        skip: params.offset || 0,
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data,
      total,
      limit: params.limit || 50,
      offset: params.offset || 0,
    };
  }

  async getChangeById(id: string) {
    const change = await this.prisma.permissionChangeHistory.findUnique({
      where: { id },
    });

    if (!change) {
      throw new NotFoundException(`Change with ID ${id} not found`);
    }

    return change;
  }

  async rollback(dto: RollbackChangeDto) {
    const change = await this.getChangeById(dto.changeId);

    if (!change.isRollbackable) {
      throw new BadRequestException('This change cannot be rolled back');
    }

    if (change.rolledBackAt) {
      throw new BadRequestException('This change has already been rolled back');
    }

    if (!change.previousState) {
      throw new BadRequestException('No previous state available for rollback');
    }

    const rollbackResult = await this.prisma.$transaction(async (tx) => {
      // Perform the rollback based on entity type and operation
      let rollbackState: any;

      switch (change.entityType) {
        case 'user_permission':
          rollbackState = await this.rollbackUserPermission(tx, change);
          break;
        case 'role_permission':
          rollbackState = await this.rollbackRolePermission(tx, change);
          break;
        case 'template_application':
          rollbackState = await this.rollbackTemplateApplication(tx, change);
          break;
        case 'permission_delegation':
          rollbackState = await this.rollbackDelegation(tx, change);
          break;
        default:
          throw new BadRequestException(
            `Rollback not supported for entity type: ${change.entityType}`,
          );
      }

      // Mark the original change as rolled back
      await tx.permissionChangeHistory.update({
        where: { id: dto.changeId },
        data: {
          rolledBackBy: dto.performedBy,
          rolledBackAt: new Date(),
        },
      });

      // Record the rollback as a new change
      const rollbackChange = await tx.permissionChangeHistory.create({
        data: {
          id: uuidv7(),
          entityType: change.entityType,
          entityId: change.entityId,
          operation: `rollback_${change.operation}`,
          previousState: change.newState as Prisma.InputJsonValue,
          newState: change.previousState as Prisma.InputJsonValue,
          metadata: {
            originalChangeId: change.id,
            reason: dto.reason,
          },
          performedBy: dto.performedBy,
          rollbackOf: change.id,
          isRollbackable: false, // Rollbacks cannot be rolled back
        },
      });

      return { rollbackChange, rollbackState };
    });

    return rollbackResult;
  }

  private async rollbackUserPermission(
    tx: Prisma.TransactionClient,
    change: any,
  ) {
    const previousState = change.previousState as any;

    switch (change.operation) {
      case 'grant':
        // Revoke the permission
        await tx.userPermission.delete({
          where: { id: change.entityId },
        });
        break;

      case 'revoke':
        // Re-grant the permission
        await tx.userPermission.create({
          data: previousState,
        });
        break;

      case 'update':
        // Restore previous state
        await tx.userPermission.update({
          where: { id: change.entityId },
          data: previousState,
        });
        break;
    }

    return previousState;
  }

  private async rollbackRolePermission(
    tx: Prisma.TransactionClient,
    change: any,
  ) {
    const previousState = change.previousState as any;

    switch (change.operation) {
      case 'grant':
        // Revoke the permission
        await tx.rolePermission.delete({
          where: { id: change.entityId },
        });
        break;

      case 'revoke':
        // Re-grant the permission
        await tx.rolePermission.create({
          data: previousState,
        });
        break;

      case 'update':
        // Restore previous state
        await tx.rolePermission.update({
          where: { id: change.entityId },
          data: previousState,
        });
        break;
    }

    return previousState;
  }

  private async rollbackTemplateApplication(
    tx: Prisma.TransactionClient,
    change: any,
  ) {
    const previousState = change.previousState as any;

    if (change.operation === 'apply_template') {
      // Mark the template application as inactive
      await tx.permissionTemplateApplication.update({
        where: { id: change.entityId },
        data: { isActive: false },
      });
    } else if (change.operation === 'revoke_template') {
      // Reactivate the template application
      await tx.permissionTemplateApplication.update({
        where: { id: change.entityId },
        data: { isActive: true },
      });
    }

    return previousState;
  }

  private async rollbackDelegation(tx: Prisma.TransactionClient, change: any) {
    const previousState = change.previousState as any;

    if (change.operation === 'delegate') {
      // Revoke the delegation
      await tx.permissionDelegation.update({
        where: { id: change.entityId },
        data: { isRevoked: true },
      });
    } else if (change.operation === 'revoke_delegation') {
      // Restore the delegation
      await tx.permissionDelegation.update({
        where: { id: change.entityId },
        data: { isRevoked: false },
      });
    }

    return previousState;
  }

  async getEntityHistory(entityType: string, entityId: string) {
    return this.prisma.permissionChangeHistory.findMany({
      where: {
        entityType,
        entityId,
      },
      orderBy: { performedAt: 'desc' },
    });
  }

  async getUserActivity(
    userId: string,
    params?: { limit?: number; offset?: number },
  ) {
    return this.getHistory({
      performedBy: userId,
      limit: params?.limit,
      offset: params?.offset,
    });
  }

  async getRollbackableChanges(params?: {
    entityType?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.PermissionChangeHistoryWhereInput = {
      isRollbackable: true,
      rolledBackAt: null,
    };

    if (params?.entityType) {
      where.entityType = params.entityType;
    }

    const [data, total] = await Promise.all([
      this.prisma.permissionChangeHistory.findMany({
        where,
        orderBy: { performedAt: 'desc' },
        take: params?.limit || 50,
        skip: params?.offset || 0,
      }),
      this.prisma.permissionChangeHistory.count({ where }),
    ]);

    return {
      data,
      total,
      limit: params?.limit || 50,
      offset: params?.offset || 0,
    };
  }
}
