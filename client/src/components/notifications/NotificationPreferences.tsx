/**
 * Notification Preferences Component
 * 
 * Modal for managing notification preferences including channels,
 * frequency, quiet hours, and push notification settings.
 */

import React, { useState, useEffect } from 'react';
import { X, Bell, Mail, Smartphone, Clock, Test } from 'lucide-react';
import { 
  useNotificationPreferences, 
  usePushNotifications, 
  useEmailNotifications 
} from '../../hooks/useNotifications';
import { NotificationCategory } from '../../services/notification-service';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../ui/select';
import { Input } from '../ui/input';
import { LoadingSpinner } from '../../core/loading/components/LoadingSpinner';

interface NotificationPreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationPreferences({ isOpen, onClose }: NotificationPreferencesProps) {
  const {
    preferences,
    isLoading: prefsLoading,
    error: prefsError,
    hasChanges,
    updatePreferences,
    updateLocalPreferences,
    resetPreferences,
    clearError: clearPrefsError
  } = useNotificationPreferences();

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    isLoading: pushLoading,
    error: pushError,
    permission: pushPermission,
    requestPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    clearError: clearPushError
  } = usePushNotifications();

  const {
    isLoading: emailLoading,
    error: emailError,
    configureEmail,
    sendTestEmail,
    clearError: clearEmailError
  } = useEmailNotifications();

  const [activeTab, setActiveTab] = useState<'general' | 'channels' | 'push' | 'email'>('general');
  const [isSaving, setIsSaving] = useState(false);

  // Clear errors when component mounts
  useEffect(() => {
    if (isOpen) {
      clearPrefsError();
      clearPushError();
      clearEmailError();
    }
  }, [isOpen, clearPrefsError, clearPushError, clearEmailError]);

  if (!isOpen || !preferences) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updatePreferences(preferences);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
    } else {
      if (pushPermission !== 'granted') {
        const granted = await requestPermission();
        if (!granted) return;
      }
      await subscribePush();
    }
  };

  const handleTestEmail = async () => {
    try {
      await sendTestEmail();
    } catch (error) {
      console.error('Failed to send test email:', error);
    }
  };

  const channelLabels = {
    comments: 'Comments & Replies',
    expertInsights: 'Expert Insights',
    moderation: 'Moderation Actions',
    mentions: 'Mentions',
    billUpdates: 'Bill Updates'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Notification Preferences
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'general', label: 'General', icon: Bell },
            { id: 'channels', label: 'Channels', icon: Bell },
            { id: 'push', label: 'Push', icon: Smartphone },
            { id: 'email', label: 'Email', icon: Mail }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
                onClick={() => setActiveTab(tab.id as any)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  General Settings
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="in-app">In-App Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show notifications within the application
                      </p>
                    </div>
                    <Switch
                      id="in-app"
                      checked={preferences.inApp}
                      onCheckedChange={(checked) => 
                        updateLocalPreferences({ inApp: checked })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frequency">Notification Frequency</Label>
                    <Select
                      value={preferences.frequency}
                      onValueChange={(value: 'immediate' | 'hourly' | 'daily') =>
                        updateLocalPreferences({ frequency: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="hourly">Hourly digest</SelectItem>
                        <SelectItem value="daily">Daily digest</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="quiet-hours">Quiet Hours</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Disable notifications during specific hours (urgent notifications will still be shown)
                        </p>
                      </div>
                      <Switch
                        id="quiet-hours"
                        checked={preferences.quietHours?.enabled || false}
                        onCheckedChange={(checked) =>
                          updateLocalPreferences({
                            quietHours: {
                              ...preferences.quietHours,
                              enabled: checked,
                              startTime: preferences.quietHours?.startTime || '22:00',
                              endTime: preferences.quietHours?.endTime || '08:00'
                            }
                          })
                        }
                      />
                    </div>

                    {preferences.quietHours?.enabled && (
                      <div className="grid grid-cols-2 gap-4 ml-4">
                        <div>
                          <Label htmlFor="start-time">Start Time</Label>
                          <Input
                            id="start-time"
                            type="time"
                            value={preferences.quietHours.startTime}
                            onChange={(e) =>
                              updateLocalPreferences({
                                quietHours: {
                                  ...preferences.quietHours!,
                                  startTime: e.target.value
                                }
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="end-time">End Time</Label>
                          <Input
                            id="end-time"
                            type="time"
                            value={preferences.quietHours.endTime}
                            onChange={(e) =>
                              updateLocalPreferences({
                                quietHours: {
                                  ...preferences.quietHours!,
                                  endTime: e.target.value
                                }
                              })
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Notification Channels
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                  Choose which types of notifications you want to receive
                </p>
                
                <div className="space-y-4">
                  {Object.entries(channelLabels).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={key}>{label}</Label>
                      </div>
                      <Switch
                        id={key}
                        checked={preferences.channels[key as keyof typeof preferences.channels]}
                        onCheckedChange={(checked) =>
                          updateLocalPreferences({
                            channels: {
                              ...preferences.channels,
                              [key]: checked
                            }
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Push Tab */}
          {activeTab === 'push' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Push Notifications
                </h3>
                
                {!pushSupported ? (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      Push notifications are not supported in your browser.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="push-enabled">Enable Push Notifications</Label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Receive notifications even when the app is closed
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {pushPermission !== 'granted' && (
                          <Badge variant="outline" className="text-xs">
                            Permission: {pushPermission}
                          </Badge>
                        )}
                        <Switch
                          id="push-enabled"
                          checked={pushSubscribed}
                          onCheckedChange={handlePushToggle}
                          disabled={pushLoading}
                        />
                      </div>
                    </div>

                    {pushError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">{pushError}</p>
                      </div>
                    )}

                    {pushPermission === 'denied' && (
                      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <p className="text-sm text-red-700 dark:text-red-300">
                          Push notifications are blocked. Please enable them in your browser settings.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Email Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                  Email Notifications
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="email-enabled">Enable Email Notifications</Label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Receive notifications via email
                      </p>
                    </div>
                    <Switch
                      id="email-enabled"
                      checked={preferences.email}
                      onCheckedChange={(checked) => 
                        updateLocalPreferences({ email: checked })
                      }
                    />
                  </div>

                  {preferences.email && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email-frequency">Email Frequency</Label>
                        <Select
                          value={preferences.frequency}
                          onValueChange={(value: 'immediate' | 'hourly' | 'daily') =>
                            updateLocalPreferences({ frequency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="immediate">Immediate</SelectItem>
                            <SelectItem value="hourly">Hourly digest</SelectItem>
                            <SelectItem value="daily">Daily digest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <Button
                          variant="outline"
                          onClick={handleTestEmail}
                          disabled={emailLoading}
                          className="w-full"
                        >
                          {emailLoading ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-2" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Test className="h-4 w-4 mr-2" />
                              Send Test Email
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  )}

                  {emailError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                      <p className="text-sm text-red-700 dark:text-red-300">{emailError}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* General Error Display */}
          {prefsError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{prefsError}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="text-xs">
                Unsaved changes
              </Badge>
            )}
            {prefsLoading && (
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-500">Loading...</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetPreferences} disabled={!hasChanges}>
              Reset
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || isSaving || prefsLoading}
            >
              {isSaving ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}