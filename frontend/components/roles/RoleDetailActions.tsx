// components/roles/RoleDetailActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, ArrowLeft, Key, LayoutGrid } from "lucide-react";
import { toast } from "sonner";

import { useDeleteRoleMutation } from "@/lib/store/services/rolesApi";
import { Button } from "@/components/ui/button";
import { ActionButton } from "@/components/rbac";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RoleDetailActionsProps {
  roleId: string;
  roleName: string;
}

export default function RoleDetailActions({ roleId, roleName }: RoleDetailActionsProps) {
  const router = useRouter();
  const [deleteRole, { isLoading }] = useDeleteRoleMutation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteRole(roleId).unwrap();
      toast.success("Role berhasil dihapus");
      router.push("/access/roles");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal menghapus role");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Kembali
        </Button>
        <ActionButton
          resource="roles"
          action="READ"
          variant="outline"
          hideOnDenied
          onClick={() => router.push(`/access/roles/${roleId}/permissions`)}
        >
          <Key className="mr-2 h-4 w-4" />
          Permissions
        </ActionButton>
        <ActionButton
          resource="roles"
          action="READ"
          variant="outline"
          hideOnDenied
          onClick={() => router.push(`/access/roles/${roleId}/modules`)}
        >
          <LayoutGrid className="mr-2 h-4 w-4" />
          Modules
        </ActionButton>
        <ActionButton
          resource="roles"
          action="UPDATE"
          variant="outline"
          hideOnDenied
          onClick={() => router.push(`/access/roles/${roleId}/edit`)}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </ActionButton>
        <ActionButton
          resource="roles"
          action="DELETE"
          variant="destructive"
          hideOnDenied
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </ActionButton>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Role</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus role <strong>{roleName}</strong>?
              <br />
              <br />
              <span className="text-destructive">
                Tindakan ini tidak dapat dibatalkan. Role akan dihapus permanen dari sistem.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
              {isLoading ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
