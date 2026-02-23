import { Bell, Network, Settings, Clock, AlertCircle } from 'lucide-react';
import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

import type { BillTrackingPreferences } from '@client/infrastructure/api/types';
import { useWebSocket } from '@client/infrastructure/realtime/hooks/use-websocket';
import { Badge } from '@client/lib/design-system/feedback/Badge';
import { Button } from '@client/lib/design-system/interactive/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@client/lib/design-system/interactive/Select';
import { Switch } from '@client/lib/design-system/interactive/Switch';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system/typography/Card';
import { logger } from '@client/lib/utils/logger';

interface RealTimeBillTrackerProps {
  billId?: number;
}

interface BillUpdate {
  type: string;
  timestamp: string;
  data?: {
    billId?: number;
    title?: string;
    oldStatus?: string;
    newStatus?: string;
  };
}

type UpdateFrequency = 'immediate' | 'hourly' | 'daily';

export function RealTimeBillTracker({ billId }: RealTimeBillTrackerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Use the simplified WebSocket hook
  const {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    notifications,
    connectionQuality,
    error,
    getRecentActivity,
    markNotificationRead,
  } = useWebSocket({
    subscriptions: billId ? [{ type: 'bill', id: String(billId) }] : [],
    autoConnect: true,
  });

  // Local state for bill updates derived from WebSocket activity
  const [billUpdates, setBillUpdates] = useState<BillUpdate[]>([]);

  // Effect to process recent activity into bill updates
  useEffect(() => {
    if (!getRecentActivity) return;
    
    const activity = getRecentActivity();
    const updates = activity
      .filter(a => a.type === 'bill_updated' && (!billId || a.bill_id === String(billId)))
      .map(a => ({
        type: a.type,
        timestamp: a.timestamp,
        data: {
          billId: a.bill_id ? parseInt(a.bill_id) : undefined,
        }
      }));
    setBillUpdates(updates);
  }, [getRecentActivity, billId, notifications]); // Re-run when notifications change as a proxy for activity updates

  // Mock preferences service
  const getPreferences = () => ({
    statusChanges: true,
    newComments: true,
    votingSchedule: true,
    amendments: true,
    updateFrequency: 'immediate' as UpdateFrequency,
    notificationChannels: {
      inApp: true,
      email: true,
      push: false
    },
    trackedBills: []
  });

  const updatePreferences = (prefs: BillTrackingPreferences) => {
    // In a real app, this would verify with backend
    logger.info('Updating preferences', prefs);
  };
    
  // Helper to get updates for specific bill
  const getBillUpdates = (id: number) => {
    return billUpdates.filter(u => u.data?.billId === id);
  };

  // Get preferences from service
  const [preferences, setPreferences] = useState<BillTrackingPreferences>(getPreferences());

  // Get updates for the specific bill
  const updates = billId ? getBillUpdates(billId) : [];

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (!isConnected && connect) {
      try {
        connect();
      } catch (error) {
        logger.error(
          'Failed to connect to WebSocket:',
          {
            component: 'RealTimeBillTracker',
            error: error instanceof Error ? error.message : String(error)
          }
        );
        toast.error('Failed to connect to real-time updates');
      }
    }

    return () => {
      if (isConnected && disconnect) {
        disconnect();
      }
    };
  }, [isConnected, connect, disconnect]);

  const handleSubscribe = useCallback(() => {
    if (billId && isConnected) {
      subscribe(`bill:${billId}`);
      setIsSubscribed(true);
      toast.success(`Subscribed to bill ${billId} updates`);
    }
  }, [billId, isConnected, subscribe]);

  const handleUnsubscribe = useCallback(() => {
    if (billId && isConnected) {
      unsubscribe(`bill:${billId}`);
      setIsSubscribed(false);
      toast.info(`Unsubscribed from bill ${billId} updates`);
    }
  }, [billId, isConnected, unsubscribe]);

  const handleUpdatePreferences = useCallback(() => {
    updatePreferences(preferences);
    logger.info('Preferences updated', { ...preferences });
    toast.success('Preferences updated successfully');
  }, [preferences, updatePreferences]);

  const handlePreferenceChange = useCallback((key: keyof BillTrackingPreferences, value: boolean | UpdateFrequency) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const handleNotificationChannelChange = useCallback(
    (
      channel: keyof BillTrackingPreferences['notificationChannels'],
      value: boolean
    ) => {
      setPreferences(prev => ({
        ...prev,
        notificationChannels: {
          ...prev.notificationChannels,
          [channel]: value,
        },
      }));
    },
    []
  );

  const getConnectionStatusColor = useCallback(() => {
    if (isConnected) return 'text-green-600';
    if (connectionQuality === 'poor') return 'text-yellow-600';
    return 'text-red-600';
  }, [isConnected, connectionQuality]);

  const getConnectionStatusText = useCallback(() => {
    if (isConnected) return 'Connected';
    if (connectionQuality === 'poor') return 'Poor Connection';
    return 'Disconnected';
  }, [isConnected, connectionQuality]);

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Real-Time Bill Tracking
            </span>
            <Badge
              variant={isConnected ? 'default' : 'destructive'}
              className={getConnectionStatusColor()}
            >
              {getConnectionStatusText()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                {billId ? `Tracking Bill #${billId}` : 'No specific bill selected'}
              </p>
              <p className="text-xs text-muted-foreground">
                Updates: {updates.length} | Notifications: {notifications?.length ?? 0}
              </p>
            </div>
            <div className="flex gap-2">
              {billId && (
                <Button
                  onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                  disabled={!isConnected}
                  variant={isSubscribed ? 'outline' : 'primary'}
                  size="sm"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isSubscribed ? 'Unsubscribe' : 'Subscribe'}
                </Button>
              )}
              <Button
                onClick={() => setShowPreferences(!showPreferences)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preferences Panel */}
      {showPreferences && (
        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium">Notification Types</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Status Changes</label>
                    <Switch
                      checked={preferences.statusChanges}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('statusChanges', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">New Comments</label>
                    <Switch
                      checked={preferences.newComments}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('newComments', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Voting Schedule</label>
                    <Switch
                      checked={preferences.votingSchedule}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('votingSchedule', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Amendments</label>
                    <Switch
                      checked={preferences.amendments}
                      onCheckedChange={(checked: boolean) => handlePreferenceChange('amendments', checked)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Update Frequency</h4>
                <Select
                  value={preferences.updateFrequency}
                  onValueChange={(value: UpdateFrequency) =>
                    handlePreferenceChange('updateFrequency', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Immediate
                      </div>
                    </SelectItem>
                    <SelectItem value="hourly">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Hourly Digest
                      </div>
                    </SelectItem>
                    <SelectItem value="daily">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Daily Digest
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Channels</h5>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">In-App</label>
                      <Switch
                        checked={preferences.notificationChannels.inApp}
                        onCheckedChange={(checked: boolean) =>
                          handleNotificationChannelChange('inApp', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Email</label>
                      <Switch
                        checked={preferences.notificationChannels.email}
                        onCheckedChange={(checked: boolean) =>
                          handleNotificationChannelChange('email', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Push</label>
                      <Switch
                        checked={preferences.notificationChannels.push}
                        onCheckedChange={(checked: boolean) =>
                          handleNotificationChannelChange('push', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowPreferences(false)} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleUpdatePreferences} disabled={!isConnected}>
                Save Preferences
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Updates */}
      {updates.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {updates.map((update: BillUpdate, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">{update.type.replace('_', ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {update.data?.title || `Bill #${update.data?.billId || billId}`}
                    </p>
                    {update.data?.oldStatus && update.data?.newStatus && (
                      <p className="text-muted-foreground">
                        Status: {update.data.oldStatus} → {update.data.newStatus}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Notifications */}
      {notifications && notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {notifications.map((notification: unknown, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{notification.title}</h4>
                    <Badge variant="secondary">{notification.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  {notification.data?.changeCount !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.data.changeCount} changes included
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Debug Info (Development) */}
      {process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(
                {
                  isConnected,
                  connectionQuality,
                  error: error,
                  billUpdatesCount: billUpdates.length,
                  notificationsCount: notifications?.length ?? 0,
                  updatesCount: updates.length,
                },
                null,
                2
              )}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}