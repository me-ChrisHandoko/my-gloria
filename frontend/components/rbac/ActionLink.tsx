// components/rbac/ActionLink.tsx
/**
 * ActionLink Component
 *
 * Permission-aware link that automatically handles permission checks.
 * Uses Next.js Link for client-side navigation with native browser behavior.
 * Supports Ctrl+Click, middle-click, and right-click context menu.
 */

'use client';

import { forwardRef, ReactNode } from 'react';
import Link from 'next/link';
import { VariantProps } from 'class-variance-authority';
import { buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermission } from '@/lib/hooks/usePermission';
import { PermissionAction, PermissionScope } from '@/lib/types/access';
import { Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionLinkProps extends VariantProps<typeof buttonVariants> {
  /** Navigation destination */
  href: string;
  /** Resource to check permission for */
  resource: string;
  /** Action to check permission for */
  action: PermissionAction;
  /** Optional scope for resource-level permissions */
  scope?: PermissionScope;
  /** If true, hides link when permission denied instead of showing disabled state */
  hideOnDenied?: boolean;
  /** Custom tooltip text when permission is denied */
  deniedTooltip?: string;
  /** Show loading spinner while checking permissions */
  showLoading?: boolean;
  /** Icon to show when permission denied */
  deniedIcon?: ReactNode;
  /** Additional className */
  className?: string;
  /** Link content */
  children: ReactNode;
  /** Prefetch the page in the background */
  prefetch?: boolean;
}

/**
 * Link that automatically checks permissions and handles denied state.
 * Renders as Next.js Link for optimal navigation performance.
 *
 * @example
 * ```tsx
 * // Basic usage - hidden when no permission
 * <ActionLink href="/roles/create" resource="roles" action="CREATE">
 *   Tambah Role
 * </ActionLink>
 *
 * // With icon
 * <ActionLink href="/roles/create" resource="roles" action="CREATE">
 *   <Plus className="mr-2 h-4 w-4" />
 *   Tambah Role
 * </ActionLink>
 *
 * // Different variant and size
 * <ActionLink
 *   href="/roles/1/edit"
 *   resource="roles"
 *   action="UPDATE"
 *   variant="outline"
 *   size="sm"
 * >
 *   Edit
 * </ActionLink>
 *
 * // Show disabled state instead of hiding
 * <ActionLink
 *   href="/roles/create"
 *   resource="roles"
 *   action="CREATE"
 *   hideOnDenied={false}
 *   deniedTooltip="Hubungi admin untuk akses"
 * >
 *   Tambah Role
 * </ActionLink>
 * ```
 */
export const ActionLink = forwardRef<HTMLAnchorElement, ActionLinkProps>(
  (
    {
      href,
      resource,
      action,
      scope,
      hideOnDenied = true,
      deniedTooltip = 'Anda tidak memiliki izin untuk mengakses halaman ini',
      showLoading = true,
      deniedIcon = <Lock className="h-4 w-4" />,
      variant = 'default',
      size = 'default',
      className,
      children,
      prefetch = true,
      ...props
    },
    ref
  ) => {
    const { hasPermission, isLoading } = usePermission(resource, action, scope);

    const linkClasses = cn(buttonVariants({ variant, size, className }));

    // Show loading state
    if (isLoading && showLoading) {
      return (
        <span className={cn(linkClasses, 'pointer-events-none opacity-50')}>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {children}
        </span>
      );
    }

    // Hide link if no permission and hideOnDenied is true
    if (!hasPermission && hideOnDenied) {
      return null;
    }

    // Show disabled state with tooltip if no permission
    if (!hasPermission) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className={cn(linkClasses, 'pointer-events-none opacity-50 cursor-not-allowed')}
                tabIndex={0}
                aria-disabled="true"
              >
                {deniedIcon && <span className="mr-2">{deniedIcon}</span>}
                {children}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{deniedTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Normal link with permission
    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        className={linkClasses}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

ActionLink.displayName = 'ActionLink';

/**
 * Shortcut components for common navigation actions
 */

interface ActionLinkShortcutProps extends Omit<ActionLinkProps, 'action'> {
  resource: string;
}

export const CreateLink = forwardRef<HTMLAnchorElement, ActionLinkShortcutProps>(
  ({ resource, children = 'Tambah', ...props }, ref) => (
    <ActionLink ref={ref} resource={resource} action="CREATE" {...props}>
      {children}
    </ActionLink>
  )
);
CreateLink.displayName = 'CreateLink';

export const ViewLink = forwardRef<HTMLAnchorElement, ActionLinkShortcutProps>(
  ({ resource, children = 'Lihat', variant = 'outline', ...props }, ref) => (
    <ActionLink ref={ref} resource={resource} action="READ" variant={variant} {...props}>
      {children}
    </ActionLink>
  )
);
ViewLink.displayName = 'ViewLink';

export const EditLink = forwardRef<HTMLAnchorElement, ActionLinkShortcutProps>(
  ({ resource, children = 'Edit', variant = 'outline', ...props }, ref) => (
    <ActionLink ref={ref} resource={resource} action="UPDATE" variant={variant} {...props}>
      {children}
    </ActionLink>
  )
);
EditLink.displayName = 'EditLink';

export default ActionLink;
