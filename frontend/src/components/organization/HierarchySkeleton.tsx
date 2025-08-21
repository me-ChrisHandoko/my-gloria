'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function HierarchySkeleton() {
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filter skeleton */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-full sm:w-[180px]" />
          <Skeleton className="h-9 w-32" />
        </div>

        {/* Tree skeleton */}
        <div className="space-y-3">
          {/* Root node */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-12 flex-1" />
          </div>
          
          {/* Level 1 nodes */}
          <div className="ml-8 space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-6 w-6" />
                <Skeleton className="h-10 flex-1 max-w-[90%]" />
              </div>
            ))}
            
            {/* Level 2 nodes */}
            <div className="ml-8 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-8 flex-1 max-w-[80%]" />
                </div>
              ))}
            </div>
          </div>
          
          {/* Another Level 1 node */}
          <div className="ml-8 flex items-center gap-2">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-10 flex-1 max-w-[90%]" />
          </div>
        </div>

        {/* Legend skeleton */}
        <div className="mt-6 pt-6 border-t">
          <Skeleton className="h-4 w-16 mb-2" />
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-1">
                <Skeleton className="w-3 h-3 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}