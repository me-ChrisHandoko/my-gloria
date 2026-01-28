// components/rbac/ModuleMenu.tsx
/**
 * ModuleMenu Component
 *
 * Dynamic navigation menu based on user's accessible modules.
 * Renders hierarchical menu structure with icons and active state.
 */

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, LucideIcon } from 'lucide-react';
import * as Icons from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRBAC } from '@/lib/hooks/useRBAC';
import { ModuleAccessResponse } from '@/lib/types/access';
import { ModuleCategory } from '@/lib/types/module';

/**
 * Check if a value is a valid React component (function or forwardRef)
 */
function isValidComponent(value: unknown): value is LucideIcon {
  if (!value) return false;
  // Check for function component
  if (typeof value === 'function') return true;
  // Check for forwardRef component (has $$typeof symbol and render function)
  if (typeof value === 'object' && 'render' in value) return true;
  return false;
}

/**
 * Ensure path is absolute (starts with /)
 * This prevents relative URL navigation issues
 */
function ensureAbsolutePath(path?: string | null): string {
  if (!path) return '#';
  // If path doesn't start with /, prepend it
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Get LucideIcon component from icon name string
 */
function getIconComponent(iconName?: string | null): LucideIcon | null {
  if (!iconName) return null;

  // Get icons as a record type
  const iconsRecord = Icons as unknown as Record<string, LucideIcon>;

  // Try direct lookup first (icons are stored as PascalCase like 'Shield', 'Building2')
  const directIcon = iconsRecord[iconName];
  if (isValidComponent(directIcon)) {
    return directIcon;
  }

  // Try with first letter capitalized (handle lowercase input)
  const capitalizedName = iconName
    .split(/[-_]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');

  const capitalizedIcon = iconsRecord[capitalizedName];
  if (isValidComponent(capitalizedIcon)) {
    return capitalizedIcon;
  }

  // Fallback: case-insensitive search
  const normalizedName = iconName.toLowerCase().replace(/[-_]/g, '');
  for (const [key, value] of Object.entries(iconsRecord)) {
    if (key.toLowerCase() === normalizedName && isValidComponent(value)) {
      return value;
    }
  }

  return null;
}

/**
 * Default icons for module categories
 */
const categoryIcons: Record<ModuleCategory, LucideIcon> = {
  SERVICE: Icons.Layers,
  PERFORMANCE: Icons.TrendingUp,
  QUALITY: Icons.CheckCircle,
  FEEDBACK: Icons.MessageSquare,
  TRAINING: Icons.GraduationCap,
  SYSTEM: Icons.Settings,
};

interface ModuleMenuItemProps {
  module: ModuleAccessResponse;
  isActive: boolean;
  onUrlActive: (url: string) => boolean;
}

/**
 * Single module menu item (with or without children)
 */
function ModuleMenuItem({ module, isActive, onUrlActive }: ModuleMenuItemProps) {
  const IconComponent = getIconComponent(module.icon) || categoryIcons[module.category] || Icons.Box;
  const hasChildren = module.children && module.children.length > 0;
  const url = ensureAbsolutePath(module.path);

  if (hasChildren) {
    return (
      <Collapsible asChild defaultOpen={isActive} className="group/collapsible">
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton tooltip={module.name} isActive={isActive}>
              <IconComponent className="h-4 w-4" />
              <span>{module.name}</span>
              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {module.children!.map((child) => {
                const ChildIcon = getIconComponent(child.icon) || categoryIcons[child.category] || Icons.Circle;
                const childUrl = ensureAbsolutePath(child.path);
                return (
                  <SidebarMenuSubItem key={child.id}>
                    <SidebarMenuSubButton asChild isActive={onUrlActive(childUrl)}>
                      <Link href={childUrl}>
                        <ChildIcon className="h-3 w-3" />
                        <span>{child.name}</span>
                      </Link>
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={module.name} isActive={onUrlActive(url)}>
        <Link href={url}>
          <IconComponent className="h-4 w-4" />
          <span>{module.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

/**
 * Loading skeleton for module menu
 */
function ModuleMenuSkeleton() {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>
        <Skeleton className="h-4 w-16" />
      </SidebarGroupLabel>
      <SidebarMenu>
        {[1, 2, 3, 4, 5].map((i) => (
          <SidebarMenuItem key={i}>
            <div className="flex items-center gap-2 p-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

interface ModuleMenuProps {
  /** Group label text */
  label?: string;
  /** Filter by category */
  category?: ModuleCategory;
  /** Show loading skeleton */
  showLoading?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Dynamic navigation menu based on user's accessible modules
 *
 * @example
 * ```tsx
 * // Show all accessible modules
 * <ModuleMenu label="Menu Utama" />
 *
 * // Filter by category
 * <ModuleMenu label="Sistem" category="SYSTEM" />
 * ```
 */
export function ModuleMenu({
  label = 'Platform',
  category,
  showLoading = true,
  className,
}: ModuleMenuProps) {
  const pathname = usePathname();
  const { modules, isLoading } = useRBAC();

  // Check if URL is active
  const isUrlActive = (url: string) => {
    if (!url || url === '#') return false;
    return pathname === url || pathname.startsWith(url + '/');
  };

  // Check if module or its children are active
  const isModuleActive = (module: ModuleAccessResponse): boolean => {
    const modulePath = ensureAbsolutePath(module.path);
    if (modulePath !== '#' && isUrlActive(modulePath)) return true;
    if (module.children) {
      return module.children.some((child) => {
        const childPath = ensureAbsolutePath(child.path);
        return childPath !== '#' && isUrlActive(childPath);
      });
    }
    return false;
  };

  // Filter modules by category if specified
  const filteredModules = useMemo(() => {
    if (!category) return modules;
    return modules.filter((m) => m.category === category);
  }, [modules, category]);

  // Show loading skeleton
  if (isLoading && showLoading) {
    return <ModuleMenuSkeleton />;
  }

  // Don't render if no modules
  if (filteredModules.length === 0) {
    return null;
  }

  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {filteredModules.map((module) => (
          <ModuleMenuItem
            key={module.id}
            module={module}
            isActive={isModuleActive(module)}
            onUrlActive={isUrlActive}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

/**
 * Static navigation items for fallback when RBAC is not loaded
 * or for non-module menu items
 */
export interface StaticNavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  items?: { title: string; url: string }[];
}

interface StaticModuleMenuProps {
  items: StaticNavItem[];
  label?: string;
  className?: string;
}

/**
 * Static navigation menu (non-RBAC controlled)
 */
export function StaticModuleMenu({
  items,
  label = 'Platform',
  className,
}: StaticModuleMenuProps) {
  const pathname = usePathname();

  const isUrlActive = (url: string) => {
    return pathname === url || pathname.startsWith(url + '/');
  };

  const isMenuActive = (item: StaticNavItem): boolean => {
    if (isUrlActive(item.url)) return true;
    if (item.items) {
      return item.items.some((sub) => isUrlActive(sub.url));
    }
    return false;
  };

  return (
    <SidebarGroup className={className}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const hasChildren = item.items && item.items.length > 0;
          const isActive = isMenuActive(item);

          if (hasChildren) {
            return (
              <Collapsible
                key={item.title}
                asChild
                defaultOpen={isActive}
                className="group/collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                      {item.icon && <item.icon className="h-4 w-4" />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items!.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isUrlActive(subItem.url)}
                          >
                            <Link href={subItem.url}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          }

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={isUrlActive(item.url)}
              >
                <Link href={item.url}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default ModuleMenu;
