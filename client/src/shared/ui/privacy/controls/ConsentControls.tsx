/**
 * Consent Controls Component
 * GDPR consent management and notification preferences
 */

// Remove unused React import
import {
  Bell,
  Download,
  Trash,
  AlertTriangle
} from 'lucide-react';

import { PrivacySettings } from '@client/core/auth';

import { Alert, AlertDescription } from '@client/shared/design-system/feedback/Alert.tsx';
// import { Badge } from '@client/shared/design-system/feedback/Badge.tsx';
import { Button } from '@client/shared/design-system/interactive/Button.tsx';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system/typography/Card.tsx';
import { Label } from '@client/shared/design-system/typography/Label.tsx';
import { Switch } from '@client/shared/design-system/interactive/Switch.tsx';


interface ConsentControlsProps {
  settings: PrivacySettings;
  onNotificationChange: (key: keyof PrivacySettings['notification_preferences'], value: boolean) => void;
  onRequestDataExport: (format: 'json' | 'csv' | 'xml') => void;
  onRequestDataDeletion: () => void;
  loading?: boolean;
  className?: string;
}

export function ConsentControls({
  settings,
  onNotificationChange,
  onRequestDataExport,
  onRequestDataDeletion,
  loading = false,
  className = ''
}: ConsentControlsProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Email Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.email_notifications}
                onCheckedChange={(checked) => onNotificationChange('email_notifications', checked)}
                aria-label="Email notifications toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Push Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive browser push notifications
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.push_notifications}
                onCheckedChange={(checked) => onNotificationChange('push_notifications', checked)}
                aria-label="Push notifications toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">SMS Notifications</Label>
                <p className="text-sm text-gray-600">
                  Receive notifications via SMS (requires phone number)
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.sms_notifications}
                onCheckedChange={(checked) => onNotificationChange('sms_notifications', checked)}
                aria-label="SMS notifications toggle"
              />
            </div>

            <hr className="my-4" />

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Bill Updates</Label>
                <p className="text-sm text-gray-600">
                  Notifications about bills you're following
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.bill_updates}
                onCheckedChange={(checked) => onNotificationChange('bill_updates', checked)}
                aria-label="Bill updates toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Comment Replies</Label>
                <p className="text-sm text-gray-600">
                  Notifications when someone replies to your comments
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.comment_replies}
                onCheckedChange={(checked) => onNotificationChange('comment_replies', checked)}
                aria-label="Comment replies toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Expert Insights</Label>
                <p className="text-sm text-gray-600">
                  Notifications about expert analysis and insights
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.expert_insights}
                onCheckedChange={(checked) => onNotificationChange('expert_insights', checked)}
                aria-label="Expert insights toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Security Alerts</Label>
                <p className="text-sm text-gray-600">
                  Important security notifications (recommended)
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.security_alerts}
                onCheckedChange={(checked) => onNotificationChange('security_alerts', checked)}
                aria-label="Security alerts toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Privacy Updates</Label>
                <p className="text-sm text-gray-600">
                  Notifications about privacy policy changes
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.privacy_updates}
                onCheckedChange={(checked) => onNotificationChange('privacy_updates', checked)}
                aria-label="Privacy updates toggle"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GDPR Rights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Your Data Rights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Export Section */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Export Your Data</h4>
            <p className="text-sm text-gray-600 mb-4">
              Download a copy of all your data in a portable format.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onRequestDataExport('json')}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => onRequestDataExport('csv')}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                Export as CSV
              </Button>
            </div>
          </div>

          {/* Data Deletion Section */}
          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Delete Your Account</h4>
            <p className="text-sm text-gray-600 mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> Some data may be retained for legal compliance or civic transparency requirements.
              </AlertDescription>
            </Alert>
            <Button
              variant="destructive"
              onClick={onRequestDataDeletion}
              disabled={loading}
            >
              <Trash className="h-4 w-4 mr-2" />
              Request Account Deletion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}