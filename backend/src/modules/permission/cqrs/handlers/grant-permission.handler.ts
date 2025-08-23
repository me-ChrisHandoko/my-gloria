import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AuditService } from '../../../audit/services/audit.service';
import { RedisPermissionCacheService } from '../../../../cache/services/redis-permission-cache.service';
import { GrantPermissionCommand } from '../commands/grant-permission.command';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import { PermissionGrantedEvent } from '../events/permission-granted.event';

/**
 * Command handler for granting permissions
 * Handles the write operations in CQRS pattern
 */
@CommandHandler(GrantPermissionCommand)
export class GrantPermissionHandler
  implements ICommandHandler<GrantPermissionCommand>
{
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly cacheService: RedisPermissionCacheService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GrantPermissionCommand): Promise<void> {
    const {
      userProfileId,
      permissionId,
      grantedBy,
      validFrom,
      validUntil,
      reason,
    } = command;

    // Validate user exists
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userProfileId },
    });

    if (!userProfile) {
      throw new BadRequestException(
        `User profile ${userProfileId} not found`,
      );
    }

    // Validate permission exists
    const permission = await this.prisma.permission.findUnique({
      where: { id: permissionId },
    });

    if (!permission) {
      throw new BadRequestException(`Permission ${permissionId} not found`);
    }

    // Check if already granted
    const existingGrant = await this.prisma.userPermission.findFirst({
      where: {
        userProfileId,
        permissionId,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
    });

    if (existingGrant) {
      throw new ConflictException(
        `Permission ${permission.code} already granted to user`,
      );
    }

    // Execute transaction
    await this.prisma.$transaction(async (tx) => {
      // Grant the permission
      const grant = await tx.userPermission.create({
        data: {
          id: uuidv7(),
          userProfileId,
          permissionId,
          grantedBy,
          grantReason: reason || 'Permission granted via CQRS command',
          validFrom: validFrom || new Date(),
          validUntil,
        },
      });

      // Create audit log after transaction
      setImmediate(async () => {
        await this.auditService.log({
          actorId: grantedBy,
          action: 'CREATE' as any,
          module: 'Permission',
          entityType: 'UserPermission',
          entityId: grant.id,
          metadata: {
            userProfileId,
            permissionCode: permission.code,
            validFrom,
            validUntil,
            reason,
          },
        });
      });
    });

    // Invalidate cache
    await this.cacheService.invalidateUserCache(userProfileId);

    // Publish event
    this.eventBus.publish(
      new PermissionGrantedEvent(
        userProfileId,
        permissionId,
        permission.code,
        grantedBy,
      ),
    );
  }
}