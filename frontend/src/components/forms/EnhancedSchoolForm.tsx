'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  useFormValidation, 
  schoolSchema,
  SchoolFormData,
  getFieldError 
} from '@/hooks/useFormValidation';
import { School } from '@/types/organization';
import { cn } from '@/lib/utils';
import { Loader2, AlertCircle } from 'lucide-react';

interface EnhancedSchoolFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school?: School;
  onSubmit: (data: SchoolFormData) => Promise<void>;
  isLoading?: boolean;
}

export function EnhancedSchoolForm({
  open,
  onOpenChange,
  school,
  onSubmit,
  isLoading = false,
}: EnhancedSchoolFormProps) {
  const isEdit = !!school;

  const form = useFormValidation({
    schema: schoolSchema,
    defaultValues: {
      code: '',
      name: '',
      lokasi: '',
      address: '',
      phone: '',
      email: '',
      principal: '',
      isActive: true,
    },
    onSuccess: async (data) => {
      await onSubmit(data);
      onOpenChange(false);
      form.reset();
    },
    showToastOnError: true,
  });

  // Reset form when dialog opens/closes or school changes
  useEffect(() => {
    if (open && school) {
      form.reset({
        code: school.code,
        name: school.name,
        lokasi: school.lokasi || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        principal: school.principal || '',
        isActive: school.isActive,
      });
    } else if (open && !school) {
      form.reset({
        code: '',
        name: '',
        lokasi: '',
        address: '',
        phone: '',
        email: '',
        principal: '',
        isActive: true,
      });
    }
  }, [open, school, form]);

  const handleSubmit = (data: SchoolFormData) => {
    form.submitWithValidation(data);
  };

  // Enhanced field component with validation
  const FormField = ({ 
    name, 
    label, 
    type = 'text', 
    required = false, 
    description,
    ...props 
  }: {
    name: keyof SchoolFormData;
    label: string;
    type?: string;
    required?: boolean;
    description?: string;
    [key: string]: any;
  }) => {
    const fieldError = getFieldError(form, name);
    
    return (
      <div className="space-y-2">
        <Label 
          htmlFor={name}
          className={cn(
            "text-sm font-medium",
            required && "after:content-['*'] after:text-red-500 after:ml-1"
          )}
        >
          {label}
        </Label>
        {type === 'textarea' ? (
          <Textarea
            id={name}
            {...form.register(name)}
            className={cn(
              fieldError.isInvalid && "border-red-500 focus-visible:ring-red-500",
              fieldError.isValid && "border-green-500"
            )}
            aria-invalid={fieldError.isInvalid}
            aria-describedby={fieldError.error ? `${name}-error` : undefined}
            {...props}
          />
        ) : (
          <Input
            id={name}
            type={type}
            {...form.register(name)}
            className={cn(
              fieldError.isInvalid && "border-red-500 focus-visible:ring-red-500",
              fieldError.isValid && "border-green-500"
            )}
            aria-invalid={fieldError.isInvalid}
            aria-describedby={fieldError.error ? `${name}-error` : undefined}
            {...props}
          />
        )}
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {fieldError.error && (
          <p 
            id={`${name}-error`}
            className="text-xs text-red-600 flex items-center gap-1"
            role="alert"
          >
            <AlertCircle className="h-3 w-3" />
            {fieldError.error}
          </p>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit School' : 'Add New School'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the school information below.' 
              : 'Fill in the details to create a new school.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="code"
              label="School Code"
              required
              placeholder="e.g., SCH001"
              description="Unique identifier for the school"
            />
            <FormField
              name="name"
              label="School Name"
              required
              placeholder="e.g., YPK Gloria Primary School"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="lokasi"
              label="Location"
              placeholder="e.g., Jakarta"
              description="City or region where the school is located"
            />
            <FormField
              name="principal"
              label="Principal"
              placeholder="Principal's name"
            />
          </div>

          <FormField
            name="address"
            label="Address"
            type="textarea"
            placeholder="Complete address of the school"
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              name="phone"
              label="Phone Number"
              type="tel"
              placeholder="e.g., +62812345678"
              description="Indonesian phone number format"
            />
            <FormField
              name="email"
              label="Email Address"
              type="email"
              placeholder="e.g., school@ypkgloria.com"
            />
          </div>

          <div className="flex items-center space-x-2 p-4 border rounded-lg">
            <Switch
              id="isActive"
              checked={form.watch('isActive')}
              onCheckedChange={(checked) => form.setValue('isActive', checked)}
            />
            <Label htmlFor="isActive" className="text-sm font-medium">
              Active School
            </Label>
            <p className="text-xs text-muted-foreground ml-auto">
              Inactive schools won't appear in selection lists
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !form.formState.isValid}
              className="min-w-[100px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                isEdit ? 'Update School' : 'Create School'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}