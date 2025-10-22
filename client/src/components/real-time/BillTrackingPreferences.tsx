import { useState, useEffect } from 'react';
import { Bell, Clock, Mail, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { cn } from '../../lib/utils';
import { logger } from '@/utils/browser-logger';

interface BillTrackingPreferences {
  statusChanges: boolean;
  newComments: boolean;
  votingSchedule: boolean;
  amendments: boolean;
  updateFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  notificationChannels: {
    inApp: boolean;
    email: boolean;
    push: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
}

interface BillTrackingPreferencesProps {
  className?: string;
  onSave?: (preferences: BillTrackingPreferences) => void;
}

export function BillTrackingPreferences({ className, onSave }: BillTrackingPreferencesProps) {
  const [preferences, setPreferences] = useState<BillTrackingPreferences>({
    statusChanges: true,
    newComments: false,
    votingSchedule: true,
    amendments: true,
    updateFrequency: 'immediate',
    notificationChannels: {
      inApp: true,
      email: false,
      push: false
    },
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '08:00'
    }
  });

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/real-time/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.billTracking) {
          setPreferences(data.data.billTracking);
        }
      }
    } catch (error) {
      logger.error('Error loading preferences:', { component: 'Chanuka' }, error);
    }
  };

  const savePreferences = async () => {
    setLoading(true);
    setSaved(false);

    try {
      const response = await fetch('/api/real-time/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          billTracking: preferences
        })
      });

      if (response.ok) {
        setSaved(true);
        onSave?.(preferences);
        
        // Hide success message after 3 seconds
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      logger.error('Error saving preferences:', { component: 'Chanuka' }, error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = <K extends keyof BillTrackingPreferences>(
    key: K,
    value: BillTrackingPreferences[K]
  ) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const updateNotificationChannel = (channel: keyof BillTrackingPreferences['notificationChannels'], enabled: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notificationChannels: {
        ...prev.notificationChannels,
        [channel]: enabled
      }
    }));
  };

  const updateQuietHours = (field: keyof NonNullable<BillTrackingPreferences['quietHours']>, value: any) => {
    setPreferences(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours!,
        [field]: value
      }
    }));
  };

  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Bill Tracking Preferences
        </h3>
        {saved && (
          <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
            <Bell className="h-4 w-4" />
            Preferences saved!
          </div>
        )}
      </div>

      {/* Notification Types */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
          What would you like to be notified about?
        </h4>
        
        <div className="space-y-3">
          {[
            { key: 'statusChanges' as const, label: 'Bill status changes', description: 'When a bill moves to a new stage' },
            { key: 'newComments' as const, label: 'New comments', description: 'When someone comments on bills you track' },
            { key: 'votingSchedule' as const, label: 'Voting schedule', description: 'When votes are scheduled for tracked bills' },
            { key: 'amendments' as const, label: 'Amendments', description: 'When amendments are proposed to tracked bills' }
          ].map(({ key, label, description }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences[key]}
                onChange={(e) => updatePreference(key, e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Update Frequency */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Update Frequency
        </h4>
        
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'immediate' as const, label: 'Immediate', description: 'Get notified right away' },
            { value: 'hourly' as const, label: 'Hourly', description: 'Batched every hour' },
            { value: 'daily' as const, label: 'Daily', description: 'Once per day summary' },
            { value: 'weekly' as const, label: 'Weekly', description: 'Weekly digest' }
          ].map(({ value, label, description }) => (
            <label key={value} className="cursor-pointer">
              <div className={cn(
                "p-3 border rounded-lg transition-colors",
                preferences.updateFrequency === value
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
              )}>
                <input
                  type="radio"
                  name="updateFrequency"
                  value={value}
                  checked={preferences.updateFrequency === value}
                  onChange={(e) => updatePreference('updateFrequency', e.target.value as any)}
                  className="sr-only"
                />
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Notification Channels */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
          How would you like to receive notifications?
        </h4>
        
        <div className="space-y-3">
          {[
            { key: 'inApp' as const, label: 'In-app notifications', icon: Bell, description: 'Show notifications in the app' },
            { key: 'email' as const, label: 'Email notifications', icon: Mail, description: 'Send notifications to your email' },
            { key: 'push' as const, label: 'Push notifications', icon: Smartphone, description: 'Browser push notifications' }
          ].map(({ key, label, icon: Icon, description }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.notificationChannels[key]}
                onChange={(e) => updateNotificationChannel(key, e.target.checked)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <Icon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
          {preferences.quietHours?.enabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          Quiet Hours
        </h4>
        
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.quietHours?.enabled || false}
            onChange={(e) => updateQuietHours('enabled', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Enable quiet hours
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Pause notifications during specified hours
            </div>
          </div>
        </label>

        {preferences.quietHours?.enabled && (
          <div className="ml-7 space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.startTime}
                  onChange={(e) => updateQuietHours('startTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  End time
                </label>
                <input
                  type="time"
                  value={preferences.quietHours.endTime}
                  onChange={(e) => updateQuietHours('endTime', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={savePreferences}
          disabled={loading}
          className={cn(
            "w-full px-4 py-2 text-sm font-medium rounded-md transition-colors",
            "bg-blue-600 hover:bg-blue-700 text-white",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
        >
          {loading ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </div>
  );
}