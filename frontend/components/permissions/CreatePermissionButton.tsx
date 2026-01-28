// components/permissions/CreatePermissionButton.tsx
"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreatePermissionButton() {
  return (
    <ActionLink
      href="/access/permissions/create"
      resource="permissions"
      action="CREATE"
      data-create-permission-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Permission
    </ActionLink>
  );
}
