'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Shield, Lock } from 'lucide-react';
import { Role, Permission, RolePermissionDto } from '@/types/permission';
import {
  useGetPermissionsQuery,
  useGetRoleByIdQuery,
  useAssignPermissionsToRoleMutation,
  useRemovePermissionFromRoleMutation,
} from '@/store/api/permissionApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

interface RolePermissionAssignmentProps {
  role: Role;
  onClose: () => void;
}

export function RolePermissionAssignment({ role, onClose }: RolePermissionAssignmentProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  
  const { data: permissions = [], isLoading: loadingPermissions } = useGetPermissionsQuery({ isActive: true });
  const { data: roleDetails, isLoading: loadingRole } = useGetRoleByIdQuery(role.id);
  const [assignPermissions] = useAssignPermissionsToRoleMutation();
  const [removePermission] = useRemovePermissionFromRoleMutation();

  useEffect(() => {
    if (roleDetails?.permissions) {
      const currentPermissionIds = roleDetails.permissions.map(rp => rp.permissionId);
      setSelectedPermissions(new Set(currentPermissionIds));
    }
  }, [roleDetails]);

  const groupedPermissions = permissions.reduce((acc, permission) => {
    const resource = permission.resource;
    if (!acc[resource]) {
      acc[resource] = [];
    }
    acc[resource].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  const filteredGroupedPermissions = Object.entries(groupedPermissions).reduce((acc, [resource, perms]) => {
    const filtered = perms.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.resource.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filtered.length > 0) {
      acc[resource] = filtered;
    }
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleTogglePermission = (permissionId: string) => {
    const newSelected = new Set(selectedPermissions);
    if (newSelected.has(permissionId)) {
      newSelected.delete(permissionId);
    } else {
      newSelected.add(permissionId);
    }
    setSelectedPermissions(newSelected);
  };

  const handleToggleResourcePermissions = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    const resourcePermissionIds = resourcePermissions.map(p => p.id);
    const allSelected = resourcePermissionIds.every(id => selectedPermissions.has(id));
    
    const newSelected = new Set(selectedPermissions);
    if (allSelected) {
      resourcePermissionIds.forEach(id => newSelected.delete(id));
    } else {
      resourcePermissionIds.forEach(id => newSelected.add(id));
    }
    setSelectedPermissions(newSelected);
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const currentPermissionIds = roleDetails?.permissions?.map(rp => rp.permissionId) || [];
      const newPermissionIds = Array.from(selectedPermissions);
      
      // Find permissions to add and remove
      const toAdd = newPermissionIds.filter(id => !currentPermissionIds.includes(id));
      const toRemove = currentPermissionIds.filter(id => !newPermissionIds.includes(id));

      // Remove permissions
      for (const permissionId of toRemove) {
        await removePermission({ roleId: role.id, permissionId }).unwrap();
      }

      // Add new permissions
      if (toAdd.length > 0) {
        const permissionsToAssign: RolePermissionDto[] = toAdd.map(permissionId => ({
          permissionId,
        }));
        await assignPermissions({ roleId: role.id, permissions: permissionsToAssign }).unwrap();
      }

      toast.success('Permissions updated successfully');
      onClose();
    } catch (error: any) {
      console.error('Failed to update permissions:', error);
      toast.error(error?.data?.message || 'Failed to update permissions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading = loadingPermissions || loadingRole;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Manage Permissions for {role.name}
          </DialogTitle>
          <DialogDescription>
            Assign or remove permissions for this role. {role.isSystemRole && 
              <span className="text-yellow-600">This is a system role with restricted modifications.</span>
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="resources" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="resources">By Resource</TabsTrigger>
              <TabsTrigger value="all">All Permissions</TabsTrigger>
            </TabsList>
            
            <div className="mt-4 mb-2">
              <Input
                placeholder="Search permissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <TabsContent value="resources" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-4">
                  {Object.entries(filteredGroupedPermissions).map(([resource, perms]) => {
                    const resourcePermissionIds = perms.map(p => p.id);
                    const allSelected = resourcePermissionIds.every(id => selectedPermissions.has(id));
                    const someSelected = resourcePermissionIds.some(id => selectedPermissions.has(id)) && !allSelected;
                    
                    return (
                      <div key={resource} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => handleToggleResourcePermissions(resource)}
                            className="data-[state=checked]:bg-primary"
                            {...(someSelected && { checked: 'indeterminate' })}
                          />
                          <Badge variant="outline" className="font-semibold">
                            {resource}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({perms.length} permissions)
                          </span>
                        </div>
                        <div className="ml-6 grid grid-cols-2 gap-2">
                          {perms.map((permission) => (
                            <div key={permission.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedPermissions.has(permission.id)}
                                onCheckedChange={() => handleTogglePermission(permission.id)}
                                disabled={permission.isSystem && role.isSystemRole}
                              />
                              <label className="text-sm flex items-center gap-1 cursor-pointer">
                                {permission.isSystem && <Lock className="h-3 w-3" />}
                                {permission.name}
                                <Badge variant="secondary" className="ml-1 text-xs">
                                  {permission.action}
                                </Badge>
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="flex-1 overflow-hidden">
              <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-2">
                  {permissions
                    .filter(p => 
                      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.resource.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((permission) => (
                    <div key={permission.id} className="flex items-center gap-2 py-1">
                      <Checkbox
                        checked={selectedPermissions.has(permission.id)}
                        onCheckedChange={() => handleTogglePermission(permission.id)}
                        disabled={permission.isSystem && role.isSystemRole}
                      />
                      <label className="text-sm flex-1 flex items-center gap-2 cursor-pointer">
                        {permission.isSystem && <Lock className="h-3 w-3" />}
                        <span>{permission.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {permission.resource}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {permission.action}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {permission.scope}
                        </Badge>
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-muted-foreground">
              {selectedPermissions.size} permissions selected
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}