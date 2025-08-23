import { Injectable } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  PolicyPlugin,
  PolicyPluginDecorator,
} from '../interfaces/plugin.interface';
import { IPolicyEvaluator } from '../interfaces/policy-evaluator.interface';
import { LocationBasedPolicyEngine } from '../engines/location-based-policy.engine';

/**
 * Plugin for location-based access control policies
 * Supports IP ranges, geolocation, and network-based restrictions
 */
@Injectable()
@PolicyPluginDecorator({
  id: 'location-based-policy',
  name: 'Location-Based Policy Plugin',
  version: '1.0.0',
  description: 'Provides location-based access control capabilities',
  author: 'Gloria System',
})
export class LocationBasedPolicyPlugin extends PolicyPlugin {
  id = 'location-based-policy';
  name = 'Location-Based Policy Plugin';
  version = '1.0.0';
  supportedPolicyTypes = [PolicyType.LOCATION_BASED];

  constructor(
    private readonly locationBasedEngine: LocationBasedPolicyEngine,
  ) {
    super();
  }

  async initialize(): Promise<void> {
    // Initialize geolocation services, IP databases, etc.
  }

  async destroy(): Promise<void> {
    // Cleanup any resources
  }

  getEvaluators(): IPolicyEvaluator[] {
    return [this.locationBasedEngine];
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