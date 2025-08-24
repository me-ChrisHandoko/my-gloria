import { useState, useEffect, useRef, useMemo } from 'react';

interface UseVirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  itemCount: number;
  scrollElement?: HTMLElement | null;
}

interface VirtualScrollResult {
  virtualItems: Array<{
    index: number;
    start: number;
    size: number;
  }>;
  totalSize: number;
  scrollElementRef: React.RefObject<HTMLDivElement>;
  measureElement: (el: HTMLElement | null, index: number) => void;
}

/**
 * Virtual scrolling hook for large datasets
 * Optimizes rendering by only showing visible items
 */
export function useVirtualScroll({
  itemHeight,
  containerHeight,
  overscan = 5,
  itemCount,
  scrollElement,
}: UseVirtualScrollOptions): VirtualScrollResult {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const measurementsRef = useRef<Record<number, number>>({});

  // Calculate which items are visible
  const virtualItems = useMemo(() => {
    const visibleStart = Math.floor(scrollTop / itemHeight);
    const visibleEnd = Math.min(
      itemCount - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    const start = Math.max(0, visibleStart - overscan);
    const end = Math.min(itemCount - 1, visibleEnd + overscan);

    const items = [];
    for (let i = start; i <= end; i++) {
      const measurementHeight = measurementsRef.current[i];
      const size = measurementHeight ?? itemHeight;
      items.push({
        index: i,
        start: i * itemHeight, // Simplified - could use measured heights
        size,
      });
    }

    return items;
  }, [scrollTop, containerHeight, itemHeight, itemCount, overscan]);

  const totalSize = itemCount * itemHeight;

  // Handle scroll events
  useEffect(() => {
    const element = scrollElement || scrollElementRef.current;
    if (!element) return;

    const handleScroll = () => {
      setScrollTop(element.scrollTop);
    };

    element.addEventListener('scroll', handleScroll, { passive: true });
    return () => element.removeEventListener('scroll', handleScroll);
  }, [scrollElement]);

  // Measure actual item heights (optional, for dynamic heights)
  const measureElement = (el: HTMLElement | null, index: number) => {
    if (el) {
      const height = el.getBoundingClientRect().height;
      measurementsRef.current[index] = height;
    }
  };

  return {
    virtualItems,
    totalSize,
    scrollElementRef,
    measureElement,
  };
}

// Simpler hook for fixed-height items
export function useFixedVirtualScroll(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  return useVirtualScroll({
    itemCount,
    itemHeight,
    containerHeight,
    overscan,
  });
}