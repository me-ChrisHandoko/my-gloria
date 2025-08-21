'use client';

import { useAuth } from '@clerk/nextjs';

function SimpleGetToken() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  
  const handleGetToken = async () => {
    // Always check if Clerk is loaded and user is signed in
    if (!isLoaded) {
      console.log('Clerk is still loading...');
      return;
    }
    
    if (!isSignedIn) {
      console.log('User is not signed in');
      return;
    }
    
    // Get the JWT token
    const token = await getToken();
    console.log('JWT Token:', token);
    
    // Now you can use the token for API calls
    // Example:
    // const response = await fetch('/api/protected', {
    //   headers: {
    //     'Authorization': `Bearer ${token}`
    //   }
    // });
  };

  return <button onClick={handleGetToken}>Get JWT Token</button>;
}

export default SimpleGetToken;