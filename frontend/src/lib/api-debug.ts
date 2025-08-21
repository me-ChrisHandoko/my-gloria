/**
 * API Debugging Utilities
 * 
 * These utilities help debug API calls made through clerkBaseQueryV3.
 * Access them in the browser console for troubleshooting.
 * 
 * Usage in browser console:
 * - window.__apiLogs.getLast(20) - Get last 20 requests and responses
 * - window.__apiLogs.clear() - Clear all logs
 * - window.apiDebug.showFailedRequests() - Show only failed requests
 * - window.apiDebug.showSlowRequests(1000) - Show requests slower than 1 second
 * - window.apiDebug.getAuthStatus() - Check current authentication status
 */

export interface ApiDebugTools {
  showFailedRequests: () => any[];
  showSlowRequests: (thresholdMs?: number) => any[];
  getAuthStatus: () => Promise<{
    isAuthenticated: boolean;
    hasToken: boolean;
    tokenPreview?: string;
  }>;
  exportLogs: () => string;
  analyzePerformance: () => {
    averageResponseTime: number;
    slowestEndpoints: any[];
    failureRate: number;
  };
}

// Initialize debugging tools
if (typeof window !== 'undefined') {
  const apiDebug: ApiDebugTools = {
    // Show all failed requests
    showFailedRequests: () => {
      const logs = (window as any).__apiLogs;
      if (!logs) {
        console.warn('API logs not available. Make sure clerkBaseQueryV3 is loaded.');
        return [];
      }
      
      const failed = logs.responses.filter((r: any) => r.status >= 400 || r.error);
      console.table(failed);
      return failed;
    },
    
    // Show slow requests
    showSlowRequests: (thresholdMs = 1000) => {
      const logs = (window as any).__apiLogs;
      if (!logs) {
        console.warn('API logs not available.');
        return [];
      }
      
      const slow = logs.responses.filter((r: any) => r.duration > thresholdMs);
      console.table(slow);
      return slow;
    },
    
    // Check authentication status
    getAuthStatus: async () => {
      const getTokenFn = (window as any).__getClerkToken;
      const clerk = (window as any).Clerk;
      
      let hasToken = false;
      let tokenPreview = '';
      
      if (getTokenFn) {
        try {
          const token = await getTokenFn();
          if (token) {
            hasToken = true;
            // Show first and last 10 characters of token for debugging
            tokenPreview = `${token.substring(0, 10)}...${token.substring(token.length - 10)}`;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
      }
      
      const status = {
        isAuthenticated: clerk?.user !== null,
        hasToken,
        tokenPreview: hasToken ? tokenPreview : undefined,
      };
      
      console.log('🔐 Authentication Status:', status);
      return status;
    },
    
    // Export logs as JSON
    exportLogs: () => {
      const logs = (window as any).__apiLogs;
      if (!logs) {
        console.warn('API logs not available.');
        return '{}';
      }
      
      const data = JSON.stringify({
        requests: logs.requests,
        responses: logs.responses,
        timestamp: new Date().toISOString(),
      }, null, 2);
      
      console.log('📋 Logs exported to clipboard');
      navigator.clipboard.writeText(data);
      return data;
    },
    
    // Analyze API performance
    analyzePerformance: () => {
      const logs = (window as any).__apiLogs;
      if (!logs || !logs.responses || logs.responses.length === 0) {
        console.warn('No API logs available for analysis.');
        return {
          averageResponseTime: 0,
          slowestEndpoints: [],
          failureRate: 0,
        };
      }
      
      const responses = logs.responses;
      
      // Calculate average response time
      const totalTime = responses.reduce((sum: number, r: any) => sum + (r.duration || 0), 0);
      const avgTime = Math.round(totalTime / responses.length);
      
      // Find slowest endpoints
      const slowest = [...responses]
        .sort((a: any, b: any) => (b.duration || 0) - (a.duration || 0))
        .slice(0, 5)
        .map((r: any) => ({
          url: r.url,
          method: r.method,
          duration: r.duration,
          status: r.status,
        }));
      
      // Calculate failure rate
      const failures = responses.filter((r: any) => r.status >= 400 || r.error).length;
      const failureRate = Math.round((failures / responses.length) * 100);
      
      const analysis = {
        averageResponseTime: avgTime,
        slowestEndpoints: slowest,
        failureRate,
      };
      
      console.log('📊 API Performance Analysis:');
      console.log(`Average Response Time: ${avgTime}ms`);
      console.log(`Failure Rate: ${failureRate}%`);
      console.log('Slowest Endpoints:');
      console.table(slowest);
      
      return analysis;
    },
  };
  
  // Make debugging tools globally available
  (window as any).apiDebug = apiDebug;
  
  // Log availability
  console.log(
    '%c🔧 API Debug Tools Available',
    'color: #4CAF50; font-weight: bold;',
    '\nUse window.apiDebug or window.__apiLogs in console'
  );
}

export default {};