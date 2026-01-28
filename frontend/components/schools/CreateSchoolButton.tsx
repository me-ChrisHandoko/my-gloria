// components/schools/CreateSchoolButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/rbac";

export default function CreateSchoolButton() {
  const router = useRouter();

  return (
    <ActionButton
      resource="schools"
      action="CREATE"
      hideOnDenied
      onClick={() => router.push("/organization/schools/create")}
      data-create-school-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Sekolah
    </ActionButton>
  );
}
