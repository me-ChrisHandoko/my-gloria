/**
 * EmptyState Component
 *
 * Reusable component for displaying empty states with:
 * - Custom icon/illustration
 * - Title and description
 * - Primary and secondary actions (CTA)
 * - Responsive layout
 */

"use client";

import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost" | "destructive";
  icon?: LucideIcon;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  iconClassName?: string;
  title: string;
  description: string | React.ReactNode;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  iconClassName = "text-muted-foreground",
  title,
  description,
  primaryAction,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <Card className={`p-12 ${className}`}>
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {/* Icon/Illustration */}
        <div className="rounded-full bg-muted/50 p-6">
          <Icon className={`h-12 w-12 ${iconClassName}`} />
        </div>

        {/* Content */}
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-semibold tracking-tight">{title}</h3>

          {typeof description === 'string' ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          ) : (
            description
          )}
        </div>

        {/* Actions */}
        {(primaryAction || secondaryAction) && (
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                variant={primaryAction.variant || "default"}
                className="min-w-[140px]"
              >
                {primaryAction.icon && (
                  <primaryAction.icon className="mr-2 h-4 w-4" />
                )}
                {primaryAction.label}
              </Button>
            )}

            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                variant={secondaryAction.variant || "outline"}
                className="min-w-[140px]"
              >
                {secondaryAction.icon && (
                  <secondaryAction.icon className="mr-2 h-4 w-4" />
                )}
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/**
 * Preset EmptyState variants for common scenarios
 */

interface PresetEmptyStateProps {
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
}

// No Data - First time empty state
export function NoDataEmptyState({
  onPrimaryAction
}: {
  onPrimaryAction?: () => void;
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
}) {
  return function EmptyStateComponent(props: PresetEmptyStateProps & {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel: string;
  }) {
    return (
      <EmptyState
        icon={props.icon}
        iconClassName="text-primary"
        title={props.title}
        description={props.description}
        primaryAction={props.onPrimaryAction ? {
          label: props.actionLabel,
          onClick: props.onPrimaryAction,
          variant: "default",
        } : undefined}
      />
    );
  };
}

// No Results - After filtering/searching
export function NoResultsEmptyState({
  onClearFilters,
}: {
  onClearFilters: () => void;
  icon?: LucideIcon;
  title?: string;
  description?: string;
}) {
  return function EmptyStateComponent(props: {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    onClearFilters: () => void;
  }) {
    const { Search } = require("lucide-react");
    const Icon = props.icon || Search;

    return (
      <EmptyState
        icon={Icon}
        iconClassName="text-muted-foreground"
        title={props.title || "Tidak ada hasil ditemukan"}
        description={props.description || "Tidak ada data yang sesuai dengan filter atau pencarian Anda. Coba ubah kriteria pencarian atau reset filter."}
        primaryAction={{
          label: "Reset Filter",
          onClick: props.onClearFilters,
          variant: "outline",
        }}
      />
    );
  };
}

// Error State
export function ErrorEmptyState({
  onRetry,
  error,
}: {
  onRetry: () => void;
  error?: string;
}) {
  return function EmptyStateComponent(props: {
    onRetry: () => void;
    error?: string;
  }) {
    const { AlertCircle } = require("lucide-react");

    return (
      <EmptyState
        icon={AlertCircle}
        iconClassName="text-destructive"
        title="Terjadi Kesalahan"
        description={
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {props.error || "Gagal memuat data. Silakan coba lagi."}
            </p>
            <p className="text-xs text-muted-foreground">
              Jika masalah berlanjut, hubungi administrator sistem.
            </p>
          </div>
        }
        primaryAction={{
          label: "Coba Lagi",
          onClick: props.onRetry,
          variant: "default",
        }}
      />
    );
  };
}
