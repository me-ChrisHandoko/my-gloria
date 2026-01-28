// components/rbac/ActionButton.tsx
/**
 * ActionButton Component
 *
 * Permission-aware button that automatically handles permission checks.
 * Can be disabled or hidden based on user permissions.
 */

'use client';

import { forwardRef, ReactNode, ComponentProps } from 'react';
import { VariantProps } from 'class-variance-authority';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePermission } from '@/lib/hooks/usePermission';
import { PermissionAction, PermissionScope } from '@/lib/types/access';
import { Loader2, Lock } from 'lucide-react';

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

interface ActionButtonProps extends Omit<ButtonProps, 'disabled'> {
  /** Resource to check permission for */
  resource: string;
  /** Action to check permission for */
  action: PermissionAction;
  /** Optional scope for resource-level permissions */
  scope?: PermissionScope;
  /** If true, hides button when permission denied instead of disabling */
  hideOnDenied?: boolean;
  /** Custom tooltip text when permission is denied */
  deniedTooltip?: string;
  /** Show loading spinner while checking permissions */
  showLoading?: boolean;
  /** Icon to show when permission denied (used when disabled) */
  deniedIcon?: ReactNode;
  /** Additional disabled state (combines with permission check) */
  disabled?: boolean;
  /** Button content */
  children: ReactNode;
}

/**
 * Button that automatically checks permissions and handles denied state
 *
 * @example
 * ```tsx
 * // Basic usage - disabled when no permission
 * <ActionButton resource="employees" action="CREATE">
 *   Create Employee
 * </ActionButton>
 *
 * // Hide when no permission
 * <ActionButton resource="employees" action="DELETE" hideOnDenied>
 *   Delete
 * </ActionButton>
 *
 * // With custom denied tooltip
 * <ActionButton
 *   resource="employees"
 *   action="UPDATE"
 *   deniedTooltip="Contact admin to get edit access"
 * >
 *   Edit
 * </ActionButton>
 *
 * // Combine with other disabled conditions
 * <ActionButton
 *   resource="employees"
 *   action="UPDATE"
 *   disabled={!selectedEmployee}
 * >
 *   Edit Selected
 * </ActionButton>
 * ```
 */
export const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  (
    {
      resource,
      action,
      scope,
      hideOnDenied = false,
      deniedTooltip = 'Anda tidak memiliki izin untuk melakukan aksi ini',
      showLoading = true,
      deniedIcon = <Lock className="h-4 w-4" />,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const { hasPermission, isLoading } = usePermission(resource, action, scope);

    // Hide button if no permission and hideOnDenied is true
    if (hideOnDenied && !isLoading && !hasPermission) {
      return null;
    }

    // Show loading state
    if (isLoading && showLoading) {
      return (
        <Button ref={ref} disabled {...props}>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {children}
        </Button>
      );
    }

    // Determine if button should be disabled
    const isDisabled = disabled || !hasPermission;

    // If no permission, wrap in tooltip
    if (!hasPermission) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button
                  ref={ref}
                  disabled
                  aria-disabled="true"
                  {...props}
                >
                  {deniedIcon && <span className="mr-2">{deniedIcon}</span>}
                  {children}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{deniedTooltip}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Normal button with permission
    return (
      <Button ref={ref} disabled={isDisabled} {...props}>
        {children}
      </Button>
    );
  }
);

ActionButton.displayName = 'ActionButton';

/**
 * Shortcut components for common actions
 */

interface ActionShortcutProps extends Omit<ActionButtonProps, 'action'> {
  resource: string;
}

export const CreateButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Tambah', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="CREATE" {...props}>
      {children}
    </ActionButton>
  )
);
CreateButton.displayName = 'CreateButton';

export const ReadButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Lihat', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="READ" {...props}>
      {children}
    </ActionButton>
  )
);
ReadButton.displayName = 'ReadButton';

export const UpdateButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Edit', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="UPDATE" {...props}>
      {children}
    </ActionButton>
  )
);
UpdateButton.displayName = 'UpdateButton';

export const DeleteButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Hapus', variant = 'destructive', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="DELETE" variant={variant} {...props}>
      {children}
    </ActionButton>
  )
);
DeleteButton.displayName = 'DeleteButton';

export const ApproveButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Setuju', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="APPROVE" {...props}>
      {children}
    </ActionButton>
  )
);
ApproveButton.displayName = 'ApproveButton';

export const ExportButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Export', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="EXPORT" {...props}>
      {children}
    </ActionButton>
  )
);
ExportButton.displayName = 'ExportButton';

export const ImportButton = forwardRef<HTMLButtonElement, ActionShortcutProps>(
  ({ resource, children = 'Import', ...props }, ref) => (
    <ActionButton ref={ref} resource={resource} action="IMPORT" {...props}>
      {children}
    </ActionButton>
  )
);
ImportButton.displayName = 'ImportButton';

export default ActionButton;
