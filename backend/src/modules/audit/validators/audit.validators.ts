import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/**
 * Custom validator to prevent SQL injection in string fields
 */
@ValidatorConstraint({ name: 'noSqlInjection', async: false })
export class NoSqlInjectionConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return true;

    // Common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN|ORDER BY|GROUP BY|HAVING)\b)/gi,
      /(--|#|\/\*|\*\/|xp_|sp_|0x)/gi,
      /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
      /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
      /(';|";|`)/g,
      /(\bSLEEP\b|\bBENCHMARK\b|\bWAITFOR\b)/gi,
    ];

    return !sqlPatterns.some((pattern) => pattern.test(value));
  }

  defaultMessage(): string {
    return 'Input contains potentially malicious SQL patterns';
  }
}

export function NoSqlInjection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoSqlInjectionConstraint,
    });
  };
}

/**
 * Custom validator to prevent XSS attacks in string fields
 */
@ValidatorConstraint({ name: 'noXss', async: false })
export class NoXssConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return true;

    // Common XSS patterns
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<img[^>]*onerror\s*=/gi,
      /<img[^>]*onload\s*=/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // Event handlers
      /<svg[^>]*onload\s*=/gi,
      /alert\s*\(/gi,
      /prompt\s*\(/gi,
      /confirm\s*\(/gi,
    ];

    return !xssPatterns.some((pattern) => pattern.test(value));
  }

  defaultMessage(): string {
    return 'Input contains potentially malicious script content';
  }
}

export function NoXss(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: NoXssConstraint,
    });
  };
}

/**
 * Custom validator for date range validation
 */
@ValidatorConstraint({ name: 'dateRange', async: false })
export class DateRangeConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments): boolean {
    const [relatedPropertyName, maxDays] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];

    if (!value || !relatedValue) return true;

    const startDate = new Date(value);
    const endDate = new Date(relatedValue);

    // Check if dates are valid
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }

    // Check if end date is after start date
    if (endDate < startDate) {
      return false;
    }

    // Check if date range exceeds maximum days
    if (maxDays) {
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= maxDays;
    }

    return true;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName, maxDays] = args.constraints;
    if (maxDays) {
      return `Date range between ${args.property} and ${relatedPropertyName} cannot exceed ${maxDays} days`;
    }
    return `${relatedPropertyName} must be after ${args.property}`;
  }
}

export function DateRange(
  property: string,
  maxDays?: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property, maxDays],
      validator: DateRangeConstraint,
    });
  };
}

/**
 * Custom validator for safe filename validation
 */
@ValidatorConstraint({ name: 'safeFilename', async: false })
export class SafeFilenameConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;

    // Check for path traversal attempts
    if (value.includes('..') || value.includes('~')) {
      return false;
    }

    // Allow only safe filename characters
    const safePattern = /^[a-zA-Z0-9_\-\.]+$/;
    return safePattern.test(value);
  }

  defaultMessage(): string {
    return 'Filename contains invalid characters or path traversal attempts';
  }
}

export function SafeFilename(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: SafeFilenameConstraint,
    });
  };
}

/**
 * Sanitize string by removing dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return input;

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove control characters except tab, newline, and carriage return
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
}

/**
 * Validate IP address format
 */
export function isValidIpAddress(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

  if (ipv4Pattern.test(ip)) {
    // Validate IPv4 octets
    const octets = ip.split('.');
    return octets.every((octet) => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }

  return ipv6Pattern.test(ip);
}

/**
 * Validate user agent string
 */
export function isValidUserAgent(userAgent: string): boolean {
  if (!userAgent || typeof userAgent !== 'string') return false;

  // Check length
  if (userAgent.length > 500) return false;

  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /data:text\/html/i,
  ];

  return !dangerousPatterns.some((pattern) => pattern.test(userAgent));
}
