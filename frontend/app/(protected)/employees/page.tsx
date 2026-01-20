"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Edit, Trash2, Plus } from "lucide-react";

import { useGetKaryawansQuery } from "@/lib/store/services/karyawanApi";
import { DataKaryawanListItem } from "@/lib/types/karyawan";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";

const columns: ColumnDef<DataKaryawanListItem>[] = [
  {
    accessorKey: "nip",
    header: "NIP",
    cell: ({ row }) => <div className="font-medium">{row.getValue("nip")}</div>,
  },
  {
    accessorKey: "nama",
    header: "Nama",
    cell: ({ row }) => {
      const nama = row.getValue("nama") as string | null;
      return <div>{nama || "-"}</div>;
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.getValue("email") as string | null;
      return <div className="text-muted-foreground">{email || "-"}</div>;
    },
  },
  {
    accessorKey: "bagian_kerja",
    header: "Bagian Kerja",
    cell: ({ row }) => {
      const bagian = row.getValue("bagian_kerja") as string | null;
      return <div>{bagian || "-"}</div>;
    },
  },
  {
    accessorKey: "jenis_karyawan",
    header: "Jenis Karyawan",
    cell: ({ row }) => {
      const jenis = row.getValue("jenis_karyawan") as string | null;
      return <div>{jenis || "-"}</div>;
    },
  },
  {
    accessorKey: "status_aktif",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status_aktif") as string | null;
      const isAktif = status?.toLowerCase() === "aktif";
      return (
        <Badge variant={isAktif ? "success" : "secondary"}>
          {status || "Unknown"}
        </Badge>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const karyawan = row.original;
      const router = useRouter();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Buka menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => router.push(`/employees/${karyawan.nip}`)}>
              <Eye className="mr-2 h-4 w-4" />
              Lihat Detail
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/employees/${karyawan.nip}/edit`)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function KaryawanPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({});

  const { data, isLoading, error } = useGetKaryawansQuery(filters);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <Alert variant="error">Gagal memuat data karyawan</Alert>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Daftar Karyawan</h1>
          <p className="text-muted-foreground">
            Kelola data karyawan YPK Gloria
          </p>
        </div>
        <Button onClick={() => router.push("/employees/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Karyawan
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        <DataTable
          columns={columns}
          data={data?.data || []}
          searchKey="nama"
          searchPlaceholder="Cari berdasarkan nama..."
        />
      </div>
    </div>
  );
}
