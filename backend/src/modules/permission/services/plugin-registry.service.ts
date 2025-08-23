import { Injectable, Logger } from '@nestjs/common';
import { PolicyType } from '@prisma/client';
import {
  IPolicyPlugin,
  IPluginRegistry,
  IPluginMetadata,
} from '../interfaces/plugin.interface';
import { IPolicyEvaluator } from '../interfaces/policy-evaluator.interface';

/**
 * Service responsible for managing policy plugins
 * Implements the plugin registry pattern for extensibility
 */
@Injectable()
export class PluginRegistryService implements IPluginRegistry {
  private readonly logger = new Logger(PluginRegistryService.name);
  private readonly plugins = new Map<string, IPolicyPlugin>();
  private readonly evaluatorCache = new Map<PolicyType, IPolicyEvaluator[]>();

  async register(plugin: IPolicyPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    try {
      // Initialize the plugin
      await plugin.initialize();

      // Register the plugin
      this.plugins.set(plugin.id, plugin);

      // Update evaluator cache
      this.updateEvaluatorCache(plugin);

      this.logger.log(
        `Successfully registered plugin: ${plugin.name} v${plugin.version}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to register plugin ${plugin.id}: ${error.message}`,
      );
      throw error;
    }
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    try {
      // Cleanup plugin resources
      await plugin.destroy();

      // Remove from registry
      this.plugins.delete(pluginId);

      // Update evaluator cache
      this.rebuildEvaluatorCache();

      this.logger.log(`Successfully unregistered plugin: ${plugin.name}`);
    } catch (error) {
      this.logger.error(
        `Failed to unregister plugin ${pluginId}: ${error.message}`,
      );
      throw error;
    }
  }

  getPlugin(pluginId: string): IPolicyPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): IPolicyPlugin[] {
    return Array.from(this.plugins.values());
  }

  getPluginsForPolicyType(policyType: PolicyType): IPolicyPlugin[] {
    return Array.from(this.plugins.values()).filter((plugin) =>
      plugin.supportedPolicyTypes.includes(policyType),
    );
  }

  /**
   * Get all evaluators for a specific policy type
   */
  getEvaluatorsForPolicyType(policyType: PolicyType): IPolicyEvaluator[] {
    return this.evaluatorCache.get(policyType) || [];
  }

  /**
   * Get a specific evaluator by policy type
   * Returns the first available evaluator for the type
   */
  getEvaluator(policyType: PolicyType): IPolicyEvaluator | undefined {
    const evaluators = this.getEvaluatorsForPolicyType(policyType);
    return evaluators[0];
  }

  /**
   * Load plugins from a directory (for dynamic plugin loading)
   */
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    // This would be implemented to dynamically load plugin modules
    // from a specified directory
    this.logger.log(`Loading plugins from directory: ${directory}`);
    // Implementation would go here
  }

  /**
   * Get plugin metadata
   */
  getPluginMetadata(pluginId: string): IPluginMetadata | undefined {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      return undefined;
    }

    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: `Policy plugin: ${plugin.name}`,
    };
  }

  /**
   * Validate all registered plugins
   */
  async validateAllPlugins(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const [id, plugin] of this.plugins) {
      try {
        const isValid = plugin.validateConfig({});
        results.set(id, isValid);
      } catch (error) {
        this.logger.error(`Plugin ${id} validation failed: ${error.message}`);
        results.set(id, false);
      }
    }

    return results;
  }

  private updateEvaluatorCache(plugin: IPolicyPlugin): void {
    const evaluators = plugin.getEvaluators();

    for (const evaluator of evaluators) {
      const existing = this.evaluatorCache.get(evaluator.type) || [];
      existing.push(evaluator);
      this.evaluatorCache.set(evaluator.type, existing);
    }
  }

  private rebuildEvaluatorCache(): void {
    this.evaluatorCache.clear();

    for (const plugin of this.plugins.values()) {
      this.updateEvaluatorCache(plugin);
    }
  }
}