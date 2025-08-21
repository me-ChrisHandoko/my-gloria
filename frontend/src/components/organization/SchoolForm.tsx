'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  useCreateSchoolMutation,
  useUpdateSchoolMutation,
  useGetAvailableSchoolCodesQuery,
} from '@/store/api/organizationApi';
import { School, CreateSchoolDto, UpdateSchoolDto } from '@/types/organization';

interface SchoolFormProps {
  school?: School | null;
  open: boolean;
  onClose: () => void;
}

export function SchoolForm({ school, open, onClose }: SchoolFormProps) {
  const [createSchool, { isLoading: isCreating }] = useCreateSchoolMutation();
  const [updateSchool, { isLoading: isUpdating }] = useUpdateSchoolMutation();
  const { data: availableSchoolCodes, isLoading: isLoadingCodes } = useGetAvailableSchoolCodesQuery();

  const [formData, setFormData] = useState<CreateSchoolDto>({
    code: '',
    name: '',
    lokasi: '',
    address: '',
    phone: '',
    email: '',
    principal: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (school) {
      setFormData({
        code: school.code,
        name: school.name,
        lokasi: school.lokasi || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        principal: school.principal || '',
        isActive: school.isActive,
      });
    } else {
      setFormData({
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
    setErrors({});
  }, [school, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.code) {
      newErrors.code = 'School code is required';
    } else if (formData.code.length < 2 || formData.code.length > 10) {
      newErrors.code = 'School code must be between 2 and 10 characters';
    }

    if (!formData.name) {
      newErrors.name = 'School name is required';
    } else if (formData.name.length > 100) {
      newErrors.name = 'School name must not exceed 100 characters';
    }

    // Only validate email if it has actual content (not just whitespace)
    const trimmedEmail = formData.email?.trim();
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Clean form data by converting empty strings to undefined for optional fields
  const cleanFormData = (data: CreateSchoolDto): CreateSchoolDto => {
    const cleaned = { ...data };
    
    // List of optional fields that should be undefined if empty
    const optionalFields: (keyof CreateSchoolDto)[] = [
      'lokasi', 'address', 'phone', 'email', 'principal'
    ];
    
    optionalFields.forEach(field => {
      const value = cleaned[field];
      // Trim string values
      const trimmedValue = typeof value === 'string' ? value.trim() : value;
      
      // Convert empty strings, null, or whitespace-only strings to undefined
      if (!trimmedValue || trimmedValue === '') {
        (cleaned as any)[field] = undefined;
      } else {
        // Update with trimmed value
        (cleaned as any)[field] = trimmedValue;
      }
    });
    
    // Also trim required string fields
    if (cleaned.code) cleaned.code = cleaned.code.trim();
    if (cleaned.name) cleaned.name = cleaned.name.trim();
    
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean the form data before submission
    const cleanedData = cleanFormData(formData);
    
    console.log('🔍 Submitting school data:', {
      isUpdate: !!school,
      schoolId: school?.id,
      cleanedData,
      rawFormData: formData
    });

    try {
      if (school) {
        console.log('📤 Sending update request:', {
          id: school.id,
          data: cleanedData as UpdateSchoolDto,
        });
        await updateSchool({
          id: school.id,
          data: cleanedData as UpdateSchoolDto,
        }).unwrap();
        toast.success('School updated successfully');
      } else {
        await createSchool(cleanedData).unwrap();
        toast.success('School created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('❌ Failed to save school:', error);
      console.error('Error details:', {
        status: error?.status,
        data: error?.data,
        message: error?.data?.message,
        fullError: error
      });
      
      // Parse error message for better user experience
      let errorMessage = 'Failed to save school';
      
      if (error?.data?.message) {
        // Check for specific error types
        if (error.data.message.includes('Unique constraint failed') && error.data.message.includes('code')) {
          errorMessage = 'School code already exists. Please use a different code.';
        } else if (error.data.message.includes('Unique constraint failed') && error.data.message.includes('name')) {
          errorMessage = 'School name already exists. Please use a different name.';
        } else if (error.data.message.includes('not found')) {
          errorMessage = 'School not found. Please refresh and try again.';
        } else if (error.data.message.includes('Access denied')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.data.message.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else {
          // For other errors, try to extract a cleaner message
          const cleanMessage = error.data.message
            .replace(/\\x1B\[[0-9;]*m/g, '') // Remove ANSI color codes
            .replace(/\n/g, ' ') // Remove newlines
            .split('Unique constraint')[0] // Take only the first part if it's a constraint error
            .trim();
          
          errorMessage = cleanMessage || 'An unexpected error occurred. Please try again.';
        }
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error?.status === 404) {
        errorMessage = 'School not found. It may have been deleted.';
      } else if (error?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your input.';
      }
      
      toast.error(errorMessage);
      
      // Also set error for form display if needed
      if (error.data?.message) {
        setErrors({ submit: error.data.message });
      }
    }
  };

  const handleInputChange = (field: keyof CreateSchoolDto, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const isLoading = isCreating || isUpdating;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{school ? 'Edit School' : 'Create School'}</DialogTitle>
          <DialogDescription>
            {school
              ? 'Update the school information below.'
              : 'Fill in the information to create a new school.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">
                  School Code <span className="text-red-500">*</span>
                </Label>
                {!!school ? (
                  <Input
                    id="code"
                    value={formData.code}
                    disabled={true}
                    className={errors.code ? 'border-red-500' : ''}
                  />
                ) : (
                  <Combobox
                    options={availableSchoolCodes || []}
                    value={formData.code}
                    onValueChange={(value) => handleInputChange('code', value)}
                    placeholder={isLoadingCodes ? "Loading..." : "Select school code"}
                    searchPlaceholder="Search school code..."
                    emptyMessage="No school code found."
                    disabled={isLoadingCodes || !!school}
                    className={errors.code ? 'border-red-500' : ''}
                    maxHeight="250px"
                  />
                )}
                {errors.code && (
                  <p className="text-xs text-red-500">{errors.code}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">
                  School Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., SD Gloria 1"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lokasi">Location</Label>
                <Input
                  id="lokasi"
                  value={formData.lokasi}
                  onChange={(e) => handleInputChange('lokasi', e.target.value)}
                  placeholder="e.g., LOC01"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="principal">Principal</Label>
                <Input
                  id="principal"
                  value={formData.principal}
                  onChange={(e) => handleInputChange('principal', e.target.value)}
                  placeholder="Principal name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="School address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="e.g., 021-12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="e.g., school@gloria.sch.id"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  handleInputChange('isActive', checked)
                }
              />
              <Label htmlFor="isActive">Active</Label>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : school ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}