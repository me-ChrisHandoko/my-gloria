'use client';

import { useState } from 'react';
import { PositionDataTable } from '@/components/organization/PositionDataTable';
import { PositionForm } from '@/components/organization/PositionForm';
import { Position } from '@/types/organization';
import { useDebugAuth } from '@/hooks/useDebugAuth';

export default function PositionsPage() {
  useDebugAuth(); // Debug authentication state
  const [isPositionFormOpen, setIsPositionFormOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);

  const handleAddPosition = () => {
    setEditingPosition(null);
    setIsPositionFormOpen(true);
  };

  const handleEditPosition = (position: Position) => {
    setEditingPosition(position);
    setIsPositionFormOpen(true);
  };

  const handleViewPosition = (position: Position) => {
    // TODO: Implement view details modal or redirect to detail page
    console.log('View position:', position);
  };

  const handleClosePositionForm = () => {
    setIsPositionFormOpen(false);
    setEditingPosition(null);
  };

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">Positions Management</h1>
        <p className="text-muted-foreground">
          Manage job positions and roles within your organization
        </p>
      </div>

      <PositionDataTable
        onAdd={handleAddPosition}
        onEdit={handleEditPosition}
        onView={handleViewPosition}
      />

      <PositionForm
        position={editingPosition}
        open={isPositionFormOpen}
        onClose={handleClosePositionForm}
      />
    </div>
  );
}