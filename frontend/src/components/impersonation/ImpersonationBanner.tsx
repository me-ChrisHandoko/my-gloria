'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X, Clock, User, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useGetImpersonationSessionQuery,
  useStopImpersonationMutation,
  useRefreshImpersonationSessionMutation,
} from '@/store/api/impersonationApi';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function ImpersonationBanner() {
  const { data: session, isLoading, error } = useGetImpersonationSessionQuery(undefined, {
    pollingInterval: 30000, // Poll every 30 seconds
  });
  
  // Don't show banner if API returns 404 (not implemented yet)
  const isApiNotImplemented = error && (error as any)?.status === 404;
  const [stopImpersonation, { isLoading: isStopping }] = useStopImpersonationMutation();
  const [refreshSession, { isLoading: isRefreshing }] = useRefreshImpersonationSessionMutation();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);

  useEffect(() => {
    if (!session?.isActive) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(session.expiresAt).getTime();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

      if (remaining === 0) {
        toast.warning('Impersonation session has expired');
        return;
      }

      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      setTimeRemaining(`${minutes}m ${seconds}s`);
      
      // Warning when less than 5 minutes remaining
      setIsExpiringSoon(remaining < 300);
      
      // Auto-refresh when less than 10 minutes remaining
      if (remaining < 600 && remaining > 300) {
        handleRefresh();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const handleStopImpersonation = async () => {
    if (!window.confirm('Are you sure you want to stop impersonating this user?')) {
      return;
    }

    try {
      await stopImpersonation().unwrap();
      toast.success('Impersonation stopped successfully');
      // Reload the page to refresh the session
      window.location.reload();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to stop impersonation');
    }
  };

  const handleRefresh = async () => {
    try {
      await refreshSession().unwrap();
      toast.success('Session refreshed successfully');
    } catch (error: any) {
      console.error('Failed to refresh session:', error);
    }
  };

  if (isLoading || !session?.isActive || isApiNotImplemented) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-gradient-to-r px-4 py-3 shadow-lg',
        isExpiringSoon
          ? 'from-red-500 to-orange-500'
          : 'from-yellow-500 to-amber-500'
      )}
    >
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-white animate-pulse" />
            <span className="text-white font-semibold">Impersonation Mode Active</span>
          </div>
          
          <div className="flex items-center gap-3 text-white/90">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4" />
              <span className="text-sm">
                Original: <strong>{session.originalUser.email}</strong>
              </span>
            </div>
            
            <div className="text-white/60">→</div>
            
            <div className="flex items-center gap-1.5">
              <User className="h-4 w-4" />
              <span className="text-sm">
                Impersonating: <strong>{session.impersonatedUser.name || session.impersonatedUser.email}</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className={cn(
              "h-4 w-4 text-white",
              isExpiringSoon && "animate-pulse"
            )} />
            <Badge
              variant="secondary"
              className={cn(
                "text-xs font-mono",
                isExpiringSoon
                  ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                  : "bg-white/20 text-white border-white/30"
              )}
            >
              {timeRemaining}
            </Badge>
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-7 bg-white/20 text-white hover:bg-white/30 border-white/30"
          >
            <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
            <span className="ml-1.5">Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={handleStopImpersonation}
            disabled={isStopping}
            className="h-7"
          >
            <X className="h-3 w-3" />
            <span className="ml-1.5">Stop Impersonation</span>
          </Button>
        </div>
      </div>

      {isExpiringSoon && (
        <Alert className="mt-2 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            Your impersonation session will expire soon. Click refresh to extend it or stop impersonation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}