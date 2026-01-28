"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, FileText, Calendar, User, Tag } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetAuditLogsQuery } from "@/lib/store/services/auditApi";
import { AuditLogListResponse } from "@/lib/types/audit";
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
import { PermissionGate } from "@/components/rbac";

const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    CREATE: "bg-green-500/10 text-green-700 dark:text-green-400",
    READ: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    UPDATE: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
    APPROVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    REJECT: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    LOGIN: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    LOGOUT: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    EXPORT: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    IMPORT: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    ASSIGN: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    GRANT: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
    REVOKE: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  return colors[action] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    PERMISSION: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    MODULE: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    WORKFLOW: "bg-green-500/10 text-green-700 dark:text-green-400",
    SYSTEM_CONFIG: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    USER_MANAGEMENT: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    DATA_CHANGE: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    SECURITY: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return colors[category] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
};

export default function AuditLogsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: auditLogsData, isLoading, error } = useGetAuditLogsQuery({});

  const columns: ColumnDef<AuditLogListResponse>[] = [
    {
      accessorKey: "actor_name",
      header: "Actor",
      cell: ({ row }) => {
        const actorName = row.getValue("actor_name") as string | null;
        return actorName ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">{actorName}</span>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Unknown</span>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const action = row.getValue("action") as string;
        return (
          <Badge variant="outline" className={`text-xs uppercase ${getActionColor(action)}`}>
            {action}
          </Badge>
        );
      },
    },
    {
      accessorKey: "module",
      header: "Module",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.getValue("module")}</span>
      ),
    },
    {
      accessorKey: "entity_type",
      header: "Entity Type",
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue("entity_type")}</span>
      ),
    },
    {
      accessorKey: "entity_display",
      header: "Entity",
      cell: ({ row }) => {
        const display = row.getValue("entity_display") as string | null;
        return display ? (
          <span className="text-sm">{display}</span>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string | null;
        return category ? (
          <Badge variant="outline" className={`text-xs uppercase ${getCategoryColor(category)}`}>
            <Tag className="mr-1 h-3 w-3" />
            {category}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {format(new Date(row.getValue("created_at")), "dd MMM yyyy, HH:mm:ss", { locale: localeId })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const auditLog = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(auditLog.id)}>
                Copy Audit Log ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <PermissionGate resource="audit_logs" action="READ" hideOnDenied>
                <DropdownMenuItem onClick={() => router.push(`/audit/${auditLog.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Lihat Detail
                </DropdownMenuItem>
              </PermissionGate>
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
    return <Alert variant="error">Gagal memuat data audit logs</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track semua aktivitas dan perubahan data dalam sistem
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={auditLogsData?.data || []}
        searchKey="actor_name"
        searchPlaceholder="Cari berdasarkan actor name..."
      />
    </div>
  );
}
