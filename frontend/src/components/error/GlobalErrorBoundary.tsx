'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'page' | 'component' | 'critical';
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

// Error logging service
class ErrorLogger {
  static log(error: Error, errorInfo: ErrorInfo, level: string = 'error') {
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const errorData = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      level,
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error ${errorId}`);
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.error('Full Error Data:', errorData);
      console.groupEnd();
    }

    // In production, send to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry, LogRocket, etc.
      // window.errorReportingService?.report(errorData);
    }

    return errorId;
  }
}

export class GlobalErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = ErrorLogger.log(error, errorInfo, this.props.level);
    
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Show toast notification for non-critical errors
    if (this.props.level !== 'critical') {
      toast.error('Something went wrong', {
        description: 'The error has been logged and will be investigated.',
        action: {
          label: 'Retry',
          onClick: this.handleRetry,
        },
      });
    }
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
      });
    } else {
      toast.error('Maximum retry attempts reached');
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      const { level = 'component' } = this.props;

      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Critical errors get full page treatment
      if (level === 'critical') {
        return (
          <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-2xl">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <CardTitle className="text-2xl">Critical Error</CardTitle>
                <p className="text-muted-foreground">
                  A critical error has occurred that prevents the application from functioning properly.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {this.state.errorId && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">Error ID: {this.state.errorId}</p>
                  </div>
                )}
                
                <div className="flex justify-center gap-2">
                  <Button onClick={this.handleReload} variant="default">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reload Application
                  </Button>
                  <Button onClick={this.handleGoHome} variant="outline">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium mb-2">
                      <Bug className="inline mr-1 h-4 w-4" />
                      Development Error Details
                    </summary>
                    <pre className="text-xs overflow-auto p-4 bg-muted rounded-md max-h-40">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
        );
      }

      // Component-level errors get inline treatment
      return (
        <div className="w-full p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>
              {level === 'page' ? 'Page Error' : 'Component Error'}
            </AlertTitle>
            <AlertDescription className="mt-2">
              <p>
                {level === 'page' 
                  ? 'An error occurred while loading this page.'
                  : 'A component failed to render properly.'
                }
              </p>
              
              {this.state.errorId && (
                <p className="text-xs mt-2 opacity-75">
                  Error ID: {this.state.errorId}
                </p>
              )}

              <div className="mt-4 flex gap-2">
                <Button 
                  onClick={this.handleRetry} 
                  variant="outline" 
                  size="sm"
                  disabled={this.retryCount >= this.maxRetries}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Retry ({this.maxRetries - this.retryCount} left)
                </Button>
                
                {level === 'page' && (
                  <>
                    <Button onClick={this.handleReload} variant="outline" size="sm">
                      Reload Page
                    </Button>
                    <Button onClick={this.handleGoHome} variant="outline" size="sm">
                      <Home className="mr-2 h-3 w-3" />
                      Dashboard
                    </Button>
                  </>
                )}
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-xs font-medium">
                    Development Error Details
                  </summary>
                  <pre className="mt-2 text-xs overflow-auto p-2 bg-black/10 rounded max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Convenience components for different error levels
export const CriticalErrorBoundary = (props: Omit<Props, 'level'>) => (
  <GlobalErrorBoundary {...props} level="critical" />
);

export const PageErrorBoundary = (props: Omit<Props, 'level'>) => (
  <GlobalErrorBoundary {...props} level="page" />
);

export const ComponentErrorBoundary = (props: Omit<Props, 'level'>) => (
  <GlobalErrorBoundary {...props} level="component" />
);