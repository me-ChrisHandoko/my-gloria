'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AuthTest() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const [tokenStatus, setTokenStatus] = useState<string>('Not tested');
  const [apiTestResult, setApiTestResult] = useState<string>('Not tested');

  const testToken = async () => {
    if (!isLoaded) {
      setTokenStatus('Clerk is still loading...');
      return;
    }

    if (!isSignedIn) {
      setTokenStatus('User is not signed in');
      return;
    }

    try {
      const token = await getToken();
      if (token) {
        setTokenStatus(`✅ Token obtained (length: ${token.length})`);
        
        // Test API call
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/v1/positions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setApiTestResult(`✅ API call successful. Got ${Array.isArray(data) ? data.length : 0} positions`);
        } else {
          setApiTestResult(`❌ API call failed: ${response.status} ${response.statusText}`);
        }
      } else {
        setTokenStatus('❌ No token available');
      }
    } catch (error) {
      setTokenStatus(`❌ Error: ${error}`);
      setApiTestResult(`❌ Error: ${error}`);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Authentication Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm">
            <strong>Clerk Status:</strong> {isLoaded ? '✅ Loaded' : '⏳ Loading...'}
          </p>
          <p className="text-sm">
            <strong>Auth Status:</strong> {isSignedIn ? `✅ Signed in (${userId})` : '❌ Not signed in'}
          </p>
          <p className="text-sm">
            <strong>Token Status:</strong> {tokenStatus}
          </p>
          <p className="text-sm">
            <strong>API Test:</strong> {apiTestResult}
          </p>
        </div>
        
        <Button 
          onClick={testToken} 
          disabled={!isLoaded}
          className="w-full"
        >
          Test Authentication
        </Button>
      </CardContent>
    </Card>
  );
}