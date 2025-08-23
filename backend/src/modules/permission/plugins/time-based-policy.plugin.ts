import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  PolicyPlugin,
  PolicyPluginDecorator,
} from '../interfaces/plugin.interface';
import { IPolicyEvaluator } from '../interfaces/policy-evaluator.interface';
import { TimeBasedPolicyEngine } from '../engines/time-based-policy.engine';

/**
 * Plugin for time-based access control policies
 * Supports business hours, time windows, and schedule-based access
 */
@Injectable()
@PolicyPluginDecorator({
  id: 'time-based-policy',
  name: 'Time-Based Policy Plugin',
  version: '1.0.0',
  description: 'Provides time-based access control capabilities',
  author: 'Gloria System',
})
export class TimeBasedPolicyPlugin extends PolicyPlugin {
  id = 'time-based-policy';
  name = 'Time-Based Policy Plugin';
  version = '1.0.0';
  supportedPolicyTypes = [PolicyType.TIME_BASED];

  constructor(private readonly timeBasedEngine: TimeBasedPolicyEngine) {
    super();
  }

  async initialize(): Promise<void> {
    // Perform any initialization tasks
    // e.g., validate timezone settings, load schedules
  }

  async destroy(): Promise<void> {
    // Cleanup any resources
  }

  getEvaluators(): IPolicyEvaluator[] {
    return [this.timeBasedEngine];
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