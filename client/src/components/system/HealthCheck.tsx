import React, { useEffect, useState } from 'react';
import { systemApi } from '../../services/api';
import { logger } from '../../utils/browser-logger';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  message: string;
  timestamp: string;
  details?: Record<string, any>;
}

interface HealthCheckProps {
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function HealthCheck({ 
  showDetails = false, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: HealthCheckProps) {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'unknown',
    message: 'Checking system health...',
    timestamp: new Date().toISOString()
  });
  const [loading, setLoading] = useState(true);

  const checkHealth = async () => {
    try {
      const response = await systemApi.getHealth();
      setHealth({
        status: (response as any).status || 'healthy',
        message: (response as any).message || 'System is operational',
        timestamp: new Date().toISOString(),
        details: (response as any).details
      });
    } catch (error) {
      logger.error('Health check failed:', { component: 'HealthCheck' }, error);
      setHealth({
        status: 'unhealthy',
        message: 'Unable to connect to server',
        timestamp: new Date().toISOString(),
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();

    if (autoRefresh) {
      const interval = setInterval(checkHealth, refreshInterval);
      return () => clearInterval(interval);
    }
    
    return undefined;
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        <span>Checking system health...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
        <span>{getStatusIcon(health.status)}</span>
        <span>{health.message}</span>
      </div>
      
      {showDetails && health.details && (
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-800">
            System Details
          </summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify(health.details, null, 2)}
          </pre>
        </details>
      )}
      
      <div className="text-xs text-gray-500">
        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}

export default HealthCheck;