// components/workflow-rules/CreateWorkflowRuleButton.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateWorkflowRuleButton() {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <Link href="/workflow/rules/bulk">
        <Button variant="outline">
          <Layers className="mr-2 h-4 w-4" />
          Bulk Create
        </Button>
      </Link>
      <Button
        onClick={() => router.push("/workflow/rules/create")}
        data-create-workflow-rule-btn
      >
        <Plus className="mr-2 h-4 w-4" />
        Tambah Aturan
      </Button>
    </div>
  );
}
