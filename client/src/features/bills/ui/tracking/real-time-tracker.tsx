import { Bell, Network, Settings, Clock, AlertCircle } from 'lucide-react';
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useWebSocket } from "@client/hooks/use-websocket";
import type { BillTrackingPreferences } from '@client/core/api/types';
import { logger } from '@client/utils/logger';

import { Badge } from '@/shared/design-system/feedback/Badge';
import { Button } from '@/shared/design-system/interactive/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@client/shared/ui/Select";
import { Switch } from '@client/shared/ui/Switch';


interface RealTimeBillTrackerProps {
  billId?: number;
}

export function RealTimeBillTracker({
  billId,
}: RealTimeBillTrackerProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);

  // Use the simplified WebSocket hook
  const {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    billUpdates,
    notifications,
    connectionQuality,
    error,
    getBillUpdates,
    markNotificationRead,
    updatePreferences,
    getPreferences
  } = useWebSocket({
    subscriptions: billId ? [{ type: 'bill', id: billId }] : [],
    handlers: {
      onBillUpdate: (update) => {
        logger.debug('Bill update received in tracker', {
          billId: update.data?.billId,
          type: update.type
        });
      },
      onNotification: (notification) => {
        toast.info(notification.title, {
          description: notification.message,
        });
      },
      onConnectionChange: (connected) => {
        if (connected) {
          toast.success("Connected to real-time updates");
        } else {
          toast.warning("Disconnected from real-time updates");
        }
      },
      onError: (error) => {
        toast.error("WebSocket error occurred");
        logger.error('WebSocket error in tracker:', error);
      }
    }
  });

  // Get preferences from service
  const [preferences, setPreferences] = useState<BillTrackingPreferences>(getPreferences());

  // Get updates for the specific bill
  const updates = billId ? getBillUpdates(billId) : [];

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (!isConnected) {
      connect().catch((error: Error) => {
        logger.error('Failed to connect to WebSocket:', {
          component: 'RealTimeBillTracker'
        }, error);
        toast.error("Failed to connect to real-time updates");
      });
    }

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [isConnected, connect, disconnect]);

  const handleSubscribe = () => {
    if (billId && isConnected) {
      subscribe({ type: 'bill', id: billId });
      setIsSubscribed(true);
      toast.success(`Subscribed to bill ${billId} updates`);
    }
  };

  const handleUnsubscribe = () => {
    if (billId && isConnected) {
      unsubscribe({ type: 'bill', id: billId });
      setIsSubscribed(false);
      toast.info(`Unsubscribed from bill ${billId} updates`);
    }
  };

  const handleUpdatePreferences = () => {
    updatePreferences(preferences);
    toast.success("Preferences updated successfully");
  };

  const handlePreferenceChange = (key: keyof BillTrackingPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleNotificationChannelChange = (channel: keyof BillTrackingPreferences['notificationChannels'], value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notificationChannels: {
        ...prev.notificationChannels,
        [channel]: value
      }
    }));
  };

  const getConnectionStatusColor = () => {
    if (isConnected) return "text-green-600";
    if (connectionQuality === 'poor') return "text-yellow-600";
    return "text-red-600";
  };

  const getConnectionStatusText = () => {
    if (isConnected) return "Connected";
    if (connectionQuality === 'poor') return "Poor Connection";
    return "Disconnected";
  };

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
              variant={isConnected ? "default" : "destructive"}
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
                {billId
                  ? `Tracking Bill #${billId}`
                  : "No specific bill selected"}
              </p>
              <p className="text-xs text-muted-foreground">
                Updates: {updates.length} | Notifications:{" "}
                {notifications.length}
              </p>
            </div>
            <div className="flex gap-2">
              {billId && (
                <Button
                  onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
                  disabled={!isConnected}
                  variant={isSubscribed ? "outline" : "default"}
                  size="sm"
                >
                  {isSubscribed ? (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Unsubscribe
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4 mr-2" />
                      Subscribe
                    </>
                  )}
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
                      onCheckedChange={(checked) =>
                        handlePreferenceChange('statusChanges', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">New Comments</label>
                    <Switch
                      checked={preferences.newComments}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange('newComments', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Voting Schedule</label>
                    <Switch
                      checked={preferences.votingSchedule}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange('votingSchedule', checked)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Amendments</label>
                    <Switch
                      checked={preferences.amendments}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange('amendments', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Update Frequency</h4>
                <Select
                  value={preferences.updateFrequency}
                  onValueChange={(value: "immediate" | "hourly" | "daily") =>
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
                        onCheckedChange={(checked) =>
                          handleNotificationChannelChange('inApp', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Email</label>
                      <Switch
                        checked={preferences.notificationChannels.email}
                        onCheckedChange={(checked) =>
                          handleNotificationChannelChange('email', checked)
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Push</label>
                      <Switch
                        checked={preferences.notificationChannels.push}
                        onCheckedChange={(checked) =>
                          handleNotificationChannelChange('push', checked)
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowPreferences(false)}
                variant="outline"
              >
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
              {updates.map((update, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline">
                      {update.type.replace("_", " ")}
                    </Badge>
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
                        Status: {update.data.oldStatus} →{" "}
                        {update.data.newStatus}
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
      {notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {notifications.map((notification, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">
                      {notification.title}
                    </h4>
                    <Badge variant="secondary">{notification.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.message}
                  </p>
                  {notification.data && typeof notification.data === 'object' && 'changeCount' in notification.data && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {String(notification.data.changeCount)} changes included
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Debug Info (Development) */}
      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify({
                isConnected,
                connectionQuality,
                error,
                billUpdatesCount: Object.keys(billUpdates).length,
                notificationsCount: notifications.length,
                updatesCount: updates.length
              }, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
