// components/departments/CreateDepartmentButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/rbac";

export default function CreateDepartmentButton() {
  const router = useRouter();

  return (
    <ActionButton
      resource="departments"
      action="CREATE"
      hideOnDenied
      onClick={() => router.push("/organization/departments/create")}
      data-create-department-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Departemen
    </ActionButton>
  );
}
