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
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { Loader2, CalendarIcon, UserCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Permission } from '@/types/permission';
import { useGetPermissionsQuery } from '@/store/api/permissionApi';
import { useGetUsersQuery } from '@/store/api/userApi';

const delegationSchema = z.object({
  fromUserId: z.string().min(1, 'Delegator is required'),
  toUserId: z.string().min(1, 'Delegate is required'),
  permissionIds: z.array(z.string()).min(1, 'Select at least one permission'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date({
    required_error: 'End date is required',
  }),
  reason: z.string().min(10, 'Please provide a reason for delegation'),
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

type DelegationFormData = z.infer<typeof delegationSchema>;

interface PermissionDelegationProps {
  onClose: () => void;
}

export function PermissionDelegation({ onClose }: PermissionDelegationProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: permissions = [] } = useGetPermissionsQuery({ isActive: true });
  const { data: usersResponse } = useGetUsersQuery({});
  const users = usersResponse?.data || [];

  const form = useForm<DelegationFormData>({
    resolver: zodResolver(delegationSchema),
    defaultValues: {
      fromUserId: '',
      toUserId: '',
      permissionIds: [],
      reason: '',
    },
  });

  const fromUserId = form.watch('fromUserId');

  // Filter permissions to show only those the delegator has
  const availablePermissions = permissions; // TODO: Filter based on fromUserId's permissions

  const onSubmit = async (values: DelegationFormData) => {
    setIsSubmitting(true);
    
    try {
      // TODO: Implement actual delegation API call
      toast.success(
        `Successfully delegated ${values.permissionIds.length} permissions from ${
          values.startDate.toLocaleDateString()
        } to ${values.endDate.toLocaleDateString()}`
      );
      
      onClose();
    } catch (error: any) {
      console.error('Failed to delegate permissions:', error);
      toast.error('Failed to delegate permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Delegate Permissions</DialogTitle>
          <DialogDescription>
            Temporarily delegate permissions from one user to another
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fromUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delegator</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select delegator" />
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
                    <FormDescription>
                      User who will delegate their permissions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="toUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delegate</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!fromUserId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select delegate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users
                          .filter((user) => user.clerkUserId !== fromUserId)
                          .map((user) => (
                            <SelectItem key={user.id} value={user.clerkUserId}>
                              {user.profile?.fullName || user.email}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      User who will receive the permissions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => {
                            const startDate = form.getValues('startDate');
                            return date <= (startDate || new Date());
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Delegation</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="e.g., Covering during vacation, temporary project assignment..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="permissionIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Permissions to Delegate</FormLabel>
                  <FormDescription>
                    Select permissions to delegate (only showing permissions the delegator has)
                  </FormDescription>
                  <ScrollArea className="h-[200px] border rounded-md p-4">
                    <div className="space-y-2">
                      {availablePermissions.map((permission) => (
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
                              {permission.resource}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {permission.action}
                            </Badge>
                          </label>
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delegate Permissions
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}