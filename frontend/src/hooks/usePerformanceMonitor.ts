import { useEffect, useRef, useState, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentMounts: number;
  rerenders: number;
  lastRenderTime: number;
  averageRenderTime: number;
  maxRenderTime: number;
}

interface PerformanceMonitorOptions {
  enabled?: boolean;
  logToConsole?: boolean;
  componentName?: string;
  warningThreshold?: number; // ms
}

/**
 * Hook for monitoring component performance
 * Tracks render times, mount counts, and re-render frequency
 */
export function usePerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = true,
  componentName = 'Unknown Component',
  warningThreshold = 16, // 60fps = 16.67ms per frame
}: PerformanceMonitorOptions = {}) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMounts: 0,
    rerenders: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    maxRenderTime: 0,
  });

  const renderStartTime = useRef<number>();
  const renderTimes = useRef<number[]>([]);
  const mountTime = useRef<number>();

  // Track render start
  useEffect(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  });

  // Track render end and calculate metrics
  useEffect(() => {
    if (!enabled || !renderStartTime.current) return;

    const renderEndTime = performance.now();
    const renderDuration = renderEndTime - renderStartTime.current;
    
    renderTimes.current.push(renderDuration);
    
    // Keep only last 100 render times for memory efficiency
    if (renderTimes.current.length > 100) {
      renderTimes.current.shift();
    }

    const averageRenderTime = renderTimes.current.reduce((a, b) => a + b, 0) / renderTimes.current.length;
    const maxRenderTime = Math.max(...renderTimes.current);

    setMetrics(prev => ({
      renderTime: renderDuration,
      componentMounts: prev.componentMounts,
      rerenders: prev.rerenders + 1,
      lastRenderTime: renderDuration,
      averageRenderTime,
      maxRenderTime,
    }));

    // Log performance warnings
    if (logToConsole && renderDuration > warningThreshold) {
      console.warn(
        `⚠️ Slow render detected in ${componentName}: ${renderDuration.toFixed(2)}ms`,
        {
          renderTime: renderDuration,
          average: averageRenderTime,
          max: maxRenderTime,
          threshold: warningThreshold,
        }
      );
    }
  });

  // Track component mount
  useEffect(() => {
    if (!enabled) return;
    
    mountTime.current = performance.now();
    setMetrics(prev => ({
      ...prev,
      componentMounts: prev.componentMounts + 1,
    }));

    if (logToConsole) {
      console.log(`🚀 Component mounted: ${componentName}`);
    }

    // Cleanup on unmount
    return () => {
      if (!enabled) return;
      
      const unmountTime = performance.now();
      const lifetime = mountTime.current ? unmountTime - mountTime.current : 0;
      
      if (logToConsole) {
        console.log(`👋 Component unmounted: ${componentName}`, {
          lifetime: `${lifetime.toFixed(2)}ms`,
          totalRenders: renderTimes.current.length,
          averageRenderTime: metrics.averageRenderTime.toFixed(2),
          maxRenderTime: metrics.maxRenderTime.toFixed(2),
        });
      }
    };
  }, [enabled, logToConsole, componentName, metrics.averageRenderTime, metrics.maxRenderTime]);

  const getReport = useCallback(() => ({
    componentName,
    ...metrics,
    renderHistory: [...renderTimes.current],
    lifetimeMs: mountTime.current ? performance.now() - mountTime.current : 0,
  }), [componentName, metrics]);

  return {
    metrics,
    getReport,
    isSlowRender: metrics.lastRenderTime > warningThreshold,
  };
}

// Global performance tracking
interface GlobalPerformanceData {
  components: Map<string, PerformanceMetrics>;
  totalComponents: number;
  slowComponents: string[];
}

class PerformanceTracker {
  private static instance: PerformanceTracker;
  private data: GlobalPerformanceData = {
    components: new Map(),
    totalComponents: 0,
    slowComponents: [],
  };

  static getInstance(): PerformanceTracker {
    if (!PerformanceTracker.instance) {
      PerformanceTracker.instance = new PerformanceTracker();
    }
    return PerformanceTracker.instance;
  }

  updateComponent(name: string, metrics: PerformanceMetrics) {
    this.data.components.set(name, metrics);
    
    // Track slow components
    if (metrics.averageRenderTime > 16 && !this.data.slowComponents.includes(name)) {
      this.data.slowComponents.push(name);
    }
  }

  getGlobalReport() {
    return {
      ...this.data,
      totalComponents: this.data.components.size,
      averageRenderTime: Array.from(this.data.components.values())
        .reduce((sum, metrics) => sum + metrics.averageRenderTime, 0) / this.data.components.size,
    };
  }

  reset() {
    this.data.components.clear();
    this.data.slowComponents = [];
  }
}

// Make performance tracker available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__performanceTracker = PerformanceTracker.getInstance();
}

// Utility for component performance profiling
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  options?: PerformanceMonitorOptions
) {
  const WrappedComponent = (props: P) => {
    usePerformanceMonitor({
      ...options,
      componentName: options?.componentName || Component.displayName || Component.name,
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  return WrappedComponent;
}