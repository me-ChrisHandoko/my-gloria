import { useCallback, useState } from 'react';
import { toast } from 'sonner';

interface ErrorRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  showToast?: boolean;
}

interface ErrorRecoveryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
}

/**
 * Hook for handling error recovery with automatic retries
 * Useful for API calls, form submissions, and other fallible operations
 */
export function useErrorRecovery({
  maxRetries = 3,
  retryDelay = 1000,
  onError,
  onSuccess,
  showToast = true,
}: ErrorRecoveryOptions = {}) {
  const [state, setState] = useState<ErrorRecoveryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
  });

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    customOptions?: Partial<ErrorRecoveryOptions>
  ): Promise<T> => {
    const options = { maxRetries, retryDelay, onError, onSuccess, showToast, ...customOptions };
    
    setState(prev => ({ ...prev, isRetrying: true }));

    for (let attempt = 0; attempt <= options.maxRetries!; attempt++) {
      try {
        const result = await operation();
        
        // Success
        setState({
          isRetrying: false,
          retryCount: 0,
          lastError: null,
        });
        
        if (options.showToast && attempt > 0) {
          toast.success(`Operation succeeded after ${attempt} ${attempt === 1 ? 'retry' : 'retries'}`);
        }
        
        options.onSuccess?.();
        return result;
        
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        
        setState(prev => ({
          ...prev,
          retryCount: attempt + 1,
          lastError: errorObj,
        }));

        // If this was the last attempt, throw the error
        if (attempt === options.maxRetries) {
          setState(prev => ({ ...prev, isRetrying: false }));
          
          if (options.showToast) {
            toast.error(`Operation failed after ${options.maxRetries + 1} attempts`, {
              description: errorObj.message,
            });
          }
          
          options.onError?.(errorObj);
          throw errorObj;
        }

        // Wait before retrying (with exponential backoff)
        const delay = options.retryDelay! * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (options.showToast) {
          toast.info(`Retrying... (${attempt + 1}/${options.maxRetries})`, {
            description: `Retrying in ${delay}ms`,
          });
        }
      }
    }

    // This should never be reached
    throw new Error('Unexpected error in retry logic');
  }, [maxRetries, retryDelay, onError, onSuccess, showToast]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
    });
  }, []);

  return {
    execute,
    reset,
    ...state,
    canRetry: state.retryCount < maxRetries,
  };
}

// Utility function for API calls with automatic retry
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorRecoveryOptions
): T {
  return ((...args: Parameters<T>) => {
    const { execute } = useErrorRecovery(options);
    return execute(() => fn(...args));
  }) as T;
}

// React Query integration helper
export function useQueryWithRetry<T>(
  queryKey: string[],
  queryFn: () => Promise<T>,
  options?: ErrorRecoveryOptions & { enabled?: boolean }
) {
  const { execute, isRetrying, lastError, retryCount } = useErrorRecovery(options);
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (options?.enabled === false) return;
    
    setIsLoading(true);
    try {
      const result = await execute(queryFn);
      setData(result);
    } catch (error) {
      // Error is already handled by useErrorRecovery
    } finally {
      setIsLoading(false);
    }
  }, [execute, queryFn, options?.enabled]);

  return {
    data,
    error: lastError,
    isLoading: isLoading || isRetrying,
    retryCount,
    refetch,
  };
}