/**
 * Create User Button Component
 *
 * Link to navigate to user creation page
 */

"use client";

import { Plus } from "lucide-react";
import { ActionLink } from "@/components/rbac";

export default function CreateUserButton() {
  return (
    <ActionLink
      href="/user/users/create"
      resource="users"
      action="CREATE"
      data-create-user-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Pengguna
    </ActionLink>
  );
}
