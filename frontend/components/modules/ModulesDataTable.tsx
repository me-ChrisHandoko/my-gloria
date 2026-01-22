/**
 * Modules Data Table Component
 *
 * Server-side sorted and filtered table for modules
 * Supports column sorting with visual indicators
 */

"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Edit, Boxes, Folder, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { ModuleListResponse } from "@/lib/types/module";
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

interface ModulesDataTableProps {
  modules: ModuleListResponse[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (column: string) => void;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    SERVICE: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    PERFORMANCE: "bg-green-500/10 text-green-700 dark:text-green-400",
    QUALITY: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    FEEDBACK: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    TRAINING: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    SYSTEM: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
  return colors[category] || colors.SYSTEM;
};

export default function ModulesDataTable({
  modules,
  sortBy,
  sortOrder,
  onSortChange,
}: ModulesDataTableProps) {
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
                Nama Module
                {getSortIcon("name")}
              </Button>
            </TableHead>
            <TableHead>Kategori</TableHead>
            <TableHead>Tipe</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("sort_order")}
                className="h-8 flex items-center"
              >
                Urutan
                {getSortIcon("sort_order")}
              </Button>
            </TableHead>
            <TableHead>Visible</TableHead>
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
          {modules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Tidak ada data module
              </TableCell>
            </TableRow>
          ) : (
            modules.map((module) => (
              <TableRow key={module.id}>
                <TableCell className="font-mono text-sm">{module.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{module.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs uppercase ${getCategoryColor(module.category)}`}>
                    {module.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  {module.parent_id ? (
                    <Badge variant="outline" className="text-xs">
                      <Folder className="mr-1 h-3 w-3" />
                      Submodule
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Root Module</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-center font-mono text-sm">{module.sort_order}</div>
                </TableCell>
                <TableCell>
                  <Badge variant={module.is_visible ? "success" : "secondary"} className="text-xs">
                    {module.is_visible ? "Ya" : "Tidak"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={module.is_active ? "success" : "destructive"}>
                    {module.is_active ? "Aktif" : "Non-Aktif"}
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
                        onClick={() => router.push(`/access/modules/${module.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/access/modules/${module.id}/edit`)}
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
