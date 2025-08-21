'use client';

import { useState, useEffect } from 'react';
import { mockApiProvider } from '@/lib/mock-data/mock-api-provider';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Database, 
  RefreshCw, 
  X,
  ChevronUp,
  ChevronDown,
  Wifi,
  WifiOff
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function DevelopmentToolbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMockEnabled, setIsMockEnabled] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  useEffect(() => {
    // Check initial mock data status
    setIsMockEnabled(mockApiProvider.isMockDataEnabled());
  }, []);

  const handleToggleMockData = () => {
    const newStatus = mockApiProvider.toggleMockData();
    setIsMockEnabled(newStatus);
    
    if (newStatus) {
      toast.success('Mock data enabled', {
        description: 'Using sample data for development',
      });
    } else {
      toast.info('Mock data disabled', {
        description: 'Connecting to real API',
      });
    }

    // Reload the page to apply changes
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
          aria-label="Open development toolbar"
        >
          <Settings className="h-5 w-5" />
        </button>
      )}

      {/* Development panel */}
      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-4 right-4 z-50 shadow-xl border-2",
            "transition-all duration-300",
            isMinimized ? "w-80" : "w-96"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-sm">Dev Tools</span>
              <Badge variant="outline" className="text-xs">
                {process.env.NODE_ENV}
              </Badge>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                aria-label={isMinimized ? "Expand" : "Minimize"}
              >
                {isMinimized ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                aria-label="Close toolbar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          {!isMinimized && (
            <div className="p-4 space-y-4">
              {/* Mock Data Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium">Data Source</span>
                  </div>
                  <Badge 
                    variant={isMockEnabled ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {isMockEnabled ? "Mock" : "API"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleToggleMockData}
                    variant={isMockEnabled ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                  >
                    {isMockEnabled ? (
                      <>
                        <WifiOff className="mr-2 h-4 w-4" />
                        Using Mock Data
                      </>
                    ) : (
                      <>
                        <Wifi className="mr-2 h-4 w-4" />
                        Using Real API
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    title="Refresh page"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>

                {isMockEnabled && (
                  <div className="text-xs text-muted-foreground bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                    <strong>Mock Mode Active:</strong> Sample data is being used. 
                    Toggle off to connect to the real backend API.
                  </div>
                )}
              </div>

              {/* API Status */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-muted-foreground">
                    API URL: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-2 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Quick Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      localStorage.clear();
                      toast.success('Cache cleared');
                      setTimeout(() => window.location.reload(), 500);
                    }}
                  >
                    Clear Cache
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('Redux State:', (window as any).__REDUX_STORE__?.getState());
                      toast.info('Check console for Redux state');
                    }}
                  >
                    Log State
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Minimized view */}
          {isMinimized && (
            <div className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isMockEnabled ? (
                    <WifiOff className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Wifi className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    {isMockEnabled ? 'Mock Data' : 'Real API'}
                  </span>
                </div>
                <Button
                  onClick={handleToggleMockData}
                  variant="ghost"
                  size="sm"
                >
                  Toggle
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
}