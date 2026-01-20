// components/schools/SchoolDetailActions.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDeleteSchoolMutation } from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface SchoolDetailActionsProps {
  schoolId: string;
  schoolName: string;
}

export default function SchoolDetailActions({ schoolId, schoolName }: SchoolDetailActionsProps) {
  const router = useRouter();
  const [deleteSchool, { isLoading: isDeleting }] = useDeleteSchoolMutation();

  const handleDelete = async () => {
    if (!confirm(`Apakah Anda yakin ingin menghapus sekolah ${schoolName}?`)) return;

    try {
      await deleteSchool(schoolId).unwrap();
      toast.success("Sekolah berhasil dihapus");
      router.push("/organization/schools");
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal menghapus sekolah");
    }
  };

  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={() => router.push("/organization/schools")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Kembali
      </Button>
      <Button variant="outline" onClick={() => router.push(`/organization/schools/${schoolId}/edit`)}>
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
