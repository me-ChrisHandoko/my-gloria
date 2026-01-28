// components/positions/PositionDetailActions.tsx
"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useDeletePositionMutation } from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ActionButton } from "@/components/rbac";

interface PositionDetailActionsProps {
    positionId: string;
    positionName: string;
}

export default function PositionDetailActions({ positionId, positionName }: PositionDetailActionsProps) {
    const router = useRouter();
    const [deletePosition, { isLoading: isDeleting }] = useDeletePositionMutation();

    const handleDelete = async () => {
        if (!confirm(`Apakah Anda yakin ingin menghapus posisi ${positionName}?`)) return;

        try {
            await deletePosition(positionId).unwrap();
            toast.success("Posisi berhasil dihapus");
            router.push("/organization/positions");
        } catch (error: unknown) {
            const apiError = error as { data?: { message?: string } };
            toast.error(apiError?.data?.message || "Gagal menghapus posisi");
        }
    };

    return (
        <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/organization/positions")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Daftar
            </Button>
            <ActionButton
                resource="positions"
                action="UPDATE"
                variant="outline"
                hideOnDenied
                onClick={() => router.push(`/organization/positions/${positionId}/edit`)}
            >
                <Edit className="mr-2 h-4 w-4" />
                Edit
            </ActionButton>
            <ActionButton
                resource="positions"
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
