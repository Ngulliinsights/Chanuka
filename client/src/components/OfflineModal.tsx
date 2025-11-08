/**
 * Offline Modal Component
 * Comprehensive offline status modal with detailed information and actions
 */

import { useState, useEffect } from 'react';
import { logger } from '../utils/client-core';
import { useOnlineStatus } from '../hooks/use-online-status';
import { backgroundSyncManager } from '../utils/backgroundSyncManager';
import { offlineDataManager } from '../utils/offlineDataManager';

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineModal: React.FC<OfflineModalProps> = ({ isOpen, onClose }) => {
  const isOnline = useOnlineStatus();
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [status, analyticsData] = await Promise.all([
        backgroundSyncManager.getSyncStatus(),
        offlineDataManager.getOfflineAnalytics(),
      ]);
      setSyncStatus(status);
      setAnalytics(analyticsData.slice(-10)); // Last 10 events
    } catch (error) {
      logger.error('Failed to load offline modal data', { component: 'OfflineModal', error });
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await backgroundSyncManager.triggerSync();
      await loadData(); // Refresh data
    } catch (error) {
      logger.error('Manual sync failed', { component: 'OfflineModal', error });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all offline data? This cannot be undone.')) {
      return;
    }

    setIsClearing(true);
    try {
      await backgroundSyncManager.clearOfflineData();
      await loadData(); // Refresh data
    } catch (error) {
      logger.error('Failed to clear offline data', { component: 'OfflineModal', error });
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  const getStatusIcon = () => {
    if (!isOnline) return '🔴';
    if (syncStatus?.queueLength > 0) return '🟡';
    return '🟢';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus?.queueLength > 0) return 'Syncing';
    return 'Online';
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Offline Status
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              title="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Status Overview */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <span className="text-2xl">{getStatusIcon()}</span>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {getStatusText()}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isOnline ? 'Connected to the internet' : 'No internet connection detected'}
                </p>
              </div>
            </div>

            {syncStatus && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {syncStatus.queueLength}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Pending Actions
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {syncStatus.lastSyncTime ? formatTimestamp(syncStatus.lastSyncTime) : 'Never'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Last Sync
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Actions
            </h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isSyncing && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                onClick={handleClearData}
                disabled={isClearing}
                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                {isClearing && (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                <span>{isClearing ? 'Clearing...' : 'Clear Offline Data'}</span>
              </button>
            </div>
          </div>

          {/* Pending Actions */}
          {syncStatus?.pendingActions && syncStatus.pendingActions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Pending Actions ({syncStatus.pendingActions.length})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {syncStatus.pendingActions.map((action: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {action.method} {action.endpoint}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Priority: {action.priority} | Retries: {action.retryCount}/{action.maxRetries}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(action.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Analytics */}
          {analytics.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                Recent Events
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {analytics.map((event: any, index: number) => (
                  <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {event.type}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {event.data?.message || 'No details'}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(event.timestamp)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Offline Features */}
          {!isOnline && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Available Offline
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• View cached bills and legislation</li>
                <li>• Read saved bill summaries</li>
                <li>• Access your preferences and settings</li>
                <li>• Browse your activity history</li>
                <li>• Actions will sync when connection is restored</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OfflineModal;

