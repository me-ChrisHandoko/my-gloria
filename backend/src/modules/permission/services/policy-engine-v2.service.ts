import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PolicyType, PermissionPolicy } from '@prisma/client';
import {
  PolicyContext,
  PolicyEvaluationResult,
} from '../interfaces/policy-evaluator.interface';
import { PluginRegistryService } from './plugin-registry.service';
import { TimeBasedPolicyPlugin } from '../plugins/time-based-policy.plugin';
import { LocationBasedPolicyPlugin } from '../plugins/location-based-policy.plugin';
import { AttributeBasedPolicyPlugin } from '../plugins/attribute-based-policy.plugin';
import { v7 as uuidv7 } from 'uuid';

/**
 * Enhanced Policy Engine Service with plugin-based architecture
 * Provides extensible policy evaluation through registered plugins
 */
@Injectable()
export class PolicyEngineV2Service implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pluginRegistry: PluginRegistryService,
    private readonly timeBasedPlugin: TimeBasedPolicyPlugin,
    private readonly locationBasedPlugin: LocationBasedPolicyPlugin,
    private readonly attributeBasedPlugin: AttributeBasedPolicyPlugin,
  ) {}

  async onModuleInit() {
    // Register default plugins on module initialization
    await this.registerDefaultPlugins();
  }

  private async registerDefaultPlugins(): Promise<void> {
    // Register built-in plugins
    await this.pluginRegistry.register(this.timeBasedPlugin);
    await this.pluginRegistry.register(this.locationBasedPlugin);
    await this.pluginRegistry.register(this.attributeBasedPlugin);
  }

  /**
   * Register a custom policy plugin
   */
  async registerPlugin(plugin: any): Promise<void> {
    await this.pluginRegistry.register(plugin);
  }

  /**
   * Evaluate all applicable policies for a user
   */
  async evaluatePolicies(
    userId: string,
    context?: Partial<PolicyContext>,
  ): Promise<Map<string, PolicyEvaluationResult>> {
    // Get user profile with roles
    const userProfile = await this.getUserProfileWithContext(userId);

    if (!userProfile) {
      throw new BadRequestException(`User profile ${userId} not found`);
    }

    // Build full context
    const fullContext = this.buildPolicyContext(userProfile, context);

    // Get applicable policies
    const policies = await this.getApplicablePolicies(
      userProfile.id,
      fullContext,
    );
    const results = new Map<string, PolicyEvaluationResult>();

    // Evaluate each policy using appropriate plugin
    for (const policy of policies) {
      const result = await this.evaluateSinglePolicy(
        policy,
        fullContext,
        userProfile.id,
      );
      results.set(policy.code, result);
    }

    return results;
  }

  /**
   * Evaluate a specific policy
   */
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

    const userProfile = await this.getUserProfileWithContext(userId);
    if (!userProfile) {
      throw new BadRequestException(`User profile ${userId} not found`);
    }

    const fullContext = this.buildPolicyContext(userProfile, context);
    return this.evaluateSinglePolicy(policy, fullContext, userProfile.id);
  }

  /**
   * Validate policy rules using the appropriate plugin
   */
  validatePolicyRules(policyType: PolicyType, rules: any): boolean {
    const evaluator = this.pluginRegistry.getEvaluator(policyType);
    if (!evaluator) {
      throw new BadRequestException(
        `No evaluator for policy type: ${policyType}`,
      );
    }

    return evaluator.validate(rules);
  }

  /**
   * Get available policy types from registered plugins
   */
  getAvailablePolicyTypes(): PolicyType[] {
    const types = new Set<PolicyType>();
    
    for (const plugin of this.pluginRegistry.getAllPlugins()) {
      plugin.supportedPolicyTypes.forEach((type) => types.add(type));
    }

    return Array.from(types);
  }

  /**
   * Get plugin information
   */
  getPluginInfo() {
    return this.pluginRegistry.getAllPlugins().map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      supportedTypes: plugin.supportedPolicyTypes,
    }));
  }

  private async evaluateSinglePolicy(
    policy: PermissionPolicy,
    context: PolicyContext,
    userProfileId: string,
  ): Promise<PolicyEvaluationResult> {
    const evaluator = this.pluginRegistry.getEvaluator(policy.policyType);
    
    if (!evaluator) {
      console.warn(
        `No evaluator found for policy type: ${policy.policyType}`,
      );
      return {
        isApplicable: false,
        grantedPermissions: [],
        reason: 'No evaluator available',
      };
    }

    try {
      const result = await evaluator.evaluate(
        policy.rules as any,
        context,
      );

      // Log policy evaluation
      await this.logPolicyEvaluation(
        userProfileId,
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
    } catch (error) {
      console.error(`Error evaluating policy ${policy.code}:`, error);
      return {
        isApplicable: false,
        grantedPermissions: [],
        reason: 'Evaluation error',
      };
    }
  }

  private async getUserProfileWithContext(userId: string) {
    return this.prisma.userProfile.findUnique({
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
  }

  private buildPolicyContext(
    userProfile: any,
    additionalContext?: Partial<PolicyContext>,
  ): PolicyContext {
    return {
      userId: userProfile.clerkUserId,
      userProfileId: userProfile.id,
      timestamp: new Date(),
      roles: userProfile.roles.map((ur) => ur.role.code),
      department: userProfile.positions[0]?.position.department?.code,
      school: userProfile.positions[0]?.position.school?.code,
      position: userProfile.positions[0]?.position.code,
      ...additionalContext,
    };
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