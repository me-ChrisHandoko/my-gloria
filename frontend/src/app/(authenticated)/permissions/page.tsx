'use client';

import { PermissionDataTable } from '@/components/permission/PermissionDataTable';
import { PermissionTemplates } from '@/components/permission/PermissionTemplates';
import { PermissionAnalytics } from '@/components/permission/PermissionAnalytics';
import { BatchPermissionCheck } from '@/components/permission/BatchPermissionCheck';
import { BulkPermissionOperations } from '@/components/permission/BulkPermissionOperations';
import { useState } from 'react';
import { Permission } from '@/types/permission';
import { PermissionForm } from '@/components/permission/PermissionForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Shield, 
  BarChart3, 
  FileText, 
  CheckCircle,
  Users,
  Settings
} from 'lucide-react';

export default function PermissionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [showBatchCheck, setShowBatchCheck] = useState(false);
  const [showBulkOperations, setShowBulkOperations] = useState(false);

  const handleAdd = () => {
    setSelectedPermission(null);
    setShowForm(true);
  };

  const handleEdit = (permission: Permission) => {
    setSelectedPermission(permission);
    setShowForm(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedPermission(null);
  };

  return (
    <div className="container mx-auto flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Permission Management</h1>
          <p className="text-muted-foreground">
            Manage system permissions, roles, and access controls
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBatchCheck(true)}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Check Permissions
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowBulkOperations(true)}
          >
            <Users className="mr-2 h-4 w-4" />
            Bulk Operations
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="permissions" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Permissions
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="space-y-4">
          <PermissionDataTable
            onAdd={handleAdd}
            onEdit={handleEdit}
          />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <PermissionTemplates
            onCreateTemplate={() => {
              // TODO: Implement template creation
              console.log('Create template');
            }}
            onEditTemplate={(template) => {
              // TODO: Implement template editing
              console.log('Edit template', template);
            }}
            onApplyTemplate={(template) => {
              // TODO: Implement template application
              console.log('Apply template', template);
            }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <PermissionAnalytics />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <div className="text-center py-12 text-muted-foreground">
            Permission settings coming soon...
          </div>
        </TabsContent>
      </Tabs>

      {showForm && (
        <PermissionForm
          permission={selectedPermission}
          onClose={handleClose}
        />
      )}

      {showBatchCheck && (
        <BatchPermissionCheck
          onClose={() => setShowBatchCheck(false)}
        />
      )}

      {showBulkOperations && (
        <BulkPermissionOperations
          onClose={() => setShowBulkOperations(false)}
        />
      )}
    </div>
  );
}