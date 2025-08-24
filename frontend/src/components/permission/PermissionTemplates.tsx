'use client';

import { useState } from 'react';
import { Plus, Edit, Trash, Copy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal } from 'lucide-react';

// Mock data for templates (replace with API call)
const mockTemplates = [
  {
    id: '1',
    name: 'Basic User',
    description: 'Standard permissions for regular users',
    permissions: [
      { resource: 'profile', action: 'READ', scope: 'SELF' },
      { resource: 'profile', action: 'UPDATE', scope: 'SELF' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Department Manager',
    description: 'Permissions for department managers',
    permissions: [
      { resource: 'user', action: 'READ', scope: 'DEPARTMENT' },
      { resource: 'user', action: 'UPDATE', scope: 'DEPARTMENT' },
      { resource: 'report', action: 'CREATE', scope: 'DEPARTMENT' },
      { resource: 'report', action: 'APPROVE', scope: 'DEPARTMENT' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'HR Administrator',
    description: 'Full access to HR functions',
    permissions: [
      { resource: 'user', action: 'CREATE', scope: 'ORGANIZATION' },
      { resource: 'user', action: 'READ', scope: 'ORGANIZATION' },
      { resource: 'user', action: 'UPDATE', scope: 'ORGANIZATION' },
      { resource: 'user', action: 'DELETE', scope: 'ORGANIZATION' },
      { resource: 'role', action: 'ASSIGN', scope: 'ORGANIZATION' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: Array<{
    resource: string;
    action: string;
    scope: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PermissionTemplatesProps {
  onCreateTemplate?: () => void;
  onEditTemplate?: (template: PermissionTemplate) => void;
  onApplyTemplate?: (template: PermissionTemplate) => void;
}

export function PermissionTemplates({
  onCreateTemplate,
  onEditTemplate,
  onApplyTemplate,
}: PermissionTemplatesProps) {
  const [templates] = useState<PermissionTemplate[]>(mockTemplates);
  const [isLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<PermissionTemplate | null>(null);

  const handleDelete = async () => {
    if (!templateToDelete) return;
    
    try {
      // TODO: Implement actual delete API call
      toast.success(`Template "${templateToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const handleDuplicate = async (template: PermissionTemplate) => {
    try {
      // TODO: Implement actual duplicate API call
      toast.success(`Template "${template.name}" duplicated successfully`);
    } catch (error) {
      toast.error('Failed to duplicate template');
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Permission Templates</h3>
            <p className="text-sm text-muted-foreground">
              Pre-defined permission sets for common roles
            </p>
          </div>
          {onCreateTemplate && (
            <Button onClick={onCreateTemplate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{template.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {onApplyTemplate && (
                        <DropdownMenuItem onClick={() => onApplyTemplate(template)}>
                          <Users className="mr-2 h-4 w-4" />
                          Apply to Users
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      {onEditTemplate && (
                        <DropdownMenuItem onClick={() => onEditTemplate(template)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          setTemplateToDelete(template);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm font-medium">
                    {template.permissions.length} Permissions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {template.permissions.slice(0, 3).map((perm, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {perm.resource}.{perm.action}
                      </Badge>
                    ))}
                    {template.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.permissions.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the template "{templateToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}