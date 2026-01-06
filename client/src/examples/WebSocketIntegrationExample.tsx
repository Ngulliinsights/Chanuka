/**
 * WebSocket Integration Example
 *
 * Demonstrates how to integrate real-time WebSocket features
 * with bill tracking and community engagement.
 */

import { useWebSocket } from '@client/hooks/use-websocket';
import { Activity, Bell, MessageSquare, TrendingUp, Users, Wifi, WifiOff } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useNotifications } from '@client/hooks/useNotifications';
import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';

/**
 * Example 1: Basic WebSocket Connection
 */
export function BasicWebSocketExample() {
  const { isConnected, connectionQuality, connect, disconnect, error } = useWebSocket({
    autoConnect: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-red-500" />
          )}
          WebSocket Connection Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span>Quality:</span>
            <Badge variant="outline">{connectionQuality}</Badge>
          </div>

          {error && <div className="text-sm text-red-600">Error: {error}</div>}

          <div className="flex gap-2">
            <Button onClick={connect} disabled={isConnected} size="sm">
              Connect
            </Button>
            <Button onClick={disconnect} disabled={!isConnected} variant="outline" size="sm">
              Disconnect
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example 2: Bill Real-time Tracking
 */
export function BillTrackingExample() {
  const billId = 123;
  const { isConnected, billUpdates, engagementMetrics, getBillUpdates, getEngagementMetrics } =
    useBillRealTime(billId);

  const updates = getBillUpdates(billId);
  const metrics = getEngagementMetrics(billId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Bill #{billId} Real-time Updates
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Connection:</span>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Live Updates' : 'Cached Data'}
            </Badge>
          </div>

          <div>
            <h4 className="font-medium mb-2">Recent Updates ({updates.length})</h4>
            {updates.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent updates</p>
            ) : (
              <div className="space-y-2">
                {updates.slice(0, 3).map((update, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    <div className="font-medium">{update.type.replace('_', ' ')}</div>
                    <div className="text-muted-foreground">
                      {new Date(update.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {metrics && (
            <div>
              <h4 className="font-medium mb-2">Engagement Metrics</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{metrics.metrics.view_count}</div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
                <div className="text-center p-2 border rounded">
                  <div className="text-lg font-bold">{metrics.metrics.comment_count}</div>
                  <div className="text-xs text-muted-foreground">Comments</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example 3: Notifications System
 */
export function NotificationsExample() {
  const { notifications, notificationCount, markAsRead, isConnected } = useNotifications();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
          {notificationCount > 0 && <Badge variant="destructive">{notificationCount}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Real-time:</span>
            <Badge variant={isConnected ? 'default' : 'secondary'}>
              {isConnected ? 'Active' : 'Offline'}
            </Badge>
          </div>

          <div>
            <h4 className="font-medium mb-2">Recent Notifications</h4>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notifications</p>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map(notification => (
                  <div
                    key={notification.id}
                    className={`p-2 border rounded text-sm ${
                      !notification.read ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-muted-foreground text-xs">{notification.message}</div>
                        <div className="text-muted-foreground text-xs mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </div>
                      </div>
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="text-xs px-2 py-1 h-auto"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Example 4: Advanced WebSocket Usage with Custom Handlers
 */
export function AdvancedWebSocketExample() {
  const [activityLog, setActivityLog] = useState<string[]>([]);

  const { isConnected, subscribe, unsubscribe, getRecentActivity } = useWebSocket({
    autoConnect: true,
    handlers: {
      onBillUpdate: update => {
        setActivityLog(prev => [`Bill ${update.bill_id}: ${update.type}`, ...prev.slice(0, 9)]);
      },
      onCommunityUpdate: update => {
        setActivityLog(prev => [`Community: ${update.type}`, ...prev.slice(0, 9)]);
      },
      onNotification: notification => {
        setActivityLog(prev => [`Notification: ${notification.title}`, ...prev.slice(0, 9)]);
      },
      onConnectionChange: connected => {
        setActivityLog(prev => [
          `Connection ${connected ? 'established' : 'lost'}`,
          ...prev.slice(0, 9),
        ]);
      },
    },
  });

  const handleSubscribeToBill = () => {
    subscribe({ type: 'bill', id: 456 });
    setActivityLog(prev => ['Subscribed to Bill 456', ...prev.slice(0, 9)]);
  };

  const handleUnsubscribeFromBill = () => {
    unsubscribe({ type: 'bill', id: 456 });
    setActivityLog(prev => ['Unsubscribed from Bill 456', ...prev.slice(0, 9)]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Advanced WebSocket Usage
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleSubscribeToBill} disabled={!isConnected} size="sm">
              Subscribe to Bill 456
            </Button>
            <Button
              onClick={handleUnsubscribeFromBill}
              disabled={!isConnected}
              variant="outline"
              size="sm"
            >
              Unsubscribe
            </Button>
          </div>

          <div>
            <h4 className="font-medium mb-2">Activity Log</h4>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                activityLog.map((activity, index) => (
                  <div key={index} className="text-sm p-1 border-l-2 border-blue-200 pl-2">
                    {activity}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Example Component
 */
export function WebSocketIntegrationExample() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">WebSocket Integration Examples</h1>
          <p className="text-muted-foreground">
            Demonstrations of real-time WebSocket features for civic engagement
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BasicWebSocketExample />
          <BillTrackingExample />
          <NotificationsExample />
          <AdvancedWebSocketExample />
        </div>
      </div>
    </div>
  );
}

export default WebSocketIntegrationExample;
