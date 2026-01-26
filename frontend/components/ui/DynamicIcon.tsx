// components/ui/DynamicIcon.tsx
"use client";

import * as LucideIcons from "lucide-react";
import { LucideProps } from "lucide-react";

interface DynamicIconProps extends LucideProps {
  name: string;
  fallback?: React.ReactNode;
}

/**
 * Renders a Lucide icon dynamically based on the icon name string.
 *
 * @param name - The name of the Lucide icon (e.g., "LayoutDashboard", "Shield")
 * @param fallback - Optional fallback content if icon is not found
 * @param ...props - Additional props passed to the icon component
 */
export function DynamicIcon({ name, fallback, ...props }: DynamicIconProps) {
  // Get the icon component from lucide-react
  const IconComponent = (LucideIcons as Record<string, React.ComponentType<LucideProps>>)[name];

  if (!IconComponent) {
    // Return fallback or null if icon not found
    return fallback ? <>{fallback}</> : null;
  }

  return <IconComponent {...props} />;
}

/**
 * Check if an icon name exists in Lucide icons
 */
export function isValidLucideIcon(name: string): boolean {
  return name in LucideIcons;
}
