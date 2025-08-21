'use client';

import { useEffect } from 'react';
import { mockApiProvider } from '@/lib/mock-data/mock-api-provider';

export function MockDataInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      // Check if this is the first visit or if mock data was never configured
      const mockDataConfig = localStorage.getItem('USE_MOCK_DATA');
      
      if (mockDataConfig === null) {
        // First time setup - enable mock data by default in development
        console.log('🚀 First time setup - enabling mock data for development');
        mockApiProvider.enableMockData();
      }
    }
  }, []);

  return null; // This component doesn't render anything
}