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
import { Helmet } from 'react-helmet-async';

import { ErrorBoundary } from '@client/core/error/components/ErrorBoundary';
import { PerformanceDashboard } from '@client/shared/ui/performance';

export default function PerformanceDashboardPage() {
  return (
    <>
      <Helmet>
        <title>Performance Dashboard - Chanuka Platform</title>
        <meta 
          name="description" 
          content="Monitor Core Web Vitals, performance budgets, and optimization opportunities for the Chanuka platform." 
        />
      </Helmet>

      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <PerformanceDashboard />
        </div>
      </ErrorBoundary>
    </>
  );
}