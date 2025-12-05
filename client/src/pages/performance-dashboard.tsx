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

import { PerformanceDashboard } from '@client/components/performance/PerformanceDashboard';
import { ErrorBoundary } from '@client/components/error-handling/ErrorBoundary';

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