// components/positions/CreatePositionButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/rbac";

export default function CreatePositionButton() {
  const router = useRouter();

  return (
    <ActionButton
      resource="positions"
      action="CREATE"
      hideOnDenied
      onClick={() => router.push("/organization/positions/create")}
      data-create-position-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Posisi
    </ActionButton>
  );
}
