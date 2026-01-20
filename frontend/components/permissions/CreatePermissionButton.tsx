// components/permissions/CreatePermissionButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatePermissionButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/access/permissions/create")}
      data-create-permission-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Permission
    </Button>
  );
}
