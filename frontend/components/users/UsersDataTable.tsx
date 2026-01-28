/**
 * Users Data Table Component
 *
 * Server-side sorted and filtered table for users
 * Supports column sorting with visual indicators
 */

"use client";

import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Eye,
  Edit,
  Mail,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

import { UserListResponse } from "@/lib/types/user";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/rbac";

interface UsersDataTableProps {
  users: UserListResponse[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (column: string) => void;
}

export default function UsersDataTable({
  users,
  sortBy,
  sortOrder,
  onSortChange,
}: UsersDataTableProps) {
  const router = useRouter();

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("email")}
                className="h-8 flex items-center"
              >
                Email
                {getSortIcon("email")}
              </Button>
            </TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("last_active")}
                className="h-8 flex items-center"
              >
                Terakhir Aktif
                {getSortIcon("last_active")}
              </Button>
            </TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center py-8 text-muted-foreground"
              >
                Tidak ada data pengguna
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{user.email}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span>{user.name || "-"}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? "success" : "destructive"}>
                    {user.is_active ? "Aktif" : "Non-Aktif"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.last_active ? (
                    <span className="text-sm text-muted-foreground">
                      {new Date(user.last_active).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Buka menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                      <PermissionGate resource="users" action="READ" hideOnDenied>
                        <DropdownMenuItem
                          onClick={() => router.push(`/user/users/${user.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Lihat Detail
                        </DropdownMenuItem>
                      </PermissionGate>
                      <PermissionGate resource="users" action="UPDATE" hideOnDenied>
                        <DropdownMenuItem
                          onClick={() => router.push(`/user/users/${user.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </PermissionGate>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
