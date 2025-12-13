/**
 * User Not Found Error Component
 *
 * Displays when user is authenticated in Clerk but not found in backend database.
 * Provides options to:
 * 1. Retry fetching user context
 * 2. Sign out and try different account
 * 3. Contact support
 */

"use client";

import { AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserNotFoundErrorProps {
  onRetry: () => void;
  errorMessage?: string;
}

export function UserNotFoundError({
  onRetry,
  errorMessage,
}: UserNotFoundErrorProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-6 w-6" />
            <CardTitle>User Profile Not Found</CardTitle>
          </div>
          <CardDescription>
            Your account was authenticated, but we couldn't find your profile in
            our database.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              {errorMessage ||
                "Unable to load your profile. Please try again or contact support."}
            </AlertDescription>
          </Alert>

          <div className="rounded-lg bg-muted p-4">
            <p className="text-sm text-muted-foreground">
              <strong>What you can do:</strong>
            </p>
            <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-muted-foreground">
              <li>Sign out and try again</li>
              <li>Contact IT or HR</li>
            </ul>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button onClick={onRetry} className="w-full" size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry Loading Profile
          </Button>

          <Button
            onClick={() => signOut()}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
