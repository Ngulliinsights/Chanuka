import React, { useEffect, useState } from "react";
import {
  useWebSocket,
  useBillUpdates,
  webSocketClient,
} from "../../services/websocket-client";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Bell,
  BellOff,
  Wifi,
  WifiOff,
  Settings,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { logger } from '@/utils/browser-logger';

interface RealTimeBillTrackerProps {
  billId?: number;
  userToken?: string;
}

export function RealTimeBillTracker({
  billId,
  userToken,
}: RealTimeBillTrackerProps) {
  const {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    subscribeToBill,
    unsubscribeFromBill,
  } = useWebSocket();
  const { updates, notifications, clearUpdates, clearNotifications } =
    useBillUpdates(billId);

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [preferences, setPreferences] = useState({
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true,
    updateFrequency: "immediate" as "immediate" | "hourly" | "daily",
    notificationChannels: {
      inApp: true,
      email: false,
      push: false,
    },
  });
  const [showPreferences, setShowPreferences] = useState(false);

  // Connect to WebSocket when component mounts
  useEffect(() => {
    if (userToken && !isConnected) {
      connect(userToken).catch((error) => {
        logger.error('Failed to connect to WebSocket:', { component: 'Chanuka' }, error);
        toast.error("Failed to connect to real-time updates");
      });
    }

    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [userToken, isConnected, connect, disconnect]);

  // Set up event listeners
  useEffect(() => {
    const handlePreferences = (prefs: any) => {
      setPreferences(prefs.billTracking);
    };

    const handlePreferencesUpdated = (prefs: any) => {
      setPreferences(prefs);
      toast.success("Preferences updated successfully");
    };

    const handleSubscribed = (data: any) => {
      setIsSubscribed(true);
      toast.success(`Subscribed to bill ${data.billId} updates`);
    };

    const handleUnsubscribed = (data: any) => {
      setIsSubscribed(false);
      toast.info(`Unsubscribed from bill ${data.billId} updates`);
    };

    const handleNotification = (notification: any) => {
      toast.info(notification.title, {
        description: notification.message,
      });
    };

    const handleBatchedUpdates = (notification: any) => {
      toast.info(notification.title, {
        description: notification.message,
      });
    };

    webSocketClient.on("preferences", handlePreferences);
    webSocketClient.on("preferencesUpdated", handlePreferencesUpdated);
    webSocketClient.on("subscribed", handleSubscribed);
    webSocketClient.on("unsubscribed", handleUnsubscribed);
    webSocketClient.on("notification", handleNotification);
    webSocketClient.on("batchedUpdates", handleBatchedUpdates);

    return () => {
      webSocketClient.off("preferences", handlePreferences);
      webSocketClient.off("preferencesUpdated", handlePreferencesUpdated);
      webSocketClient.off("subscribed", handleSubscribed);
      webSocketClient.off("unsubscribed", handleUnsubscribed);
      webSocketClient.off("notification", handleNotification);
      webSocketClient.off("batchedUpdates", handleBatchedUpdates);
    };
  }, []);

  const handleSubscribe = () => {
    if (billId && isConnected) {
      subscribeToBill(billId, [
        "status_change",
        "new_comment",
        "amendment",
        "voting_scheduled",
      ]);
    }
  };

  const handleUnsubscribe = () => {
    if (billId && isConnected) {
      unsubscribeFromBill(billId);
    }
  };

  const handleUpdatePreferences = () => {
    if (isConnected) {
      webSocketClient.updatePreferences(preferences);
    }
  };

  const getConnectionStatusColor = () => {
    if (isConnected) return "text-green-600";
    if (connectionStatus.reconnectAttempts > 0) return "text-yellow-600";
    return "text-red-600";
  };

  const getConnectionStatusText = () => {
    if (isConnected) return "Connected";
    if (connectionStatus.reconnectAttempts > 0)
      return `Reconnecting... (${connectionStatus.reconnectAttempts})`;
    return "Disconnected";
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              {isConnected ? (
                <Wifi className="h-5 w-5" />
              ) : (
                <WifiOff className="h-5 w-5" />
              )}
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
                      <BellOff className="h-4 w-4 mr-2" />
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
                        setPreferences((prev) => ({
                          ...prev,
                          statusChanges: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">New Comments</label>
                    <Switch
                      checked={preferences.newComments}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({
                          ...prev,
                          newComments: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Voting Schedule</label>
                    <Switch
                      checked={preferences.votingSchedule}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({
                          ...prev,
                          votingSchedule: checked,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm">Amendments</label>
                    <Switch
                      checked={preferences.amendments}
                      onCheckedChange={(checked) =>
                        setPreferences((prev) => ({
                          ...prev,
                          amendments: checked,
                        }))
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
                    setPreferences((prev) => ({
                      ...prev,
                      updateFrequency: value,
                    }))
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
                          setPreferences((prev) => ({
                            ...prev,
                            notificationChannels: {
                              ...prev.notificationChannels,
                              inApp: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Email</label>
                      <Switch
                        checked={preferences.notificationChannels.email}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            notificationChannels: {
                              ...prev.notificationChannels,
                              email: checked,
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Push</label>
                      <Switch
                        checked={preferences.notificationChannels.push}
                        onCheckedChange={(checked) =>
                          setPreferences((prev) => ({
                            ...prev,
                            notificationChannels: {
                              ...prev.notificationChannels,
                              push: checked,
                            },
                          }))
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
            <CardTitle className="flex items-center justify-between">
              Recent Updates
              <Button onClick={clearUpdates} variant="outline" size="sm">
                Clear
              </Button>
            </CardTitle>
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
                      {update.data.title || `Bill #${update.data.billId}`}
                    </p>
                    {update.data.oldStatus && update.data.newStatus && (
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
            <CardTitle className="flex items-center justify-between">
              Recent Notifications
              <Button onClick={clearNotifications} variant="outline" size="sm">
                Clear
              </Button>
            </CardTitle>
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
                  {notification.data?.changeCount && (
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
      {process.env.NODE_ENV === "development" && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-2 rounded">
              {JSON.stringify(connectionStatus, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
