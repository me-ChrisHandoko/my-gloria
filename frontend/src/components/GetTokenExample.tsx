'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Key, CheckCircle, XCircle } from 'lucide-react';

export function GetTokenExample() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGetToken = async () => {
    // Reset states
    setError(null);
    setToken(null);
    setLoading(true);

    try {
      // Check if Clerk is loaded
      if (!isLoaded) {
        throw new Error('Clerk is still loading. Please wait...');
      }

      // Check if user is signed in
      if (!isSignedIn) {
        throw new Error('You must be signed in to get a token');
      }

      // Get the JWT token
      const jwtToken = await getToken();
      
      if (jwtToken) {
        setToken(jwtToken);
        console.log('JWT Token retrieved:', jwtToken);
        
        // Example: You can now use this token for API calls
        // const response = await fetch('/api/protected-endpoint', {
        //   headers: {
        //     'Authorization': `Bearer ${jwtToken}`
        //   }
        // });
      } else {
        throw new Error('No token available. Please try signing in again.');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      console.error('Error getting token:', err);
    } finally {
      setLoading(false);
    }
  };

  // Copy token to clipboard
  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      alert('Token copied to clipboard!');
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          JWT Token Retrieval
        </CardTitle>
        <CardDescription>
          Get your Clerk JWT token for authenticated API requests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Display */}
        <div className="flex items-center gap-2 text-sm">
          {isLoaded ? (
            <>
              {isSignedIn ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">
                    Signed in as user: {userId}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    Not signed in
                  </span>
                </>
              )}
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">Loading Clerk...</span>
            </>
          )}
        </div>

        {/* Get Token Button */}
        <Button
          onClick={handleGetToken}
          disabled={loading || !isLoaded || !isSignedIn}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Getting Token...
            </>
          ) : (
            'Get JWT Token'
          )}
        </Button>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Token Display */}
        {token && (
          <div className="space-y-2">
            <Alert>
              <AlertDescription className="flex items-center justify-between">
                <span className="text-green-600 dark:text-green-400">
                  ✅ Token retrieved successfully!
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                >
                  Copy Token
                </Button>
              </AlertDescription>
            </Alert>
            
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs font-mono break-all line-clamp-3">
                {token}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Token preview (first 100 characters shown for security)
              </p>
            </div>
          </div>
        )}

        {/* Usage Instructions */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-semibold">How to use this token:</h4>
          <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
{`// In your API calls:
fetch('/api/your-endpoint', {
  headers: {
    'Authorization': \`Bearer \${token}\`
  }
})`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}