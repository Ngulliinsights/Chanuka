/**
 * System Hook
 * Provides system-level information and health monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/utils/logger';

export interface SystemHealth {
  isHealthy: boolean;
  warnings: string[];
  errors: string[];
  lastCheck: number;
}

export interface SystemStats {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  performance: {
    navigation: PerformanceNavigationTiming | null;
    resource: PerformanceResourceTiming[] | null;
  };
  connection: {
    type: string;
    effectiveType: string;
    downlink: number;
  };
}

export interface SystemActivity {
  activeRequests: number;
  lastActivity: number;
  isIdle: boolean;
}

export interface SystemSchema {
  version: string;
  features: string[];
  capabilities: string[];
}

export interface SystemEnvironment {
  userAgent: string;
  platform: string;
  language: string;
  timezone: string;
}

export function useSystem(): {
  health: SystemHealth;
  stats: SystemStats;
  activity: SystemActivity;
  schema: SystemSchema;
  environment: SystemEnvironment;
  checkHealth: () => Promise<void>;
  getStats: () => SystemStats;
  resetActivity: () => void;
} {
  const [health, setHealth] = useState<SystemHealth>({
    isHealthy: true,
    warnings: [],
    errors: [],
    lastCheck: Date.now(),
  });

  const [stats, setStats] = useState<SystemStats>({
    memory: { used: 0, total: 0, percentage: 0 },
    performance: { navigation: null, resource: [] },
    connection: { type: 'unknown', effectiveType: 'unknown', downlink: 0 },
  });

  const [activity, setActivity] = useState<SystemActivity>({
    activeRequests: 0,
    lastActivity: Date.now(),
    isIdle: true,
  });

  const [schema, setSchema] = useState<SystemSchema>({
    version: '1.0.0',
    features: [],
    capabilities: [],
  });

  const [environment, setEnvironment] = useState<SystemEnvironment>({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check system health
  const checkHealth = useCallback(async () => {
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Check memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const percentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (percentage > 90) {
          errors.push('High memory usage detected');
        } else if (percentage > 70) {
          warnings.push('Memory usage is elevated');
        }
      }

      // Check connection quality
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
          warnings.push('Slow network connection detected');
        }
      }

      // Check performance metrics
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation && navigation.loadEventEnd - navigation.loadEventStart > 5000) {
        warnings.push('Slow page load detected');
      }

      const isHealthy = errors.length === 0;

      setHealth({
        isHealthy,
        warnings,
        errors,
        lastCheck: Date.now(),
      });

      logger.info('System health check completed', {
        isHealthy,
        warnings: warnings.length,
        errors: errors.length,
        component: 'useSystem',
      });

    } catch (error) {
      logger.error('System health check failed', { error, component: 'useSystem' });
      setHealth(prev => ({
        ...prev,
        isHealthy: false,
        errors: [...prev.errors, 'Health check failed'],
      }));
    }
  }, []);

  // Get system statistics
  const getStats = useCallback((): SystemStats => {
    const newStats: SystemStats = { ...stats };

    // Memory stats
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      newStats.memory = {
        used: memory.usedJSHeapSize,
        total: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }

    // Performance stats
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resource = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    newStats.performance = {
      navigation,
      resource,
    };

    // Connection stats
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      newStats.connection = {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
      };
    }

    setStats(newStats);
    return newStats;
  }, [stats]);

  // Track system activity
  const trackActivity = useCallback(() => {
    setActivity(prev => ({
      ...prev,
      activeRequests: prev.activeRequests + 1,
      lastActivity: Date.now(),
      isIdle: false,
    }));

    // Clear existing timer
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }

    // Set idle timer
    activityTimerRef.current = setTimeout(() => {
      setActivity(prev => ({
        ...prev,
        isIdle: true,
      }));
    }, 5000); // 5 seconds of inactivity
  }, []);

  // Reset activity tracking
  const resetActivity = useCallback(() => {
    setActivity({
      activeRequests: 0,
      lastActivity: Date.now(),
      isIdle: true,
    });
  }, []);

  // Initialize system information
  useEffect(() => {
    // Initial health check
    checkHealth();

    // Initial stats collection
    getStats();

    // Track initial activity
    trackActivity();

    // Set up periodic health checks
    const healthInterval = setInterval(checkHealth, 60000); // Every minute

    // Set up periodic stats updates
    const statsInterval = setInterval(getStats, 30000); // Every 30 seconds

    return () => {
      clearInterval(healthInterval);
      clearInterval(statsInterval);
      if (activityTimerRef.current) {
        clearTimeout(activityTimerRef.current);
      }
    };
  }, [checkHealth, getStats, trackActivity]);

  // Listen for performance entries
  useEffect(() => {
    const handlePerformanceEntry = (entry: PerformanceEntry) => {
      if (entry.entryType === 'resource') {
        setStats(prev => ({
          ...prev,
          performance: {
            ...prev.performance,
            resource: [...(prev.performance.resource || []), entry as PerformanceResourceTiming],
          },
        }));
      }
    };

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(handlePerformanceEntry);
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  }, []);

  return {
    health,
    stats,
    activity,
    schema,
    environment,
    checkHealth,
    getStats,
    resetActivity,
  };
}
