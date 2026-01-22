/**
 * Create User Button Component
 *
 * Button to navigate to user creation page
 */

"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateUserButton() {
  const router = useRouter();

  return (
    <Button
      onClick={() => router.push("/user/users/create")}
      data-create-user-btn
    >
      <Plus className="mr-2 h-4 w-4" />
      Tambah Pengguna
    </Button>
  );
}
