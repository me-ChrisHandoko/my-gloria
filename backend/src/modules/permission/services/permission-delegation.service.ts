import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import { PermissionChangeHistoryService } from './permission-change-history.service';
import { CreateDelegationDto, RevokeDelegationDto } from '../dto/delegation';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class PermissionDelegationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly changeHistoryService: PermissionChangeHistoryService,
  ) {}

  async create(delegatorId: string, dto: CreateDelegationDto) {
    // Validate dates
    const validFrom = dto.validFrom ? new Date(dto.validFrom) : new Date();
    const validUntil = new Date(dto.validUntil);

    if (validFrom >= validUntil) {
      throw new BadRequestException(
        'Valid from date must be before valid until date',
      );
    }

    if (validUntil <= new Date()) {
      throw new BadRequestException('Valid until date must be in the future');
    }

    // Check if delegator exists
    const delegator = await this.prisma.userProfile.findUnique({
      where: { id: delegatorId },
      include: {
        userPermissions: {
          include: { permission: true },
        },
        roles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!delegator) {
      throw new NotFoundException('Delegator not found');
    }

    // Check if delegate exists
    const delegate = await this.prisma.userProfile.findUnique({
      where: { id: dto.delegateId },
    });

    if (!delegate) {
      throw new NotFoundException('Delegate not found');
    }

    // Verify delegator has the permissions they're trying to delegate
    const delegatorPermissionCodes = this.extractUserPermissionCodes(delegator);
    const requestedPermissions = dto.permissions.map((p) => p.permission);

    const unauthorizedPermissions = requestedPermissions.filter(
      (perm) => !delegatorPermissionCodes.includes(perm),
    );

    if (unauthorizedPermissions.length > 0) {
      throw new ForbiddenException(
        `Cannot delegate permissions you don't have: ${unauthorizedPermissions.join(', ')}`,
      );
    }

    // Check for existing active delegations with overlapping permissions
    const existingDelegations = await this.prisma.permissionDelegation.findMany(
      {
        where: {
          delegatorId,
          delegateId: dto.delegateId,
          isRevoked: false,
          validUntil: { gte: new Date() },
        },
      },
    );

    // Create the delegation
    const delegation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.permissionDelegation.create({
        data: {
          id: uuidv7(),
          delegatorId,
          delegateId: dto.delegateId,
          permissions: dto.permissions as unknown as Prisma.InputJsonValue,
          reason: dto.reason,
          validFrom,
          validUntil,
        },
        include: {
          delegator: true,
          delegate: true,
        },
      });

      await this.auditService.log({
        actorId: delegatorId,
        action: 'CREATE',
        module: 'permission',
        entityType: 'PermissionDelegation',
        entityId: created.id,
        entityDisplay: `Delegation to ${delegate.nip}`,
        newValues: created,
        targetUserId: dto.delegateId,
        metadata: {
          permissions: dto.permissions,
          validUntil,
        },
      });

      await this.changeHistoryService.recordChange({
        entityType: 'permission_delegation',
        entityId: created.id,
        operation: 'delegate',
        newState: created,
        performedBy: delegatorId,
        metadata: {
          delegateNip: delegate.nip,
          permissions: dto.permissions,
          reason: dto.reason,
        },
      });

      return created;
    });

    return delegation;
  }

  async findAll(params?: {
    delegatorId?: string;
    delegateId?: string;
    isActive?: boolean;
    includeExpired?: boolean;
  }) {
    const where: Prisma.PermissionDelegationWhereInput = {};

    if (params?.delegatorId) {
      where.delegatorId = params.delegatorId;
    }

    if (params?.delegateId) {
      where.delegateId = params.delegateId;
    }

    if (params?.isActive !== undefined) {
      where.isRevoked = !params.isActive;
      if (params.isActive && !params.includeExpired) {
        where.validUntil = { gte: new Date() };
        where.validFrom = { lte: new Date() };
      }
    }

    return this.prisma.permissionDelegation.findMany({
      where,
      include: {
        delegator: {
          include: {
            dataKaryawan: true,
          },
        },
        delegate: {
          include: {
            dataKaryawan: true,
          },
        },
      },
      orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const delegation = await this.prisma.permissionDelegation.findUnique({
      where: { id },
      include: {
        delegator: {
          include: {
            dataKaryawan: true,
          },
        },
        delegate: {
          include: {
            dataKaryawan: true,
          },
        },
      },
    });

    if (!delegation) {
      throw new NotFoundException(`Delegation with ID ${id} not found`);
    }

    return delegation;
  }

  async revoke(actorId: string, dto: RevokeDelegationDto) {
    const delegation = await this.findOne(dto.delegationId);

    // Only delegator or admin can revoke
    if (delegation.delegatorId !== actorId) {
      // Check if actor is admin
      const actor = await this.prisma.userProfile.findUnique({
        where: { id: actorId },
      });

      if (!actor?.isSuperadmin) {
        throw new ForbiddenException(
          'Only the delegator or an admin can revoke this delegation',
        );
      }
    }

    if (delegation.isRevoked) {
      throw new BadRequestException('Delegation is already revoked');
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.permissionDelegation.update({
        where: { id: dto.delegationId },
        data: {
          isRevoked: true,
          revokedBy: actorId,
          revokedAt: new Date(),
          revokedReason: dto.reason,
        },
        include: {
          delegator: true,
          delegate: true,
        },
      });

      await this.auditService.log({
        actorId,
        action: 'UPDATE',
        module: 'permission',
        entityType: 'PermissionDelegation',
        entityId: updated.id,
        entityDisplay: `Revoked delegation to ${updated.delegate.nip}`,
        oldValues: { isRevoked: false },
        newValues: { isRevoked: true, revokedReason: dto.reason },
        targetUserId: updated.delegateId,
      });

      await this.changeHistoryService.recordChange({
        entityType: 'permission_delegation',
        entityId: updated.id,
        operation: 'revoke_delegation',
        previousState: delegation,
        newState: updated,
        performedBy: actorId,
        metadata: {
          reason: dto.reason,
          delegateNip: updated.delegate.nip,
        },
      });

      return updated;
    });

    return revoked;
  }

  async getActiveDelegations(userId: string) {
    const now = new Date();

    return this.prisma.permissionDelegation.findMany({
      where: {
        delegateId: userId,
        isRevoked: false,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
      include: {
        delegator: {
          include: {
            dataKaryawan: true,
          },
        },
      },
    });
  }

  async getDelegatedPermissions(userId: string): Promise<string[]> {
    const activeDelegations = await this.getActiveDelegations(userId);

    const permissions = new Set<string>();

    for (const delegation of activeDelegations) {
      const delegationPerms = delegation.permissions as any[];
      delegationPerms.forEach((perm) => {
        if (typeof perm === 'string') {
          permissions.add(perm);
        } else if (perm.permission) {
          permissions.add(perm.permission);
        }
      });
    }

    return Array.from(permissions);
  }

  async getMyDelegations(delegatorId: string) {
    return this.findAll({
      delegatorId,
      isActive: true,
    });
  }

  async getDelegationsToMe(delegateId: string) {
    return this.findAll({
      delegateId,
      isActive: true,
    });
  }

  async cleanupExpiredDelegations() {
    const now = new Date();

    const expired = await this.prisma.permissionDelegation.findMany({
      where: {
        isRevoked: false,
        validUntil: { lt: now },
      },
    });

    if (expired.length === 0) {
      return { cleaned: 0 };
    }

    // Mark expired delegations as revoked
    await this.prisma.permissionDelegation.updateMany({
      where: {
        isRevoked: false,
        validUntil: { lt: now },
      },
      data: {
        isRevoked: true,
        revokedBy: 'system',
        revokedAt: now,
        revokedReason: 'Expired',
      },
    });

    // Log the cleanup
    for (const delegation of expired) {
      await this.changeHistoryService.recordChange({
        entityType: 'permission_delegation',
        entityId: delegation.id,
        operation: 'expire_delegation',
        previousState: delegation,
        newState: { ...delegation, isRevoked: true },
        performedBy: 'system',
        metadata: { reason: 'Automatic expiration' },
        isRollbackable: false,
      });
    }

    return { cleaned: expired.length };
  }

  private extractUserPermissionCodes(user: any): string[] {
    const permissions = new Set<string>();

    // Direct user permissions
    user.userPermissions?.forEach((up: any) => {
      permissions.add(up.permission.code);
    });

    // Role permissions
    user.roles?.forEach((userRole: any) => {
      userRole.role.rolePermissions?.forEach((rp: any) => {
        permissions.add(rp.permission.code);
      });
    });

    return Array.from(permissions);
  }

  async extendDelegation(
    delegationId: string,
    newValidUntil: Date,
    actorId: string,
  ) {
    const delegation = await this.findOne(delegationId);

    if (delegation.delegatorId !== actorId) {
      throw new ForbiddenException(
        'Only the delegator can extend this delegation',
      );
    }

    if (delegation.isRevoked) {
      throw new BadRequestException('Cannot extend a revoked delegation');
    }

    if (newValidUntil <= delegation.validUntil) {
      throw new BadRequestException(
        'New expiry date must be later than current expiry',
      );
    }

    const extended = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.permissionDelegation.update({
        where: { id: delegationId },
        data: {
          validUntil: newValidUntil,
          updatedAt: new Date(),
        },
      });

      await this.changeHistoryService.recordChange({
        entityType: 'permission_delegation',
        entityId: updated.id,
        operation: 'extend_delegation',
        previousState: { validUntil: delegation.validUntil },
        newState: { validUntil: newValidUntil },
        performedBy: actorId,
        metadata: {
          oldValidUntil: delegation.validUntil,
          newValidUntil,
        },
      });

      return updated;
    });

    return extended;
  }
}
