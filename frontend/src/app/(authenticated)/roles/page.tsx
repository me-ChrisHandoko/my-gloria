'use client';

import { RoleDataTable } from '@/components/permission/RoleDataTable';
import { useState } from 'react';
import { Role } from '@/types/permission';
import { RoleForm } from '@/components/permission/RoleForm';
import { RolePermissionAssignment } from '@/components/permission/RolePermissionAssignment';

export default function RolesPage() {
  const [showForm, setShowForm] = useState(false);
  const [showPermissionAssignment, setShowPermissionAssignment] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleAdd = () => {
    setSelectedRole(null);
    setShowForm(true);
  };

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setShowForm(true);
  };

  const handleAssignPermissions = (role: Role) => {
    setSelectedRole(role);
    setShowPermissionAssignment(true);
  };

  const handleClose = () => {
    setShowForm(false);
    setShowPermissionAssignment(false);
    setSelectedRole(null);
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">Role Management</h1>
        <p className="text-muted-foreground">
          Manage user roles and role-based permissions
        </p>
      </div>
      
      <RoleDataTable
        onAdd={handleAdd}
        onEdit={handleEdit}
        onAssignPermissions={handleAssignPermissions}
      />

      {showForm && (
        <RoleForm
          role={selectedRole}
          onClose={handleClose}
        />
      )}

      {showPermissionAssignment && selectedRole && (
        <RolePermissionAssignment
          role={selectedRole}
          onClose={handleClose}
        />
      )}
    </div>
  );
}