"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Package, Calendar, CheckCircle2, XCircle, Clock, Activity } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetBulkOperationsQuery } from "@/lib/store/services/workflowsApi";
import { BulkOperationProgressResponse } from "@/lib/types/workflow";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400",
    RUNNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    FAILED: "bg-red-500/10 text-red-700 dark:text-red-400",
    CANCELLED: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
  return colors[status] || colors.PENDING;
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    COMPLETED: <CheckCircle2 className="h-3 w-3" />,
    RUNNING: <Activity className="h-3 w-3 animate-pulse" />,
    PENDING: <Clock className="h-3 w-3" />,
    FAILED: <XCircle className="h-3 w-3" />,
    CANCELLED: <XCircle className="h-3 w-3" />,
  };
  return icons[status] || icons.PENDING;
};

export default function BulkOperationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: bulkOpsData, isLoading, error } = useGetBulkOperationsQuery({});

  const columns: ColumnDef<BulkOperationProgressResponse>[] = [
    {
      accessorKey: "operation_type",
      header: "Operation Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{row.getValue("operation_type")}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant="outline" className={`text-xs uppercase ${getStatusColor(status)}`}>
            <span className="mr-1">{getStatusIcon(status)}</span>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "progress_percent",
      header: "Progress",
      cell: ({ row }) => {
        const percent = row.getValue("progress_percent") as number;
        const processed = row.original.processed_items;
        const total = row.original.total_items;
        return (
          <div className="space-y-1 min-w-[150px]">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{processed}/{total} items</span>
              <span className="font-mono">{percent.toFixed(1)}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>
        );
      },
    },
    {
      accessorKey: "successful_items",
      header: "Success",
      cell: ({ row }) => {
        const successful = row.getValue("successful_items") as number;
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {successful}
          </Badge>
        );
      },
    },
    {
      accessorKey: "failed_items",
      header: "Failed",
      cell: ({ row }) => {
        const failed = row.getValue("failed_items") as number;
        return failed > 0 ? (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400">
            <XCircle className="mr-1 h-3 w-3" />
            {failed}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-xs">0</span>
        );
      },
    },
    {
      accessorKey: "started_at",
      header: "Started",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {format(new Date(row.getValue("started_at")), "dd MMM, HH:mm", { locale: localeId })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const operation = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(operation.id)}>
                Copy Operation ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/workflow/bulk-operations/${operation.id}`)}>
                <Eye className="mr-2 h-4 w-4" />
                Lihat Detail
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
    return <Alert variant="error">Gagal memuat data bulk operations</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bulk Operations</h1>
          <p className="text-muted-foreground">
            Monitor progress bulk operations dan batch processing
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={bulkOpsData?.data || []}
        searchKey="operation_type"
        searchPlaceholder="Cari berdasarkan operation type..."
      />
    </div>
  );
}
