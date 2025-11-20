import React, { useEffect, useState } from 'react';
import { useOffline } from './offline-manager';

interface OfflineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineModal: React.FC<OfflineModalProps> = ({ isOpen, onClose }) => {
  const { isOnline, pendingActions, syncPendingActions, clearOfflineData, offlineData } = useOffline();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    // No-op for now; left hook for parity with previous implementation
  }, [isOpen]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await syncPendingActions();
    } catch (err) {
      // silent
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all offline data? This cannot be undone.')) return;
    setIsClearing(true);
    try {
      await clearOfflineData();
    } catch (err) {
      // silent
    } finally {
      setIsClearing(false);
    }
  };

  if (!isOpen) return null;

  const lastSync = offlineData?.lastSync ? new Date(offlineData.lastSync).toLocaleString() : 'Never';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Offline Status</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Close modal">×</button>
          </div>

          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isOnline ? 'Online' : 'Offline'}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{isOnline ? 'Connected to the internet' : 'No internet connection detected'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pendingActions?.length ?? 0}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Pending Actions</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{lastSync}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Last Sync</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Actions</h4>
            <div className="flex flex-wrap gap-3">
              <button onClick={handleSync} disabled={!isOnline || isSyncing} className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors">
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
              <button onClick={handleClearData} disabled={isClearing} className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded-lg transition-colors">
                {isClearing ? 'Clearing...' : 'Clear Offline Data'}
              </button>
            </div>
          </div>

          {pendingActions && pendingActions.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Pending Actions ({pendingActions.length})</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {pendingActions.map((action, idx) => (
                  <div key={action.id || idx} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">{action.type}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Retries: {action.retryCount ?? 0}</div>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{new Date(action.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isOnline && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">Available Offline</h4>
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
