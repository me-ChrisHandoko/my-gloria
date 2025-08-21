'use client';

import { PermissionDataTable } from '@/components/permission/PermissionDataTable';
import { useState } from 'react';
import { Permission } from '@/types/permission';
import { PermissionForm } from '@/components/permission/PermissionForm';

export default function PermissionsPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);

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
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">Permission Management</h1>
        <p className="text-muted-foreground">
          Manage system permissions and access controls
        </p>
      </div>
      
      <PermissionDataTable
        onAdd={handleAdd}
        onEdit={handleEdit}
      />

      {showForm && (
        <PermissionForm
          permission={selectedPermission}
          onClose={handleClose}
        />
      )}
    </div>
  );
}