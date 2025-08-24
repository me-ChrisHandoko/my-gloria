import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ValidationUtil } from '../utils/validation.util';

/**
 * Validator for table names to prevent SQL injection
 */
@ValidatorConstraint({ name: 'isValidTableName', async: false })
export class IsValidTableNameConstraint implements ValidatorConstraintInterface {
  validate(tableName: string, args: ValidationArguments) {
    if (!tableName || typeof tableName !== 'string') {
      return false;
    }

    try {
      ValidationUtil.validateTableName(tableName);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Table name must contain only alphanumeric characters and underscores, and cannot be a SQL keyword';
  }
}

export function IsValidTableName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidTableName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidTableNameConstraint,
    });
  };
}

/**
 * Validator for feature flag names
 */
@ValidatorConstraint({ name: 'isValidFeatureFlagName', async: false })
export class IsValidFeatureFlagNameConstraint
  implements ValidatorConstraintInterface
{
  validate(name: string, args: ValidationArguments) {
    if (!name || typeof name !== 'string') {
      return false;
    }

    try {
      ValidationUtil.validateFeatureFlagName(name);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Feature flag name must start with a letter and contain only alphanumeric characters, dots, hyphens, and underscores (3-100 characters)';
  }
}

export function IsValidFeatureFlagName(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidFeatureFlagName',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidFeatureFlagNameConstraint,
    });
  };
}

/**
 * Validator for rollout percentage
 */
@ValidatorConstraint({ name: 'isValidRolloutPercentage', async: false })
export class IsValidRolloutPercentageConstraint
  implements ValidatorConstraintInterface
{
  validate(percentage: any, args: ValidationArguments) {
    if (percentage === undefined || percentage === null) {
      return true; // Optional field
    }

    try {
      ValidationUtil.validateRolloutPercentage(percentage);
      return true;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments) {
    return 'Rollout percentage must be a number between 0 and 100';
  }
}

export function IsValidRolloutPercentage(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidRolloutPercentage',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidRolloutPercentageConstraint,
    });
  };
}

/**
 * Validator for configuration keys
 */
@ValidatorConstraint({ name: 'isValidConfigKey', async: false })
export class IsValidConfigKeyConstraint implements ValidatorConstraintInterface {
  validate(key: string, args: ValidationArguments) {
    if (!key || typeof key !== 'string') {
      return false;
    }

    // Only allow alphanumeric characters, underscores, hyphens, dots, and colons
    const keyRegex = /^[a-zA-Z][a-zA-Z0-9._:-]*$/;

    if (!keyRegex.test(key)) {
      return false;
    }

    // Check length constraints
    if (key.length < 3 || key.length > 100) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Configuration key must start with a letter and contain only alphanumeric characters, dots, colons, hyphens, and underscores (3-100 characters)';
  }
}

export function IsValidConfigKey(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidConfigKey',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsValidConfigKeyConstraint,
    });
  };
}

/**
 * Validator for safe string (no shell injection)
 */
@ValidatorConstraint({ name: 'isSafeString', async: false })
export class IsSafeStringConstraint implements ValidatorConstraintInterface {
  validate(value: string, args: ValidationArguments) {
    if (!value || typeof value !== 'string') {
      return true; // Let other validators handle required validation
    }

    // Check for dangerous characters
    const dangerousChars = /[;&|`$<>\\]/;
    if (dangerousChars.test(value)) {
      return false;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Value contains potentially dangerous characters';
  }
}

export function IsSafeString(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isSafeString',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: IsSafeStringConstraint,
    });
  };
}