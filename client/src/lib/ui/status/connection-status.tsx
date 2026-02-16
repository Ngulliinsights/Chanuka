/**
 * Connection Status Component
 *
 * Simple component to display connection status information
 */

import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import React from 'react';

import { Badge } from '@client/lib/design-system';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
  };
}

export default function ConnectionStatus({ className = '', showDetails = false }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check connection type if available
    if ('connection' in navigator) {
      const connection = (navigator as NavigatorWithConnection).connection;
      setConnectionType(connection?.effectiveType || 'unknown');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-100 text-red-800';
    if (connectionType === 'slow-2g' || connectionType === '2g')
      return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (connectionType === 'slow-2g' || connectionType === '2g')
      return <AlertCircle className="w-4 h-4" />;
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!isOnline) return 'Offline';
    if (connectionType === 'slow-2g' || connectionType === '2g') return 'Slow Connection';
    return 'Connected';
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      {connectionType !== 'unknown' && isOnline && (
        <span className="text-xs text-gray-500">{connectionType.toUpperCase()}</span>
      )}
    </div>
  );
}
