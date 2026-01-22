"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GraduationCap, Users, UserCog, Building2, Shield, Boxes, GitBranch, Workflow, FileText } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail } from "@/components/ui/sidebar";
import { useAppSelector } from "@/lib/store/hooks";

export function GloriaSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user } = useAppSelector((state) => state.auth);
    const pathname = usePathname();

    // Helper function to check if a menu item or its children are active
    const isMenuActive = (url: string, items?: { url: string }[]) => {
        // Check if current path matches the main url
        if (pathname === url) return true;

        // Check if current path starts with the main url (for nested routes)
        if (pathname.startsWith(url + "/")) return true;

        // Check if any sub-item matches
        if (items) {
            return items.some(item => pathname === item.url || pathname.startsWith(item.url + "/"));
        }

        return false;
    };

    const navMain = [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
            isActive: isMenuActive("/dashboard"),
        },
        {
            title: "Karyawan",
            url: "/employees",
            icon: Users,
            isActive: isMenuActive("/employees", [
                { url: "/employees" },
                { url: "/employees/create" },
            ]),
            items: [
                {
                    title: "Daftar Karyawan",
                    url: "/employees",
                },
                {
                    title: "Tambah Karyawan",
                    url: "/employees/create",
                },
            ],
        },
        {
            title: "Pengguna",
            url: "/user/users",
            icon: UserCog,
            isActive: isMenuActive("/user/users", [
                { url: "/user/users" },
                { url: "/user/users/create" },
            ]),
            items: [
                {
                    title: "Daftar Pengguna",
                    url: "/user/users",
                },
                {
                    title: "Tambah Pengguna",
                    url: "/user/users/create",
                },
            ],
        },
        {
            title: "Organisasi",
            url: "/organization",
            icon: Building2,
            isActive: isMenuActive("/organization", [
                { url: "/organization/schools" },
                { url: "/organization/departments" },
                { url: "/organization/positions" },
            ]),
            items: [
                {
                    title: "Sekolah",
                    url: "/organization/schools",
                },
                {
                    title: "Departemen",
                    url: "/organization/departments",
                },
                {
                    title: "Posisi",
                    url: "/organization/positions",
                },
            ],
        },
        {
            title: "Akses & Roles",
            url: "/access",
            icon: Shield,
            isActive: isMenuActive("/access", [
                { url: "/access/roles" },
                { url: "/access/permissions" },
                { url: "/access/modules" },
            ]),
            items: [
                {
                    title: "Roles",
                    url: "/access/roles",
                },
                {
                    title: "Permissions",
                    url: "/access/permissions",
                },
                {
                    title: "Modules",
                    url: "/access/modules",
                },
            ],
        },
        {
            title: "Delegasi",
            url: "/delegations",
            icon: GitBranch,
            isActive: isMenuActive("/delegations", [
                { url: "/delegations" },
                { url: "/delegations/create" },
            ]),
            items: [
                {
                    title: "Daftar Delegasi",
                    url: "/delegations",
                },
                {
                    title: "Tambah Delegasi",
                    url: "/delegations/create",
                },
            ],
        },
        {
            title: "Workflow",
            url: "/workflow",
            icon: Workflow,
            isActive: isMenuActive("/workflow", [
                { url: "/workflow/rules" },
                { url: "/workflow/instances" },
                { url: "/workflow/bulk-operations" },
            ]),
            items: [
                {
                    title: "Aturan Workflow",
                    url: "/workflow/rules",
                },
                {
                    title: "Workflow Instances",
                    url: "/workflow/instances",
                },
                {
                    title: "Bulk Operations",
                    url: "/workflow/bulk-operations",
                },
            ],
        },
        {
            title: "Audit Logs",
            url: "/audit",
            icon: FileText,
            isActive: isMenuActive("/audit", [
                { url: "/audit" },
            ]),
            items: [
                {
                    title: "Daftar Audit Logs",
                    url: "/audit",
                },
            ],
        },
    ];

    // Get name from data_karyawan (firstname + lastname)
    const getFullName = () => {
        // Priority: full_name > firstname + lastname > firstname only > nama (legacy) > username > email
        if (user?.data_karyawan?.full_name) {
            return user.data_karyawan.full_name;
        }
        if (user?.data_karyawan?.firstname && user?.data_karyawan?.lastname) {
            return `${user.data_karyawan.firstname} ${user.data_karyawan.lastname}`;
        }
        if (user?.data_karyawan?.firstname) {
            return user.data_karyawan.firstname;
        }
        if (user?.data_karyawan?.nama) {
            return user.data_karyawan.nama;
        }
        return user?.username || user?.email?.split("@")[0] || "User";
    };

    const userData = {
        name: getFullName(),
        email: user?.data_karyawan?.nip || user?.email || "",
        avatar: "",
    };

    return (
        <Sidebar collapsible="icon" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <GraduationCap className="size-5" />
                            </div>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">YPK Gloria</span>
                                <span className="truncate text-xs">My Gloria Apps</span>
                            </div>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={navMain} />
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={userData} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
}
