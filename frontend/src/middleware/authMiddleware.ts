import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function authMiddleware(request: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the token for backend API calls
    const token = await getToken();
    
    // Create headers for backend API
    const headers = new Headers(request.headers);
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Add user ID to headers for convenience
    headers.set('X-User-Id', userId);

    // Create new request with updated headers
    const authenticatedRequest = new NextRequest(request.url, {
      headers,
      method: request.method,
      body: request.body,
    });

    return { authenticatedRequest, userId, token };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}