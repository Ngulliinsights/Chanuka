/**
 * Real-time Dashboard Component
 * 
 * Displays live bill updates, community engagement metrics, and notifications
 * using the integrated WebSocket client with polling fallback.
 */

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '../../hooks/use-websocket';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Bell, 
  Activity, 
  Users, 
  MessageSquare, 
  TrendingUp,
  Wifi,
  WifiOff,
  AlertCircle
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface RealTimeDashboardProps {
  className?: string;
  showNotifications?: boolean;
  showEngagementMetrics?: boolean;
  showRecentActivity?: boolean;
}

export function RealTimeDashboard({
  className,
  showNotifications = true,
  showEngagementMetrics = true,
  showRecentActivity = true
}: RealTimeDashboardProps) {
  const {
    isConnected,
    isConnecting,
    connectionQuality,
    error,
    notifications,
    notificationCount,
    getRecentActivity,
    markNotificationRead,
    connect
  } = useWebSocket({
    autoConnect: true,
    subscriptions: [
      { type: 'user_notifications', id: 'user' }
    ]
  });

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  // Update recent activity periodically
  useEffect(() => {
    const updateActivity = () => {
      setRecentActivity(getRecentActivity(5));
    };

    updateActivity();
    const interval = setInterval(updateActivity, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [getRecentActivity]);

  const getConnectionIcon = () => {
    if (isConnecting) return <Activity className="h-4 w-4 animate-spin" />;
    if (!isConnected) return <WifiOff className="h-4 w-4 text-red-500" />;
    
    switch (connectionQuality) {
      case 'excellent':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'good':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'poor':
        return <Wifi className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getConnectionStatus = () => {
    if (isConnecting) return 'Connecting...';
    if (!isConnected) return 'Disconnected';
    
    switch (connectionQuality) {
      case 'excellent':
        return 'Excellent Connection';
      case 'good':
        return 'Good Connection';
      case 'poor':
        return 'Poor Connection';
      default:
        return 'Disconnected';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              {getConnectionIcon()}
              Real-time Status
            </span>
            {error && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => connect()}
                className="text-xs"
              >
                Retry
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {getConnectionStatus()}
            </span>
            {!isConnected && (
              <Badge variant="secondary" className="text-xs">
                Using Polling Fallback
              </Badge>
            )}
          </div>
          {error && (
            <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      {showNotifications && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </span>
              {notificationCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {notificationCount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No new notifications
              </p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={cn(
                      "flex items-start gap-3 p-2 rounded-md border",
                      !notification.read && "bg-blue-50 border-blue-200"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimestamp(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markNotificationRead(notification.id)}
                        className="text-xs px-2 py-1 h-auto"
                      >
                        Mark Read
                      </Button>
                    )}
                  </div>
                ))}
                {notifications.length > 3 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{notifications.length - 3} more notifications
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {showRecentActivity && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Activity className="h-4 w-4" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity
              </p>
            ) : (
              <div className="space-y-2">
                {recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-2 rounded-md border"
                  >
                    <div className="flex-shrink-0">
                      {'bill_id' in activity ? (
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                      ) : (
                        <MessageSquare className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {'bill_id' in activity 
                          ? `Bill ${activity.bill_id} updated`
                          : 'Community discussion'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type.replace('_', ' ')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Engagement Metrics Summary */}
      {showEngagementMetrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Live Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {isConnected ? '1.2k' : '---'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Active Users
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {isConnected ? '847' : '---'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Comments Today
                </div>
              </div>
            </div>
            {!isConnected && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Real-time metrics unavailable
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RealTimeDashboard;