import { AlertCircle, CheckCircle, Network, RefreshCw, Settings } from 'lucide-react';
import { useState } from 'react';
import React from 'react';

import { useApiConnection } from '@/core/api/hooks/useApiConnection';

import { logger } from '../../utils/logger';

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

export function ConnectionStatus({ showDetails = false, className = '' }: ConnectionStatusProps) {
  const {
    connectionStatus,
    healthStatus,
    isConnected,
    isHealthy,
    isLoading,
    error,
    checkConnection,
    checkHealth,
    diagnose,
  } = useApiConnection();

  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  const handleDiagnose = async () => {
    setShowDiagnostics(true);
    try {
      const result = await diagnose();
      setDiagnostics(result);
    } catch (error) {
      logger.error('Diagnostics failed:', { component: 'Chanuka' }, error);
    }
  };

  const handleRefresh = async () => {
    await Promise.all([checkConnection(), checkHealth()]);
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
    }

    if (!navigator.onLine) {
      return <Network className="w-4 h-4 text-red-500" />;
    }

    if (isConnected && isHealthy) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }

    if (isConnected) {
      return <Network className="w-4 h-4 text-yellow-500" />;
    }

    return <AlertCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Checking connection...';
    if (!navigator.onLine) return 'No internet connection';
    if (isConnected && isHealthy) return 'Connected';
    if (isConnected) return 'Connected (degraded)';
    return 'Connection failed';
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-blue-600';
    if (!navigator.onLine) return 'text-red-600';
    if (isConnected && isHealthy) return 'text-green-600';
    if (isConnected) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!showDetails) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {getStatusIcon()}
        <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <h3 className="font-medium">Connection Status</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Refresh status"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleDiagnose}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Run diagnostics"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Internet</span>
          <div className="flex items-center gap-2">
            {navigator.onLine ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span className={`text-sm ${navigator.onLine ? 'text-green-600' : 'text-red-600'}`}>
              {navigator.onLine ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* API Connection */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">API Server</span>
          <div className="flex items-center gap-2">
            {connectionStatus?.apiReachable ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm ${connectionStatus?.apiReachable ? 'text-green-600' : 'text-red-600'}`}
            >
              {connectionStatus?.apiReachable ? 'Reachable' : 'Unreachable'}
            </span>
          </div>
        </div>

        {/* CORS Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">CORS</span>
          <div className="flex items-center gap-2">
            {connectionStatus?.corsEnabled ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <span
              className={`text-sm ${connectionStatus?.corsEnabled ? 'text-green-600' : 'text-red-600'}`}
            >
              {connectionStatus?.corsEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>

        {/* Database Status */}
        {healthStatus && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Database</span>
            <div className="flex items-center gap-2">
              {healthStatus.database ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
              <span
                className={`text-sm ${healthStatus.database ? 'text-green-600' : 'text-yellow-600'}`}
              >
                {healthStatus.database ? 'Connected' : 'Fallback Mode'}
              </span>
            </div>
          </div>
        )}

        {/* Response Time */}
        {healthStatus?.latency && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Response Time</span>
            <span
              className={`text-sm ${
                healthStatus.latency < 1000
                  ? 'text-green-600'
                  : healthStatus.latency < 3000
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {healthStatus.latency}ms
            </span>
          </div>
        )}

        {/* Last Checked */}
        {connectionStatus?.last_checked && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Last Checked</span>
            <span className="text-sm text-gray-500">
              {new Date(connectionStatus.last_checked).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Connection Error</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Errors */}
      {connectionStatus?.errors && connectionStatus.errors.length > 0 && (
        <div className="mt-4 space-y-2">
          {connectionStatus.errors.map((err, index) => (
            <div
              key={index}
              className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800"
            >
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Diagnostics */}
      {showDiagnostics && diagnostics && (
        <div className="mt-4 p-3 bg-gray-50 border rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Diagnostics</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Status:</span>
              <span
                className={`text-sm font-medium ${
                  diagnostics.status === 'healthy'
                    ? 'text-green-600'
                    : diagnostics.status === 'degraded'
                      ? 'text-yellow-600'
                      : 'text-red-600'
                }`}
              >
                {diagnostics.status.toUpperCase()}
              </span>
            </div>

            {diagnostics.issues.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Issues:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {diagnostics.issues.map((issue: string, index: number) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-red-500">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {diagnostics.recommendations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Recommendations:</p>
                <ul className="text-sm text-gray-600 space-y-1">
                  {diagnostics.recommendations.map((rec: string, index: number) => (
                    <li key={index} className="flex items-start gap-1">
                      <span className="text-blue-500">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
