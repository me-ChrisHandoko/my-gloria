'use client';

import { useAuth } from '@clerk/nextjs';
import { useState } from 'react';

export default function TestAuthDebug() {
  const { isLoaded, isSignedIn, user } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testEmailValidation = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    const primaryEmail = user.emailAddresses.find(
      email => email.id === user.primaryEmailAddressId
    );

    if (!primaryEmail) {
      alert('No primary email found');
      return;
    }

    setLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
      const response = await fetch(`${apiUrl}/v1/auth/validate-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: primaryEmail.emailAddress }),
      });

      const text = await response.text();
      console.log('Raw response:', text);
      
      const data = JSON.parse(text);
      setTestResult(data);
    } catch (error: any) {
      setTestResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Auth Debug Page</h1>
      
      <div className="mb-4 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Version Info:</h2>
        <p>AuthWrapper Version: 3.0 - FIXED RESPONSE PARSING</p>
        <p>Backend Connection: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}</p>
      </div>

      <div className="mb-4 p-4 bg-blue-50 rounded">
        <h2 className="font-bold mb-2">Clerk Status:</h2>
        <p>Loaded: {isLoaded ? 'Yes' : 'No'}</p>
        <p>Signed In: {isSignedIn ? 'Yes' : 'No'}</p>
        {user && (
          <>
            <p>User ID: {user.id}</p>
            <p>Emails:</p>
            <ul className="ml-4">
              {user.emailAddresses.map((email, i) => (
                <li key={i}>
                  {email.emailAddress} {email.id === user.primaryEmailAddressId && '(Primary)'}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {isSignedIn && (
        <div className="mb-4">
          <button
            onClick={testEmailValidation}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Email Validation'}
          </button>
        </div>
      )}

      {testResult && (
        <div className="p-4 bg-gray-50 rounded">
          <h2 className="font-bold mb-2">Test Result:</h2>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}