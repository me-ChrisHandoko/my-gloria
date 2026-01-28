/**
 * Create User Button Component
 *
 * Button to navigate to user creation page
 */

"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { ActionButton } from "@/components/rbac";

export default function CreateUserButton() {
  const router = useRouter();

  return (
    <ActionButton
      resource="users"
      action="CREATE"
      hideOnDenied
      onClick={() => router.push("/user/users/create")}
      data-create-user-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Pengguna
    </ActionButton>
  );
}
