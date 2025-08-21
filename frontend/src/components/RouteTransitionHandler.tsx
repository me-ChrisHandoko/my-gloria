'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { LoadingOverlay } from './LoadingOverlay';

export function RouteTransitionHandler() {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);
  const [transitionMessage, setTransitionMessage] = useState('Loading...');

  useEffect(() => {
    // Detect route changes
    if (previousPath !== pathname) {
      console.log(`🔀 Route change detected: ${previousPath} → ${pathname}`);
      
      // Define which transitions need loading overlay
      const needsLoading = () => {
        // From sign-in to dashboard (after OAuth)
        if (previousPath?.includes('/sign-in') && pathname?.includes('/dashboard')) {
          setTransitionMessage('Setting up your dashboard...');
          return true;
        }
        
        // From any page to dashboard
        if (!previousPath?.includes('/dashboard') && pathname?.includes('/dashboard')) {
          setTransitionMessage('Loading dashboard...');
          return true;
        }
        
        // Between major sections
        const majorSections = ['/dashboard', '/profile', '/settings', '/admin'];
        const fromMajor = majorSections.some(section => previousPath?.includes(section));
        const toMajor = majorSections.some(section => pathname?.includes(section));
        
        if (fromMajor && toMajor && previousPath !== pathname) {
          setTransitionMessage('Loading...');
          return true;
        }
        
        return false;
      };

      if (needsLoading()) {
        setIsTransitioning(true);
        
        // Hide loading after a short delay
        const timer = setTimeout(() => {
          setIsTransitioning(false);
        }, 600);
        
        return () => clearTimeout(timer);
      }
      
      setPreviousPath(pathname);
    }
  }, [pathname, previousPath]);

  if (!isTransitioning) {
    return null;
  }

  return (
    <LoadingOverlay
      message={transitionMessage}
      subMessage="Please wait"
      showProgress={false}
      minDuration={600}
    />
  );
}