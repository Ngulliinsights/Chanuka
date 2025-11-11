/**
 * Offline Indicator Component
 * Shows connection status and provides offline feedback to users
 */

import { useState, useEffect } from 'react';
import { logger } from '../utils/client-core';
import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { backgroundSyncManager } from '../utils/backgroundSyncManager';

interface OfflineIndicatorProps {
  className?: string;
  showDetails?: boolean;
  autoHide?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  showDetails = false,
  autoHide = true,
}) => {
  const { isOnline } = useOfflineDetection();
  const [syncStatus, setSyncStatus] = useState<{
    queueLength: number;
    lastSyncTime: number | null;
  } | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update sync status periodically
  useEffect(() => {
    const updateSyncStatus = async () => {
      try {
        const status = await backgroundSyncManager.getSyncStatus();
        setSyncStatus({
          queueLength: status.queueLength,
          lastSyncTime: status.lastSyncTime,
        });
      } catch (error) {
        logger.error('Failed to get sync status', { component: 'OfflineIndicator', error });
      }
    };

    updateSyncStatus();
    const interval = setInterval(updateSyncStatus, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Control visibility
  useEffect(() => {
    if (!isOnline || (syncStatus && syncStatus.queueLength > 0)) {
      setIsVisible(true);
    } else if (autoHide && isOnline && syncStatus && syncStatus.queueLength === 0) {
      // Hide after a delay when everything is synced
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
    
    return undefined;
  }, [isOnline, syncStatus, autoHide]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await backgroundSyncManager.triggerSync();
      // Refresh sync status
      const status = await backgroundSyncManager.getSyncStatus();
      setSyncStatus({
        queueLength: status.queueLength,
        lastSyncTime: status.lastSyncTime,
      });
    } catch (error) {
      logger.error('Manual sync failed', { component: 'OfflineIndicator', error });
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isVisible) return null;

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus?.queueLength && syncStatus.queueLength > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (syncStatus?.queueLength && syncStatus.queueLength > 0) return 'Syncing...';
    return 'Online';
  };

  const getLastSyncText = () => {
    if (!syncStatus?.lastSyncTime) return 'Never synced';
    const timeDiff = Date.now() - syncStatus.lastSyncTime;
    const minutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 min-w-[200px]">
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {getStatusText()}
          </span>
          {isSyncing && (
            <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
          )}
        </div>

        {showDetails && (
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            {syncStatus && (
              <>
                <div>Pending: {syncStatus.queueLength} action{syncStatus.queueLength !== 1 ? 's' : ''}</div>
                <div>Last sync: {getLastSyncText()}</div>
              </>
            )}
          </div>
        )}

        {!isOnline && (
          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Some features may be limited while offline
          </div>
        )}

        {syncStatus && syncStatus.queueLength > 0 && isOnline && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="mt-2 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs py-1 px-2 rounded transition-colors"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;

