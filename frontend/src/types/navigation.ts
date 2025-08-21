import { LucideIcon } from "lucide-react";

export interface MenuItem {
  id: string;
  title: string;
  titleIndonesian?: string;
  url?: string;
  icon?: LucideIcon;
  badge?: {
    value: string | number;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  shortcut?: string;
  separator?: boolean;
  isActive?: boolean;
  isDisabled?: boolean;
  isExternal?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
  children?: MenuItem[];
}

export interface MenuSection {
  id: string;
  title?: string;
  titleIndonesian?: string;
  items: MenuItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
  requiredPermissions?: string[];
  requiredRoles?: string[];
}

export interface NavigationConfig {
  sections: MenuSection[];
  footerItems?: MenuItem[];
  userMenuItems?: MenuItem[];
}