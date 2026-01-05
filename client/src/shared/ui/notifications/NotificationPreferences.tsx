import { Bell, Mail, MessageSquare, Smartphone, Filter, Settings, TestTube, Save, CheckCircle, X, RefreshCw, AlertCircle } from 'lucide-react';
import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/shared/design-system';
import { Badge } from '@/shared/design-system';
import { Button } from '@/shared/design-system';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/design-system';
import { Input } from '@/shared/design-system';
import { Label } from '@/shared/design-system';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/design-system';
import { Separator } from '@/shared/design-system';
import { Switch } from '@/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/design-system';

// --- TYPES ---

type ChannelKey = 'inApp' | 'email' | 'sms' | 'push';
type CategoryKey = 'billUpdates' | 'commentReplies' | 'expertVerifications' | 'systemAlerts' | 'weeklyDigest';
type Frequency = 'immediate' | 'hourly' | 'daily' | 'weekly';
type Priority = 'low' | 'medium' | 'high' | 'urgent';
type FilterField = 'keywordFilters' | 'categoryFilters' | 'sponsorFilters';

interface QuietHours {
  start: string;
  end: string;
  timezone: string;
}

interface NotificationChannel {
  enabled: boolean;
  frequency: Frequency;
  quietHours?: QuietHours;
}

interface SmartFiltering {
  enabled: boolean;
  interestBasedFiltering: boolean;
  priorityThreshold: 'low' | 'medium' | 'high';
  categoryFilters: string[];
  keywordFilters: string[];
  sponsorFilters: string[];
}

interface NotificationPreferences {
  channels: Record<ChannelKey, NotificationChannel>;
  categories: Record<CategoryKey, boolean>;
  interests: string[];
  batchingEnabled: boolean;
  minimumPriority: Priority;
  smartFiltering: SmartFiltering;
}

interface ChannelConfig {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  testable: boolean;
}

interface PriorityConfig {
  label: string;
  color: string;
}

interface CategoryConfig {
  label: string;
  description: string;
}

// --- CONSTANTS ---

const CHANNEL_CONFIG: Record<ChannelKey, ChannelConfig> = {
  inApp: { icon: Bell, label: 'In-App Notifications', testable: false },
  email: { icon: Mail, label: 'Email Notifications', testable: true },
  sms: { icon: MessageSquare, label: 'SMS Notifications', testable: false },
  push: { icon: Smartphone, label: 'Push Notifications', testable: false }
} as const;

const FREQUENCY_OPTIONS: readonly { value: Frequency; label: string }[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'hourly', label: 'Hourly Digest' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Digest' }
] as const;

const PRIORITY_CONFIG: Record<Priority, PriorityConfig> = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800 border-red-300' }
} as const;

const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  billUpdates: {
    label: 'Bill Updates',
    description: 'Status changes, new amendments, and voting updates'
  },
  commentReplies: {
    label: 'Comment Replies',
    description: 'Replies to your comments and mentions'
  },
  expertVerifications: {
    label: 'Expert Verifications',
    description: 'Expert analysis and verification updates'
  },
  systemAlerts: {
    label: 'System Alerts',
    description: 'Important system announcements and maintenance'
  },
  weeklyDigest: {
    label: 'Weekly Digest',
    description: 'Weekly summary of activity and updates'
  }
} as const;

// --- MAIN COMPONENT ---

export default function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [originalPreferences, setOriginalPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [activeTab, setActiveTab] = useState('channels');

  // Input states
  const [newInterest, setNewInterest] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategoryFilter, setNewCategoryFilter] = useState('');
  const [newSponsorFilter, setNewSponsorFilter] = useState('');

  const { toast } = useToast();

  // Computed values
  const hasChanges = useMemo(() => {
    if (!preferences || !originalPreferences) return false;
    return JSON.stringify(preferences) !== JSON.stringify(originalPreferences);
  }, [preferences, originalPreferences]);

  const pushSupported = useMemo(() =>
    'Notification' in window && 'serviceWorker' in navigator,
    []
  );

  // --- API CALLS ---

  const fetchPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to fetch preferences');

      const data = await response.json();
      const preferences = data.data;

      setPreferences(preferences);
      setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));
    } catch (error) {
      toast({
        title: 'Error Loading Preferences',
        description: 'Unable to load your notification settings. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const savePreferences = useCallback(async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) throw new Error('Failed to save preferences');

      setOriginalPreferences(JSON.parse(JSON.stringify(preferences)));

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated successfully.'
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'Unable to save your preferences. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }, [preferences, toast]);

  const sendTestNotification = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to send test');

      toast({
        title: 'Test Notification Sent',
        description: 'Check your enabled notification channels.'
      });
    } catch (error) {
      toast({
        title: 'Test Failed',
        description: 'Unable to send test notification.',
        variant: 'destructive'
      });
    }
  }, [toast]);

  const sendTestEmail = useCallback(async () => {
    setTestingEmail(true);
    try {
      const response = await fetch('/api/notifications/test-email', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) throw new Error('Failed to send test email');

      toast({
        title: 'Test Email Sent',
        description: 'Check your inbox for the test email.'
      });
    } catch (error) {
      toast({
        title: 'Email Test Failed',
        description: 'Unable to send test email.',
        variant: 'destructive'
      });
    } finally {
      setTestingEmail(false);
    }
  }, [toast]);

  // --- PREFERENCE HANDLERS ---

  const updateChannel = useCallback((
    channel: ChannelKey,
    field: keyof NotificationChannel,
    value: boolean | Frequency | QuietHours
  ) => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        channels: {
          ...prev.channels,
          [channel]: { ...prev.channels[channel], [field]: value }
        }
      };
    });
  }, []);

  const updateCategory = useCallback((category: CategoryKey, enabled: boolean) => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        categories: { ...prev.categories, [category]: enabled }
      };
    });
  }, []);

  const updateSmartFiltering = useCallback(<K extends keyof SmartFiltering>(
    field: K,
    value: SmartFiltering[K]
  ) => {
    setPreferences(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        smartFiltering: { ...prev.smartFiltering, [field]: value }
      };
    });
  }, []);

  const updatePreference = useCallback((updates: Partial<NotificationPreferences>) => {
    setPreferences(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  // --- TAG HANDLERS ---

  const addTag = useCallback((
    field: 'interests' | FilterField,
    value: string,
    resetFn: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (!preferences || !value.trim()) return;

    const normalizedValue = value.trim().toLowerCase();
    const currentArray = field === 'interests'
      ? preferences.interests
      : preferences.smartFiltering[field];

    if (currentArray.includes(normalizedValue)) {
      toast({
        title: 'Already Added',
        description: `"${normalizedValue}" is already in your list.`,
        variant: 'destructive'
      });
      return;
    }

    if (field === 'interests') {
      updatePreference({ interests: [...preferences.interests, normalizedValue] });
    } else {
      updateSmartFiltering(field, [...currentArray, normalizedValue]);
    }

    resetFn('');
  }, [preferences, toast, updatePreference, updateSmartFiltering]);

  const removeTag = useCallback((
    field: 'interests' | FilterField,
    value: string
  ) => {
    if (!preferences) return;

    if (field === 'interests') {
      updatePreference({ interests: preferences.interests.filter(i => i !== value) });
    } else {
      const currentArray = preferences.smartFiltering[field];
      updateSmartFiltering(field, currentArray.filter(item => item !== value));
    }
  }, [preferences, updatePreference, updateSmartFiltering]);

  // --- PUSH NOTIFICATION HANDLERS ---

  const requestPushPermission = useCallback(async () => {
    if (!pushSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === 'granted') {
        toast({
          title: 'Permission Granted',
          description: 'Push notifications are now enabled.'
        });
        return true;
      } else if (permission === 'denied') {
        toast({
          title: 'Permission Denied',
          description: 'Enable push notifications in your browser settings to use this feature.',
          variant: 'destructive'
        });
        return false;
      }
    } catch (error) {
      toast({
        title: 'Permission Error',
        description: 'Unable to request notification permission.',
        variant: 'destructive'
      });
      return false;
    }
    return false;
  }, [pushSupported, toast]);

  const handlePushToggle = useCallback(async (enabled: boolean) => {
    if (enabled && pushPermission !== 'granted') {
      const granted = await requestPushPermission();
      if (!granted) return;
    }
    updateChannel('push', 'enabled', enabled);
  }, [pushPermission, requestPushPermission, updateChannel]);

  const resetPreferences = useCallback(() => {
    if (originalPreferences) {
      setPreferences(JSON.parse(JSON.stringify(originalPreferences)));
      toast({
        title: 'Changes Reset',
        description: 'All changes have been reverted.'
      });
    }
  }, [originalPreferences, toast]);

  // --- EFFECTS ---

  useEffect(() => {
    fetchPreferences();
    if (pushSupported) {
      setPushPermission(Notification.permission);
    }
  }, [fetchPreferences, pushSupported]);

  // --- RENDER HELPERS ---

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        <p className="text-sm text-gray-500">Loading preferences...</p>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-gray-400" />
        <p className="text-gray-600 font-medium">Unable to load notification preferences</p>
        <Button onClick={fetchPreferences} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notification Preferences</h1>
          <p className="text-gray-600 mt-1">Customize how and when you receive notifications</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasChanges && (
            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50">
              Unsaved changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetPreferences}
            disabled={!hasChanges}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={savePreferences}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        {/* CHANNELS TAB */}
        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Configure delivery methods and timing for your notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(Object.entries(CHANNEL_CONFIG) as [ChannelKey, ChannelConfig][]).map(
                ([channelKey, config]) => {
                  const channel = preferences.channels[channelKey];
                  const Icon = config.icon;
                  const isPush = channelKey === 'push';
                  const showPermissionWarning = isPush && channel.enabled && pushPermission !== 'granted';

                  return (
                    <div key={channelKey} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${channel.enabled ? 'bg-blue-50' : 'bg-gray-50'}`}>
                            <Icon className={`h-5 w-5 ${channel.enabled ? 'text-blue-600' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <Label className="text-base font-medium">{config.label}</Label>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className={`text-xs ${channel.enabled ? 'border-green-300 text-green-700 bg-green-50' : 'border-gray-300 text-gray-600'}`}
                              >
                                {channel.enabled ? 'Active' : 'Disabled'}
                              </Badge>
                              {isPush && pushPermission !== 'default' && (
                                <Badge variant="outline" className="text-xs">
                                  {pushPermission}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={channel.enabled}
                          onCheckedChange={(enabled: boolean) =>
                            isPush ? handlePushToggle(enabled) : updateChannel(channelKey, 'enabled', enabled)
                          }
                        />
                      </div>

                      {showPermissionWarning && (
                        <Alert className="ml-14">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            Browser permission required. Click the switch to enable push notifications.
                          </AlertDescription>
                        </Alert>
                      )}

                      {channel.enabled && (
                        <div className="ml-14 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Delivery Frequency</Label>
                              <Select
                                value={channel.frequency}
                                onValueChange={(value: Frequency) =>
                                  updateChannel(channelKey, 'frequency', value)
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FREQUENCY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {channelKey !== 'inApp' && (
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">Quiet Hours</Label>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="time"
                                    value={channel.quietHours?.start || '22:00'}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      updateChannel(channelKey, 'quietHours', {
                                        start: e.target.value,
                                        end: channel.quietHours?.end || '08:00',
                                        timezone: channel.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                                      })
                                    }
                                    className="flex-1"
                                  />
                                  <span className="text-sm text-gray-500">to</span>
                                  <Input
                                    type="time"
                                    value={channel.quietHours?.end || '08:00'}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                      updateChannel(channelKey, 'quietHours', {
                                        start: channel.quietHours?.start || '22:00',
                                        end: e.target.value,
                                        timezone: channel.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                                      })
                                    }
                                    className="flex-1"
                                  />
                                </div>
                                <p className="text-xs text-gray-500">
                                  Urgent notifications will still be delivered
                                </p>
                              </div>
                            )}
                          </div>

                          {config.testable && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={sendTestEmail}
                              disabled={testingEmail}
                              className="w-full sm:w-auto"
                            >
                              {testingEmail ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-2"></div>
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Mail className="h-3 w-3 mr-2" />
                                  Send Test Email
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                      {channelKey !== 'push' && <Separator />}
                    </div>
                  );
                }
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* CATEGORIES TAB */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(Object.entries(CATEGORY_CONFIG) as [CategoryKey, CategoryConfig][]).map(
                ([categoryKey, config]) => (
                  <div key={categoryKey} className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <div className="flex-1">
                      <Label className="text-base font-medium cursor-pointer">
                        {config.label}
                      </Label>
                      <p className="text-sm text-gray-600 mt-1">
                        {config.description}
                      </p>
                    </div>
                    <Switch
                      checked={preferences.categories[categoryKey]}
                      onCheckedChange={(checked: boolean) => updateCategory(categoryKey, checked)}
                    />
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* INTERESTS TAB */}
        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Interests</CardTitle>
              <CardDescription>
                Add topics you care about to personalize your notification experience.
                Enable &ldquo;Interest-Based Filtering&rdquo; in Advanced settings to only receive relevant notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="e.g., healthcare, education, climate"
                  value={newInterest}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewInterest(e.target.value)}
                  onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === 'Enter' && addTag('interests', newInterest, setNewInterest)
                  }
                  className="flex-1"
                />
                <Button
                  onClick={() => addTag('interests', newInterest, setNewInterest)}
                  size="sm"
                  disabled={!newInterest.trim()}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>

              {preferences.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  {preferences.interests.map((interest) => (
                    <TagBadge
                      key={interest}
                      label={interest}
                      onRemove={() => removeTag('interests', interest)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500">
                    No interests added yet. Add topics above to get started!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADVANCED TAB */}
        <TabsContent value="advanced" className="space-y-4">
          {/* General Settings */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Fine-tune your notification experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between p-4 rounded-lg border border-gray-200">
                <div className="flex-1">
                  <Label className="text-base font-medium">Batch Notifications</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Group similar notifications together to reduce interruptions
                  </p>
                </div>
                <Switch
                  checked={preferences.batchingEnabled}
                  onCheckedChange={(checked: boolean) => updatePreference({ batchingEnabled: checked })}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-base font-medium">Minimum Priority Level</Label>
                <p className="text-sm text-gray-600">
                  Only receive notifications at or above this priority level
                </p>
                <Select
                  value={preferences.minimumPriority}
                  onValueChange={(value: Priority) => updatePreference({ minimumPriority: value })}
                >
                  <SelectTrigger className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(PRIORITY_CONFIG) as [Priority, PriorityConfig][]).map(
                      ([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <Badge className={`${config.color} border`}>
                            {config.label}
                          </Badge>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Smart Filtering */}
          <Card>
            <CardHeader>
              <CardTitle>Smart Filtering</CardTitle>
              <CardDescription>
                Advanced filters to customize which notifications you receive based on content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start justify-between p-4 rounded-lg border-2 border-gray-200">
                <div className="flex-1">
                  <Label className="text-base font-medium">Enable Smart Filtering</Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Apply content-based filters to your notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.smartFiltering.enabled}
                  onCheckedChange={(checked: boolean) => updateSmartFiltering('enabled', checked)}
                />
              </div>

              {preferences.smartFiltering.enabled && (
                <div className="space-y-6 pl-6 border-l-2 border-blue-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Label className="text-base font-medium">Interest-Based Filtering</Label>
                      <p className="text-sm text-gray-600 mt-1">
                        Only notify about topics matching your interests list
                      </p>
                    </div>
                    <Switch
                      checked={preferences.smartFiltering.interestBasedFiltering}
                      onCheckedChange={(checked: boolean) => updateSmartFiltering('interestBasedFiltering', checked)}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-medium">Filter Priority Threshold</Label>
                    <p className="text-sm text-gray-600">
                      Smart filters only apply to notifications below this priority
                    </p>
                    <Select
                      value={preferences.smartFiltering.priorityThreshold}
                      onValueChange={(value: 'low' | 'medium' | 'high') =>
                        updateSmartFiltering('priorityThreshold', value)
                      }
                    >
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(['low', 'medium', 'high'] as const).map((value) => (
                          <SelectItem key={value} value={value}>
                            <Badge className={`${PRIORITY_CONFIG[value].color} border`}>
                              {PRIORITY_CONFIG[value].label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <FilterSection
                    title="Keyword Filters"
                    description="Only receive notifications containing these keywords"
                    placeholder="Add a keyword"
                    items={preferences.smartFiltering.keywordFilters}
                    value={newKeyword}
                    onChange={setNewKeyword}
                    onAdd={() => addTag('keywordFilters', newKeyword, setNewKeyword)}
                    onRemove={(item) => removeTag('keywordFilters', item)}
                  />

                  <FilterSection
                    title="Category Filters"
                    description="Only receive notifications from these categories"
                    placeholder="Add a category"
                    items={preferences.smartFiltering.categoryFilters}
                    value={newCategoryFilter}
                    onChange={setNewCategoryFilter}
                    onAdd={() => addTag('categoryFilters', newCategoryFilter, setNewCategoryFilter)}
                    onRemove={(item) => removeTag('categoryFilters', item)}
                  />

                  <FilterSection
                    title="Sponsor Filters"
                    description="Only receive notifications related to these sponsors"
                    placeholder="Add a sponsor"
                    items={preferences.smartFiltering.sponsorFilters}
                    value={newSponsorFilter}
                    onChange={setNewSponsorFilter}
                    onAdd={() => addTag('sponsorFilters', newSponsorFilter, setNewSponsorFilter)}
                    onRemove={(item) => removeTag('sponsorFilters', item)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- SUBCOMPONENTS ---

interface TagBadgeProps {
  label: string;
  onRemove: () => void;
}

function TagBadge({ label, onRemove }: TagBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-sm hover:bg-gray-200 transition-colors"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-1 hover:text-red-600 transition-colors rounded-full hover:bg-red-100 p-0.5"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

interface FilterSectionProps {
  title: string;
  description: string;
  placeholder: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (item: string) => void;
}

function FilterSection({
  title,
  description,
  placeholder,
  items,
  value,
  onChange,
  onAdd,
  onRemove
}: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-base font-medium">{title}</Label>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          onKeyPress={(e: React.KeyboardEvent<HTMLInputElement>) =>
            e.key === 'Enter' && onAdd()
          }
          className="flex-1"
        />
        <Button onClick={onAdd} size="sm" disabled={!value.trim()}>
          <CheckCircle className="h-4 w-4" />
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {items.map((item) => (
            <TagBadge key={item} label={item} onRemove={() => onRemove(item)} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic pl-3">No filters added</p>
      )}
    </div>
  );
}
