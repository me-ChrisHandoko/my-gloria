/**
 * API Keys Client Component
 *
 * Client-side interactive component for API key management.
 * Handles CRUD operations for external API access keys (n8n, etc.).
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Key, Search, RefreshCw, Plus, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGetApiKeysQuery } from "@/lib/store/services/apiKeysApi";
import { ActionButton } from "@/components/rbac";
import ApiKeysDataTable from "./ApiKeysDataTable";
import CreateApiKeyDialog from "./CreateApiKeyDialog";
import type { ApiKeyFilter } from "@/lib/types/apikey";

export default function ApiKeysClient() {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [filters, setFilters] = useState<ApiKeyFilter>({
        page: 1,
        page_size: 10,
        sort_by: "created_at",
        sort_order: "desc",
    });

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setFilters((prev) => ({ ...prev, page: 1 }));
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    // Build query params
    const queryParams = useMemo<ApiKeyFilter>(() => {
        const params: ApiKeyFilter = { ...filters };
        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter !== undefined) params.is_active = statusFilter;
        return params;
    }, [filters, debouncedSearch, statusFilter]);

    const { data: apiKeysData, isLoading, error, refetch } = useGetApiKeysQuery(queryParams);

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
                sort_by: sortBy as ApiKeyFilter["sort_by"],
                sort_order: "desc",
            };
        });
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
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter(undefined);
        setFilters({
            page: 1,
            page_size: 10,
            sort_by: "created_at",
            sort_order: "desc",
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
                    <p className="text-muted-foreground">Kelola API key untuk integrasi eksternal (n8n, webhook, dll)</p>
                </div>
                <ActionButton onClick={() => setIsCreateDialogOpen(true)} resource="api-keys" action="CREATE">
                    <Plus className="mr-2 h-4 w-4" />
                    Buat API Key
                </ActionButton>
            </div>

            {/* Security Warning */}
            <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Keamanan API Key</AlertTitle>
                <AlertDescription>API Key memberikan akses ke data sistem. Simpan key dengan aman dan jangan bagikan ke pihak yang tidak berwenang. Key hanya ditampilkan sekali saat pembuatan.</AlertDescription>
            </Alert>

            {/* Main Card */}
            <Card>
                {/* Filters Section */}
                <div className="px-4 pt-4 pb-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Cari berdasarkan nama..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>

                        {/* Status Filter */}
                        <Select value={statusFilter === undefined ? "all" : statusFilter ? "active" : "inactive"} onValueChange={handleStatusFilterChange}>
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="inactive">Dinonaktifkan</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Clear Filters */}
                        {(search || statusFilter !== undefined) && (
                            <Button variant="outline" size="sm" onClick={handleClearFilters}>
                                Reset Filter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && !apiKeysData && (
                    <div className="py-12 flex flex-col items-center gap-4">
                        <LoadingSpinner />
                        <p className="text-sm text-muted-foreground">Memuat data API key...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <EmptyState
                        icon={RefreshCw}
                        iconClassName="text-destructive"
                        title="Gagal Memuat Data"
                        description="Terjadi kesalahan saat mengambil data dari server."
                        primaryAction={{
                            label: "Muat Ulang",
                            onClick: () => refetch(),
                            variant: "default",
                            icon: RefreshCw,
                        }}
                    />
                )}

                {/* Data Display */}
                {!error && apiKeysData && (
                    <>
                        {isLoading && <div className="text-sm text-muted-foreground text-center py-2">Memperbarui data...</div>}

                        {/* Empty State - No Data */}
                        {apiKeysData.data.length === 0 && !search && statusFilter === undefined ? (
                            <div className="px-4 pb-4">
                                <EmptyState
                                    icon={Key}
                                    iconClassName="text-primary"
                                    title="Belum Ada API Key"
                                    description={
                                        <div className="space-y-2">
                                            <p>Anda belum memiliki API key. Buat API key untuk mengakses data via integrasi eksternal seperti n8n.</p>
                                            <p className="text-xs">API key memungkinkan aplikasi eksternal mengakses data tanpa login manual.</p>
                                        </div>
                                    }
                                />
                            </div>
                        ) : apiKeysData.data.length === 0 ? (
                            /* Empty State - No Results */
                            <div className="px-4 pb-4">
                                <EmptyState
                                    icon={Search}
                                    iconClassName="text-muted-foreground"
                                    title="Tidak Ada Hasil"
                                    description="Tidak ada API key yang sesuai dengan filter Anda."
                                    primaryAction={{
                                        label: "Reset Filter",
                                        onClick: handleClearFilters,
                                        variant: "default",
                                        icon: RefreshCw,
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Data Table */}
                                <div className="px-4 pt-2 pb-2">
                                    <ApiKeysDataTable apiKeys={apiKeysData.data} sortBy={filters.sort_by} sortOrder={filters.sort_order} onSortChange={handleSortChange} />
                                </div>

                                {/* Pagination */}
                                <div className="px-4 pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        {/* Summary */}
                                        <div className="text-sm text-muted-foreground text-center sm:text-left">
                                            Menampilkan {(apiKeysData.page - 1) * apiKeysData.page_size + 1}-{Math.min(apiKeysData.page * apiKeysData.page_size, apiKeysData.total)} dari {apiKeysData.total} API key
                                        </div>

                                        {/* Page Size */}
                                        <div className="flex items-center justify-center sm:justify-start gap-2">
                                            <span className="text-sm text-muted-foreground whitespace-nowrap">Per Halaman</span>
                                            <Select value={filters.page_size?.toString() || "10"} onValueChange={handlePageSizeChange}>
                                                <SelectTrigger className="w-[70px] h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="5">5</SelectItem>
                                                    <SelectItem value="10">10</SelectItem>
                                                    <SelectItem value="20">20</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Navigation */}
                                        <div className="flex items-center justify-center sm:justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={apiKeysData.page === 1}>
                                                &laquo;
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(apiKeysData.page - 1)} disabled={apiKeysData.page === 1}>
                                                &lsaquo;
                                            </Button>
                                            <span className="text-sm text-muted-foreground px-2">
                                                Halaman {apiKeysData.page} dari {apiKeysData.total_pages}
                                            </span>
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(apiKeysData.page + 1)} disabled={apiKeysData.page >= apiKeysData.total_pages}>
                                                &rsaquo;
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(apiKeysData.total_pages)} disabled={apiKeysData.page >= apiKeysData.total_pages}>
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

            {/* Create Dialog */}
            <CreateApiKeyDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />
        </div>
    );
}
