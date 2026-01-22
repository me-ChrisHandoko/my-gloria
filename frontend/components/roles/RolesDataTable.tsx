/**
 * Roles Data Table Component
 *
 * Server-side sorted and filtered table for roles
 * Supports column sorting with visual indicators
 */

"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Edit, Shield, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { RoleListResponse } from "@/lib/types/role";
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

interface RolesDataTableProps {
  roles: RoleListResponse[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (column: string) => void;
}

export default function RolesDataTable({
  roles,
  sortBy,
  sortOrder,
  onSortChange,
}: RolesDataTableProps) {
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
                onClick={() => onSortChange("code")}
                className="h-8 flex items-center"
              >
                Kode
                {getSortIcon("code")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("name")}
                className="h-8 flex items-center"
              >
                Nama Role
                {getSortIcon("name")}
              </Button>
            </TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("hierarchy_level")}
                className="h-8 flex items-center"
              >
                Level Hierarki
                {getSortIcon("hierarchy_level")}
              </Button>
            </TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("is_active")}
                className="h-8 flex items-center"
              >
                Status
                {getSortIcon("is_active")}
              </Button>
            </TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {roles.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                Tidak ada data role
              </TableCell>
            </TableRow>
          ) : (
            roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-mono text-sm">{role.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{role.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{role.hierarchy_level}</Badge>
                </TableCell>
                <TableCell>
                  {role.is_system_role ? (
                    <Badge variant="secondary">Sistem</Badge>
                  ) : (
                    <Badge variant="default">Custom</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={role.is_active ? "success" : "destructive"}>
                    {role.is_active ? "Aktif" : "Non-Aktif"}
                  </Badge>
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
                      <DropdownMenuItem
                        onClick={() => router.push(`/access/roles/${role.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/access/roles/${role.id}/edit`)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
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
