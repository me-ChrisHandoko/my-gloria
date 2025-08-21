'use client';

import { useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthTest } from '@/components/test/AuthTest';
import { PositionDataTable } from '@/components/organization/PositionDataTable';

export default function TestAuthPage() {
  const { user, isSignedIn } = useClerkAuth();
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPositions, setShowPositions] = useState(false);

  // Test validate-email endpoint
  const testValidateEmail = async (email: string) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      console.log('Testing API URL:', apiUrl);
      console.log('Testing email:', email);

      const response = await fetch(`${apiUrl}/v1/auth/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setTestResult({
        endpoint: 'validate-email',
        email,
        response: data,
        status: response.status,
        ok: response.ok,
      });
    } catch (error: any) {
      setTestResult({
        endpoint: 'validate-email',
        email,
        error: error.message,
        type: 'network_error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test debug endpoint
  const testDebugEndpoint = async (email: string) => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/v1/auth/debug/check-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setTestResult({
        endpoint: 'debug/check-email',
        email,
        response: data,
        status: response.status,
        ok: response.ok,
      });
    } catch (error: any) {
      setTestResult({
        endpoint: 'debug/check-email',
        email,
        error: error.message,
        type: 'network_error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test with current user email
  const testCurrentUserEmail = () => {
    if (user && user.emailAddresses.length > 0) {
      const primaryEmail = user.emailAddresses.find(
        email => email.id === user.primaryEmailAddressId
      );
      if (primaryEmail) {
        setTestEmail(primaryEmail.emailAddress);
        testValidateEmail(primaryEmail.emailAddress);
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Authentication Test Page</h1>

      {/* Current User Info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current User Information</CardTitle>
          <CardDescription>Data from Clerk authentication</CardDescription>
        </CardHeader>
        <CardContent>
          {isSignedIn && user ? (
            <div className="space-y-2">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>First Name:</strong> {user.firstName || 'N/A'}</p>
              <p><strong>Last Name:</strong> {user.lastName || 'N/A'}</p>
              <div>
                <strong>Email Addresses:</strong>
                <ul className="ml-4 mt-1">
                  {user.emailAddresses.map((email, idx) => (
                    <li key={email.id} className="text-sm">
                      {idx + 1}. {email.emailAddress} 
                      {email.id === user.primaryEmailAddressId && ' (Primary)'}
                      {email.verification?.status && ` - ${email.verification.status}`}
                    </li>
                  ))}
                </ul>
              </div>
              <Button 
                onClick={testCurrentUserEmail}
                className="mt-4"
                disabled={isLoading}
              >
                Test Current User Email
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">Not signed in</p>
          )}
        </CardContent>
      </Card>

      {/* Email Test Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Email Validation</CardTitle>
          <CardDescription>Test any email against the backend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email to test"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={() => testValidateEmail(testEmail)}
                disabled={!testEmail || isLoading}
              >
                Test Validate Endpoint
              </Button>
              <Button 
                onClick={() => testDebugEndpoint(testEmail)}
                disabled={!testEmail || isLoading}
                variant="outline"
              >
                Test Debug Endpoint
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResult && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
            <CardDescription>Response from backend API</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded overflow-auto text-xs">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Environment Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Environment Configuration</CardTitle>
          <CardDescription>Current environment variables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api (default)'}</p>
            <p><strong>Bypass Validation:</strong> {process.env.NEXT_PUBLIC_BYPASS_EMAIL_VALIDATION || 'false'}</p>
            <p><strong>Clerk Publishable Key:</strong> {process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.substring(0, 20)}...</p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Test Buttons */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Tests</CardTitle>
          <CardDescription>Common test scenarios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={() => {
                setTestEmail('christian_handoko@gloriaschool.org');
                testValidateEmail('christian_handoko@gloriaschool.org');
              }}
              variant="outline"
              size="sm"
            >
              Test: christian_handoko@gloriaschool.org
            </Button>
            <Button 
              onClick={() => {
                setTestEmail('test@example.com');
                testValidateEmail('test@example.com');
              }}
              variant="outline"
              size="sm"
            >
              Test: test@example.com (should fail)
            </Button>
            <Button 
              onClick={() => {
                setTestEmail('christian_handoko@gloriaschool.org');
                testDebugEndpoint('christian_handoko@gloriaschool.org');
              }}
              variant="outline"
              size="sm"
            >
              Debug: christian_handoko@gloriaschool.org
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* New Authentication Test Component */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>JWT Token Test</CardTitle>
          <CardDescription>Test Clerk JWT token retrieval and API authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <AuthTest />
        </CardContent>
      </Card>

      {/* Positions Table Test */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Positions Table Test</CardTitle>
          <CardDescription>Test if the positions table loads correctly with authentication</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will test if the positions API endpoint works with Clerk authentication.
            </p>
            
            {!showPositions ? (
              <Button 
                onClick={() => setShowPositions(true)}
                variant="default"
              >
                Load Positions Table
              </Button>
            ) : (
              <PositionDataTable 
                onAdd={() => console.log('Add position clicked')}
                onEdit={(position) => console.log('Edit position:', position)}
                onView={(position) => console.log('View position:', position)}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}