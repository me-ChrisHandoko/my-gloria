'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useGetSchoolsQuery,
  useGetDepartmentsQuery,
} from '@/store/api/organizationApi';
import { Department } from '@/types/organization';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  code: z.string()
    .min(1, 'Code is required')
    .max(50, 'Code must be less than 50 characters')
    .regex(/^[A-Z0-9_-]+$/i, 'Code can only contain letters, numbers, hyphens, and underscores'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  schoolId: z.string().optional().transform((val) => val === 'none' ? undefined : val),
  parentId: z.string().optional().transform((val) => val === 'none' ? undefined : val),
  bagianKerja: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface DepartmentFormProps {
  department?: Department | null;
  open: boolean;
  onClose: () => void;
  schoolId?: string;
  parentId?: string;
}

export function DepartmentForm({ 
  department, 
  open, 
  onClose, 
  schoolId: defaultSchoolId,
  parentId: defaultParentId 
}: DepartmentFormProps) {
  const [createDepartment, { isLoading: isCreating }] = useCreateDepartmentMutation();
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();
  const { data: schools = [] } = useGetSchoolsQuery({});
  const { data: departments = [] } = useGetDepartmentsQuery({});
  
  const isLoading = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      schoolId: defaultSchoolId || 'none',
      parentId: defaultParentId || 'none',
      bagianKerja: '',
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (department) {
      form.reset({
        code: department.code,
        name: department.name,
        schoolId: department.schoolId || 'none',
        parentId: department.parentId || 'none',
        bagianKerja: department.bagianKerja || '',
        description: department.description || '',
        isActive: department.isActive,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        schoolId: defaultSchoolId || 'none',
        parentId: defaultParentId || 'none',
        bagianKerja: '',
        description: '',
        isActive: true,
      });
    }
  }, [department, form, defaultSchoolId, defaultParentId]);

  const onSubmit = async (data: FormData) => {
    try {
      console.log('Form data after validation:', data);
      
      // Build the data object, excluding undefined values
      const cleanedData: any = {
        code: data.code,
        name: data.name,
        isActive: data.isActive,
      };

      // Only add optional fields if they have values
      if (data.schoolId) {
        cleanedData.schoolId = data.schoolId;
      }
      if (data.parentId) {
        cleanedData.parentId = data.parentId;
      }
      if (data.bagianKerja) {
        cleanedData.bagianKerja = data.bagianKerja;
      }
      if (data.description) {
        cleanedData.description = data.description;
      }

      console.log('Final data to be sent:', cleanedData);

      if (department) {
        await updateDepartment({
          id: department.id,
          data: cleanedData,
        }).unwrap();
        toast.success('Department updated successfully');
      } else {
        await createDepartment(cleanedData).unwrap();
        toast.success('Department created successfully');
      }
      onClose();
      form.reset();
    } catch (error: any) {
      console.error('Failed to save department:', error);
      
      // Parse error message for better user experience
      let errorMessage = 'Failed to save department';
      
      if (error?.data?.message) {
        // Check for specific error types
        if (error.data.message.includes('Unique constraint failed') && error.data.message.includes('code')) {
          errorMessage = 'Department code already exists. Please use a different code.';
        } else if (error.data.message.includes('Unique constraint failed') && error.data.message.includes('name')) {
          errorMessage = 'Department name already exists. Please use a different name.';
        } else if (error.data.message.includes('not found')) {
          errorMessage = 'Department not found. Please refresh and try again.';
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
        errorMessage = 'Department not found. It may have been deleted.';
      } else if (error?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your input.';
      }
      
      toast.error(errorMessage);
    }
  };

  // Filter out current department from parent options
  const parentOptions = departments.filter(d => d.id !== department?.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{department ? 'Edit Department' : 'Create Department'}</DialogTitle>
          <DialogDescription>
            {department
              ? 'Update the department information below.'
              : 'Fill in the information to create a new department.'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="DEPT001" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          // Convert to uppercase and remove invalid characters
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique code (letters, numbers, hyphens, underscores only)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Finance Department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The school this department belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Department</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None (Root Department)</SelectItem>
                        {parentOptions.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Parent department in the hierarchy
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bagianKerja"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bagian Kerja</FormLabel>
                  <FormControl>
                    <Input placeholder="Work division code" {...field} />
                  </FormControl>
                  <FormDescription>
                    Maps to data_karyawan.bagian_kerja
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Department description..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Set whether this department is currently active
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {department ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}