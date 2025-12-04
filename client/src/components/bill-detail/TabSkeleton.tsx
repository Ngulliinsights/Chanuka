import React from 'react';

import { Card, CardContent, CardHeader } from '../ui/card';

/**
 * TabSkeleton - Loading skeleton for lazy-loaded tab content
 */
export function TabSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Main content skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-muted rounded"></div>
            <div className="w-48 h-6 bg-muted rounded"></div>
          </div>
          <div className="w-64 h-4 bg-muted rounded mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="w-full h-4 bg-muted rounded"></div>
            <div className="w-3/4 h-4 bg-muted rounded"></div>
            <div className="w-5/6 h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>

      {/* Secondary content skeleton */}
      <Card>
        <CardHeader>
          <div className="w-40 h-6 bg-muted rounded"></div>
          <div className="w-56 h-4 bg-muted rounded mt-2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <div className="w-32 h-4 bg-muted rounded"></div>
                <div className="w-24 h-3 bg-muted rounded"></div>
              </div>
              <div className="w-20 h-8 bg-muted rounded"></div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="space-y-2">
                <div className="w-40 h-4 bg-muted rounded"></div>
                <div className="w-28 h-3 bg-muted rounded"></div>
              </div>
              <div className="w-20 h-8 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-8 bg-muted rounded mx-auto mb-2"></div>
                <div className="w-16 h-3 bg-muted rounded mx-auto"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}