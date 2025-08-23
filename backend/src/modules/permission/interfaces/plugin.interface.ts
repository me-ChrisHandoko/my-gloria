import { DynamicModule, Type } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import { IPolicyEvaluator } from './policy-evaluator.interface';

/**
 * Interface for permission policy plugins
 * Enables extensible policy engine architecture
 */
export interface IPolicyPlugin {
  /**
   * Unique identifier for the plugin
   */
  id: string;

  /**
   * Display name for the plugin
   */
  name: string;

  /**
   * Version of the plugin
   */
  version: string;

  /**
   * Policy types supported by this plugin
   */
  supportedPolicyTypes: PolicyType[];

  /**
   * Initialize the plugin
   */
  initialize(): Promise<void>;

  /**
   * Cleanup resources when plugin is unloaded
   */
  destroy(): Promise<void>;

  /**
   * Get policy evaluators provided by this plugin
   */
  getEvaluators(): IPolicyEvaluator[];

  /**
   * Validate plugin configuration
   */
  validateConfig(config: unknown): boolean;
}

/**
 * Plugin metadata for registration
 */
export interface IPluginMetadata {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
}

/**
 * Plugin registry interface
 */
export interface IPluginRegistry {
  /**
   * Register a new plugin
   */
  register(plugin: IPolicyPlugin): Promise<void>;

  /**
   * Unregister a plugin
   */
  unregister(pluginId: string): Promise<void>;

  /**
   * Get a registered plugin by ID
   */
  getPlugin(pluginId: string): IPolicyPlugin | undefined;

  /**
   * Get all registered plugins
   */
  getAllPlugins(): IPolicyPlugin[];

  /**
   * Get plugins that support a specific policy type
   */
  getPluginsForPolicyType(policyType: PolicyType): IPolicyPlugin[];
}

/**
 * Base class for policy plugins
 */
export abstract class PolicyPlugin implements IPolicyPlugin {
  abstract id: string;
  abstract name: string;
  abstract version: string;
  abstract supportedPolicyTypes: PolicyType[];

  async initialize(): Promise<void> {
    // Default implementation - can be overridden
  }

  async destroy(): Promise<void> {
    // Default implementation - can be overridden
  }

  abstract getEvaluators(): IPolicyEvaluator[];

  validateConfig(config: unknown): boolean {
    // Default implementation - can be overridden
    return true;
  }
}

/**
 * Decorator for marking a class as a policy plugin
 */
export function PolicyPluginDecorator(metadata: IPluginMetadata) {
  return function (constructor: Type<IPolicyPlugin>) {
    Reflect.defineMetadata('plugin:metadata', metadata, constructor);
  };
}