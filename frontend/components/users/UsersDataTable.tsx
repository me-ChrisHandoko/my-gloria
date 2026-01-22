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
  UserCheck,
  UserX,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

  // Truncate email after @glo
  const truncateEmail = (email: string): string => {
    const atIndex = email.indexOf("@glo");
    if (atIndex !== -1) {
      return email.substring(0, atIndex + 4) + "...";
    }
    return email;
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table className="table-fixed w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="w-auto max-w-[200px]">
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
            <TableHead className="w-[100px]">
              <Button
                variant="ghost"
                onClick={() => onSortChange("is_active")}
                className="h-8 flex items-center"
              >
                Status
                {getSortIcon("is_active")}
              </Button>
            </TableHead>
            <TableHead className="hidden md:table-cell w-[130px]">
              <Button
                variant="ghost"
                onClick={() => onSortChange("last_active")}
                className="h-8 flex items-center whitespace-nowrap"
              >
                Terakhir Aktif
                {getSortIcon("last_active")}
              </Button>
            </TableHead>
            <TableHead className="text-right w-[80px]">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={7}
                className="text-center py-8 text-muted-foreground"
              >
                Tidak ada data pengguna
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="max-w-[200px]">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help overflow-hidden">
                          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <span className="font-medium truncate">
                            {truncateEmail(user.email)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.email}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {user.name || "-"}
                  </span>
                </TableCell>
                <TableCell className="w-[100px]">
                  <Badge variant={user.is_active ? "success" : "secondary"} className="whitespace-nowrap">
                    {user.is_active ? (
                      <div className="flex items-center gap-1">
                        <UserCheck className="h-3 w-3" />
                        <span className="hidden sm:inline">Aktif</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <UserX className="h-3 w-3" />
                        <span className="hidden sm:inline">Non-Aktif</span>
                      </div>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell w-[130px]">
                  {user.last_active ? (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {new Date(user.last_active).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
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
                      <DropdownMenuItem
                        onClick={() => router.push(`/user/users/${user.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push(`/user/users/${user.id}/edit`)}
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
