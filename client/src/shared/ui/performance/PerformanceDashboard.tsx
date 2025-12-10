/**
 * Performance Dashboard Component
 * 
 * Provides comprehensive performance monitoring including:
 * - Core Web Vitals tracking
 * - Performance budget monitoring
 * - Real-time metrics and trends
 * - Optimization recommendations
 */

import React from 'react';
import { NavigationPerformanceDashboard } from '@client/shared/ui/navigation/performance/NavigationPerformanceDashboard';

export function PerformanceDashboard() {
  return <NavigationPerformanceDashboard />;
}

export default PerformanceDashboard;
