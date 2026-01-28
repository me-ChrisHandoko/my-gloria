// components/workflow-rules/CreateWorkflowRuleButton.tsx
"use client";

import { Plus, Layers } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreateWorkflowRuleButton() {
  return (
    <div className="flex gap-2">
      <ActionLink
        href="/workflow/rules/bulk"
        resource="workflow_rules"
        action="CREATE"
        variant="outline"
      >
        <Layers className="mr-2 h-4 w-4" />
        Bulk Create
      </ActionLink>
      <ActionLink
        href="/workflow/rules/create"
        resource="workflow_rules"
        action="CREATE"
        data-create-workflow-rule-btn
      >
        <Plus className="mr-2 h-4 w-4" />
        Tambah Aturan
      </ActionLink>
    </div>
  );
}
