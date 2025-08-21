import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../audit/services/audit.service';
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  AssignPolicyDto,
} from '../dto/policy/create-policy.dto';
import {
  PermissionPolicy,
  PolicyAssignment,
  PolicyType,
  Prisma,
} from '@prisma/client';
import { PolicyEngineService } from './policy-engine.service';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PermissionPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly policyEngine: PolicyEngineService,
  ) {}

  async create(
    createPolicyDto: CreatePolicyDto,
    createdBy: string,
  ): Promise<PermissionPolicy> {
    // Validate rules
    const isValid = this.policyEngine.validatePolicyRules(
      createPolicyDto.policyType,
      createPolicyDto.rules,
    );
    if (!isValid) {
      throw new BadRequestException(
        'Invalid policy rules for the specified policy type',
      );
    }

    // Check if policy code already exists
    const existing = await this.prisma.permissionPolicy.findUnique({
      where: { code: createPolicyDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Policy with code ${createPolicyDto.code} already exists`,
      );
    }

    const policy = await this.prisma.$transaction(async (tx) => {
      const newPolicy = await tx.permissionPolicy.create({
        data: {
          id: uuidv7(),
          code: createPolicyDto.code,
          name: createPolicyDto.name,
          description: createPolicyDto.description,
          policyType: createPolicyDto.policyType,
          rules: createPolicyDto.rules,
          priority: createPolicyDto.priority || 100,
          createdBy,
        },
      });

      // Handle permission associations if provided
      if (
        createPolicyDto.grantPermissions?.length ||
        createPolicyDto.denyPermissions?.length
      ) {
        // Store permissions in the rules or metadata
        await tx.permissionPolicy.update({
          where: { id: newPolicy.id },
          data: {
            rules: {
              ...createPolicyDto.rules,
              grantPermissions: createPolicyDto.grantPermissions || [],
              denyPermissions: createPolicyDto.denyPermissions || [],
            },
          },
        });
      }

      // Log audit
      await this.auditService.log({
        actorId: createdBy,
        action: 'CREATE',
        module: 'permission-policy',
        entityType: 'PermissionPolicy',
        entityId: newPolicy.id,
        entityDisplay: newPolicy.name,
        newValues: newPolicy,
        metadata: {
          policyCode: newPolicy.code,
          policyType: newPolicy.policyType,
        },
      });

      return newPolicy;
    });

    return policy;
  }

  async findAll(filters?: {
    policyType?: PolicyType;
    isActive?: boolean;
  }): Promise<PermissionPolicy[]> {
    const where: Prisma.PermissionPolicyWhereInput = {};

    if (filters?.policyType) where.policyType = filters.policyType;
    if (filters?.isActive !== undefined) where.isActive = filters.isActive;

    return this.prisma.permissionPolicy.findMany({
      where,
      include: {
        policyAssignments: true,
        _count: {
          select: {
            policyAssignments: true,
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string): Promise<PermissionPolicy> {
    const policy = await this.prisma.permissionPolicy.findUnique({
      where: { id },
      include: {
        policyAssignments: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }

    return policy;
  }

  async update(
    id: string,
    updatePolicyDto: UpdatePolicyDto,
    modifiedBy: string,
  ): Promise<PermissionPolicy> {
    const existing = await this.findOne(id);

    // Validate rules if being updated
    if (updatePolicyDto.rules) {
      const policyType = updatePolicyDto.policyType || existing.policyType;
      const isValid = this.policyEngine.validatePolicyRules(
        policyType,
        updatePolicyDto.rules,
      );
      if (!isValid) {
        throw new BadRequestException(
          'Invalid policy rules for the specified policy type',
        );
      }
    }

    // Check for code uniqueness if updating code
    if (updatePolicyDto.code && updatePolicyDto.code !== existing.code) {
      const codeExists = await this.prisma.permissionPolicy.findUnique({
        where: { code: updatePolicyDto.code },
      });

      if (codeExists) {
        throw new ConflictException(
          `Policy with code ${updatePolicyDto.code} already exists`,
        );
      }
    }

    const policy = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.permissionPolicy.update({
        where: { id },
        data: {
          code: updatePolicyDto.code,
          name: updatePolicyDto.name,
          description: updatePolicyDto.description,
          policyType: updatePolicyDto.policyType,
          rules: updatePolicyDto.rules,
          priority: updatePolicyDto.priority,
          isActive: updatePolicyDto.isActive,
        },
      });

      // Log audit
      await this.auditService.log({
        actorId: modifiedBy,
        action: 'UPDATE',
        module: 'permission-policy',
        entityType: 'PermissionPolicy',
        entityId: updated.id,
        entityDisplay: updated.name,
        oldValues: existing,
        newValues: updated,
        metadata: {
          changedFields: Object.keys(updatePolicyDto),
        },
      });

      return updated;
    });

    return policy;
  }

  async remove(id: string, deletedBy: string): Promise<void> {
    const policy = await this.findOne(id);

    await this.prisma.$transaction(async (tx) => {
      // Delete the policy (cascades to assignments)
      await tx.permissionPolicy.delete({
        where: { id },
      });

      // Log audit
      await this.auditService.log({
        actorId: deletedBy,
        action: 'DELETE',
        module: 'permission-policy',
        entityType: 'PermissionPolicy',
        entityId: policy.id,
        entityDisplay: policy.name,
        oldValues: policy,
      });
    });
  }

  async assignPolicy(
    policyId: string,
    assignDto: AssignPolicyDto,
    assignedBy: string,
  ): Promise<PolicyAssignment> {
    const policy = await this.findOne(policyId);

    // Check if assignment already exists
    const existing = await this.prisma.policyAssignment.findFirst({
      where: {
        policyId,
        assigneeType: assignDto.assigneeType as any,
        assigneeId: assignDto.assigneeId,
      },
    });

    if (existing) {
      throw new ConflictException('Policy is already assigned to this entity');
    }

    const assignment = await this.prisma.$transaction(async (tx) => {
      const newAssignment = await tx.policyAssignment.create({
        data: {
          id: uuidv7(),
          policyId,
          assigneeType: assignDto.assigneeType as any,
          assigneeId: assignDto.assigneeId,
          conditions: assignDto.conditions,
          validFrom: assignDto.validFrom
            ? new Date(assignDto.validFrom)
            : new Date(),
          validUntil: assignDto.validUntil
            ? new Date(assignDto.validUntil)
            : null,
          assignedBy,
        },
      });

      // Log audit
      await this.auditService.log({
        actorId: assignedBy,
        action: 'ASSIGN',
        module: 'permission-policy',
        entityType: 'PolicyAssignment',
        entityId: newAssignment.id,
        entityDisplay: `${policy.name} to ${assignDto.assigneeType} ${assignDto.assigneeId}`,
        newValues: newAssignment,
      });

      return newAssignment;
    });

    return assignment;
  }

  async removeAssignment(
    assignmentId: string,
    removedBy: string,
  ): Promise<void> {
    const assignment = await this.prisma.policyAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        policy: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException('Policy assignment not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.policyAssignment.delete({
        where: { id: assignmentId },
      });

      // Log audit
      await this.auditService.log({
        actorId: removedBy,
        action: 'REVOKE',
        module: 'permission-policy',
        entityType: 'PolicyAssignment',
        entityId: assignmentId,
        entityDisplay: `${assignment.policy.name} from ${assignment.assigneeType} ${assignment.assigneeId}`,
        oldValues: assignment,
      });
    });
  }

  async getPolicyAssignments(policyId: string): Promise<PolicyAssignment[]> {
    const policy = await this.findOne(policyId);

    return this.prisma.policyAssignment.findMany({
      where: { policyId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
