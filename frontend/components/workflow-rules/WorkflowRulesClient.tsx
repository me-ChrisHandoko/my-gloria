/**
 * Workflow Rules Client Component
 *
 * Client-side interactive component for workflow rules management.
 * Receives initial server-fetched data and handles:
 * - Interactive search, filters, pagination
 * - RTK Query caching for subsequent requests
 * - Server-side sorting and filtering
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, GitBranch, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  useGetWorkflowRulesQuery,
  useDeleteWorkflowRuleMutation,
  useGetPositionsQuery,
  useGetSchoolsQuery,
} from "@/lib/store/services/organizationApi";
import { WORKFLOW_TYPES, WorkflowType, WorkflowRuleFilter, PaginatedWorkflowRulesResponse } from "@/lib/types/organization";
import WorkflowRulesDataTable from "./WorkflowRulesDataTable";
import CreateWorkflowRuleButton from "./CreateWorkflowRuleButton";

interface WorkflowRulesClientProps {
  initialData: PaginatedWorkflowRulesResponse;
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

export default function WorkflowRulesClient({ initialData }: WorkflowRulesClientProps) {
  const [workflowTypeFilter, setWorkflowTypeFilter] = useState<WorkflowType | undefined>(undefined);
  const [positionFilter, setPositionFilter] = useState<string | undefined>(undefined);
  const [schoolFilter, setSchoolFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
  const [filters, setFilters] = useState<WorkflowRuleFilter>({
    page: 1,
    page_size: 20,
    sort_by: "priority",
    sort_order: "asc",
  });

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<{ id: string; description: string } | null>(null);

  // Fetch positions and schools for filters
  const { data: positionsData } = useGetPositionsQuery({
    page_size: 100,
    is_active: true,
  });

  const { data: schoolsData } = useGetSchoolsQuery({
    page_size: 100,
    is_active: true,
  });

  // Build query params
  const queryParams = useMemo<WorkflowRuleFilter>(() => {
    const params: WorkflowRuleFilter = {
      ...filters,
    };

    if (workflowTypeFilter) params.workflow_type = workflowTypeFilter;
    if (positionFilter) params.position_id = positionFilter;
    if (schoolFilter) params.school_id = schoolFilter;
    if (statusFilter !== undefined) params.is_active = statusFilter;

    return params;
  }, [filters, workflowTypeFilter, positionFilter, schoolFilter, statusFilter]);

  const { data: rulesData, isLoading, error, refetch } = useGetWorkflowRulesQuery(queryParams);
  const [deleteWorkflowRule, { isLoading: isDeleting }] = useDeleteWorkflowRuleMutation();

  // Use initialData as fallback only for first render before query completes
  const displayData = rulesData || initialData;

  const handlePageChange = (newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setFilters((prev) => ({
      ...prev,
      page_size: parseInt(newPageSize),
      page: 1,
    }));
  };

  const handleSortChange = (sortBy: string) => {
    setFilters((prev) => {
      if (prev.sort_by === sortBy) {
        return {
          ...prev,
          sort_order: prev.sort_order === "asc" ? "desc" : "asc",
        };
      }
      return {
        ...prev,
        sort_by: sortBy as WorkflowRuleFilter["sort_by"],
        sort_order: "asc",
      };
    });
  };

  const handleWorkflowTypeFilterChange = (type: string) => {
    if (type === "all") {
      setWorkflowTypeFilter(undefined);
    } else {
      setWorkflowTypeFilter(type as WorkflowType);
    }
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handlePositionFilterChange = (positionId: string) => {
    if (positionId === "all") {
      setPositionFilter(undefined);
    } else {
      setPositionFilter(positionId);
    }
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleSchoolFilterChange = (schoolId: string) => {
    if (schoolId === "all") {
      setSchoolFilter(undefined);
    } else {
      setSchoolFilter(schoolId);
    }
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (status: string) => {
    if (status === "all") {
      setStatusFilter(undefined);
    } else {
      setStatusFilter(status === "active");
    }
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handleClearFilters = () => {
    setWorkflowTypeFilter(undefined);
    setPositionFilter(undefined);
    setSchoolFilter(undefined);
    setStatusFilter(undefined);
    setFilters({
      page: 1,
      page_size: 20,
      sort_by: "priority",
      sort_order: "asc",
    });
  };

  const handleDeleteClick = (id: string, description: string) => {
    setRuleToDelete({ id, description });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      await deleteWorkflowRule(ruleToDelete.id).unwrap();
      toast.success("Aturan workflow berhasil dihapus");
      setDeleteDialogOpen(false);
      setRuleToDelete(null);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal menghapus aturan workflow");
    }
  };

  const hasActiveFilters = workflowTypeFilter !== undefined || positionFilter !== undefined || schoolFilter !== undefined || statusFilter !== undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Aturan Workflow</h1>
          <p className="text-muted-foreground">Kelola aturan persetujuan workflow berdasarkan posisi dan tipe</p>
        </div>
        <CreateWorkflowRuleButton />
      </div>

      {/* Main Card - Contains Filters, Table, and Pagination */}
      <Card>
        {/* Filters Section */}
        <div className="px-4 pt-4 pb-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
            {/* Workflow Type Filter */}
            <Select value={workflowTypeFilter || "all"} onValueChange={handleWorkflowTypeFilterChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Semua Tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {Object.entries(WORKFLOW_TYPES).map(([key, value]) => (
                  <SelectItem key={key} value={value}>
                    {getWorkflowTypeLabel(value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* School Filter */}
            <Select value={schoolFilter || "all"} onValueChange={handleSchoolFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Semua Sekolah" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sekolah</SelectItem>
                <SelectItem value="global">Global (Tanpa Sekolah)</SelectItem>
                {schoolsData?.data?.map((school) => (
                  <SelectItem key={school.id} value={school.id}>
                    {school.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Position Filter */}
            <Select value={positionFilter || "all"} onValueChange={handlePositionFilterChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Semua Posisi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Posisi</SelectItem>
                {positionsData?.data?.map((position) => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={statusFilter === undefined ? "all" : statusFilter ? "active" : "inactive"} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Non-Aktif</SelectItem>
              </SelectContent>
            </Select>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full sm:w-auto">
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && !displayData && (
          <div className="py-12 flex flex-col items-center gap-4">
            <LoadingSpinner />
            <p className="text-sm text-muted-foreground">Memuat data aturan workflow...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <EmptyState
            icon={RefreshCw}
            iconClassName="text-destructive"
            title="Gagal Memuat Data Aturan Workflow"
            description={
              <div className="space-y-2">
                <p>Terjadi kesalahan saat mengambil data dari server. Hal ini bisa disebabkan oleh masalah koneksi atau server sedang sibuk.</p>
                <p className="text-xs">Silakan coba muat ulang data. Jika masalah berlanjut, hubungi administrator sistem.</p>
              </div>
            }
            primaryAction={{
              label: "Muat Ulang Data",
              onClick: () => refetch(),
              variant: "default",
              icon: RefreshCw,
            }}
            secondaryAction={{
              label: "Reset Filter",
              onClick: handleClearFilters,
              variant: "outline",
            }}
          />
        )}

        {/* Data Display */}
        {!error && displayData && (
          <>
            {/* Subtle loading indicator for refetching */}
            {isLoading && <div className="text-sm text-muted-foreground text-center py-2">Memperbarui data...</div>}

            {/* Empty State - No Data (First Time) */}
            {displayData.data.length === 0 && !hasActiveFilters ? (
              <div className="px-4 pb-4">
                <EmptyState
                  icon={GitBranch}
                  iconClassName="text-primary"
                  title="Belum Ada Aturan Workflow"
                  description={
                    <div className="space-y-2">
                      <p>Sistem belum memiliki aturan workflow. Mulai dengan menambahkan aturan pertama untuk mengatur alur persetujuan.</p>
                      <p className="text-xs">Aturan workflow menentukan siapa yang menyetujui pengajuan berdasarkan posisi dan tipe workflow.</p>
                    </div>
                  }
                  primaryAction={{
                    label: "Tambah Aturan Pertama",
                    onClick: () => {
                      const createBtn = document.querySelector("[data-create-workflow-rule-btn]") as HTMLButtonElement;
                      if (createBtn) createBtn.click();
                    },
                    variant: "default",
                    icon: Plus,
                  }}
                />
              </div>
            ) : displayData.data.length === 0 ? (
              /* Empty State - No Results (After Filtering) */
              <div className="px-4 pb-4">
                <EmptyState
                  icon={Search}
                  iconClassName="text-muted-foreground"
                  title="Tidak Ada Hasil Ditemukan"
                  description={
                    <div className="space-y-2">
                      <p>Tidak ada aturan workflow yang sesuai dengan kriteria filter Anda.</p>
                      <div className="text-xs space-y-1 mt-3 text-left bg-muted/50 p-3 rounded-md">
                        <p className="font-semibold">Saran:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Coba ubah atau reset filter tipe workflow</li>
                          <li>Pilih sekolah atau posisi yang berbeda</li>
                          <li>Periksa filter status aktif/non-aktif</li>
                        </ul>
                      </div>
                    </div>
                  }
                  primaryAction={{
                    label: "Reset Semua Filter",
                    onClick: handleClearFilters,
                    variant: "default",
                    icon: RefreshCw,
                  }}
                  secondaryAction={{
                    label: "Tambah Aturan Baru",
                    onClick: () => {
                      const createBtn = document.querySelector("[data-create-workflow-rule-btn]") as HTMLButtonElement;
                      if (createBtn) createBtn.click();
                    },
                    variant: "outline",
                    icon: Plus,
                  }}
                />
              </div>
            ) : (
              <>
                {/* Data Table Section */}
                <div className="px-4 pt-2 pb-2">
                  <WorkflowRulesDataTable
                    rules={displayData.data}
                    sortBy={filters.sort_by}
                    sortOrder={filters.sort_order}
                    onSortChange={handleSortChange}
                    onDeleteClick={handleDeleteClick}
                  />
                </div>

                {/* Pagination Section */}
                <div className="px-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Summary */}
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                      Menampilkan {(displayData.page - 1) * displayData.page_size + 1}-{Math.min(displayData.page * displayData.page_size, displayData.total)} dari {displayData.total} aturan
                    </div>

                    {/* Page Size Selector */}
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-sm text-muted-foreground whitespace-nowrap">Baris per Halaman</span>
                      <Select value={filters.page_size?.toString() || "20"} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-[70px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-center sm:justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={displayData.page === 1}>
                        &laquo;
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(displayData.page - 1)} disabled={displayData.page === 1}>
                        &lsaquo;
                      </Button>
                      <span className="text-sm text-muted-foreground px-2">
                        Halaman {displayData.page} dari {displayData.total_pages}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(displayData.page + 1)} disabled={displayData.page >= displayData.total_pages}>
                        &rsaquo;
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handlePageChange(displayData.total_pages)} disabled={displayData.page >= displayData.total_pages}>
                        &raquo;
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus aturan workflow &quot;{ruleToDelete?.description}&quot;?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Menghapus...</span>
                </>
              ) : (
                "Hapus"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
