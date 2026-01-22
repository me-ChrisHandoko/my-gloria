"use client";

import { usePathname } from "next/navigation";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

// Route configuration untuk breadcrumb mapping
const routeConfig: Record<string, { label: string; parent?: string }> = {
    "/dashboard": { label: "Dashboard" },

    // Karyawan
    "/employees": { label: "Karyawan", parent: "/dashboard" },
    "/employees/create": { label: "Tambah Karyawan", parent: "/employees" },

    // Pengguna
    "/user/users": { label: "Pengguna", parent: "/dashboard" },
    "/user/users/create": { label: "Tambah Pengguna", parent: "/user/users" },

    // Organisasi
    "/organization/schools": { label: "Sekolah", parent: "/dashboard" },
    "/organization/schools/create": { label: "Tambah Sekolah", parent: "/organization/schools" },
    "/organization/departments": { label: "Departemen", parent: "/dashboard" },
    "/organization/positions": { label: "Posisi", parent: "/dashboard" },

    // Akses & Roles
    "/access/roles": { label: "Roles", parent: "/dashboard" },
    "/access/permissions": { label: "Permissions", parent: "/dashboard" },
    "/access/modules": { label: "Modules", parent: "/dashboard" },

    // Delegasi
    "/delegations": { label: "Delegasi", parent: "/dashboard" },
    "/delegations/create": { label: "Tambah Delegasi", parent: "/delegations" },

    // Workflow
    "/workflow/instances": { label: "Workflow Instances", parent: "/dashboard" },
    "/workflow/bulk-operations": { label: "Bulk Operations", parent: "/dashboard" },

    // Audit
    "/audit": { label: "Audit Logs", parent: "/dashboard" },

    // Profile & Settings
    "/profile": { label: "Profil", parent: "/dashboard" },
    "/change-password": { label: "Ubah Password", parent: "/dashboard" },
};

/**
 * Hook untuk generate breadcrumb items berdasarkan pathname
 *
 * @returns Array of breadcrumb items dengan label dan href
 *
 * @example
 * const breadcrumbs = useBreadcrumbs();
 * // Pathname: /organization/schools
 * // Returns: [{ label: "Dashboard", href: "/dashboard" }, { label: "Sekolah" }]
 */
export function useBreadcrumbs(): BreadcrumbItem[] {
    const pathname = usePathname();

    // Function untuk build breadcrumb trail dengan parent
    const buildBreadcrumbTrail = (path: string): BreadcrumbItem[] => {
        const breadcrumbs: BreadcrumbItem[] = [];
        let currentPath: string | undefined = path;

        // Build trail dari current path ke root
        while (currentPath) {
            const config: { label: string; parent?: string } | undefined = routeConfig[currentPath];

            if (config) {
                breadcrumbs.unshift({
                    label: config.label,
                    href: currentPath,
                });
                currentPath = config.parent;
            } else {
                break;
            }
        }

        // Last item tidak perlu href (current page)
        if (breadcrumbs.length > 0) {
            delete breadcrumbs[breadcrumbs.length - 1].href;
        }

        return breadcrumbs;
    };

    // Check exact match first
    if (routeConfig[pathname]) {
        return buildBreadcrumbTrail(pathname);
    }

    // Handle dynamic routes (e.g., /employees/[nip], /access/roles/[id])
    const segments = pathname.split("/").filter(Boolean);

    // Try to match dynamic routes
    if (segments.length >= 2) {
        // Pattern: /employees/[nip]/edit
        if (segments[segments.length - 1] === "edit") {
            const basePath = "/" + segments.slice(0, -2).join("/");
            const config = routeConfig[basePath];

            if (config) {
                return [
                    { label: "Dashboard", href: "/dashboard" },
                    { label: config.label, href: basePath },
                    { label: "Edit" },
                ];
            }
        }

        // Pattern: /employees/[nip] or /access/roles/[id]
        const basePath = "/" + segments.slice(0, -1).join("/");
        const config = routeConfig[basePath];

        if (config) {
            return [
                { label: "Dashboard", href: "/dashboard" },
                { label: config.label, href: basePath },
                { label: "Detail" },
            ];
        }
    }

    // Fallback: Generate from pathname segments
    const fallbackBreadcrumbs: BreadcrumbItem[] = [
        { label: "Dashboard", href: "/dashboard" },
    ];

    if (pathname !== "/dashboard") {
        segments.forEach((segment, index) => {
            const isLast = index === segments.length - 1;
            const href = "/" + segments.slice(0, index + 1).join("/");

            // Capitalize and format segment
            const label = segment
                .split("-")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            fallbackBreadcrumbs.push({
                label,
                href: isLast ? undefined : href,
            });
        });
    }

    return fallbackBreadcrumbs;
}
