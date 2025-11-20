import { useState, useEffect } from 'react';
import { logger } from '@client/utils/logger';

/**
 * @deprecated Use useOfflineDetection instead. This hook is deprecated and will be removed in a future version.
 * useOfflineDetection provides enhanced offline detection with connection quality assessment and additional features.
 */
export function useOnlineStatus() {
  // Log deprecation warning
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      'useOnlineStatus is deprecated. Use useOfflineDetection instead for enhanced offline detection capabilities.'
    );
  }

  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    // Create event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // Register event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

