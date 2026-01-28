/**
 * Create Module Button Component
 */

"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreateModuleButton() {
  return (
    <ActionLink
      href="/access/modules/create"
      resource="modules"
      action="CREATE"
      data-create-module-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Module
    </ActionLink>
  );
}
