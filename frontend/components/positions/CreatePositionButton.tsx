// components/positions/CreatePositionButton.tsx
"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreatePositionButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/organization/positions/create")}
      data-create-position-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Posisi
    </Button>
  );
}
