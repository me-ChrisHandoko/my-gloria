// components/modules/ModuleDetailActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDeleteModuleMutation } from "@/lib/store/services/modulesApi";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface ModuleDetailActionsProps {
  moduleId: string;
  moduleName: string;
}

export default function ModuleDetailActions({ moduleId, moduleName }: ModuleDetailActionsProps) {
  const router = useRouter();
  const [deleteModule, { isLoading: isDeleting }] = useDeleteModuleMutation();

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus module ${moduleName}?`)) return;

    try {
      await deleteModule(moduleId).unwrap();
      toast.success("Module berhasil dihapus");
      router.push("/access/modules");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal menghapus module");
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push("/access/modules")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>
      <Button variant="outline" onClick={() => router.push(`/access/modules/${moduleId}/edit`)}>
        <Edit className="mr-2 h-4 w-4" />
        Edit
      </Button>
      <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
        {isDeleting ? (
          <>
            <LoadingSpinner />
            <span className="ml-2">Menghapus...</span>
          </>
        ) : (
          <>
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </>
        )}
      </Button>
    </div>
  );
}
