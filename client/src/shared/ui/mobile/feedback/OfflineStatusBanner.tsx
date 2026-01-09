/**
 * OfflineStatusBanner - Offline status indicator
 *
 * Shows a banner when the device is offline.
 * Uses navigator.onLine to detect connectivity.
 *
 * @module components/mobile/feedback/OfflineStatusBanner
 */

import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import React from 'react';

import { cn } from '@/utils/cn';

interface OfflineStatusBannerProps {
  /**
   * CSS class name
   */
  className?: string;
  /**
   * Custom message when offline
   * @default "You are offline. Check your connection."
   */
  message?: string;
  /**
   * Position of the banner
   * @default "top"
   */
  position?: 'top' | 'bottom';
}

/**
 * Offline status banner component
 *
 * Automatically shows when device loses internet connection.
 * Hides when connection is restored.
 *
 * @example
 * ```tsx
 * <OfflineStatusBanner position="top" />
 * ```
 */
export function OfflineStatusBanner({
  className,
  message = 'You are offline. Check your connection.',
  position = 'top',
}: OfflineStatusBannerProps): JSX.Element | null {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50',
        'bg-destructive text-destructive-foreground',
        'px-4 py-3 flex items-center gap-2',
        'shadow-md animate-in slide-in-from-top',
        position === 'top' ? 'top-0' : 'bottom-0',
        className
      )}
      role="alert"
      aria-live="polite"
    >
      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}
