/**
 * Modules Client Component
 *
 * Client-side interactive component for module management.
 * Receives initial server-fetched data and handles:
 * - Interactive search, filters, pagination
 * - RTK Query caching for subsequent requests
 * - Server-side sorting and filtering
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Boxes, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGetModulesQuery } from "@/lib/store/services/modulesApi";
import ModulesDataTable from "./ModulesDataTable";
import CreateModuleButton from "./CreateModuleButton";
import type { PaginatedModulesResponse, ModuleFilter } from "@/lib/types/module";

interface ModulesClientProps {
    initialData: PaginatedModulesResponse;
}

export default function ModulesClient({ initialData }: ModulesClientProps) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
    const [visibilityFilter, setVisibilityFilter] = useState<boolean | undefined>(undefined);
    const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
    const [filters, setFilters] = useState<ModuleFilter>({
        page: 1,
        page_size: 20,
        sort_by: "code",
        sort_order: "asc",
    });

    // Debounce search input (wait 500ms after user stops typing)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setFilters((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    // Fetch modules with filters - use useMemo to prevent unnecessary re-renders
    const queryParams = useMemo<ModuleFilter>(() => {
        const params: ModuleFilter = {
            ...filters,
        };

        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter !== undefined) params.is_active = statusFilter;
        if (visibilityFilter !== undefined) params.is_visible = visibilityFilter;
        if (categoryFilter) params.category = categoryFilter as any;

        return params;
    }, [filters, debouncedSearch, statusFilter, visibilityFilter, categoryFilter]);

    const { data: modulesData, isLoading, error, refetch } = useGetModulesQuery(queryParams);

    // Use initialData as fallback only for first render before query completes
    const displayData = modulesData || initialData;

    const handlePageChange = (newPage: number) => {
        setFilters((prev) => ({ ...prev, page: newPage }));
    };

    const handlePageSizeChange = (newPageSize: string) => {
        setFilters((prev) => ({
            ...prev,
            page_size: parseInt(newPageSize),
            page: 1, // Reset to page 1 when changing page size
        }));
    };

    const handleSortChange = (sortBy: string) => {
        setFilters((prev) => {
            // Toggle sort order if clicking the same column
            if (prev.sort_by === sortBy) {
                return {
                    ...prev,
                    sort_order: prev.sort_order === "asc" ? "desc" : "asc",
                };
            }
            // New column, default to ascending
            return {
                ...prev,
                sort_by: sortBy as ModuleFilter["sort_by"],
                sort_order: "asc",
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

    const handleVisibilityFilterChange = (visibility: string) => {
        if (visibility === "all") {
            setVisibilityFilter(undefined);
        } else {
            setVisibilityFilter(visibility === "visible");
        }
        setFilters((prev) => ({ ...prev, page: 1 }));
    };

    const handleCategoryFilterChange = (category: string) => {
        if (category === "all") {
            setCategoryFilter(undefined);
        } else {
            setCategoryFilter(category);
        }
        setFilters((prev) => ({ ...prev, page: 1 }));
    };

    const handleClearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter(undefined);
        setVisibilityFilter(undefined);
        setCategoryFilter(undefined);
        setFilters({
            page: 1,
            page_size: 20,
            sort_by: "code",
            sort_order: "asc",
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Modules</h1>
                    <p className="text-muted-foreground">Kelola modules dan struktur akses sistem YPK Gloria</p>
                </div>
                <CreateModuleButton />
            </div>

            {/* Main Card - Contains Filters, Table, and Pagination */}
            <Card>
                {/* Filters Section - All in One Row */}
                <div className="px-4 pt-4 pb-2">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Cari berdasarkan nama atau kode module..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>

                        {/* Category Filter */}
                        <Select value={categoryFilter || "all"} onValueChange={handleCategoryFilterChange}>
                            <SelectTrigger className="w-full lg:w-[190px]">
                                <SelectValue placeholder="Semua Kategori" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Kategori</SelectItem>
                                <SelectItem value="SERVICE">SERVICE</SelectItem>
                                <SelectItem value="PERFORMANCE">PERFORMANCE</SelectItem>
                                <SelectItem value="QUALITY">QUALITY</SelectItem>
                                <SelectItem value="FEEDBACK">FEEDBACK</SelectItem>
                                <SelectItem value="TRAINING">TRAINING</SelectItem>
                                <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Visibility Filter */}
                        <Select value={visibilityFilter === undefined ? "all" : visibilityFilter ? "visible" : "hidden"} onValueChange={handleVisibilityFilterChange}>
                            <SelectTrigger className="w-full lg:w-[190px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Visibility</SelectItem>
                                <SelectItem value="visible">Visible</SelectItem>
                                <SelectItem value="hidden">Hidden</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={statusFilter === undefined ? "all" : statusFilter ? "active" : "inactive"} onValueChange={handleStatusFilterChange}>
                            <SelectTrigger className="w-full lg:w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Status</SelectItem>
                                <SelectItem value="active">Aktif</SelectItem>
                                <SelectItem value="inactive">Non-Aktif</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Clear Filters Button */}
                        {(search || statusFilter !== undefined || visibilityFilter !== undefined || categoryFilter !== undefined) && (
                            <Button variant="outline" size="sm" onClick={handleClearFilters} className="w-full lg:w-auto">
                                Reset Filter
                            </Button>
                        )}
                    </div>
                </div>

                {/* Loading State */}
                {isLoading && !displayData && (
                    <div className="py-12 flex flex-col items-center gap-4">
                        <LoadingSpinner />
                        <p className="text-sm text-muted-foreground">Memuat data modules...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <EmptyState
                        icon={RefreshCw}
                        iconClassName="text-destructive"
                        title="Gagal Memuat Data Modules"
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
                        {displayData.data.length === 0 && !search && statusFilter === undefined && visibilityFilter === undefined && categoryFilter === undefined ? (
                            <div className="px-4 pb-4">
                                <EmptyState
                                    icon={Boxes}
                                    iconClassName="text-primary"
                                    title="Belum Ada Module Terdaftar"
                                    description={
                                        <div className="space-y-2">
                                            <p>Sistem belum memiliki data module. Mulai dengan menambahkan module pertama untuk sistem YPK Gloria.</p>
                                            <p className="text-xs">Module yang ditambahkan akan menjadi bagian dari struktur akses dan dapat dikelola oleh pengguna dengan hak akses yang sesuai.</p>
                                        </div>
                                    }
                                    primaryAction={{
                                        label: "Tambah Module Pertama",
                                        onClick: () => {
                                            // Trigger CreateModuleButton
                                            const createBtn = document.querySelector("[data-create-module-btn]") as HTMLButtonElement;
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
                                            <p>Tidak ada module yang sesuai dengan kriteria pencarian atau filter Anda.</p>
                                            <div className="text-xs space-y-1 mt-3 text-left bg-muted/50 p-3 rounded-md">
                                                <p className="font-semibold">Saran:</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li>Periksa ejaan kata kunci pencarian</li>
                                                    <li>Gunakan kata kunci yang lebih umum</li>
                                                    <li>Coba ubah atau reset filter kategori, visibility, atau status</li>
                                                    <li>Pastikan data module sudah ditambahkan ke sistem</li>
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
                                        label: "Tambah Module Baru",
                                        onClick: () => {
                                            const createBtn = document.querySelector("[data-create-module-btn]") as HTMLButtonElement;
                                            if (createBtn) createBtn.click();
                                        },
                                        variant: "outline",
                                        icon: Plus,
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Modules Table Section */}
                                <div className="px-4 pt-2 pb-2">
                                    <ModulesDataTable modules={displayData.data} sortBy={filters.sort_by} sortOrder={filters.sort_order} onSortChange={handleSortChange} />
                                </div>

                                {/* Pagination Section */}
                                <div className="px-4 pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        {/* 1. Summary - Record Data */}
                                        <div className="text-sm text-muted-foreground text-center sm:text-left">
                                            Menampilkan {(displayData.page - 1) * displayData.page_size + 1}-{Math.min(displayData.page * displayData.page_size, displayData.total)} dari {displayData.total} modules
                                        </div>

                                        {/* 2. Page Size Selector */}
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

                                        {/* 3. Navigation Buttons */}
                                        <div className="flex items-center justify-center sm:justify-end gap-2">
                                            {/* First Page */}
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)} disabled={displayData.page === 1}>
                                                &laquo;
                                            </Button>

                                            {/* Previous Page */}
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(displayData.page - 1)} disabled={displayData.page === 1}>
                                                &lsaquo;
                                            </Button>

                                            {/* Current Page Info */}
                                            <span className="text-sm text-muted-foreground px-2">
                                                Halaman {displayData.page} dari {displayData.total_pages}
                                            </span>

                                            {/* Next Page */}
                                            <Button variant="outline" size="sm" onClick={() => handlePageChange(displayData.page + 1)} disabled={displayData.page >= displayData.total_pages}>
                                                &rsaquo;
                                            </Button>

                                            {/* Last Page */}
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
        </div>
    );
}
