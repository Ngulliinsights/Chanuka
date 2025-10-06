import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  Mail, 
  MessageSquare, 
  Smartphone, 
  Clock, 
  Filter,
  Settings,
  TestTube,
  Save,
  Plus,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationChannel {
  enabled: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  quietHours?: {
    start: string;
    end: string;
    timezone: string;
  };
}

interface NotificationPreferences {
  channels: {
    inApp: NotificationChannel;
    email: NotificationChannel;
    sms: NotificationChannel;
    push: NotificationChannel;
  };
  categories: {
    billUpdates: boolean;
    commentReplies: boolean;
    expertVerifications: boolean;
    systemAlerts: boolean;
    weeklyDigest: boolean;
  };
  interests: string[];
  batchingEnabled: boolean;
  minimumPriority: 'low' | 'medium' | 'high' | 'urgent';
}

const channelIcons = {
  inApp: Bell,
  email: Mail,
  sms: MessageSquare,
  push: Smartphone
};

const channelLabels = {
  inApp: 'In-App Notifications',
  email: 'Email Notifications',
  sms: 'SMS Notifications',
  push: 'Push Notifications'
};

const frequencyOptions = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' }
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' }
];

const categoryLabels = {
  billUpdates: 'Bill Updates',
  commentReplies: 'Comment Replies',
  expertVerifications: 'Expert Verifications',
  systemAlerts: 'System Alerts',
  weeklyDigest: 'Weekly Digest'
};

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      setPreferences(data.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load notification preferences',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
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

      if (!response.ok) {
        throw new Error('Failed to save preferences');
      }

      toast({
        title: 'Success',
        description: 'Notification preferences saved successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to send test notification');
      }

      toast({
        title: 'Test Sent',
        description: 'Test notification sent successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive'
      });
    }
  };

  const updateChannelPreference = (
    channel: keyof NotificationPreferences['channels'],
    field: keyof NotificationChannel,
    value: any
  ) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      channels: {
        ...preferences.channels,
        [channel]: {
          ...preferences.channels[channel],
          [field]: value
        }
      }
    });
  };

  const updateCategoryPreference = (
    category: keyof NotificationPreferences['categories'],
    enabled: boolean
  ) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: enabled
      }
    });
  };

  const addInterest = () => {
    if (!preferences || !newInterest.trim()) return;

    const interest = newInterest.trim().toLowerCase();
    if (preferences.interests.includes(interest)) {
      toast({
        title: 'Duplicate Interest',
        description: 'This interest is already added',
        variant: 'destructive'
      });
      return;
    }

    setPreferences({
      ...preferences,
      interests: [...preferences.interests, interest]
    });
    setNewInterest('');
  };

  const removeInterest = (interest: string) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      interests: preferences.interests.filter(i => i !== interest)
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Failed to load notification preferences</p>
        <Button onClick={fetchPreferences} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notification Preferences</h1>
          <p className="text-gray-600">Customize how and when you receive notifications</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={sendTestNotification}
            className="flex items-center gap-2"
          >
            <TestTube className="h-4 w-4" />
            Send Test
          </Button>
          <Button
            onClick={savePreferences}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Configure how you want to receive notifications for each channel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(preferences.channels).map(([channelKey, channel]) => {
                const Icon = channelIcons[channelKey as keyof typeof channelIcons];
                const label = channelLabels[channelKey as keyof typeof channelLabels];

                return (
                  <div key={channelKey} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-gray-600" />
                        <div>
                          <Label className="text-base font-medium">{label}</Label>
                          <p className="text-sm text-gray-500">
                            {channel.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={channel.enabled}
                        onCheckedChange={(enabled) =>
                          updateChannelPreference(
                            channelKey as keyof NotificationPreferences['channels'],
                            'enabled',
                            enabled
                          )
                        }
                      />
                    </div>

                    {channel.enabled && (
                      <div className="ml-8 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm">Frequency</Label>
                            <Select
                              value={channel.frequency}
                              onValueChange={(value) =>
                                updateChannelPreference(
                                  channelKey as keyof NotificationPreferences['channels'],
                                  'frequency',
                                  value
                                )
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {frequencyOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {channelKey !== 'inApp' && (
                            <div>
                              <Label className="text-sm">Quiet Hours</Label>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="time"
                                  value={channel.quietHours?.start || '22:00'}
                                  onChange={(e) =>
                                    updateChannelPreference(
                                      channelKey as keyof NotificationPreferences['channels'],
                                      'quietHours',
                                      {
                                        ...channel.quietHours,
                                        start: e.target.value,
                                        end: channel.quietHours?.end || '08:00',
                                        timezone: channel.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                                      }
                                    )
                                  }
                                  className="w-24"
                                />
                                <span className="text-sm text-gray-500">to</span>
                                <Input
                                  type="time"
                                  value={channel.quietHours?.end || '08:00'}
                                  onChange={(e) =>
                                    updateChannelPreference(
                                      channelKey as keyof NotificationPreferences['channels'],
                                      'quietHours',
                                      {
                                        ...channel.quietHours,
                                        start: channel.quietHours?.start || '22:00',
                                        end: e.target.value,
                                        timezone: channel.quietHours?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
                                      }
                                    )
                                  }
                                  className="w-24"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Notification Categories
              </CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(preferences.categories).map(([categoryKey, enabled]) => (
                <div key={categoryKey} className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">
                      {categoryLabels[categoryKey as keyof typeof categoryLabels]}
                    </Label>
                    <p className="text-sm text-gray-500">
                      {getCategoryDescription(categoryKey)}
                    </p>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      updateCategoryPreference(
                        categoryKey as keyof NotificationPreferences['categories'],
                        checked
                      )
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Smart Filtering by Interests</CardTitle>
              <CardDescription>
                Add topics you're interested in to receive more relevant notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Add an interest (e.g., healthcare, education)"
                  value={newInterest}
                  onChange={(e) => setNewInterest(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                />
                <Button onClick={addInterest} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {preferences.interests.map((interest) => (
                  <Badge key={interest} variant="secondary" className="flex items-center gap-1">
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="ml-1 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {preferences.interests.length === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No interests added. Add some topics to get more relevant notifications.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>
                Fine-tune your notification experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Batch Notifications</Label>
                  <p className="text-sm text-gray-500">
                    Group similar notifications together to reduce interruptions
                  </p>
                </div>
                <Switch
                  checked={preferences.batchingEnabled}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, batchingEnabled: checked })
                  }
                />
              </div>

              <div>
                <Label className="text-base font-medium">Minimum Priority</Label>
                <p className="text-sm text-gray-500 mb-3">
                  Only receive notifications at or above this priority level
                </p>
                <Select
                  value={preferences.minimumPriority}
                  onValueChange={(value) =>
                    setPreferences({
                      ...preferences,
                      minimumPriority: value as NotificationPreferences['minimumPriority']
                    })
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Badge className={option.color}>{option.label}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getCategoryDescription(category: string): string {
  const descriptions = {
    billUpdates: 'Status changes, new amendments, and voting updates',
    commentReplies: 'Replies to your comments and mentions',
    expertVerifications: 'Expert analysis and verification updates',
    systemAlerts: 'Important system announcements and maintenance',
    weeklyDigest: 'Weekly summary of activity and updates'
  };
  
  return descriptions[category as keyof typeof descriptions] || '';
}