"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Edit, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { useDeletePermissionMutation } from "@/lib/store/services/permissionsApi";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface PermissionDetailActionsProps {
  permissionId: string;
  permissionName: string;
  isSystemPermission?: boolean;
}

export default function PermissionDetailActions({
  permissionId,
  permissionName,
  isSystemPermission = false,
}: PermissionDetailActionsProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePermission, { isLoading: isDeleting }] = useDeletePermissionMutation();

  const handleDelete = async () => {
    try {
      await deletePermission(permissionId).unwrap();
      toast.success("Permission berhasil dihapus");
      router.push("/access/permissions");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal menghapus permission");
    } finally {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push(`/access/permissions/${permissionId}/edit`)}
          disabled={isSystemPermission}
        >
          <Edit className="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isSystemPermission}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Hapus
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Permission</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus permission <strong>{permissionName}</strong>?
              <br />
              <br />
              Tindakan ini tidak dapat dibatalkan. Permission yang sudah dihapus tidak dapat dikembalikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Menghapus...</span>
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Ya, Hapus
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
