import { GetTokenExample } from '@/components/GetTokenExample';

export default function TestTokenPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">JWT Token Test</h1>
          <p className="text-muted-foreground">
            Test Clerk authentication and JWT token retrieval
          </p>
        </div>
        
        <GetTokenExample />
        
        <div className="max-w-2xl text-center text-sm text-muted-foreground space-y-2">
          <p>
            This page demonstrates how to get a JWT token from Clerk using the useAuth hook.
          </p>
          <p>
            The token can be used to authenticate API requests to your backend services.
          </p>
        </div>
      </div>
    </div>
  );
}