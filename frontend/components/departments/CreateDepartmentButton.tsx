// components/departments/CreateDepartmentButton.tsx
"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreateDepartmentButton() {
  return (
    <ActionLink
      href="/organization/departments/create"
      resource="departments"
      action="CREATE"
      data-create-department-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Departemen
    </ActionLink>
  );
}
