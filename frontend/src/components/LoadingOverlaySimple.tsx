'use client';

import { useEffect, useState } from 'react';

interface LoadingOverlaySimpleProps {
  message?: string;
  subMessage?: string;
}

// Simplified loading overlay that avoids scroll restoration issues
export function LoadingOverlaySimple({
  message = 'Loading...',
  subMessage = 'Please wait'
}: LoadingOverlaySimpleProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Delay visibility for smooth animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div 
      className={`
        absolute inset-0 z-[9999] flex items-center justify-center
        bg-background/95 backdrop-blur-sm
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
        min-h-screen
      `}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="relative w-full max-w-md px-6">
        <div className="relative bg-card/50 backdrop-blur-md rounded-2xl p-8 shadow-2xl border border-border/50 animate-in fade-in-0 zoom-in-95 duration-500">
          
          {/* Simple spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {message}
            </h3>
            <p className="text-sm text-muted-foreground">
              {subMessage}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}