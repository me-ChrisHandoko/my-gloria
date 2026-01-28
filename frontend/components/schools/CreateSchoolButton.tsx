// components/schools/CreateSchoolButton.tsx
"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreateSchoolButton() {
  return (
    <ActionLink
      href="/organization/schools/create"
      resource="schools"
      action="CREATE"
      data-create-school-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Sekolah
    </ActionLink>
  );
}
