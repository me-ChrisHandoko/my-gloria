"use client";

import * as React from "react";
import { LayoutDashboard, User, Settings, GraduationCap } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarRail } from "@/components/ui/sidebar";
import { useAppSelector } from "@/lib/store/hooks";

export function GloriaSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { user } = useAppSelector((state) => state.auth);

    const navMain = [
        {
            title: "Dashboard",
            url: "/dashboard",
            icon: LayoutDashboard,
            isActive: true,
        },
        {
            title: "Profile",
            url: "/profile",
            icon: User,
        },
        {
            title: "Settings",
            url: "#",
            icon: Settings,
            items: [
                {
                    title: "General",
                    url: "#",
                },
                {
                    title: "Account",
                    url: "#",
                },
            ],
        },
    ];

    const userData = {
        name: user?.data_karyawan
            ? `${user.data_karyawan.firstname} ${user.data_karyawan.lastname}`
            : user?.username || user?.email?.split("@")[0] || "User",
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
