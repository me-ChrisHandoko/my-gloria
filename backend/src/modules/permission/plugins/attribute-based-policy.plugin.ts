import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  PolicyPlugin,
  PolicyPluginDecorator,
} from '../interfaces/plugin.interface';
import { IPolicyEvaluator } from '../interfaces/policy-evaluator.interface';
import { AttributeBasedPolicyEngine } from '../engines/attribute-based-policy.engine';

/**
 * Plugin for attribute-based access control (ABAC) policies
 * Supports complex attribute matching and dynamic conditions
 */
@Injectable()
@PolicyPluginDecorator({
  id: 'attribute-based-policy',
  name: 'Attribute-Based Policy Plugin',
  version: '1.0.0',
  description: 'Provides attribute-based access control capabilities',
  author: 'Gloria System',
})
export class AttributeBasedPolicyPlugin extends PolicyPlugin {
  id = 'attribute-based-policy';
  name = 'Attribute-Based Policy Plugin';
  version = '1.0.0';
  supportedPolicyTypes = [PolicyType.ATTRIBUTE_BASED];

  constructor(
    private readonly attributeBasedEngine: AttributeBasedPolicyEngine,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    // Initialize attribute providers, validators, etc.
  }

  async destroy(): Promise<void> {
    // Cleanup any resources
  }

  getEvaluators(): IPolicyEvaluator[] {
    return [this.attributeBasedEngine];
  }

  validateConfig(config: unknown): boolean {
    // Validate plugin-specific configuration
    if (!config || typeof config !== 'object') {
      return true; // No config required
    }

    // Add specific validation logic here
    return true;
  }
}