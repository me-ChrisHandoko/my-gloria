'use client';

import { useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Role,
  CreateRoleDto,
  UpdateRoleDto,
} from '@/types/permission';
import {
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useGetRolesQuery,
} from '@/store/api/permissionApi';

const formSchema = z.object({
  code: z.string().min(1, 'Code is required').max(100),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().optional(),
  parentRoleId: z.string().optional(),
  hierarchyLevel: z.number().min(0).max(10),
  isActive: z.boolean().default(true),
});

interface RoleFormProps {
  role?: Role | null;
  onClose: () => void;
}

export function RoleForm({ role, onClose }: RoleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: roles = [] } = useGetRolesQuery();
  const [createRole] = useCreateRoleMutation();
  const [updateRole] = useUpdateRoleMutation();

  const availableParentRoles = roles.filter(r => 
    r.id !== role?.id && 
    (!role || r.hierarchyLevel < (role?.hierarchyLevel || 0))
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: role?.code || '',
      name: role?.name || '',
      description: role?.description || '',
      parentRoleId: role?.parentRoleId || '',
      hierarchyLevel: role?.hierarchyLevel || 1,
      isActive: role?.isActive ?? true,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      if (role) {
        // Update existing role
        const updateData: UpdateRoleDto = {
          name: values.name,
          description: values.description,
          parentRoleId: values.parentRoleId,
          hierarchyLevel: values.hierarchyLevel,
          isActive: values.isActive,
        };
        await updateRole({ id: role.id, data: updateData }).unwrap();
        toast.success('Role updated successfully');
      } else {
        // Create new role
        const createData: CreateRoleDto = {
          code: values.code,
          name: values.name,
          description: values.description,
          parentRoleId: values.parentRoleId,
          hierarchyLevel: values.hierarchyLevel,
          isActive: values.isActive,
        };
        await createRole(createData).unwrap();
        toast.success('Role created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to save role:', error);
      toast.error(error?.data?.message || 'Failed to save role');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {role ? 'Edit Role' : 'Create New Role'}
          </DialogTitle>
          <DialogDescription>
            {role
              ? 'Update the role details below.'
              : 'Fill in the details to create a new role.'}
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
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="role.code"
                        disabled={!!role}
                      />
                    </FormControl>
                    <FormDescription>
                      Unique identifier for the role
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Role Name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Role description..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="parentRoleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Role</FormLabel>
                    <Select
                      value={field.value || 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? '' : value)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select parent role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Parent</SelectItem>
                        {availableParentRoles.map((parentRole) => (
                          <SelectItem key={parentRole.id} value={parentRole.id}>
                            {parentRole.name} (Level {parentRole.hierarchyLevel})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Optional parent role for inheritance
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hierarchyLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hierarchy Level</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">0 - System</SelectItem>
                        <SelectItem value="1">1 - Organization</SelectItem>
                        <SelectItem value="2">2 - School</SelectItem>
                        <SelectItem value="3">3 - Department</SelectItem>
                        <SelectItem value="4">4 - Team</SelectItem>
                        <SelectItem value="5">5 - Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Role hierarchy level
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable or disable this role
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
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {role ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}