/**
 * Positions Client Component
 *
 * Client-side interactive component for position management.
 * Receives initial server-fetched data and handles:
 * - Interactive search, filters, pagination
 * - RTK Query caching for subsequent requests
 * - Server-side sorting and filtering
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Search, Briefcase, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useGetPositionsQuery, useGetDepartmentsQuery } from "@/lib/store/services/organizationApi";
import PositionsDataTable from "./PositionsDataTable";
import CreatePositionButton from "./CreatePositionButton";
import type { PaginatedPositionsResponse, PositionFilter } from "@/lib/types/organization";

interface PositionsClientProps {
    initialData: PaginatedPositionsResponse;
}

export default function PositionsClient({ initialData }: PositionsClientProps) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<boolean | undefined>(undefined);
    const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
    const [schoolFilter, setSchoolFilter] = useState<string | undefined>(undefined);
    const [hierarchyFilter, setHierarchyFilter] = useState<number | undefined>(undefined);
    const [filters, setFilters] = useState<PositionFilter>({
        page: 1,
        page_size: 20,
        sort_by: "code",
        sort_order: "asc",
    });

    // Fetch departments for filter dropdown
    const { data: departmentsData } = useGetDepartmentsQuery({ page_size: 100, is_active: true });

    // Debounce search input (wait 500ms after user stops typing)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setFilters((prev) => ({ ...prev, page: 1 })); // Reset to page 1 on search
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    // Fetch positions with filters - use useMemo to prevent unnecessary re-renders
    const queryParams = useMemo<PositionFilter>(() => {
        const params: PositionFilter = {
            ...filters,
        };

        if (debouncedSearch) params.search = debouncedSearch;
        if (statusFilter !== undefined) params.is_active = statusFilter;
        if (departmentFilter) params.department_id = departmentFilter;
        if (schoolFilter) params.school_id = schoolFilter;
        if (hierarchyFilter !== undefined) params.hierarchy_level = hierarchyFilter;

        return params;
    }, [filters, debouncedSearch, statusFilter, departmentFilter, schoolFilter, hierarchyFilter]);

    const { data: positionsData, isLoading, error, refetch } = useGetPositionsQuery(queryParams);

    // Use initialData as fallback only for first render before query completes
    const displayData = positionsData || initialData;

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
                sort_by: sortBy as PositionFilter["sort_by"],
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

    const handleDepartmentFilterChange = (department: string) => {
        if (department === "all") {
            setDepartmentFilter(undefined);
        } else {
            setDepartmentFilter(department);
        }
        setFilters((prev) => ({ ...prev, page: 1 }));
    };

    const handleClearFilters = () => {
        setSearch("");
        setDebouncedSearch("");
        setStatusFilter(undefined);
        setDepartmentFilter(undefined);
        setSchoolFilter(undefined);
        setHierarchyFilter(undefined);
        setFilters({
            page: 1,
            page_size: 20,
            sort_by: "code",
            sort_order: "asc",
        });
    };

    const hasActiveFilters = search || statusFilter !== undefined || departmentFilter || schoolFilter || hierarchyFilter !== undefined;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Posisi</h1>
                    <p className="text-muted-foreground">Kelola data posisi dalam organisasi YPK Gloria</p>
                </div>
                <CreatePositionButton />
            </div>

            {/* Main Card - Contains Filters, Table, and Pagination */}
            <Card>
                {/* Filters Section */}
                <div className="px-4 pt-4 pb-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input placeholder="Cari berdasarkan nama atau kode posisi..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
                        </div>

                        {/* Department Filter */}
                        <Select value={departmentFilter || "all"} onValueChange={handleDepartmentFilterChange}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Semua Departemen" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Departemen</SelectItem>
                                {departmentsData?.data?.map((dept) => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                        {dept.name}
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
                        <p className="text-sm text-muted-foreground">Memuat data posisi...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <EmptyState
                        icon={RefreshCw}
                        iconClassName="text-destructive"
                        title="Gagal Memuat Data Posisi"
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
                                    icon={Briefcase}
                                    iconClassName="text-primary"
                                    title="Belum Ada Posisi Terdaftar"
                                    description={
                                        <div className="space-y-2">
                                            <p>Sistem belum memiliki data posisi. Mulai dengan menambahkan posisi pertama untuk organisasi YPK Gloria.</p>
                                            <p className="text-xs">Posisi yang ditambahkan akan menjadi bagian dari struktur organisasi dan dapat dikelola oleh pengguna dengan hak akses yang sesuai.</p>
                                        </div>
                                    }
                                    primaryAction={{
                                        label: "Tambah Posisi Pertama",
                                        onClick: () => {
                                            const createBtn = document.querySelector("[data-create-position-btn]") as HTMLButtonElement;
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
                                            <p>Tidak ada posisi yang sesuai dengan kriteria pencarian atau filter Anda.</p>
                                            <div className="text-xs space-y-1 mt-3 text-left bg-muted/50 p-3 rounded-md">
                                                <p className="font-semibold">Saran:</p>
                                                <ul className="list-disc list-inside space-y-1">
                                                    <li>Periksa ejaan kata kunci pencarian</li>
                                                    <li>Gunakan kata kunci yang lebih umum</li>
                                                    <li>Coba ubah atau reset filter</li>
                                                    <li>Pastikan data posisi sudah ditambahkan ke sistem</li>
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
                                        label: "Tambah Posisi Baru",
                                        onClick: () => {
                                            const createBtn = document.querySelector("[data-create-position-btn]") as HTMLButtonElement;
                                            if (createBtn) createBtn.click();
                                        },
                                        variant: "outline",
                                        icon: Plus,
                                    }}
                                />
                            </div>
                        ) : (
                            <>
                                {/* Positions Table Section */}
                                <div className="px-4 pt-2 pb-2">
                                    <PositionsDataTable positions={displayData.data} sortBy={filters.sort_by} sortOrder={filters.sort_order} onSortChange={handleSortChange} />
                                </div>

                                {/* Pagination Section */}
                                <div className="px-4 pb-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                        {/* 1. Summary - Record Data */}
                                        <div className="text-sm text-muted-foreground text-center sm:text-left">
                                            Menampilkan {(displayData.page - 1) * displayData.page_size + 1}-{Math.min(displayData.page * displayData.page_size, displayData.total)} dari {displayData.total} posisi
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
