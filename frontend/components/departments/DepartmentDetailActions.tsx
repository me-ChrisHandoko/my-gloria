// components/departments/DepartmentDetailActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDeleteDepartmentMutation } from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ActionButton } from "@/components/rbac";

interface DepartmentDetailActionsProps {
    departmentId: string;
    departmentName: string;
}

export default function DepartmentDetailActions({ departmentId, departmentName }: DepartmentDetailActionsProps) {
    const router = useRouter();
    const [deleteDepartment, { isLoading: isDeleting }] = useDeleteDepartmentMutation();

    const handleDelete = async () => {
        if (!confirm(`Apakah Anda yakin ingin menghapus departemen ${departmentName}?`)) return;

        try {
            await deleteDepartment(departmentId).unwrap();
            toast.success("Departemen berhasil dihapus");
            router.push("/organization/departments");
        } catch (error: unknown) {
            const apiError = error as { data?: { message?: string; error?: string } };
            toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal menghapus departemen");
        }
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/organization/departments")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar
            </Button>
            <ActionButton
                resource="departments"
                action="UPDATE"
                variant="outline"
                hideOnDenied
                onClick={() => router.push(`/organization/departments/${departmentId}/edit`)}
            >
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </ActionButton>
            <ActionButton
                resource="departments"
                action="DELETE"
                variant="destructive"
                hideOnDenied
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
                        Hapus
                    </>
                )}
            </ActionButton>
        </div>
    );
}
