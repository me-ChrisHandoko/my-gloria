import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  CreatePermissionTemplateDto,
  UpdatePermissionTemplateDto,
  ApplyPermissionTemplateDto,
  RevokePermissionTemplateDto,
  TemplateTargetType,
} from '../dto/permission-template';
import { PermissionChangeHistoryService } from './permission-change-history.service';
import { v7 as uuidv7 } from 'uuid';
import { Prisma } from '@prisma/client';

@Injectable()
export class PermissionTemplateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly changeHistoryService: PermissionChangeHistoryService,
  ) {}

  async create(dto: CreatePermissionTemplateDto, actorId: string) {
    const existing = await this.prisma.permissionTemplate.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Permission template with code ${dto.code} already exists`,
      );
    }

    const template = await this.prisma.$transaction(async (tx) => {
      const created = await tx.permissionTemplate.create({
        data: {
          id: uuidv7(),
          code: dto.code,
          name: dto.name,
          description: dto.description,
          category: dto.category,
          permissions: dto.permissions as unknown as Prisma.InputJsonValue,
          moduleAccess: dto.moduleAccess as unknown as Prisma.InputJsonValue,
          isSystem: dto.isSystem || false,
          createdBy: actorId,
        },
      });

      await this.auditService.log({
        actorId,
        action: 'CREATE',
        module: 'permission',
        entityType: 'PermissionTemplate',
        entityId: created.id,
        entityDisplay: created.name,
        newValues: created,
        metadata: { category: dto.category },
      });

      await this.changeHistoryService.recordChange({
        entityType: 'permission_template',
        entityId: created.id,
        operation: 'create',
        newState: created,
        performedBy: actorId,
        metadata: { name: created.name, category: created.category },
      });

      return created;
    });

    return template;
  }

  async findAll(params?: {
    category?: string;
    isActive?: boolean;
    isSystem?: boolean;
  }) {
    const where: Prisma.PermissionTemplateWhereInput = {};

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    if (params?.isSystem !== undefined) {
      where.isSystem = params.isSystem;
    }

    return this.prisma.permissionTemplate.findMany({
      where,
      include: {
        templateApplications: {
          where: { isActive: true },
          select: {
            id: true,
            targetType: true,
            targetId: true,
            appliedAt: true,
          },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.permissionTemplate.findUnique({
      where: { id },
      include: {
        templateApplications: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(
        `Permission template with ID ${id} not found`,
      );
    }

    return template;
  }

  async update(id: string, dto: UpdatePermissionTemplateDto, actorId: string) {
    const existing = await this.findOne(id);

    if (existing.isSystem) {
      throw new ForbiddenException('System templates cannot be modified');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      try {
        const result = await tx.permissionTemplate.update({
          where: {
            id,
            version: dto.version,
          },
          data: {
            name: dto.name,
            description: dto.description,
            category: dto.category,
            permissions: dto.permissions as unknown as Prisma.InputJsonValue,
            moduleAccess: dto.moduleAccess as unknown as Prisma.InputJsonValue,
            version: { increment: 1 },
          },
        });

        await this.auditService.log({
          actorId,
          action: 'UPDATE',
          module: 'permission',
          entityType: 'PermissionTemplate',
          entityId: result.id,
          entityDisplay: result.name,
          oldValues: existing,
          newValues: result,
          metadata: {
            changedFields: Object.keys(dto).filter((key) => key !== 'version'),
          },
        });

        await this.changeHistoryService.recordChange({
          entityType: 'permission_template',
          entityId: result.id,
          operation: 'update',
          previousState: existing,
          newState: result,
          performedBy: actorId,
          metadata: { name: result.name },
        });

        return result;
      } catch (error) {
        if (error.code === 'P2025') {
          throw new ConflictException(
            'Template was modified by another user. Please refresh and try again.',
          );
        }
        throw error;
      }
    });

    return updated;
  }

  async apply(dto: ApplyPermissionTemplateDto, actorId: string) {
    const template = await this.findOne(dto.templateId);

    if (!template.isActive) {
      throw new BadRequestException('Cannot apply an inactive template');
    }

    // Check if already applied
    const existing = await this.prisma.permissionTemplateApplication.findUnique(
      {
        where: {
          templateId_targetType_targetId: {
            templateId: dto.templateId,
            targetType: dto.targetType,
            targetId: dto.targetId,
          },
        },
      },
    );

    if (existing && existing.isActive) {
      throw new ConflictException('Template is already applied to this target');
    }

    const application = await this.prisma.$transaction(async (tx) => {
      // Create or reactivate application
      const app = existing
        ? await tx.permissionTemplateApplication.update({
            where: { id: existing.id },
            data: {
              isActive: true,
              appliedBy: actorId,
              appliedAt: new Date(),
              notes: dto.notes,
              revokedBy: null,
              revokedAt: null,
            },
          })
        : await tx.permissionTemplateApplication.create({
            data: {
              id: uuidv7(),
              templateId: dto.templateId,
              targetType: dto.targetType,
              targetId: dto.targetId,
              appliedBy: actorId,
              notes: dto.notes,
            },
          });

      // Apply permissions based on target type
      if (dto.targetType === TemplateTargetType.ROLE) {
        await this.applyToRole(tx, template, dto.targetId, actorId);
      } else if (dto.targetType === TemplateTargetType.USER) {
        await this.applyToUser(tx, template, dto.targetId, actorId);
      }

      await this.auditService.log({
        actorId,
        action: 'CREATE',
        module: 'permission',
        entityType: 'PermissionTemplateApplication',
        entityId: app.id,
        entityDisplay: `${template.name} → ${dto.targetType}:${dto.targetId}`,
        newValues: app,
        metadata: {
          templateName: template.name,
          targetType: dto.targetType,
          targetId: dto.targetId,
        },
      });

      await this.changeHistoryService.recordChange({
        entityType: 'template_application',
        entityId: app.id,
        operation: 'apply_template',
        newState: {
          templateId: dto.templateId,
          targetType: dto.targetType,
          targetId: dto.targetId,
          permissions: template.permissions,
        },
        performedBy: actorId,
        metadata: {
          templateName: template.name,
          notes: dto.notes,
        },
      });

      return app;
    });

    return application;
  }

  async revoke(dto: RevokePermissionTemplateDto, actorId: string) {
    const application =
      await this.prisma.permissionTemplateApplication.findUnique({
        where: { id: dto.applicationId },
        include: { template: true },
      });

    if (!application) {
      throw new NotFoundException('Template application not found');
    }

    if (!application.isActive) {
      throw new BadRequestException('Template application is already revoked');
    }

    const revoked = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.permissionTemplateApplication.update({
        where: { id: dto.applicationId },
        data: {
          isActive: false,
          revokedBy: actorId,
          revokedAt: new Date(),
        },
      });

      // Record the change
      await this.changeHistoryService.recordChange({
        entityType: 'template_application',
        entityId: updated.id,
        operation: 'revoke_template',
        previousState: application,
        newState: updated,
        performedBy: actorId,
        metadata: {
          reason: dto.reason,
          templateName: application.template.name,
        },
      });

      await this.auditService.log({
        actorId,
        action: 'UPDATE',
        module: 'permission',
        entityType: 'PermissionTemplateApplication',
        entityId: updated.id,
        entityDisplay: `Revoked: ${application.template.name}`,
        oldValues: { isActive: true },
        newValues: { isActive: false },
        metadata: { reason: dto.reason },
      });

      return updated;
    });

    return revoked;
  }

  private async applyToRole(
    tx: Prisma.TransactionClient,
    template: any,
    roleId: string,
    actorId: string,
  ) {
    // Apply permissions from template
    const permissions = template.permissions as any[];

    for (const perm of permissions) {
      const permission = await tx.permission.findUnique({
        where: { code: perm.permission },
      });

      if (!permission) continue;

      // Check if role already has this permission
      const existing = await tx.rolePermission.findFirst({
        where: {
          roleId,
          permissionId: permission.id,
        },
      });

      if (!existing) {
        await tx.rolePermission.create({
          data: {
            id: uuidv7(),
            roleId,
            permissionId: permission.id,
            conditions: perm.conditions || null,
            grantedBy: actorId,
            grantReason: 'Applied from template',
          },
        });
      }
    }

    // Apply module access if specified
    if (template.moduleAccess) {
      const moduleAccess = template.moduleAccess as any[];

      for (const access of moduleAccess) {
        const module = await tx.module.findUnique({
          where: { code: access.module },
        });

        if (!module) continue;

        await tx.roleModuleAccess.upsert({
          where: {
            roleId_moduleId: {
              roleId,
              moduleId: module.id,
            },
          },
          create: {
            id: uuidv7(),
            roleId,
            moduleId: module.id,
            permissions: access.actions,
            createdBy: actorId,
          },
          update: {
            permissions: access.actions,
            isActive: true,
          },
        });
      }
    }
  }

  private async applyToUser(
    tx: Prisma.TransactionClient,
    template: any,
    userProfileId: string,
    actorId: string,
  ) {
    // Apply permissions from template
    const permissions = template.permissions as any[];

    for (const perm of permissions) {
      const permission = await tx.permission.findUnique({
        where: { code: perm.permission },
      });

      if (!permission) continue;

      // Check if user already has this permission
      const existing = await tx.userPermission.findFirst({
        where: {
          userProfileId,
          permissionId: permission.id,
        },
      });

      if (!existing) {
        await tx.userPermission.create({
          data: {
            id: uuidv7(),
            userProfileId,
            permissionId: permission.id,
            conditions: perm.conditions || null,
            grantedBy: actorId,
            grantReason: 'Applied from template',
          },
        });
      }
    }

    // Apply module access if specified
    if (template.moduleAccess) {
      const moduleAccess = template.moduleAccess as any[];

      for (const access of moduleAccess) {
        const module = await tx.module.findUnique({
          where: { code: access.module },
        });

        if (!module) continue;

        await tx.userModuleAccess.upsert({
          where: {
            id: uuidv7(), // This will always create new record
          },
          create: {
            id: uuidv7(),
            userProfileId,
            moduleId: module.id,
            permissions: access.actions,
            grantedBy: actorId,
          },
          update: {
            permissions: access.actions,
            isActive: true,
          },
        });
      }
    }
  }

  async getTemplatesByCategory(category: string) {
    return this.prisma.permissionTemplate.findMany({
      where: {
        category,
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async delete(id: string, actorId: string) {
    const template = await this.findOne(id);

    if (template.isSystem) {
      throw new ForbiddenException('System templates cannot be deleted');
    }

    // Check if template is in use
    const activeApplications =
      await this.prisma.permissionTemplateApplication.count({
        where: {
          templateId: id,
          isActive: true,
        },
      });

    if (activeApplications > 0) {
      throw new BadRequestException(
        `Cannot delete template that is currently applied to ${activeApplications} targets`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Soft delete by marking as inactive
      await tx.permissionTemplate.update({
        where: { id },
        data: { isActive: false },
      });

      await this.auditService.log({
        actorId,
        action: 'DELETE',
        module: 'permission',
        entityType: 'PermissionTemplate',
        entityId: template.id,
        entityDisplay: template.name,
        oldValues: { isActive: true },
        newValues: { isActive: false },
      });

      await this.changeHistoryService.recordChange({
        entityType: 'permission_template',
        entityId: template.id,
        operation: 'delete',
        previousState: template,
        newState: { ...template, isActive: false },
        performedBy: actorId,
      });
    });

    return { success: true, message: 'Template deleted successfully' };
  }
}
