import { BadRequestException } from '@nestjs/common';
import * as path from 'path';
import { Logger } from '@nestjs/common';

/**
 * Security validation utilities for system configuration module
 */
export class ValidationUtil {
  private static readonly logger = new Logger(ValidationUtil.name);

  /**
   * Validates a file path to prevent path traversal attacks
   * @param filePath The file path to validate
   * @param basePath The base directory that files must be within
   * @returns The resolved absolute path
   * @throws BadRequestException if path is invalid
   */
  static validateFilePath(filePath: string, basePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new BadRequestException('Invalid file path provided');
    }

    // Normalize and resolve paths
    const resolvedBase = path.resolve(basePath);
    const resolvedPath = path.resolve(filePath);

    // Check if the resolved path is within the base directory
    if (!resolvedPath.startsWith(resolvedBase)) {
      this.logger.warn(`Path traversal attempt detected: ${filePath}`);
      throw new BadRequestException(
        'Invalid file path - potential path traversal detected',
      );
    }

    // Additional checks for dangerous patterns
    const dangerousPatterns = [
      '../',
      '..\\',
      '%2e%2e%2f',
      '%2e%2e%5c',
      '..%2f',
      '..%5c',
      '..',
    ];

    const normalizedPath = filePath.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (normalizedPath.includes(pattern)) {
        this.logger.warn(
          `Dangerous pattern detected in path: ${pattern} in ${filePath}`,
        );
        throw new BadRequestException(
          'Invalid file path - dangerous pattern detected',
        );
      }
    }

    return resolvedPath;
  }

  /**
   * Validates a table name to prevent SQL injection
   * @param tableName The table name to validate
   * @returns The validated table name
   * @throws BadRequestException if table name is invalid
   */
  static validateTableName(tableName: string): string {
    if (!tableName || typeof tableName !== 'string') {
      throw new BadRequestException('Invalid table name provided');
    }

    // Only allow alphanumeric characters, underscores, and dots (for schema.table)
    const tableNameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$/;
    
    if (!tableNameRegex.test(tableName)) {
      this.logger.warn(`Invalid table name attempted: ${tableName}`);
      throw new BadRequestException(
        'Invalid table name - only alphanumeric characters and underscores allowed',
      );
    }

    // Check length constraints
    if (tableName.length > 63) {
      // PostgreSQL identifier limit
      throw new BadRequestException(
        'Table name too long - maximum 63 characters allowed',
      );
    }

    // Check for SQL keywords (basic list)
    const sqlKeywords = [
      'drop',
      'delete',
      'insert',
      'update',
      'select',
      'alter',
      'create',
      'truncate',
      'exec',
      'execute',
      'script',
      'union',
    ];

    const lowerTableName = tableName.toLowerCase();
    for (const keyword of sqlKeywords) {
      if (lowerTableName === keyword) {
        throw new BadRequestException(
          `Invalid table name - SQL keyword '${keyword}' not allowed`,
        );
      }
    }

    return tableName;
  }

  /**
   * Validates an array of table names
   * @param tableNames Array of table names to validate
   * @returns Array of validated table names
   */
  static validateTableNames(tableNames: string[]): string[] {
    if (!Array.isArray(tableNames)) {
      throw new BadRequestException('Table names must be an array');
    }

    return tableNames.map((name) => this.validateTableName(name));
  }

  /**
   * Validates a feature flag name
   * @param name The feature flag name to validate
   * @returns The validated name
   * @throws BadRequestException if name is invalid
   */
  static validateFeatureFlagName(name: string): string {
    if (!name || typeof name !== 'string') {
      throw new BadRequestException('Invalid feature flag name provided');
    }

    // Only allow alphanumeric characters, underscores, hyphens, and dots
    const nameRegex = /^[a-zA-Z][a-zA-Z0-9._-]*$/;

    if (!nameRegex.test(name)) {
      throw new BadRequestException(
        'Invalid feature flag name - must start with a letter and contain only alphanumeric characters, dots, hyphens, and underscores',
      );
    }

    // Check length constraints
    if (name.length < 3) {
      throw new BadRequestException(
        'Feature flag name too short - minimum 3 characters required',
      );
    }

    if (name.length > 100) {
      throw new BadRequestException(
        'Feature flag name too long - maximum 100 characters allowed',
      );
    }

    return name;
  }

  /**
   * Validates a rollout percentage
   * @param percentage The percentage to validate
   * @returns The validated percentage
   * @throws BadRequestException if percentage is invalid
   */
  static validateRolloutPercentage(percentage: number): number {
    if (percentage === undefined || percentage === null) {
      return 100; // Default to 100%
    }

    if (typeof percentage !== 'number' || isNaN(percentage)) {
      throw new BadRequestException('Rollout percentage must be a number');
    }

    if (percentage < 0 || percentage > 100) {
      throw new BadRequestException(
        'Rollout percentage must be between 0 and 100',
      );
    }

    return Math.round(percentage);
  }

  /**
   * Validates an IP address
   * @param ip The IP address to validate
   * @returns The validated IP address
   * @throws BadRequestException if IP is invalid
   */
  static validateIpAddress(ip: string): string {
    if (!ip || typeof ip !== 'string') {
      throw new BadRequestException('Invalid IP address provided');
    }

    // IPv4 regex
    const ipv4Regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    // IPv6 regex (simplified)
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      throw new BadRequestException('Invalid IP address format');
    }

    return ip;
  }

  /**
   * Validates an array of IP addresses
   * @param ips Array of IP addresses to validate
   * @returns Array of validated IP addresses
   */
  static validateIpAddresses(ips: string[]): string[] {
    if (!Array.isArray(ips)) {
      throw new BadRequestException('IP addresses must be an array');
    }

    return ips.map((ip) => this.validateIpAddress(ip));
  }

  /**
   * Validates backup directory environment variable
   * @param backupDir The backup directory path
   * @returns The validated absolute path
   * @throws BadRequestException if path is invalid
   */
  static validateBackupDirectory(backupDir: string): string {
    if (!backupDir || typeof backupDir !== 'string') {
      throw new BadRequestException('Backup directory must be specified');
    }

    // Ensure absolute path
    const absolutePath = path.isAbsolute(backupDir)
      ? backupDir
      : path.resolve(process.cwd(), backupDir);

    // Check for dangerous patterns
    if (backupDir.includes('..') || backupDir.includes('~')) {
      throw new BadRequestException(
        'Backup directory path contains dangerous patterns',
      );
    }

    return absolutePath;
  }

  /**
   * Sanitizes a string for use in shell commands
   * @param input The string to sanitize
   * @returns The sanitized string
   */
  static sanitizeForShell(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove or escape dangerous characters
    return input
      .replace(/[;&|`$<>\\]/g, '') // Remove dangerous shell characters
      .replace(/'/g, "\\'") // Escape single quotes
      .replace(/"/g, '\\"') // Escape double quotes
      .replace(/\n/g, '') // Remove newlines
      .replace(/\r/g, ''); // Remove carriage returns
  }

  /**
   * Validates configuration value based on type
   * @param value The value to validate
   * @param expectedType The expected type
   * @returns The validated value
   * @throws BadRequestException if value is invalid
   */
  static validateConfigValue(value: any, expectedType?: string): any {
    if (value === undefined || value === null) {
      throw new BadRequestException('Configuration value cannot be null');
    }

    if (expectedType) {
      switch (expectedType) {
        case 'string':
          if (typeof value !== 'string') {
            throw new BadRequestException('Configuration value must be a string');
          }
          break;
        case 'number':
          if (typeof value !== 'number' || isNaN(value)) {
            throw new BadRequestException('Configuration value must be a number');
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            throw new BadRequestException('Configuration value must be a boolean');
          }
          break;
        case 'object':
          if (typeof value !== 'object') {
            throw new BadRequestException('Configuration value must be an object');
          }
          break;
        case 'array':
          if (!Array.isArray(value)) {
            throw new BadRequestException('Configuration value must be an array');
          }
          break;
      }
    }

    return value;
  }
}