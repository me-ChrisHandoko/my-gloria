'use client';

import { useState } from 'react';
import { SchoolDataTable } from '@/components/organization/SchoolDataTable';
import { SchoolForm } from '@/components/organization/SchoolForm';
import { DepartmentTree } from '@/components/organization/DepartmentTree';
import { School } from '@/types/organization';

export default function SchoolsPage() {
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [isSchoolFormOpen, setIsSchoolFormOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);

  const handleAddSchool = () => {
    setEditingSchool(null);
    setIsSchoolFormOpen(true);
  };

  const handleEditSchool = (school: School) => {
    setEditingSchool(school);
    setIsSchoolFormOpen(true);
  };

  const handleViewSchool = (school: School) => {
    setSelectedSchool(school);
  };

  const handleCloseSchoolForm = () => {
    setIsSchoolFormOpen(false);
    setEditingSchool(null);
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
          <div>
            <h1 className="text-3xl font-bold">Schools Management</h1>
            <p className="text-muted-foreground">
              Manage your educational institutions and their departments
            </p>
          </div>

          <SchoolDataTable
            onAdd={handleAddSchool}
            onEdit={handleEditSchool}
            onView={handleViewSchool}
          />
          
          {selectedSchool && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">
                Departments in {selectedSchool.name}
              </h2>
              <DepartmentTree schoolId={selectedSchool.id} />
            </div>
          )}

          <SchoolForm
            school={editingSchool}
            open={isSchoolFormOpen}
            onClose={handleCloseSchoolForm}
          />
    </div>
  );
}