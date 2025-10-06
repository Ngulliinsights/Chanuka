import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  MessageSquare, 
  Clock, 
  Filter, 
  Settings, 
  TestTube,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';

interface NotificationChannel {
  type: 'inApp' | 'email' | 'push' | 'sms';
  enabled: boolean;
  available: boolean;
  description: string;
}

interface AlertPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  updateFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone?: string;
  };
  smartFiltering: {
    enabled: boolean;
    interestBasedFiltering: boolean;
    priorityThreshold: 'low' | 'medium' | 'high';
    categoryFilters: string[];
    keywordFilters: string[];
    sponsorFilters: string[];
  };
  advancedSettings: {
    digestSchedule: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      timeOfDay: string;
    };
    escalationRules: {
      enabled: boolean;
      urgentBillsImmediate: boolean;
      importantSponsorsImmediate: boolean;
      highEngagementImmediate: boolean;
    };
    batchingRules: {
      maxBatchSize: number;
      batchTimeWindow: number;
      similarUpdatesGrouping: boolean;
    };
  };
}

interface AlertPreferencesProps {
  userId?: string;
}

export function AlertPreferences({ userId }: AlertPreferencesProps) {
  const [preferences, setPreferences] = useState<AlertPreferences | null>(null);
  const [channels, setChannels] = useState<Record<string, NotificationChannel>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
    loadChannels();
    loadCategories();
    loadSponsors();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/alert-preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreferences(data.data.billTracking);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      setMessage({ type: 'error', text: 'Failed to load alert preferences' });
    } finally {
      setLoading(false);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await fetch('/api/alert-preferences/channels', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setChannels(data.data);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/alert-preferences/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSponsors = async () => {
    try {
      const response = await fetch('/api/alert-preferences/sponsors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSponsors(data.data);
      }
    } catch (error) {
      console.error('Error loading sponsors:', error);
    }
  };

  const savePreferences = async () => {
    if (!preferences) return;

    setSaving(true);
    try {
      const response = await fetch('/api/alert-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(preferences)
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Alert preferences saved successfully' });
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save alert preferences' });
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (type: string, priority: string = 'medium') => {
    setTestingNotification(true);
    try {
      const response = await fetch('/api/alert-preferences/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type, priority })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test notification sent successfully' });
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      setMessage({ type: 'error', text: 'Failed to send test notification' });
    } finally {
      setTestingNotification(false);
    }
  };

  const updatePreference = (path: string, value: any) => {
    if (!preferences) return;

    const keys = path.split('.');
    const newPreferences = { ...preferences };
    let current: any = newPreferences;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setPreferences(newPreferences);
  };

  const addFilter = (type: 'categoryFilters' | 'keywordFilters' | 'sponsorFilters', value: string) => {
    if (!preferences || !value.trim()) return;

    const currentFilters = preferences.smartFiltering[type];
    if (!currentFilters.includes(value)) {
      updatePreference(`smartFiltering.${type}`, [...currentFilters, value]);
    }
  };

  const removeFilter = (type: 'categoryFilters' | 'keywordFilters' | 'sponsorFilters', value: string) => {
    if (!preferences) return;

    const currentFilters = preferences.smartFiltering[type];
    updatePreference(`smartFiltering.${type}`, currentFilters.filter(f => f !== value));
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
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load alert preferences. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 
                         message.type === 'success' ? 'border-green-200 bg-green-50' : 
                         'border-blue-200 bg-blue-50'}>
          {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
           message.type === 'success' ? <CheckCircle className="h-4 w-4" /> :
           <Info className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Alert Preferences</h2>
          <p className="text-gray-600">Customize how and when you receive legislative notifications</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => testNotification('bill_update')}
            disabled={testingNotification}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Notification
          </Button>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="basic">Basic Settings</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="filtering">Smart Filtering</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Choose which types of updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="status-changes">Bill Status Changes</Label>
                  <p className="text-sm text-gray-500">When bills move through the legislative process</p>
                </div>
                <Switch
                  id="status-changes"
                  checked={preferences.statusChanges}
                  onCheckedChange={(checked) => updatePreference('statusChanges', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="new-comments">New Comments</Label>
                  <p className="text-sm text-gray-500">When experts or citizens comment on bills you're tracking</p>
                </div>
                <Switch
                  id="new-comments"
                  checked={preferences.newComments}
                  onCheckedChange={(checked) => updatePreference('newComments', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="voting-schedule">Voting Schedule</Label>
                  <p className="text-sm text-gray-500">When votes are scheduled for bills you're tracking</p>
                </div>
                <Switch
                  id="voting-schedule"
                  checked={preferences.votingSchedule}
                  onCheckedChange={(checked) => updatePreference('votingSchedule', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="amendments">Amendments</Label>
                  <p className="text-sm text-gray-500">When amendments are proposed to bills you're tracking</p>
                </div>
                <Switch
                  id="amendments"
                  checked={preferences.amendments}
                  onCheckedChange={(checked) => updatePreference('amendments', checked)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Update Frequency
              </CardTitle>
              <CardDescription>
                How often you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={preferences.updateFrequency}
                onValueChange={(value) => updatePreference('updateFrequency', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="hourly">Hourly Digest</SelectItem>
                  <SelectItem value="daily">Daily Digest</SelectItem>
                  <SelectItem value="weekly">Weekly Digest</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to receive notifications (except urgent ones)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
                <Switch
                  id="quiet-hours"
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={(checked) => updatePreference('quietHours.enabled', checked)}
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-time">Start Time</Label>
                    <Input
                      id="start-time"
                      type="time"
                      value={preferences.quietHours.startTime}
                      onChange={(e) => updatePreference('quietHours.startTime', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-time">End Time</Label>
                    <Input
                      id="end-time"
                      type="time"
                      value={preferences.quietHours.endTime}
                      onChange={(e) => updatePreference('quietHours.endTime', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Notification Channels
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(channels).map(([key, channel]) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {key === 'inApp' && <Bell className="h-5 w-5" />}
                    {key === 'email' && <Mail className="h-5 w-5" />}
                    {key === 'push' && <Smartphone className="h-5 w-5" />}
                    {key === 'sms' && <MessageSquare className="h-5 w-5" />}
                    <div>
                      <div className="flex items-center gap-2">
                        <Label className="capitalize">{key === 'inApp' ? 'In-App' : key.toUpperCase()}</Label>
                        {!channel.available && <Badge variant="secondary">Coming Soon</Badge>}
                      </div>
                      <p className="text-sm text-gray-500">{channel.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.notificationChannels[key as keyof typeof preferences.notificationChannels]}
                    onCheckedChange={(checked) => updatePreference(`notificationChannels.${key}`, checked)}
                    disabled={!channel.available}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filtering" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Smart Filtering
              </CardTitle>
              <CardDescription>
                Customize which notifications you receive based on your interests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="smart-filtering">Enable Smart Filtering</Label>
                  <p className="text-sm text-gray-500">Filter notifications based on your preferences below</p>
                </div>
                <Switch
                  id="smart-filtering"
                  checked={preferences.smartFiltering.enabled}
                  onCheckedChange={(checked) => updatePreference('smartFiltering.enabled', checked)}
                />
              </div>

              {preferences.smartFiltering.enabled && (
                <>
                  <Separator />
                  
                  <div>
                    <Label>Priority Threshold</Label>
                    <p className="text-sm text-gray-500 mb-2">Only show notifications above this priority level</p>
                    <Select
                      value={preferences.smartFiltering.priorityThreshold}
                      onValueChange={(value) => updatePreference('smartFiltering.priorityThreshold', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low and above</SelectItem>
                        <SelectItem value="medium">Medium and above</SelectItem>
                        <SelectItem value="high">High only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Category Filters</Label>
                    <p className="text-sm text-gray-500 mb-2">Only receive notifications for these categories</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {preferences.smartFiltering.categoryFilters.map((category) => (
                        <Badge key={category} variant="secondary" className="cursor-pointer" onClick={() => removeFilter('categoryFilters', category)}>
                          {category} ×
                        </Badge>
                      ))}
                    </div>
                    <Select onValueChange={(value) => addFilter('categoryFilters', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Add category filter" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.filter(cat => !preferences.smartFiltering.categoryFilters.includes(cat)).map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="keyword-input">Keyword Filters</Label>
                    <p className="text-sm text-gray-500 mb-2">Only receive notifications containing these keywords</p>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {preferences.smartFiltering.keywordFilters.map((keyword) => (
                        <Badge key={keyword} variant="secondary" className="cursor-pointer" onClick={() => removeFilter('keywordFilters', keyword)}>
                          {keyword} ×
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="keyword-input"
                        placeholder="Enter keyword and press Enter"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            addFilter('keywordFilters', e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Fine-tune your notification experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-4">Digest Schedule</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="digest-enabled">Enable Digest Notifications</Label>
                    <Switch
                      id="digest-enabled"
                      checked={preferences.advancedSettings.digestSchedule.enabled}
                      onCheckedChange={(checked) => updatePreference('advancedSettings.digestSchedule.enabled', checked)}
                    />
                  </div>

                  {preferences.advancedSettings.digestSchedule.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Frequency</Label>
                        <Select
                          value={preferences.advancedSettings.digestSchedule.frequency}
                          onValueChange={(value) => updatePreference('advancedSettings.digestSchedule.frequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Time of Day</Label>
                        <Input
                          type="time"
                          value={preferences.advancedSettings.digestSchedule.timeOfDay}
                          onChange={(e) => updatePreference('advancedSettings.digestSchedule.timeOfDay', e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Escalation Rules</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="escalation-enabled">Enable Escalation Rules</Label>
                    <Switch
                      id="escalation-enabled"
                      checked={preferences.advancedSettings.escalationRules.enabled}
                      onCheckedChange={(checked) => updatePreference('advancedSettings.escalationRules.enabled', checked)}
                    />
                  </div>

                  {preferences.advancedSettings.escalationRules.enabled && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Urgent Bills Immediate</Label>
                          <p className="text-sm text-gray-500">Send urgent bill updates immediately</p>
                        </div>
                        <Switch
                          checked={preferences.advancedSettings.escalationRules.urgentBillsImmediate}
                          onCheckedChange={(checked) => updatePreference('advancedSettings.escalationRules.urgentBillsImmediate', checked)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Important Sponsors Immediate</Label>
                          <p className="text-sm text-gray-500">Send updates from important sponsors immediately</p>
                        </div>
                        <Switch
                          checked={preferences.advancedSettings.escalationRules.importantSponsorsImmediate}
                          onCheckedChange={(checked) => updatePreference('advancedSettings.escalationRules.importantSponsorsImmediate', checked)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-4">Batching Rules</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Group Similar Updates</Label>
                      <p className="text-sm text-gray-500">Combine similar notifications into batches</p>
                    </div>
                    <Switch
                      checked={preferences.advancedSettings.batchingRules.similarUpdatesGrouping}
                      onCheckedChange={(checked) => updatePreference('advancedSettings.batchingRules.similarUpdatesGrouping', checked)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Max Batch Size</Label>
                      <Input
                        type="number"
                        min="1"
                        max="50"
                        value={preferences.advancedSettings.batchingRules.maxBatchSize}
                        onChange={(e) => updatePreference('advancedSettings.batchingRules.maxBatchSize', parseInt(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>Batch Time Window (minutes)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="1440"
                        value={preferences.advancedSettings.batchingRules.batchTimeWindow}
                        onChange={(e) => updatePreference('advancedSettings.batchingRules.batchTimeWindow', parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}