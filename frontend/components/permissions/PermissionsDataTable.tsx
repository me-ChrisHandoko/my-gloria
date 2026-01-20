/**
 * Permissions Data Table Component
 *
 * Server-side sorted and filtered table for permissions
 * Supports column sorting with visual indicators
 */

"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Edit, Key, Lock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { PermissionListResponse } from "@/lib/types/permission";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PermissionsDataTableProps {
  permissions: PermissionListResponse[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (column: string) => void;
}

export default function PermissionsDataTable({
  permissions,
  sortBy,
  sortOrder,
  onSortChange,
}: PermissionsDataTableProps) {
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Sortable: Code */}
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

            {/* Sortable: Name */}
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("name")}
                className="h-8 flex items-center"
              >
                Nama Permission
                {getSortIcon("name")}
              </Button>
            </TableHead>

            {/* Non-sortable columns */}
            <TableHead>Action</TableHead>
            <TableHead>Resource</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Tipe</TableHead>

            {/* Sortable: Status */}
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
          {permissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Tidak ada data permissions
              </TableCell>
            </TableRow>
          ) : (
            permissions.map((permission) => (
              <TableRow key={permission.id}>
                {/* Code */}
                <TableCell className="font-mono text-sm">
                  {permission.code}
                </TableCell>

                {/* Name with icon */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{permission.name}</span>
                  </div>
                </TableCell>

                {/* Action badge */}
                <TableCell>
                  <Badge variant="secondary" className="text-xs uppercase">
                    {permission.action}
                  </Badge>
                </TableCell>

                {/* Resource */}
                <TableCell className="font-mono text-sm">
                  {permission.resource}
                </TableCell>

                {/* Scope */}
                <TableCell>
                  {permission.scope ? (
                    <Badge variant="outline" className="text-xs uppercase">
                      {permission.scope}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">-</span>
                  )}
                </TableCell>

                {/* Type (System vs Custom) */}
                <TableCell>
                  {permission.is_system_permission ? (
                    <Badge variant="secondary" className="text-xs">
                      <Lock className="mr-1 h-3 w-3" />
                      System
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Custom</Badge>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge variant={permission.is_active ? "success" : "destructive"}>
                    {permission.is_active ? "Aktif" : "Non-Aktif"}
                  </Badge>
                </TableCell>

                {/* Actions dropdown */}
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
                        onClick={() => navigator.clipboard.writeText(permission.id)}
                      >
                        Copy Permission ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => router.push(`/access/permissions/${permission.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/access/permissions/${permission.id}/edit`)}
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
