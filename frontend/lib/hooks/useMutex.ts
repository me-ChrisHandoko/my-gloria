// lib/hooks/useMutex.ts
'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { Mutex, KeyedMutex } from '@/lib/utils/mutex';

/**
 * Hook for using a mutex in React components
 * Returns lock status and function to run operations exclusively
 */
export function useMutex() {
  const mutexRef = useRef<Mutex>(new Mutex());
  const [isLocked, setIsLocked] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  const updateStatus = useCallback(() => {
    setIsLocked(mutexRef.current.isLocked());
    setQueueLength(mutexRef.current.getQueueLength());
  }, []);

  const runExclusive = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      updateStatus();
      try {
        const result = await mutexRef.current.runExclusive(fn);
        updateStatus();
        return result;
      } catch (error) {
        updateStatus();
        throw error;
      }
    },
    [updateStatus]
  );

  return {
    isLocked,
    queueLength,
    runExclusive,
    mutex: mutexRef.current,
  };
}

/**
 * Hook for using a keyed mutex in React components
 * Useful for managing multiple independent locks
 */
export function useKeyedMutex() {
  const mutexRef = useRef<KeyedMutex>(new KeyedMutex());
  const [lockedKeys, setLockedKeys] = useState<Set<string>>(new Set());

  const updateStatus = useCallback((key: string) => {
    setLockedKeys((prev) => {
      const next = new Set(prev);
      if (mutexRef.current.isLocked(key)) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const runExclusive = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
      updateStatus(key);
      try {
        const result = await mutexRef.current.runExclusive(key, fn);
        updateStatus(key);
        mutexRef.current.cleanup(key);
        return result;
      } catch (error) {
        updateStatus(key);
        throw error;
      }
    },
    [updateStatus]
  );

  const isLocked = useCallback(
    (key: string) => lockedKeys.has(key),
    [lockedKeys]
  );

  const getQueueLength = useCallback(
    (key: string) => mutexRef.current.getQueueLength(key),
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mutexRef.current.cleanupAll();
    };
  }, []);

  return {
    isLocked,
    getQueueLength,
    runExclusive,
    lockedKeys,
    mutex: mutexRef.current,
  };
}

/**
 * Hook to prevent duplicate form submissions
 * Returns a wrapped submit handler that prevents concurrent submissions
 */
export function useFormMutex<T = any>(
  onSubmit: (data: T) => Promise<void>,
  formId?: string
) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const mutexRef = useRef<Mutex>(new Mutex());

  const handleSubmit = useCallback(
    async (data: T) => {
      if (isSubmitting) {
        console.warn(`Form submission already in progress${formId ? ` for ${formId}` : ''}`);
        return;
      }

      setIsSubmitting(true);
      try {
        await mutexRef.current.runExclusive(() => onSubmit(data));
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, isSubmitting, formId]
  );

  return {
    handleSubmit,
    isSubmitting,
  };
}

/**
 * Hook to deduplicate API calls
 * Returns same promise if called while previous call is pending
 */
export function useDedupedCallback<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const pendingCalls = useRef<Map<string, Promise<any>>>(new Map());

  const dedupedCallback = useCallback(
    (async (...args: Parameters<T>) => {
      const key = getKey ? getKey(...args) : 'default';

      // Return existing promise if call is pending
      if (pendingCalls.current.has(key)) {
        return pendingCalls.current.get(key);
      }

      // Create new promise
      const promise = callback(...args)
        .then((result) => {
          pendingCalls.current.delete(key);
          return result;
        })
        .catch((error) => {
          pendingCalls.current.delete(key);
          throw error;
        });

      pendingCalls.current.set(key, promise);
      return promise;
    }) as T,
    [callback, getKey]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      pendingCalls.current.clear();
    };
  }, []);

  return dedupedCallback;
}
