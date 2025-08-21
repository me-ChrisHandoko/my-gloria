'use client';

import { AppSidebar } from "@/components/app-sidebar";
import { PageHeader } from "@/components/PageHeader";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex min-h-screen w-full flex-col">
          <PageHeader />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}