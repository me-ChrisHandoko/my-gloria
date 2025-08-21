'use client';

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useIsSuperAdmin } from "@/hooks/useIsSuperAdmin";
import { ImpersonationDropdown } from "@/components/impersonation/ImpersonationDropdown";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs?: BreadcrumbItemType[];
}

export function PageHeader({ breadcrumbs = [] }: PageHeaderProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isSuperAdmin, userEmail } = useIsSuperAdmin();
  const { isImpersonating } = useImpersonation();
  
  // Auto-generate breadcrumbs if not provided
  const autoBreadcrumbs: BreadcrumbItemType[] = breadcrumbs.length > 0 ? breadcrumbs : (() => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItemType[] = [];
    
    // Always add dashboard as first item
    if (segments[0] !== 'dashboard') {
      crumbs.push({ label: 'Dashboard', href: '/dashboard' });
    }
    
    // Build breadcrumbs from path segments
    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');
      const label = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      if (index === segments.length - 1) {
        crumbs.push({ label });
      } else {
        crumbs.push({ label, href });
      }
    });
    
    return crumbs;
  })();

  return (
    <header className={`flex h-16 shrink-0 items-center justify-between border-b bg-background ${isImpersonating ? 'mt-[60px]' : ''}`}>
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {autoBreadcrumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem className={index < autoBreadcrumbs.length - 1 ? "hidden md:block" : ""}>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {index < autoBreadcrumbs.length - 1 && (
                  <BreadcrumbSeparator className="hidden md:block" />
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      
      <div className="flex items-center gap-2 px-4">
        {/* Impersonation Dropdown for Superadmins */}
        <ImpersonationDropdown 
          currentUserEmail={userEmail} 
          isSuperAdmin={isSuperAdmin} 
        />
        
        <Separator
          orientation="vertical"
          className="h-6 mx-2"
        />
        
        {/* User Button */}
        <UserButton 
          afterSignOutUrl="/sign-in"
          appearance={{
            elements: {
              avatarBox: "h-8 w-8"
            }
          }}
        />
      </div>
    </header>
  );
}