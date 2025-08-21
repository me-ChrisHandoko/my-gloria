'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DepartmentDataTable } from '@/components/organization/DepartmentDataTable';
import { DepartmentTree } from '@/components/organization/DepartmentTree';
import { DepartmentForm } from '@/components/organization/DepartmentForm';
import { Department } from '@/types/organization';
import { Table, TreePine } from 'lucide-react';

export default function DepartmentsPage() {
  const [isDepartmentFormOpen, setIsDepartmentFormOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [parentDepartmentId, setParentDepartmentId] = useState<string | undefined>();

  const handleAddDepartment = (parentId?: string) => {
    setEditingDepartment(null);
    setParentDepartmentId(parentId);
    setIsDepartmentFormOpen(true);
  };

  const handleEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    setParentDepartmentId(department.parentId);
    setIsDepartmentFormOpen(true);
  };

  const handleViewDepartment = (department: Department) => {
    // TODO: Implement view details modal or redirect to detail page
    console.log('View department:', department);
  };

  const handleCloseDepartmentForm = () => {
    setIsDepartmentFormOpen(false);
    setEditingDepartment(null);
    setParentDepartmentId(undefined);
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">Departments Management</h1>
        <p className="text-muted-foreground">
          Manage organizational departments and their structure
        </p>
      </div>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="table" className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="tree" className="flex items-center gap-2">
            <TreePine className="h-4 w-4" />
            Tree View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="mt-4">
          <DepartmentDataTable
            onAdd={() => handleAddDepartment()}
            onEdit={handleEditDepartment}
            onView={handleViewDepartment}
          />
        </TabsContent>

        <TabsContent value="tree" className="mt-4">
          <DepartmentTree
            onEdit={handleEditDepartment}
            onAdd={handleAddDepartment}
          />
        </TabsContent>
      </Tabs>

      <DepartmentForm
        department={editingDepartment}
        open={isDepartmentFormOpen}
        onClose={handleCloseDepartmentForm}
        parentId={parentDepartmentId}
      />
    </div>
  );
}