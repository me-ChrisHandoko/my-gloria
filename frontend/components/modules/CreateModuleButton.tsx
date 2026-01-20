/**
 * Create Module Button Component
 */

"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateModuleButton() {
  const router = useRouter();

  return (
    <Button
      data-create-module-btn
      onClick={() => router.push("/access/modules/create")}
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Module
    </Button>
  );
}
