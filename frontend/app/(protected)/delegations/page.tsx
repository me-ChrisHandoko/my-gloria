"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Eye, Edit, Trash2, GitBranch, UserCheck, Users, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetDelegationsQuery, useDeleteDelegationMutation } from "@/lib/store/services/delegationsApi";
import { DelegationListResponse } from "@/lib/types/delegation";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";

const getDelegationTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    APPROVAL: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    PERMISSION: "bg-green-500/10 text-green-700 dark:text-green-400",
    WORKFLOW: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  };
  return colors[type] || colors.WORKFLOW;
};

export default function DelegationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: delegationsData, isLoading, error } = useGetDelegationsQuery({ search: searchQuery });
  const [deleteDelegation] = useDeleteDelegationMutation();

  const handleDelete = async (id: string, delegatorName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus delegasi dari ${delegatorName}?`)) return;

    try {
      await deleteDelegation(id).unwrap();
      toast.success("Delegasi berhasil dihapus");
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal menghapus delegasi");
    }
  };

  const columns: ColumnDef<DelegationListResponse>[] = [
    {
      accessorKey: "type",
      header: "Tipe Delegasi",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant="outline" className={`text-xs uppercase ${getDelegationTypeColor(type)}`}>
            {type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "delegator",
      header: "Delegator",
      cell: ({ row }) => {
        const delegator = row.original.delegator;
        return delegator ? (
          <div className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">{delegator.name || delegator.email}</span>
              {delegator.name && (
                <span className="text-xs text-muted-foreground">{delegator.email}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      accessorKey: "delegate",
      header: "Delegate",
      cell: ({ row }) => {
        const delegate = row.original.delegate;
        return delegate ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium text-sm">{delegate.name || delegate.email}</span>
              {delegate.name && (
                <span className="text-xs text-muted-foreground">{delegate.email}</span>
              )}
            </div>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      accessorKey: "effective_from",
      header: "Berlaku Dari",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {format(new Date(row.getValue("effective_from")), "dd MMM yyyy", { locale: localeId })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "effective_until",
      header: "Berlaku Sampai",
      cell: ({ row }) => {
        const effectiveUntil = row.getValue("effective_until") as string | null;
        return effectiveUntil ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(effectiveUntil), "dd MMM yyyy", { locale: localeId })}
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">Permanent</Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active");
        return (
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? "Aktif" : "Non-Aktif"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const delegation = row.original;
        const delegatorName = delegation.delegator?.name || delegation.delegator?.email || "Unknown";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Buka menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(delegation.id)}>
                Copy Delegation ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/delegations/${delegation.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/delegations/${delegation.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(delegation.id, delegatorName)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Gagal memuat data delegasi</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Delegasi</h1>
          <p className="text-muted-foreground">
            Kelola delegasi approval, permission, dan workflow
          </p>
        </div>
        <Button onClick={() => router.push("/delegations/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Delegasi
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={delegationsData?.data || []}
        searchKey="delegator.name"
        searchPlaceholder="Cari berdasarkan delegator..."
      />
    </div>
  );
}
