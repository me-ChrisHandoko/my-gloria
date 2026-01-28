// components/positions/CreatePositionButton.tsx
"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreatePositionButton() {
  return (
    <ActionLink
      href="/organization/positions/create"
      resource="positions"
      action="CREATE"
      data-create-position-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Posisi
    </ActionLink>
  );
}
