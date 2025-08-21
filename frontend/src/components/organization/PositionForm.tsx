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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  useCreatePositionMutation,
  useUpdatePositionMutation,
  useGetSchoolsQuery,
  useGetDepartmentsQuery,
} from '@/store/api/organizationApi';
import { Position } from '@/types/organization';
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
  schoolId: z.string().optional().nullable().transform((val) => {
    if (!val || val === 'none' || val === '') return undefined;
    return val;
  }),
  departmentId: z.string().optional().nullable().transform((val) => {
    if (!val || val === 'none' || val === '') return undefined;
    return val;
  }),
  hierarchyLevel: z.coerce.number()
    .min(1, 'Hierarchy level must be at least 1')
    .max(10, 'Hierarchy level cannot exceed 10'),
  maxHolders: z.coerce.number()
    .min(1, 'Maximum holders must be at least 1')
    .max(100, 'Maximum holders cannot exceed 100')
    .optional()
    .default(1),
  isUnique: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type FormData = z.infer<typeof formSchema>;

interface PositionFormProps {
  position?: Position | null;
  open: boolean;
  onClose: () => void;
  schoolId?: string;
  departmentId?: string;
}

export function PositionForm({ 
  position, 
  open, 
  onClose, 
  schoolId: defaultSchoolId,
  departmentId: defaultDepartmentId 
}: PositionFormProps) {
  const [createPosition, { isLoading: isCreating }] = useCreatePositionMutation();
  const [updatePosition, { isLoading: isUpdating }] = useUpdatePositionMutation();
  const { data: schools = [] } = useGetSchoolsQuery({});
  const { data: departments = [] } = useGetDepartmentsQuery({});
  
  const isLoading = isCreating || isUpdating;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: '',
      name: '',
      schoolId: defaultSchoolId || undefined,
      departmentId: defaultDepartmentId || undefined,
      hierarchyLevel: 1,
      maxHolders: 1,
      isUnique: false,
      isActive: true,
    },
  });

  useEffect(() => {
    if (position) {
      form.reset({
        code: position.code,
        name: position.name,
        schoolId: position.schoolId || undefined,
        departmentId: position.departmentId || undefined,
        hierarchyLevel: position.hierarchyLevel,
        maxHolders: position.maxHolders,
        isUnique: position.isUnique,
        isActive: position.isActive,
      });
    } else {
      form.reset({
        code: '',
        name: '',
        schoolId: defaultSchoolId || undefined,
        departmentId: defaultDepartmentId || undefined,
        hierarchyLevel: 1,
        maxHolders: 1,
        isUnique: false,
        isActive: true,
      });
    }
  }, [position, form, defaultSchoolId, defaultDepartmentId]);

  const onSubmit = async (data: FormData) => {
    try {
      const cleanedData: any = {
        code: data.code,
        name: data.name,
        hierarchyLevel: data.hierarchyLevel,
        maxHolders: data.isUnique ? 1 : (data.maxHolders || 1),
        isUnique: data.isUnique,
        isActive: data.isActive,
      };

      // Only add optional fields if they have valid UUID values (not 'none')
      if (data.schoolId && data.schoolId !== 'none') {
        cleanedData.schoolId = data.schoolId;
      }
      if (data.departmentId && data.departmentId !== 'none') {
        cleanedData.departmentId = data.departmentId;
      }

      // Debug log to see what's being sent
      console.log('Submitting position data:', cleanedData);

      if (position) {
        await updatePosition({
          id: position.id,
          data: cleanedData,
        }).unwrap();
        toast.success('Position updated successfully');
      } else {
        await createPosition(cleanedData).unwrap();
        toast.success('Position created successfully');
      }
      onClose();
      form.reset();
    } catch (error: any) {
      console.error('Failed to save position:', error);
      
      // Parse error message for better user experience
      let errorMessage = 'Failed to save position';
      
      if (error?.data?.message) {
        if (error.data.message.includes('Unique constraint failed') && error.data.message.includes('code')) {
          errorMessage = 'Position code already exists. Please use a different code.';
        } else if (error.data.message.includes('Unique constraint failed') && error.data.message.includes('name')) {
          errorMessage = 'Position name already exists. Please use a different name.';
        } else if (error.data.message.includes('not found')) {
          errorMessage = 'Position not found. Please refresh and try again.';
        } else if (error.data.message.includes('Access denied')) {
          errorMessage = 'You do not have permission to perform this action.';
        } else if (error.data.message.includes('validation')) {
          errorMessage = 'Please check your input and try again.';
        } else {
          const cleanMessage = error.data.message
            .replace(/\\x1B\[[0-9;]*m/g, '')
            .replace(/\n/g, ' ')
            .split('Unique constraint')[0]
            .trim();
          
          errorMessage = cleanMessage || 'An unexpected error occurred. Please try again.';
        }
      } else if (error?.status === 500) {
        errorMessage = 'Server error occurred. Please try again later.';
      } else if (error?.status === 404) {
        errorMessage = 'Position not found. It may have been deleted.';
      } else if (error?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error?.status === 400) {
        errorMessage = 'Invalid data provided. Please check your input.';
      }
      
      toast.error(errorMessage);
    }
  };

  const isUniqueValue = form.watch('isUnique');

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{position ? 'Edit Position' : 'Create Position'}</DialogTitle>
          <DialogDescription>
            {position
              ? 'Update the position information below.'
              : 'Fill in the information to create a new position.'}
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
                        placeholder="POS001" 
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '');
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique position code
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
                      <Input placeholder="Manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const newValue = value === 'none' ? undefined : value;
                        field.onChange(newValue);
                      }} 
                      value={field.value || 'none'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Department this position belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="schoolId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        const newValue = value === 'none' ? undefined : value;
                        field.onChange(newValue);
                      }} 
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
                      School this position belongs to
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hierarchyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hierarchy Level *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="10"
                        placeholder="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      Position level in hierarchy (1-10)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxHolders"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Holders</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1" 
                        max="100"
                        placeholder="1" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        disabled={isUniqueValue}
                      />
                    </FormControl>
                    <FormDescription>
                      Max number of people in this position
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isUnique"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Unique Position</FormLabel>
                    <FormDescription>
                      Only one person can hold this position at a time
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

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Set whether this position is currently active
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
                {position ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}