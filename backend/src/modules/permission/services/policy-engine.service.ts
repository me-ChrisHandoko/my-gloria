import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PolicyType, PermissionPolicy } from '@prisma/client';
import {
  IPolicyEvaluator,
  PolicyContext,
  PolicyEvaluationResult,
} from '../interfaces/policy-evaluator.interface';
import { TimeBasedPolicyEngine } from '../engines/time-based-policy.engine';
import { LocationBasedPolicyEngine } from '../engines/location-based-policy.engine';
import { AttributeBasedPolicyEngine } from '../engines/attribute-based-policy.engine';
import { v7 as uuidv7 } from 'uuid';

@Injectable()
export class PolicyEngineService {
  private evaluators: Map<PolicyType, IPolicyEvaluator>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly timeBasedEngine: TimeBasedPolicyEngine,
    private readonly locationBasedEngine: LocationBasedPolicyEngine,
    private readonly attributeBasedEngine: AttributeBasedPolicyEngine,
  ) {
    this.evaluators = new Map();
    this.registerEvaluator(timeBasedEngine);
    this.registerEvaluator(locationBasedEngine);
    this.registerEvaluator(attributeBasedEngine);
  }

  registerEvaluator(evaluator: IPolicyEvaluator): void {
    this.evaluators.set(evaluator.type, evaluator);
  }

  async evaluatePolicies(
    userId: string,
    context?: Partial<PolicyContext>,
  ): Promise<Map<string, PolicyEvaluationResult>> {
    // Get user profile with roles
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      throw new BadRequestException(`User profile ${userId} not found`);
    }

    // Build full context
    const fullContext: PolicyContext = {
      userId: userProfile.clerkUserId,
      userProfileId: userProfile.id,
      timestamp: new Date(),
      roles: userProfile.roles.map((ur) => ur.role.code),
      department: userProfile.positions[0]?.position.department?.code,
      school: userProfile.positions[0]?.position.school?.code,
      position: userProfile.positions[0]?.position.code,
      ...context,
    };

    // Get applicable policies
    const policies = await this.getApplicablePolicies(
      userProfile.id,
      fullContext,
    );
    const results = new Map<string, PolicyEvaluationResult>();

    // Evaluate each policy
    for (const policy of policies) {
      const evaluator = this.evaluators.get(policy.policyType);
      if (!evaluator) {
        console.warn(
          `No evaluator found for policy type: ${policy.policyType}`,
        );
        continue;
      }

      try {
        const result = await evaluator.evaluate(
          policy.rules as any,
          fullContext,
        );
        results.set(policy.code, result);

        // Log policy evaluation
        await this.logPolicyEvaluation(
          userProfile.id,
          policy.id,
          result.isApplicable,
          result.reason,
        );
      } catch (error) {
        console.error(`Error evaluating policy ${policy.code}:`, error);
        results.set(policy.code, {
          isApplicable: false,
          grantedPermissions: [],
          reason: 'Evaluation error',
        });
      }
    }

    return results;
  }

  async evaluatePolicy(
    policyId: string,
    userId: string,
    context?: Partial<PolicyContext>,
  ): Promise<PolicyEvaluationResult> {
    const policy = await this.prisma.permissionPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new BadRequestException(`Policy ${policyId} not found`);
    }

    const evaluator = this.evaluators.get(policy.policyType);
    if (!evaluator) {
      throw new BadRequestException(
        `No evaluator for policy type: ${policy.policyType}`,
      );
    }

    // Get user profile
    const userProfile = await this.prisma.userProfile.findUnique({
      where: { id: userId },
      include: {
        roles: {
          where: { isActive: true },
          include: {
            role: true,
          },
        },
        positions: {
          where: { isActive: true },
          include: {
            position: {
              include: {
                department: true,
                school: true,
              },
            },
          },
        },
      },
    });

    if (!userProfile) {
      throw new BadRequestException(`User profile ${userId} not found`);
    }

    // Build full context
    const fullContext: PolicyContext = {
      userId: userProfile.clerkUserId,
      userProfileId: userProfile.id,
      timestamp: new Date(),
      roles: userProfile.roles.map((ur) => ur.role.code),
      department: userProfile.positions[0]?.position.department?.code,
      school: userProfile.positions[0]?.position.school?.code,
      position: userProfile.positions[0]?.position.code,
      ...context,
    };

    const result = await evaluator.evaluate(policy.rules as any, fullContext);

    // Log evaluation
    await this.logPolicyEvaluation(
      userProfile.id,
      policy.id,
      result.isApplicable,
      result.reason,
    );

    // If policy is applicable, get the permissions to grant
    if (result.isApplicable) {
      const permissions = await this.getPolicyPermissions(policy.id);
      result.grantedPermissions = permissions.map((p) => p.code);
    }

    return result;
  }

  validatePolicyRules(policyType: PolicyType, rules: any): boolean {
    const evaluator = this.evaluators.get(policyType);
    if (!evaluator) {
      throw new BadRequestException(
        `No evaluator for policy type: ${policyType}`,
      );
    }

    return evaluator.validate(rules);
  }

  private async getApplicablePolicies(
    userProfileId: string,
    context: PolicyContext,
  ): Promise<PermissionPolicy[]> {
    // Get policies assigned to user
    const userPolicies = await this.prisma.policyAssignment.findMany({
      where: {
        assigneeType: 'USER',
        assigneeId: userProfileId,
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
      include: {
        policy: true,
      },
    });

    // Get policies assigned to user's roles
    const rolePolicies = await this.prisma.policyAssignment.findMany({
      where: {
        assigneeType: 'ROLE',
        assigneeId: {
          in: context.roles || [],
        },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
        validFrom: { lte: new Date() },
      },
      include: {
        policy: true,
      },
    });

    // Get policies assigned to department
    const deptPolicies = context.department
      ? await this.prisma.policyAssignment.findMany({
          where: {
            assigneeType: 'DEPARTMENT',
            assigneeId: context.department,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
          include: {
            policy: true,
          },
        })
      : [];

    // Get policies assigned to position
    const positionPolicies = context.position
      ? await this.prisma.policyAssignment.findMany({
          where: {
            assigneeType: 'POSITION',
            assigneeId: context.position,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            validFrom: { lte: new Date() },
          },
          include: {
            policy: true,
          },
        })
      : [];

    // Combine and deduplicate policies
    const allAssignments = [
      ...userPolicies,
      ...rolePolicies,
      ...deptPolicies,
      ...positionPolicies,
    ];

    const uniquePolicies = new Map<string, PermissionPolicy>();
    for (const assignment of allAssignments) {
      if (assignment.policy.isActive) {
        uniquePolicies.set(assignment.policy.id, assignment.policy);
      }
    }

    // Sort by priority (lower number = higher priority)
    return Array.from(uniquePolicies.values()).sort(
      (a, b) => a.priority - b.priority,
    );
  }

  private async getPolicyPermissions(
    policyId: string,
  ): Promise<{ id: string; code: string }[]> {
    // This would be implemented based on your policy-permission relationship
    // For now, returning empty array
    return [];
  }

  private async logPolicyEvaluation(
    userProfileId: string,
    policyId: string,
    isApplicable: boolean,
    reason?: string,
  ): Promise<void> {
    // Log to a policy evaluation table for audit purposes
    // This could be a new table or use the existing audit system
    try {
      await this.prisma.$executeRaw`
        INSERT INTO gloria_ops.permission_check_logs (
          id, user_profile_id, resource, action, is_allowed, denied_reason, check_duration, metadata, created_at
        ) VALUES (
          ${uuidv7()},
          ${userProfileId},
          'policy',
          ${policyId},
          ${isApplicable},
          ${reason || null},
          0,
          ${JSON.stringify({ policyEvaluation: true })}::jsonb,
          NOW()
        )
      `;
    } catch (error) {
      console.error('Failed to log policy evaluation:', error);
    }
  }
}
