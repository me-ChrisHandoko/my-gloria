/**
 * Auth Synchronization Hook
 *
 * Synchronizes authentication state across multiple browser tabs using BroadcastChannel API.
 * When user logs in/out in one tab, all other tabs are automatically synchronized.
 *
 * Features:
 * - Cross-tab logout synchronization
 * - Cross-tab user context updates
 * - Automatic page reload on auth state changes
 * - Fallback to localStorage for browsers without BroadcastChannel
 */

'use client';

import React, { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { clearAuth, setUserContext } from '@/store/slices/authSlice';
import { apiSlice } from '@/store/api/apiSlice';
import { selectUserContext } from '@/store/slices/authSlice';

type AuthSyncMessage =
  | { type: 'LOGOUT' }
  | { type: 'LOGIN'; userId: string }
  | {
      type: 'USER_CONTEXT_UPDATE';
      userContext: any;
    };

const CHANNEL_NAME = 'auth-sync';
const STORAGE_KEY = 'auth-sync-event';

/**
 * Hook for cross-tab authentication synchronization
 *
 * Usage:
 * ```tsx
 * function App() {
 *   useAuthSync();
 *   return <div>...</div>
 * }
 * ```
 */
export function useAuthSync() {
  const { userId } = useAuth();
  const dispatch = useAppDispatch();
  const userContext = useAppSelector(selectUserContext);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastMessageTimeRef = useRef<number>(0);

  // Debounce messages to prevent loops
  const shouldProcessMessage = useCallback(() => {
    const now = Date.now();
    if (now - lastMessageTimeRef.current < 1000) {
      return false; // Ignore messages within 1 second
    }
    lastMessageTimeRef.current = now;
    return true;
  }, []);

  // Initialize BroadcastChannel
  useEffect(() => {
    // Check if BroadcastChannel is supported
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported, using localStorage fallback');
      return;
    }

    try {
      channelRef.current = new BroadcastChannel(CHANNEL_NAME);

      // Listen for messages from other tabs
      channelRef.current.onmessage = (event: MessageEvent<AuthSyncMessage>) => {
        if (!shouldProcessMessage()) {
          return;
        }

        const message = event.data;

        switch (message.type) {
          case 'LOGOUT':
            // Another tab logged out → log out this tab too
            console.log('[AuthSync] Logout detected from another tab');
            dispatch(clearAuth());
            dispatch(apiSlice.util.resetApiState());

            // Reload page to clear all state
            window.location.href = '/sign-in';
            break;

          case 'LOGIN':
            // Another tab logged in → refresh this tab
            console.log('[AuthSync] Login detected from another tab');
            if (!userId) {
              window.location.reload();
            }
            break;

          case 'USER_CONTEXT_UPDATE':
            // Another tab updated user context → sync this tab
            console.log('[AuthSync] User context updated in another tab');
            if (message.userContext) {
              dispatch(setUserContext(message.userContext));
            }
            break;
        }
      };
    } catch (error) {
      console.error('[AuthSync] Failed to initialize BroadcastChannel:', error);
    }

    return () => {
      if (channelRef.current) {
        channelRef.current.close();
      }
    };
  }, [dispatch, userId, shouldProcessMessage]);

  // Broadcast logout to other tabs
  const broadcastLogout = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'LOGOUT' } as AuthSyncMessage);
    }

    // Fallback: also use localStorage event
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ type: 'LOGOUT', timestamp: Date.now() }));
      localStorage.removeItem(STORAGE_KEY); // Remove immediately to trigger storage event
    }
  }, []);

  // Broadcast login to other tabs
  const broadcastLogin = useCallback(
    (newUserId: string) => {
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'LOGIN', userId: newUserId } as AuthSyncMessage);
      }

      // Fallback: also use localStorage event
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ type: 'LOGIN', userId: newUserId, timestamp: Date.now() })
        );
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    []
  );

  // Broadcast user context update to other tabs
  const broadcastUserContextUpdate = useCallback(() => {
    if (channelRef.current && userContext) {
      channelRef.current.postMessage({
        type: 'USER_CONTEXT_UPDATE',
        userContext,
      } as AuthSyncMessage);
    }
  }, [userContext]);

  // Detect logout in current tab
  useEffect(() => {
    if (!userId && userContext) {
      // User logged out in this tab → broadcast to other tabs
      broadcastLogout();
    }
  }, [userId, userContext, broadcastLogout]);

  // Detect login in current tab
  useEffect(() => {
    if (userId && !userContext) {
      // User logged in this tab → broadcast to other tabs
      broadcastLogin(userId);
    }
  }, [userId, userContext, broadcastLogin]);

  // Detect user context updates
  useEffect(() => {
    if (userContext) {
      // User context updated → broadcast to other tabs (debounced)
      const timeoutId = setTimeout(() => {
        broadcastUserContextUpdate();
      }, 500);

      return () => clearTimeout(timeoutId);
    }
  }, [userContext, broadcastUserContextUpdate]);

  // localStorage fallback for browsers without BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;

      if (!shouldProcessMessage()) return;

      try {
        const message = JSON.parse(e.newValue);

        switch (message.type) {
          case 'LOGOUT':
            console.log('[AuthSync] Logout detected via localStorage');
            dispatch(clearAuth());
            dispatch(apiSlice.util.resetApiState());
            window.location.href = '/sign-in';
            break;

          case 'LOGIN':
            console.log('[AuthSync] Login detected via localStorage');
            if (!userId) {
              window.location.reload();
            }
            break;
        }
      } catch (error) {
        console.error('[AuthSync] Failed to parse storage event:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [dispatch, userId, shouldProcessMessage]);

  return {
    broadcastLogout,
    broadcastLogin,
    broadcastUserContextUpdate,
  };
}
