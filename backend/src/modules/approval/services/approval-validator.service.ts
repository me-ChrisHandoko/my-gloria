import { Injectable } from '@nestjs/common';
import { ApprovalMatrix } from '@prisma/client';
import { IApprovalMatrixConditions, IApprovalCondition } from '../interfaces/approval.interface';

@Injectable()
export class ApprovalValidatorService {
  /**
   * Filter approval matrices based on their conditions
   */
  async filterMatricesByConditions(
    matrices: ApprovalMatrix[],
    requestDetails: Record<string, any>,
  ): Promise<ApprovalMatrix[]> {
    const filtered: ApprovalMatrix[] = [];

    for (const matrix of matrices) {
      if (!matrix.conditions) {
        // No conditions means always applicable
        filtered.push(matrix);
        continue;
      }

      const conditions = matrix.conditions as IApprovalMatrixConditions;
      if (this.evaluateConditions(conditions, requestDetails)) {
        filtered.push(matrix);
      }
    }

    return filtered;
  }

  /**
   * Evaluate if conditions match the request details
   */
  private evaluateConditions(
    conditions: IApprovalMatrixConditions,
    details: Record<string, any>,
  ): boolean {
    // Check "all" conditions - all must be true
    if (conditions.all && conditions.all.length > 0) {
      const allMatch = conditions.all.every(condition =>
        this.evaluateCondition(condition, details)
      );
      if (!allMatch) return false;
    }

    // Check "any" conditions - at least one must be true
    if (conditions.any && conditions.any.length > 0) {
      const anyMatch = conditions.any.some(condition =>
        this.evaluateCondition(condition, details)
      );
      if (!anyMatch) return false;
    }

    return true;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(
    condition: IApprovalCondition,
    details: Record<string, any>,
  ): boolean {
    const fieldValue = this.getNestedValue(details, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'eq':
        return fieldValue == conditionValue;
      
      case 'ne':
        return fieldValue != conditionValue;
      
      case 'gt':
        return Number(fieldValue) > Number(conditionValue);
      
      case 'gte':
        return Number(fieldValue) >= Number(conditionValue);
      
      case 'lt':
        return Number(fieldValue) < Number(conditionValue);
      
      case 'lte':
        return Number(fieldValue) <= Number(conditionValue);
      
      case 'in':
        if (Array.isArray(conditionValue)) {
          return conditionValue.includes(fieldValue);
        }
        return false;
      
      case 'nin':
        if (Array.isArray(conditionValue)) {
          return !conditionValue.includes(fieldValue);
        }
        return true;
      
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, any>, path: string): any {
    const keys = path.split('.');
    let value = obj;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Validate if a request meets the minimum requirements
   */
  validateRequestRequirements(
    requestDetails: Record<string, any>,
    requiredFields: string[],
  ): { valid: boolean; missingFields: string[] } {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      const value = this.getNestedValue(requestDetails, field);
      if (value === undefined || value === null || value === '') {
        missingFields.push(field);
      }
    }

    return {
      valid: missingFields.length === 0,
      missingFields,
    };
  }

  /**
   * Check if approval matrix conditions are valid
   */
  validateMatrixConditions(conditions: any): boolean {
    if (!conditions) return true;

    try {
      // Check if it's a valid conditions object
      if (typeof conditions !== 'object') return false;

      const validatedConditions = conditions as IApprovalMatrixConditions;

      // Validate "all" conditions
      if (validatedConditions.all) {
        if (!Array.isArray(validatedConditions.all)) return false;
        for (const condition of validatedConditions.all) {
          if (!this.isValidCondition(condition)) return false;
        }
      }

      // Validate "any" conditions
      if (validatedConditions.any) {
        if (!Array.isArray(validatedConditions.any)) return false;
        for (const condition of validatedConditions.any) {
          if (!this.isValidCondition(condition)) return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if a single condition is valid
   */
  private isValidCondition(condition: any): boolean {
    if (!condition || typeof condition !== 'object') return false;

    const validOperators = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in', 'nin'];
    
    const hasRequiredFields = 
      'field' in condition &&
      'operator' in condition &&
      'value' in condition;

    if (!hasRequiredFields) return false;

    const isValidOperator = validOperators.includes(condition.operator);
    const isValidField = typeof condition.field === 'string' && condition.field.length > 0;

    return isValidOperator && isValidField;
  }

  /**
   * Calculate approval priority based on conditions
   */
  calculateApprovalPriority(
    matrix: ApprovalMatrix,
    requestDetails: Record<string, any>,
  ): number {
    let priority = matrix.approvalSequence * 100; // Base priority from sequence

    // Adjust priority based on specific conditions
    if (matrix.conditions) {
      const conditions = matrix.conditions as IApprovalMatrixConditions;
      
      // Higher priority for more specific conditions
      if (conditions.all) {
        priority -= conditions.all.length * 10;
      }
      if (conditions.any) {
        priority -= conditions.any.length * 5;
      }
    }

    // Adjust based on requester specificity
    if (matrix.requesterPosition) {
      priority -= 20; // Position-specific is more specific
    } else if (matrix.requesterRole) {
      priority -= 10; // Role-specific is somewhat specific
    }

    return priority;
  }
}