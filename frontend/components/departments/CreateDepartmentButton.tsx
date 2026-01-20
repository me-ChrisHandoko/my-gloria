// components/departments/CreateDepartmentButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateDepartmentButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/organization/departments/create")}
      data-create-department-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Departemen
    </Button>
  );
}
