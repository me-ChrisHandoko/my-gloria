// components/schools/CreateSchoolButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateSchoolButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/organization/schools/create")}
      data-create-school-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Sekolah
    </Button>
  );
}
