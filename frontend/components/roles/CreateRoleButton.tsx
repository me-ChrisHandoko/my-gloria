// components/roles/CreateRoleButton.tsx
"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreateRoleButton() {
  return (
    <ActionLink
      href="/access/roles/create"
      resource="roles"
      action="CREATE"
      data-create-role-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Role
    </ActionLink>
  );
}
