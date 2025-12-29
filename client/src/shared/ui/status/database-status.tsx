/**
 * Database Status Component
 * 
 * Simple component to display database connection status
 */

import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle, X as XCircle } from 'lucide-react';
import { Badge } from '@client/shared/design-system';

interface DatabaseStatusProps {
  className?: string;
}

type DatabaseStatus = 'connected' | 'disconnected' | 'error' | 'loading';

export default function DatabaseStatus({ className = '' }: DatabaseStatusProps) {
  const [status, setStatus] = useState<DatabaseStatus>('loading');
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    // Simulate database status check
    const checkDatabaseStatus = async () => {
      try {
        // In a real app, this would be an actual API call
        // For now, we'll simulate a successful connection
        await new Promise(resolve => setTimeout(resolve, 1000));
        setStatus('connected');
        setLastChecked(new Date());
      } catch (error) {
        setStatus('error');
      }
    };

    checkDatabaseStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'loading': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle className="w-4 h-4" />;
      case 'disconnected': return <Database className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'loading': return <AlertCircle className="w-4 h-4 animate-pulse" />;
      default: return <Database className="w-4 h-4" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Database Connected';
      case 'disconnected': return 'Database Disconnected';
      case 'error': return 'Database Error';
      case 'loading': return 'Checking Database...';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge className={`flex items-center gap-1 ${getStatusColor()}`}>
        {getStatusIcon()}
        {getStatusText()}
      </Badge>
      <span className="text-xs text-gray-500">
        Last checked: {lastChecked.toLocaleTimeString()}
      </span>
    </div>
  );
}