/**
 * Performance Dashboard Page
 * 
 * Provides comprehensive performance monitoring including:
 * - Core Web Vitals tracking
 * - Performance budget monitoring
 * - Real-time metrics and trends
 * - Optimization recommendations
 */

import React from 'react';

import { ErrorBoundary } from '@client/core/error/components/ErrorBoundary';
import { PerformanceDashboard } from '@client/shared/ui/performance';

export default function PerformanceDashboardPage() {
  return (
    <>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <PerformanceDashboard />
        </div>
      </ErrorBoundary>
    </>
  );
}