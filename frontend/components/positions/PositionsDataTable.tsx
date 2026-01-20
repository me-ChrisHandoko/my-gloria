/**
 * Positions Data Table Component
 *
 * Server-side sorted and filtered table for positions
 * Supports column sorting with visual indicators
 */

"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Edit, Briefcase, ArrowUpDown, ArrowUp, ArrowDown, Layers } from "lucide-react";

import { PositionListResponse } from "@/lib/types/organization";
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

interface PositionsDataTableProps {
  positions: PositionListResponse[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (column: string) => void;
}

export default function PositionsDataTable({
  positions,
  sortBy,
  sortOrder,
  onSortChange,
}: PositionsDataTableProps) {
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
                Nama Posisi
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
          {positions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Tidak ada data posisi
              </TableCell>
            </TableRow>
          ) : (
            positions.map((position) => (
              <TableRow key={position.id}>
                <TableCell className="font-mono text-sm">{position.code}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{position.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-muted-foreground" />
                    <span>Level {position.hierarchy_level}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={position.is_active ? "success" : "destructive"}>
                    {position.is_active ? "Aktif" : "Non-Aktif"}
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
                        onClick={() => router.push(`/organization/positions/${position.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/organization/positions/${position.id}/edit`)}
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
