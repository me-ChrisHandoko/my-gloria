'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetDepartmentsQuery } from '@/store/api/organizationApi';

export default function TestDepartmentsPage() {
  const [testScenario, setTestScenario] = useState<string>('');
  
  // Test 1: No filters (should work)
  const { data: allDepartments, error: allError, isLoading: allLoading } = useGetDepartmentsQuery({});
  
  // Test 2: With undefined values that should be filtered out
  const { data: filteredDepartments, error: filteredError, isLoading: filteredLoading } = useGetDepartmentsQuery({
    schoolId: undefined,
    search: undefined,
  } as any, {
    skip: testScenario !== 'filtered'
  });
  
  // Test 3: With actual search value
  const { data: searchDepartments, error: searchError, isLoading: searchLoading } = useGetDepartmentsQuery({
    search: 'IT'
  }, {
    skip: testScenario !== 'search'
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Department API Test</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test 1: Get All Departments (No Filters)</CardTitle>
          <CardDescription>This should work without any 400 errors</CardDescription>
        </CardHeader>
        <CardContent>
          {allLoading && <p>Loading...</p>}
          {allError && (
            <div className="text-red-500">
              <p>Error occurred!</p>
              <pre className="text-xs mt-2">{JSON.stringify(allError, null, 2)}</pre>
            </div>
          )}
          {allDepartments && (
            <div>
              <p className="text-green-500">✅ Success! Found {allDepartments.length} departments</p>
              <details className="mt-2">
                <summary className="cursor-pointer">View Data</summary>
                <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                  {JSON.stringify(allDepartments, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test 2: With Undefined Values</CardTitle>
          <CardDescription>Test that undefined values are properly filtered out</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setTestScenario('filtered')}
            disabled={filteredLoading}
            className="mb-4"
          >
            Run Test with Undefined Values
          </Button>
          
          {testScenario === 'filtered' && (
            <>
              {filteredLoading && <p>Loading...</p>}
              {filteredError && (
                <div className="text-red-500">
                  <p>❌ Error occurred! The fix may not be working.</p>
                  <pre className="text-xs mt-2">{JSON.stringify(filteredError, null, 2)}</pre>
                </div>
              )}
              {filteredDepartments && (
                <div>
                  <p className="text-green-500">✅ Success! Undefined values were properly handled</p>
                  <p className="text-sm mt-1">Found {filteredDepartments.length} departments</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test 3: With Search Parameter</CardTitle>
          <CardDescription>Test search functionality</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setTestScenario('search')}
            disabled={searchLoading}
            className="mb-4"
          >
            Search for "IT"
          </Button>
          
          {testScenario === 'search' && (
            <>
              {searchLoading && <p>Loading...</p>}
              {searchError && (
                <div className="text-red-500">
                  <p>Error occurred!</p>
                  <pre className="text-xs mt-2">{JSON.stringify(searchError, null, 2)}</pre>
                </div>
              )}
              {searchDepartments && (
                <div>
                  <p className="text-green-500">✅ Search completed</p>
                  <p className="text-sm mt-1">Found {searchDepartments.length} departments matching "IT"</p>
                  {searchDepartments.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">View Results</summary>
                      <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(searchDepartments, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Request URL Check</CardTitle>
          <CardDescription>Verify the actual URLs being called</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Base API URL:</strong> {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}</p>
            <p><strong>Expected for no filters:</strong> /v1/departments</p>
            <p><strong>Expected for search:</strong> /v1/departments?search=IT</p>
            <p className="text-xs text-muted-foreground mt-2">
              The fix ensures that undefined values are NOT sent as "undefined" strings in the URL
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}