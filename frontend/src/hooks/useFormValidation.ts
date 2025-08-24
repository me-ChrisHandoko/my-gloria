import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// Common validation schemas
export const commonSchemas = {
  email: z.string().email('Invalid email address'),
  required: z.string().min(1, 'This field is required'),
  uuid: z.string().uuid('Invalid UUID format'),
  phone: z.string().regex(
    /^(\+62|62|0)[0-9]{9,13}$/,
    'Invalid Indonesian phone number format'
  ),
};

// School form schema
export const schoolSchema = z.object({
  code: commonSchemas.required,
  name: commonSchemas.required,
  lokasi: z.string().optional(),
  address: z.string().optional(),
  phone: commonSchemas.phone.optional().or(z.literal('')),
  email: commonSchemas.email.optional().or(z.literal('')),
  principal: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Department form schema  
export const departmentSchema = z.object({
  code: commonSchemas.required,
  name: commonSchemas.required,
  description: z.string().optional(),
  schoolId: commonSchemas.uuid,
  parentId: commonSchemas.uuid.optional(),
  isActive: z.boolean().default(true),
});

// Position form schema
export const positionSchema = z.object({
  code: commonSchemas.required,
  name: commonSchemas.required,
  description: z.string().optional(),
  departmentId: commonSchemas.uuid,
  level: z.number().int().min(1).max(10),
  maxOccupants: z.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

// User position assignment schema
export const userPositionSchema = z.object({
  userProfileId: commonSchemas.uuid,
  positionId: commonSchemas.uuid,
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional(),
  isPlt: z.boolean().default(false),
});

export type SchoolFormData = z.infer<typeof schoolSchema>;
export type DepartmentFormData = z.infer<typeof departmentSchema>;
export type PositionFormData = z.infer<typeof positionSchema>;
export type UserPositionFormData = z.infer<typeof userPositionSchema>;

interface UseFormValidationOptions<T extends z.ZodType> {
  schema: T;
  defaultValues?: z.infer<T>;
  onSuccess?: (data: z.infer<T>) => void | Promise<void>;
  onError?: (errors: any) => void;
  showToastOnError?: boolean;
}

/**
 * Enhanced form validation hook with Zod integration
 * Provides consistent error handling and toast notifications
 */
export function useFormValidation<T extends z.ZodType>({
  schema,
  defaultValues,
  onSuccess,
  onError,
  showToastOnError = true,
}: UseFormValidationOptions<T>): UseFormReturn<z.infer<T>> & {
  submitWithValidation: (data: z.infer<T>) => Promise<void>;
} {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur', // Validate on blur for better UX
  });

  const submitWithValidation = async (data: z.infer<T>) => {
    try {
      // Additional validation before submission
      const validatedData = schema.parse(data);
      
      if (onSuccess) {
        await onSuccess(validatedData);
        toast.success('Data saved successfully');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      if (error instanceof z.ZodError) {
        // Handle Zod validation errors
        error.errors.forEach((err) => {
          form.setError(err.path[0] as any, {
            type: 'manual',
            message: err.message,
          });
        });
        
        if (showToastOnError) {
          toast.error('Please fix the form errors');
        }
      } else {
        // Handle other errors
        if (showToastOnError) {
          toast.error('An error occurred while saving data');
        }
      }
      
      if (onError) {
        onError(error);
      }
    }
  };

  return {
    ...form,
    submitWithValidation,
  };
}

// Utility function for field validation status
export function getFieldError(form: UseFormReturn<any>, fieldName: string) {
  const error = form.formState.errors[fieldName];
  const isDirty = form.formState.dirtyFields[fieldName];
  const isInvalid = !!error && isDirty;
  
  return {
    error: error?.message,
    isInvalid,
    isValid: isDirty && !error,
  };
}