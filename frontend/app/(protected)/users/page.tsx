"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Plus, Eye, Edit, Trash2, Mail, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";

import { useGetUsersQuery, useDeleteUserMutation } from "@/lib/store/services/usersApi";
import { UserListResponse } from "@/lib/types/user";
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

export default function UsersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: usersData, isLoading, error } = useGetUsersQuery({ search: searchQuery });
  const [deleteUser] = useDeleteUserMutation();

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus user ${email}?`)) return;

    try {
      await deleteUser(id).unwrap();
      toast.success("User berhasil dihapus");
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal menghapus user");
    }
  };

  const columns: ColumnDef<UserListResponse>[] = [
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue("email")}</span>
        </div>
      ),
    },
    {
      accessorKey: "username",
      header: "Username",
      cell: ({ row }) => row.getValue("username") || "-",
    },
    {
      accessorKey: "name",
      header: "Nama",
      cell: ({ row }) => row.getValue("name") || "-",
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const isActive = row.getValue("is_active");
        return (
          <Badge variant={isActive ? "success" : "secondary"}>
            {isActive ? (
              <>
                <UserCheck className="mr-1 h-3 w-3" />
                Aktif
              </>
            ) : (
              <>
                <UserX className="mr-1 h-3 w-3" />
                Non-Aktif
              </>
            )}
          </Badge>
        );
      },
    },
    {
      accessorKey: "email_verified",
      header: "Email Verified",
      cell: ({ row }) => {
        const verified = row.getValue("email_verified");
        return (
          <Badge variant={verified ? "success" : "warning"}>
            {verified ? "Terverifikasi" : "Belum Terverifikasi"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                Copy User ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(user.id, user.email)}
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
    return <Alert variant="error">Gagal memuat data pengguna</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground">
            Kelola data pengguna dan akses sistem
          </p>
        </div>
        <Button onClick={() => router.push("/users/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Pengguna
        </Button>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={usersData?.data || []}
        searchKey="email"
        searchPlaceholder="Cari berdasarkan email..."
      />
    </div>
  );
}
