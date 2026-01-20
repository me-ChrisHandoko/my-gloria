"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Workflow as WorkflowIcon, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetWorkflowsQuery } from "@/lib/store/services/workflowsApi";
import { WorkflowListResponse } from "@/lib/types/workflow";
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
    RUNNING: <Clock className="h-3 w-3" />,
    PENDING: <Clock className="h-3 w-3" />,
    FAILED: <XCircle className="h-3 w-3" />,
    CANCELLED: <XCircle className="h-3 w-3" />,
  };
  return icons[status] || icons.PENDING;
};

export default function WorkflowInstancesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: workflowsData, isLoading, error } = useGetWorkflowsQuery({});

  const columns: ColumnDef<WorkflowListResponse>[] = [
    {
      accessorKey: "request_id",
      header: "Request ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("request_id")}</div>
      ),
    },
    {
      accessorKey: "workflow_type",
      header: "Workflow Type",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <WorkflowIcon className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">{row.getValue("workflow_type")}</span>
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
      accessorKey: "started_at",
      header: "Started At",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">
            {format(new Date(row.getValue("started_at")), "dd MMM yyyy, HH:mm", { locale: localeId })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "completed_at",
      header: "Completed At",
      cell: ({ row }) => {
        const completedAt = row.getValue("completed_at") as string | null;
        return completedAt ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">
              {format(new Date(completedAt), "dd MMM yyyy, HH:mm", { locale: localeId })}
            </span>
          </div>
        ) : (
          <Badge variant="outline" className="text-xs">Running</Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const workflow = row.original;

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
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(workflow.id)}>
                Copy Workflow ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/workflow/instances/${workflow.id}`)}>
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
    return <Alert variant="error">Gagal memuat data workflow instances</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflow Instances</h1>
          <p className="text-muted-foreground">
            Monitor dan track workflow instances yang sedang berjalan
          </p>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={workflowsData?.data || []}
        searchKey="request_id"
        searchPlaceholder="Cari berdasarkan request ID..."
      />
    </div>
  );
}
