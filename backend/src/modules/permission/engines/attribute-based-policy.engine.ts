import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  IPolicyEvaluator,
  PolicyContext,
  PolicyEvaluationResult,
  AttributeBasedRule,
  PolicyRule,
} from '../interfaces/policy-evaluator.interface';

@Injectable()
export class AttributeBasedPolicyEngine implements IPolicyEvaluator {
  type = PolicyType.ATTRIBUTE_BASED;

  async evaluate(
    rules: AttributeBasedRule,
    context: PolicyContext,
  ): Promise<PolicyEvaluationResult> {
    const results: { passed: boolean; reason?: string }[] = [];

    // Evaluate user attributes
    if (rules.userAttributes?.length) {
      const userResult = this.evaluateRules(rules.userAttributes, {
        department: context.department,
        school: context.school,
        position: context.position,
        roles: context.roles,
        userId: context.userId,
        ...context.attributes,
      });
      results.push({
        passed: userResult.passed,
        reason: userResult.passed
          ? undefined
          : `User attributes: ${userResult.reason}`,
      });
    }

    // Evaluate resource attributes
    if (rules.resourceAttributes?.length) {
      const resourceResult = this.evaluateRules(
        rules.resourceAttributes,
        context.attributes?.resource || {},
      );
      results.push({
        passed: resourceResult.passed,
        reason: resourceResult.passed
          ? undefined
          : `Resource attributes: ${resourceResult.reason}`,
      });
    }

    // Evaluate environment attributes
    if (rules.environmentAttributes?.length) {
      const envResult = this.evaluateRules(rules.environmentAttributes, {
        timestamp: context.timestamp,
        ...context.attributes?.environment,
      });
      results.push({
        passed: envResult.passed,
        reason: envResult.passed
          ? undefined
          : `Environment attributes: ${envResult.reason}`,
      });
    }

    // Combine results (default to AND logic - all must pass)
    const allPassed = results.length === 0 || results.every((r) => r.passed);
    const failureReasons = results
      .filter((r) => !r.passed)
      .map((r) => r.reason);

    return {
      isApplicable: allPassed,
      grantedPermissions: [],
      reason: failureReasons.length > 0 ? failureReasons.join('; ') : undefined,
      metadata: {
        evaluatedRules: results.length,
        passedRules: results.filter((r) => r.passed).length,
        timestamp: new Date(),
      },
    };
  }

  validate(rules: any): boolean {
    if (!rules || typeof rules !== 'object') {
      return false;
    }

    const attrRule = rules as AttributeBasedRule;

    // Validate user attribute rules
    if (attrRule.userAttributes) {
      if (!Array.isArray(attrRule.userAttributes)) {
        return false;
      }
      for (const rule of attrRule.userAttributes) {
        if (!this.isValidRule(rule)) {
          return false;
        }
      }
    }

    // Validate resource attribute rules
    if (attrRule.resourceAttributes) {
      if (!Array.isArray(attrRule.resourceAttributes)) {
        return false;
      }
      for (const rule of attrRule.resourceAttributes) {
        if (!this.isValidRule(rule)) {
          return false;
        }
      }
    }

    // Validate environment attribute rules
    if (attrRule.environmentAttributes) {
      if (!Array.isArray(attrRule.environmentAttributes)) {
        return false;
      }
      for (const rule of attrRule.environmentAttributes) {
        if (!this.isValidRule(rule)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateRules(
    rules: PolicyRule[],
    attributes: Record<string, any>,
  ): { passed: boolean; reason?: string } {
    const results: boolean[] = [];
    const reasons: string[] = [];
    let currentCondition: 'AND' | 'OR' = 'AND';

    for (const rule of rules) {
      const attributeValue = this.getNestedValue(attributes, rule.field);
      const ruleResult = this.evaluateRule(rule, attributeValue);

      if (!ruleResult) {
        reasons.push(
          `${rule.field} ${rule.operator} ${JSON.stringify(rule.value)}`,
        );
      }

      if (rule.condition) {
        currentCondition = rule.condition;
      }

      results.push(ruleResult);
    }

    // Apply AND/OR logic
    let passed: boolean;
    if (currentCondition === 'OR') {
      passed = results.some((r) => r);
    } else {
      passed = results.every((r) => r);
    }

    return {
      passed,
      reason: passed ? undefined : `Failed conditions: ${reasons.join(', ')}`,
    };
  }

  private evaluateRule(rule: PolicyRule, value: any): boolean {
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;

      case 'not_equals':
        return value !== rule.value;

      case 'contains':
        if (typeof value === 'string' && typeof rule.value === 'string') {
          return value.includes(rule.value);
        }
        if (Array.isArray(value)) {
          return value.includes(rule.value);
        }
        return false;

      case 'in':
        if (Array.isArray(rule.value)) {
          return rule.value.includes(value);
        }
        return false;

      case 'not_in':
        if (Array.isArray(rule.value)) {
          return !rule.value.includes(value);
        }
        return true;

      case 'greater_than':
        if (typeof value === 'number' && typeof rule.value === 'number') {
          return value > rule.value;
        }
        if (value instanceof Date && rule.value instanceof Date) {
          return value > rule.value;
        }
        return false;

      case 'less_than':
        if (typeof value === 'number' && typeof rule.value === 'number') {
          return value < rule.value;
        }
        if (value instanceof Date && rule.value instanceof Date) {
          return value < rule.value;
        }
        return false;

      case 'between':
        if (Array.isArray(rule.value) && rule.value.length === 2) {
          const [min, max] = rule.value;
          if (
            typeof value === 'number' &&
            typeof min === 'number' &&
            typeof max === 'number'
          ) {
            return value >= min && value <= max;
          }
          if (
            value instanceof Date &&
            min instanceof Date &&
            max instanceof Date
          ) {
            return value >= min && value <= max;
          }
        }
        return false;

      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  private isValidRule(rule: any): boolean {
    if (!rule || typeof rule !== 'object') {
      return false;
    }

    if (!rule.field || typeof rule.field !== 'string') {
      return false;
    }

    const validOperators = [
      'equals',
      'not_equals',
      'contains',
      'in',
      'not_in',
      'greater_than',
      'less_than',
      'between',
    ];

    if (!validOperators.includes(rule.operator)) {
      return false;
    }

    if (rule.value === undefined) {
      return false;
    }

    if (rule.condition && !['AND', 'OR'].includes(rule.condition)) {
      return false;
    }

    // Validate specific operator requirements
    if (
      rule.operator === 'between' &&
      (!Array.isArray(rule.value) || rule.value.length !== 2)
    ) {
      return false;
    }

    if (
      (rule.operator === 'in' || rule.operator === 'not_in') &&
      !Array.isArray(rule.value)
    ) {
      return false;
    }

    return true;
  }
}
