// components/workflow-rules/CreateWorkflowRuleButton.tsx
"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Layers } from "lucide-react";
import { ActionButton, PermissionGate } from "@/components/rbac";

export default function CreateWorkflowRuleButton() {
  const router = useRouter();

  return (
    <div className="flex gap-2">
      <PermissionGate resource="workflow_rules" action="CREATE" hideOnDenied>
        <Link href="/workflow/rules/bulk">
          <ActionButton
            resource="workflow_rules"
            action="CREATE"
            variant="outline"
          >
            <Layers className="mr-2 h-4 w-4" />
            Bulk Create
          </ActionButton>
        </Link>
      </PermissionGate>
      <ActionButton
        resource="workflow_rules"
        action="CREATE"
        hideOnDenied
        onClick={() => router.push("/workflow/rules/create")}
        data-create-workflow-rule-btn
      >
        <Plus className="mr-2 h-4 w-4" />
        Tambah Aturan
      </ActionButton>
    </div>
  );
}
