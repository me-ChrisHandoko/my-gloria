import { Injectable, BadRequestException } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import {
  permissionConditionsSchema,
  policyRulesSchema,
  approvalConditionsSchema,
} from '../schemas/permission-conditions.schema';

@Injectable()
export class JsonSchemaValidatorService {
  private ajv: Ajv;
  private validators: Map<string, ValidateFunction>;

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false, // Allow union types
      validateFormats: true,
      allowUnionTypes: true,
    });
    
    // Add format validators
    addFormats(this.ajv);
    
    // Initialize validators
    this.validators = new Map();
    this.initializeValidators();
  }

  private initializeValidators() {
    // Compile schemas and store validators
    this.validators.set(
      'permissionConditions',
      this.ajv.compile(permissionConditionsSchema),
    );
    
    this.validators.set(
      'policyRules',
      this.ajv.compile(policyRulesSchema),
    );
    
    this.validators.set(
      'approvalConditions',
      this.ajv.compile(approvalConditionsSchema),
    );
  }

  /**
   * Validate permission conditions
   */
  validatePermissionConditions(conditions: any): void {
    if (!conditions) {
      return; // Conditions are optional
    }

    const validator = this.validators.get('permissionConditions');
    if (!validator) {
      throw new BadRequestException('Permission conditions validator not found');
    }

    const valid = validator(conditions);
    if (!valid) {
      throw new BadRequestException(
        `Invalid permission conditions: ${this.formatErrors(validator.errors)}`,
      );
    }
  }

  /**
   * Validate policy rules
   */
  validatePolicyRules(rules: any): void {
    if (!rules) {
      throw new BadRequestException('Policy rules are required');
    }

    const validator = this.validators.get('policyRules');
    if (!validator) {
      throw new BadRequestException('Policy rules validator not found');
    }

    const valid = validator(rules);
    if (!valid) {
      throw new BadRequestException(
        `Invalid policy rules: ${this.formatErrors(validator.errors)}`,
      );
    }
  }

  /**
   * Validate approval conditions
   */
  validateApprovalConditions(conditions: any): void {
    if (!conditions) {
      return; // Conditions are optional
    }

    const validator = this.validators.get('approvalConditions');
    if (!validator) {
      throw new BadRequestException('Approval conditions validator not found');
    }

    const valid = validator(conditions);
    if (!valid) {
      throw new BadRequestException(
        `Invalid approval conditions: ${this.formatErrors(validator.errors)}`,
      );
    }
  }

  /**
   * Generic JSON validation against a schema
   */
  validate(data: any, schemaType: string): void {
    const validator = this.validators.get(schemaType);
    if (!validator) {
      throw new BadRequestException(`Validator for ${schemaType} not found`);
    }

    const valid = validator(data);
    if (!valid) {
      throw new BadRequestException(
        `Invalid ${schemaType}: ${this.formatErrors(validator.errors)}`,
      );
    }
  }

  /**
   * Format validation errors for better readability
   */
  private formatErrors(errors: any[] | null | undefined): string {
    if (!errors || errors.length === 0) {
      return 'Unknown validation error';
    }

    const errorMessages = errors.map((err) => {
      const field = err.instancePath || 'root';
      const message = err.message || 'Invalid value';
      return `${field}: ${message}`;
    });

    return errorMessages.join(', ');
  }

  /**
   * Sanitize JSON input to prevent injection attacks
   */
  sanitizeJson(input: any): any {
    if (typeof input !== 'object' || input === null) {
      return input;
    }

    const sanitized: any = Array.isArray(input) ? [] : {};

    for (const [key, value] of Object.entries(input)) {
      // Sanitize key
      const sanitizedKey = this.sanitizeString(key);
      
      // Recursively sanitize value
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize string values
   */
  private sanitizeString(str: string): string {
    // Remove potential script tags and dangerous characters
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  /**
   * Validate and sanitize conditions
   */
  validateAndSanitizeConditions(
    conditions: any,
    type: 'permission' | 'approval' | 'policy',
  ): any {
    // First sanitize
    const sanitized = this.sanitizeJson(conditions);

    // Then validate based on type
    switch (type) {
      case 'permission':
        this.validatePermissionConditions(sanitized);
        break;
      case 'approval':
        this.validateApprovalConditions(sanitized);
        break;
      case 'policy':
        this.validatePolicyRules(sanitized);
        break;
      default:
        throw new BadRequestException(`Unknown condition type: ${type}`);
    }

    return sanitized;
  }

  /**
   * Check if conditions contain SQL injection patterns
   */
  private containsSqlInjection(value: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(--|#|\/\*|\*\/)/,
      /(\bOR\b\s*\d+\s*=\s*\d+)/i,
      /(\bAND\b\s*\d+\s*=\s*\d+)/i,
      /(';|";)/,
    ];

    return sqlPatterns.some(pattern => pattern.test(value));
  }

  /**
   * Deep validation with SQL injection detection
   */
  deepValidate(data: any): void {
    const checkValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        if (this.containsSqlInjection(value)) {
          throw new BadRequestException(
            `Potential SQL injection detected at ${path}`,
          );
        }
      } else if (typeof value === 'object' && value !== null) {
        for (const [key, val] of Object.entries(value)) {
          checkValue(val, path ? `${path}.${key}` : key);
        }
      }
    };

    checkValue(data);
  }
}