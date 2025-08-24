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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { PermissionAction, PermissionScope } from '@/types/permission';
import { useCheckPermissionMutation } from '@/store/api/permissionApi';
import { useGetUsersQuery } from '@/store/api/userApi';

const permissionSchema = z.object({
  resource: z.string().min(1, 'Resource is required'),
  action: z.nativeEnum(PermissionAction),
  scope: z.nativeEnum(PermissionScope).optional(),
});

const formSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  permissions: z.array(permissionSchema).min(1, 'At least one permission is required'),
});

interface BatchPermissionCheckProps {
  onClose: () => void;
}

export function BatchPermissionCheck({ onClose }: BatchPermissionCheckProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<Array<{ 
    permission: z.infer<typeof permissionSchema>;
    hasPermission: boolean;
    source?: string;
    roleName?: string;
  }> | null>(null);
  const { data: usersResponse } = useGetUsersQuery({});
  const users = usersResponse?.data || [];
  const [checkPermission] = useCheckPermissionMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId: '',
      permissions: [
        { resource: '', action: PermissionAction.READ, scope: PermissionScope.SELF }
      ],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    setResults(null);
    
    try {
      const checkResults = await Promise.all(
        values.permissions.map(async (permission) => {
          try {
            const result = await checkPermission({
              userId: values.userId,
              resource: permission.resource,
              action: permission.action,
              scope: permission.scope,
            }).unwrap();
            
            return {
              permission,
              hasPermission: result.hasPermission,
              source: result.source,
              roleName: result.roleName,
            };
          } catch (error) {
            return {
              permission,
              hasPermission: false,
              source: 'ERROR',
            };
          }
        })
      );
      
      setResults(checkResults);
      toast.success('Permission check completed');
    } catch (error: any) {
      console.error('Failed to check permissions:', error);
      toast.error('Failed to check permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPermission = () => {
    const currentPermissions = form.getValues('permissions');
    form.setValue('permissions', [
      ...currentPermissions,
      { resource: '', action: PermissionAction.READ, scope: PermissionScope.SELF }
    ]);
  };

  const removePermission = (index: number) => {
    const currentPermissions = form.getValues('permissions');
    form.setValue('permissions', currentPermissions.filter((_, i) => i !== index));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Batch Permission Check</DialogTitle>
          <DialogDescription>
            Check multiple permissions for a user at once.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.clerkUserId}>
                          {user.profile?.fullName || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Permissions to Check</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPermission}
                >
                  Add Permission
                </Button>
              </div>
              
              {form.watch('permissions').map((_, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name={`permissions.${index}.resource`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Resource</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., user, role" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`permissions.${index}.action`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Action</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(PermissionAction).map((action) => (
                                  <SelectItem key={action} value={action}>
                                    {action}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name={`permissions.${index}.scope`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Scope</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {Object.values(PermissionScope).map((scope) => (
                                  <SelectItem key={scope} value={scope}>
                                    {scope}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {form.watch('permissions').length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="mt-2"
                        onClick={() => removePermission(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {results && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Results</h4>
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-2">
                        {result.hasPermission ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <span className="text-sm">
                          {result.permission.resource}.{result.permission.action}
                          {result.permission.scope && ` (${result.permission.scope})`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.hasPermission && result.source && (
                          <>
                            <Badge variant="outline">{result.source}</Badge>
                            {result.roleName && (
                              <Badge variant="secondary">{result.roleName}</Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Close
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Check Permissions
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}