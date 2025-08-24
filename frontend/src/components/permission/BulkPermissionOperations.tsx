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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, UserPlus, UserMinus, Shield } from 'lucide-react';
import { Permission, Role } from '@/types/permission';
import { 
  useGetPermissionsQuery, 
  useGetRolesQuery
} from '@/store/api/permissionApi';
import { useGetUsersQuery } from '@/store/api/userApi';

const bulkGrantSchema = z.object({
  operation: z.enum(['grant', 'revoke']),
  targetType: z.enum(['users', 'role']),
  userIds: z.array(z.string()).optional(),
  roleId: z.string().optional(),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
  reason: z.string().optional(),
});

type BulkGrantFormData = z.infer<typeof bulkGrantSchema>;

interface BulkPermissionOperationsProps {
  onClose: () => void;
}

export function BulkPermissionOperations({ onClose }: BulkPermissionOperationsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: permissions = [] } = useGetPermissionsQuery({ isActive: true });
  const { data: roles = [] } = useGetRolesQuery({ isActive: true });
  const { data: usersResponse } = useGetUsersQuery({});
  const users = usersResponse?.data || [];

  const form = useForm<BulkGrantFormData>({
    resolver: zodResolver(bulkGrantSchema),
    defaultValues: {
      operation: 'grant',
      targetType: 'users',
      userIds: [],
      permissionIds: [],
    },
  });

  const operation = form.watch('operation');
  const targetType = form.watch('targetType');

  const onSubmit = async (values: BulkGrantFormData) => {
    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual bulk operations API calls
      const targetCount = targetType === 'users' ? values.userIds?.length : 1;
      const permissionCount = values.permissionIds.length;
      
      toast.success(
        `Successfully ${operation === 'grant' ? 'granted' : 'revoked'} ${permissionCount} permissions ${
          operation === 'grant' ? 'to' : 'from'
        } ${targetCount} ${targetType === 'users' ? 'users' : 'role'}`
      );
      
      onClose();
    } catch (error: any) {
      console.error('Failed to perform bulk operation:', error);
      toast.error('Failed to perform bulk operation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group permissions by resource
  const groupedPermissions = permissions.reduce((acc, permission) => {
    if (!acc[permission.resource]) {
      acc[permission.resource] = [];
    }
    acc[permission.resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Bulk Permission Operations</DialogTitle>
          <DialogDescription>
            Grant or revoke multiple permissions at once
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="operation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operation</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-row space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="grant" id="grant" />
                        <label
                          htmlFor="grant"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <UserPlus className="h-4 w-4 text-green-600" />
                          Grant Permissions
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="revoke" id="revoke" />
                        <label
                          htmlFor="revoke"
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <UserMinus className="h-4 w-4 text-red-600" />
                          Revoke Permissions
                        </label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Tabs value={targetType} onValueChange={(value) => form.setValue('targetType', value as any)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="users">Multiple Users</TabsTrigger>
                <TabsTrigger value="role">Single Role</TabsTrigger>
              </TabsList>
              
              <TabsContent value="users" className="space-y-4">
                <FormField
                  control={form.control}
                  name="userIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Users</FormLabel>
                      <FormDescription>
                        Choose users to {operation} permissions
                      </FormDescription>
                      <ScrollArea className="h-[200px] border rounded-md p-4">
                        <div className="space-y-2">
                          {users.map((user) => (
                            <div key={user.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={field.value?.includes(user.clerkUserId)}
                                onCheckedChange={(checked) => {
                                  const currentValue = field.value || [];
                                  if (checked) {
                                    field.onChange([...currentValue, user.clerkUserId]);
                                  } else {
                                    field.onChange(
                                      currentValue.filter((id) => id !== user.clerkUserId)
                                    );
                                  }
                                }}
                              />
                              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {user.profile?.fullName || user.email}
                              </label>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
              
              <TabsContent value="role" className="space-y-4">
                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Role</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <FormField
              control={form.control}
              name="permissionIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Permissions</FormLabel>
                  <FormDescription>
                    Choose permissions to {operation}
                  </FormDescription>
                  <ScrollArea className="h-[250px] border rounded-md p-4">
                    <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(([resource, perms]) => (
                        <div key={resource} className="space-y-2">
                          <div className="flex items-center gap-2 font-medium">
                            <Shield className="h-4 w-4" />
                            {resource}
                          </div>
                          <div className="ml-6 space-y-2">
                            {perms.map((permission) => (
                              <div key={permission.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(permission.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, permission.id]);
                                    } else {
                                      field.onChange(
                                        currentValue.filter((id) => id !== permission.id)
                                      );
                                    }
                                  }}
                                />
                                <label className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                  {permission.name}
                                  <Badge variant="outline" className="text-xs">
                                    {permission.action}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {permission.scope}
                                  </Badge>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <FormMessage />
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
              <Button 
                type="submit" 
                disabled={isSubmitting}
                variant={operation === 'grant' ? 'default' : 'destructive'}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {operation === 'grant' ? 'Grant' : 'Revoke'} Permissions
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}