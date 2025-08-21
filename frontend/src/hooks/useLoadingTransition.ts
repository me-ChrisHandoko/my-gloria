'use client';

import { useEffect, useState, useCallback } from 'react';

interface UseLoadingTransitionOptions {
  minDuration?: number;
  fadeOutDuration?: number;
}

export function useLoadingTransition(
  isLoading: boolean,
  options: UseLoadingTransitionOptions = {}
) {
  const { minDuration = 1500, fadeOutDuration = 300 } = options;
  
  const [showLoading, setShowLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading && !showLoading) {
      // Start loading
      setShowLoading(true);
      setLoadingStartTime(Date.now());
      setIsFadingOut(false);
    } else if (!isLoading && showLoading && loadingStartTime) {
      // Stop loading with minimum duration
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, minDuration - elapsed);
      
      setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setShowLoading(false);
          setIsFadingOut(false);
          setLoadingStartTime(null);
        }, fadeOutDuration);
      }, remainingTime);
    }
  }, [isLoading, showLoading, loadingStartTime, minDuration, fadeOutDuration]);

  const forceComplete = useCallback(() => {
    setIsFadingOut(true);
    setTimeout(() => {
      setShowLoading(false);
      setIsFadingOut(false);
      setLoadingStartTime(null);
    }, fadeOutDuration);
  }, [fadeOutDuration]);

  return {
    showLoading,
    isFadingOut,
    forceComplete,
  };
}