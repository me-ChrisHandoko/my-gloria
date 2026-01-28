/**
 * Workflow Rules Data Table Component
 *
 * Server-side sorted and filtered table for workflow rules
 * Supports column sorting with visual indicators
 */

"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Eye, Edit, Trash2, GitBranch, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { WorkflowRuleListResponse, WorkflowType } from "@/lib/types/organization";
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
import { PermissionGate } from "@/components/rbac";

interface WorkflowRulesDataTableProps {
  rules: WorkflowRuleListResponse[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (column: string) => void;
  onDeleteClick: (id: string, description: string) => void;
}

const getWorkflowTypeLabel = (type: WorkflowType): string => {
  const labels: Record<WorkflowType, string> = {
    KPI: "KPI",
    CUTI: "Cuti",
    REIMBURSE: "Reimburse",
    LEMBUR: "Lembur",
    IZIN: "Izin",
    WORKORDER: "Workorder",
  };
  return labels[type] || type;
};

const getWorkflowTypeBadgeVariant = (type: WorkflowType): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" => {
  const variants: Record<WorkflowType, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
    KPI: "default",
    CUTI: "success",
    REIMBURSE: "warning",
    LEMBUR: "secondary",
    IZIN: "outline",
    WORKORDER: "destructive",
  };
  return variants[type] || "default";
};

export default function WorkflowRulesDataTable({
  rules,
  sortBy,
  sortOrder,
  onSortChange,
  onDeleteClick,
}: WorkflowRulesDataTableProps) {
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
                onClick={() => onSortChange("workflow_type")}
                className="h-8 flex items-center"
              >
                Tipe
                {getSortIcon("workflow_type")}
              </Button>
            </TableHead>
            <TableHead>Sekolah</TableHead>
            <TableHead>Posisi Target</TableHead>
            <TableHead>Pembuat</TableHead>
            <TableHead>Langkah Approval</TableHead>
            <TableHead>
              <Button
                variant="ghost"
                onClick={() => onSortChange("priority")}
                className="h-8 flex items-center"
              >
                Prioritas
                {getSortIcon("priority")}
              </Button>
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                Tidak ada data aturan workflow
              </TableCell>
            </TableRow>
          ) : (
            rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell>
                  <Badge variant={getWorkflowTypeBadgeVariant(rule.workflow_type)}>
                    {getWorkflowTypeLabel(rule.workflow_type)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {rule.school_name ? (
                    <Badge variant="outline">{rule.school_name}</Badge>
                  ) : (
                    <Badge variant="secondary">Global</Badge>
                  )}
                </TableCell>
                <TableCell className="font-medium">
                  {rule.position_name || "-"}
                </TableCell>
                <TableCell>
                  {rule.creator_position_name || (
                    <span className="text-muted-foreground">Self</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {rule.total_steps} langkah
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{rule.priority}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={rule.is_active ? "success" : "secondary"}>
                    {rule.is_active ? "Aktif" : "Non-Aktif"}
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
                      <DropdownMenuSeparator />
                      <PermissionGate resource="workflow_rules" action="READ" hideOnDenied>
                        <DropdownMenuItem
                          onClick={() => router.push(`/workflow/rules/${rule.id}`)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          Lihat Detail
                        </DropdownMenuItem>
                      </PermissionGate>
                      <PermissionGate resource="workflow_rules" action="UPDATE" hideOnDenied>
                        <DropdownMenuItem
                          onClick={() => router.push(`/workflow/rules/${rule.id}/edit`)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                      </PermissionGate>
                      <PermissionGate resource="workflow_rules" action="DELETE" hideOnDenied>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDeleteClick(rule.id, `${getWorkflowTypeLabel(rule.workflow_type)} - ${rule.position_name}`)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus
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
