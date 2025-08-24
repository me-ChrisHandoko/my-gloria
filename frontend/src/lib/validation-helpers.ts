import { z } from 'zod';

/**
 * Validation helper utilities for consistent form validation across the app
 */

// Common field transformers
export const transformers = {
  // Transform empty strings to undefined for optional fields
  optionalString: z.string().transform(val => val === '' ? undefined : val).optional(),
  
  // Transform checkbox values
  checkbox: z.union([z.boolean(), z.string()]).transform(val => 
    typeof val === 'string' ? val === 'true' : val
  ),
  
  // Transform select values (handle "all" and empty selections)
  selectValue: z.string().transform(val => 
    val === 'all' || val === '' ? undefined : val
  ).optional(),

  // Trim whitespace
  trimmedString: z.string().transform(val => val.trim()),
  
  // Indonesian phone number normalization
  phoneNumber: z.string().transform(val => {
    if (!val) return '';
    // Normalize Indonesian phone numbers
    let normalized = val.replace(/\D/g, ''); // Remove non-digits
    if (normalized.startsWith('0')) {
      normalized = '62' + normalized.substring(1);
    } else if (!normalized.startsWith('62')) {
      normalized = '62' + normalized;
    }
    return normalized;
  }),
};

// Enhanced validation schemas with better error messages
export const validationSchemas = {
  // Indonesian-specific validations
  nip: z.string()
    .regex(/^\d{18}$/, 'NIP must be exactly 18 digits')
    .optional(),
    
  nuptk: z.string()
    .regex(/^\d{16}$/, 'NUPTK must be exactly 16 digits')
    .optional(),
    
  nik: z.string()
    .regex(/^\d{16}$/, 'NIK must be exactly 16 digits')
    .optional(),

  // Organization-specific validations  
  schoolCode: z.string()
    .min(1, 'School code is required')
    .max(10, 'School code cannot exceed 10 characters')
    .regex(/^[A-Z0-9]+$/, 'School code must contain only uppercase letters and numbers'),
    
  departmentCode: z.string()
    .min(1, 'Department code is required')
    .max(15, 'Department code cannot exceed 15 characters')
    .regex(/^[A-Z0-9-]+$/, 'Department code must contain only uppercase letters, numbers, and hyphens'),
    
  positionCode: z.string()
    .min(1, 'Position code is required')
    .max(20, 'Position code cannot exceed 20 characters')
    .regex(/^[A-Z0-9-_.]+$/, 'Position code must contain only uppercase letters, numbers, hyphens, dots, and underscores'),

  // Date validations
  startDate: z.string()
    .or(z.date())
    .refine(val => {
      const date = new Date(val);
      return date <= new Date();
    }, 'Start date cannot be in the future'),
    
  endDate: z.string()
    .or(z.date())
    .optional()
    .refine(val => {
      if (!val) return true;
      const date = new Date(val);
      return date >= new Date();
    }, 'End date must be today or in the future'),

  // Email with Indonesian domain validation
  email: z.string()
    .email('Invalid email format')
    .refine(
      email => {
        const commonDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'ypkgloria.com'];
        const domain = email.split('@')[1];
        return commonDomains.some(d => domain?.endsWith(d));
      },
      'Please use a valid email domain'
    )
    .optional(),

  // Indonesian phone number validation
  phone: z.string()
    .regex(
      /^(\+62|62|0)[0-9]{8,13}$/,
      'Invalid Indonesian phone number format'
    )
    .optional(),
};

// Cross-field validation helpers
export const crossFieldValidators = {
  dateRange: (startField: string, endField: string) => 
    z.object({
      [startField]: z.string().or(z.date()),
      [endField]: z.string().or(z.date()).optional(),
    }).refine(
      data => {
        const start = new Date(data[startField]);
        const end = data[endField] ? new Date(data[endField]) : null;
        return !end || start <= end;
      },
      {
        message: 'End date must be after start date',
        path: [endField],
      }
    ),

  uniqueCode: (existingCodes: string[], currentCode?: string) =>
    z.string().refine(
      code => code === currentCode || !existingCodes.includes(code),
      'This code is already in use'
    ),

  hierarchyLevel: (maxLevel: number = 10) =>
    z.number()
      .int('Level must be a whole number')
      .min(1, 'Level must be at least 1')
      .max(maxLevel, `Level cannot exceed ${maxLevel}`),
};

// Validation utilities
export const validationUtils = {
  // Create conditional validation based on field values
  conditionalRequired: <T>(condition: (data: any) => boolean, schema: z.ZodType<T>) =>
    z.union([schema, z.undefined()]).refine(
      (value, ctx) => {
        const formData = ctx.path.length > 0 ? ctx.parent : ctx;
        return !condition(formData) || value !== undefined;
      },
      'This field is required'
    ),

  // Async validation for API calls (e.g., checking if email exists)
  asyncValidation: <T>(
    validator: (value: T) => Promise<boolean>,
    errorMessage: string
  ) => z.string().refine(validator, errorMessage),

  // File validation
  fileValidation: (
    maxSize: number = 5 * 1024 * 1024, // 5MB
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']
  ) => z.instanceof(File).refine(
    file => file.size <= maxSize,
    `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`
  ).refine(
    file => allowedTypes.includes(file.type),
    `File type must be one of: ${allowedTypes.join(', ')}`
  ),
};

// Error message customization
export const errorMessages = {
  required: 'This field is required',
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid Indonesian phone number',
  minLength: (min: number) => `Minimum ${min} characters required`,
  maxLength: (max: number) => `Maximum ${max} characters allowed`,
  pattern: (pattern: string) => `Invalid format. Expected: ${pattern}`,
  future: 'Date cannot be in the future',
  past: 'Date cannot be in the past',
  unique: 'This value is already taken',
};

// Form validation helper that combines all validations
export function createFormSchema<T extends Record<string, any>>(
  fields: {
    [K in keyof T]: z.ZodType<T[K]>;
  }
) {
  return z.object(fields);
}

// Runtime validation for API responses
export function validateApiResponse<T>(
  data: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}