// components/roles/CreateRoleButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/rbac";

export default function CreateRoleButton() {
  const router = useRouter();

  return (
    <ActionButton
      resource="roles"
      action="CREATE"
      hideOnDenied
      onClick={() => router.push("/access/roles/create")}
      data-create-role-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Role
    </ActionButton>
  );
}
