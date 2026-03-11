/**
 * Alert Management Component
 * 
 * Displays and manages alerts for a feature
 */

import { useState } from 'react';
import { useFeatureAlerts, useAcknowledgeAlert, useResolveAlert } from '../hooks/use-monitoring';
import type { IntegrationAlert } from '../types';

interface AlertManagementProps {
  featureId: string;
}

export function AlertManagement({ featureId }: AlertManagementProps) {
  const [showResolved, setShowResolved] = useState(false);
  const { data: alerts, isLoading, error } = useFeatureAlerts(featureId, showResolved ? undefined : false);
  const acknowledgeAlert = useAcknowledgeAlert();
  const resolveAlert = useResolveAlert();

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert.mutateAsync(alertId);
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert.mutateAsync(alertId);
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Failed to load alerts
      </div>
    );
  }

  const getSeverityColor = (severity: IntegrationAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show resolved
        </label>
      </div>

      {!alerts || alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No alerts found
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`border rounded-lg p-4 ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold uppercase">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-gray-600">
                      {alert.type}
                    </span>
                  </div>
                  <h4 className="font-semibold mb-1">{alert.title}</h4>
                  <p className="text-sm mb-2">{alert.message}</p>
                  <div className="text-xs text-gray-600">
                    {new Date(alert.created_at).toLocaleString()}
                  </div>
                  {alert.acknowledged && (
                    <div className="text-xs text-gray-600 mt-1">
                      Acknowledged by {alert.acknowledgedBy} at{' '}
                      {alert.acknowledgedAt && new Date(alert.acknowledgedAt).toLocaleString()}
                    </div>
                  )}
                  {alert.resolved && (
                    <div className="text-xs text-gray-600 mt-1">
                      Resolved by {alert.resolvedBy} at{' '}
                      {alert.resolvedAt && new Date(alert.resolvedAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {!alert.resolved && (
                  <div className="flex gap-2 ml-4">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        disabled={acknowledgeAlert.isPending}
                        className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                      >
                        Acknowledge
                      </button>
                    )}
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolveAlert.isPending}
                      className="px-3 py-1 text-xs font-medium bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      Resolve
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
