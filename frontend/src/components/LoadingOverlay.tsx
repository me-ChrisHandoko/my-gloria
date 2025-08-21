'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';

interface LoadingOverlayProps {
  message?: string;
  subMessage?: string;
  showProgress?: boolean;
  minDuration?: number;
}

export function LoadingOverlay({
  message = 'Authenticating...',
  subMessage = 'Please wait a moment',
  showProgress = true,
  minDuration = 0
}: LoadingOverlayProps) {
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [previousOverflow, setPreviousOverflow] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const scrollPositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!showProgress) return;

    // Simulate progress for better UX
    const startTime = Date.now();
    const duration = minDuration || 2000;
    
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min((elapsed / duration) * 100, 95);
      setProgress(percentage);
      
      if (elapsed >= duration) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [showProgress, minDuration]);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Store current scroll position
    scrollPositionRef.current = {
      x: window.scrollX,
      y: window.scrollY
    };

    // Add enter animation
    const timeout = setTimeout(() => {
      setIsVisible(true);
    }, 10);

    // Store the previous overflow value and prevent body scroll
    const currentOverflow = document.body.style.overflow || '';
    setPreviousOverflow(currentOverflow);
    
    // Use a different approach: lock body position instead of overflow hidden
    const scrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    
    return () => {
      clearTimeout(timeout);
      
      // Restore body position
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      
      // Restore scroll position
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    };
  }, [isMounted]);

  // Don't render on server side
  if (!isMounted) {
    return null;
  }

  const overlayContent = (
    <div 
      className={`
        fixed inset-0 z-[9999] flex items-center justify-center
        bg-background/95 backdrop-blur-sm
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        overflow-y-auto
      `}
      style={{ isolation: 'isolate' }}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="relative w-full max-w-md px-6">
        {/* Main loading container */}
        <div className="relative bg-card/50 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border/50 animate-in fade-in-0 zoom-in-95 duration-500">
          
          {/* Logo or Brand Icon (optional) */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              {/* Animated ring */}
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping"></div>
              
              {/* Main spinner */}
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                
                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 rounded-full bg-primary/10 animate-pulse"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground animate-in fade-in-0 slide-in-from-bottom-1 duration-500">
              {message}
            </h3>
            <p className="text-sm text-muted-foreground animate-in fade-in-0 slide-in-from-bottom-2 duration-700 delay-100">
              {subMessage}
            </p>
          </div>

          {/* Progress bar */}
          {showProgress && (
            <div className="mt-6 space-y-2 animate-in fade-in-0 slide-in-from-bottom-3 duration-700 delay-200">
              <div className="relative h-2 bg-secondary/50 rounded-full overflow-hidden">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground/60 text-center">
                {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {/* Step indicators (optional) */}
          <div className="mt-6 flex justify-center space-x-1 animate-in fade-in-0 duration-1000 delay-300">
            {[1, 2, 3].map((step, index) => (
              <div
                key={step}
                className={`
                  w-2 h-2 rounded-full transition-all duration-500
                  ${index === 0 ? 'bg-primary animate-pulse' : 
                    index === 1 ? 'bg-primary/50' : 'bg-primary/20'}
                `}
                style={{
                  animationDelay: `${index * 200}ms`
                }}
              />
            ))}
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  // Use portal to render outside of normal DOM hierarchy
  return createPortal(overlayContent, document.body);
}