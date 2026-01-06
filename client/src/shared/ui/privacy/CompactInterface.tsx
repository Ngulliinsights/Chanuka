/**
 * Compact Privacy Interface Component
 * Simplified interface for settings pages
 */

// Remove unused React import
import React from 'react';
import {
  Shield,
  Settings,
  AlertTriangle,
  Info
} from 'lucide-react';

import { useAuth } from '@/core/auth';
import { PrivacySettings } from '@/core/auth';

import { Alert, AlertDescription } from '@/shared/design-system/feedback/Alert';
import { Button } from '@/shared/design-system/interactive/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';
import { Label } from '@/shared/design-system/typography/Label';
import { Switch } from '@/shared/design-system/interactive/Switch';


// import { ConsentControls } from './controls/ConsentControls';
import { DataUsageControls } from './controls/DataUsageControls';
import { VisibilityControls } from './controls/VisibilityControls';

interface CompactInterfaceProps {
  settings: PrivacySettings | null;
  onSettingsChange: (settings: PrivacySettings) => void;
  onOpenFullSettings?: () => void;
  className?: string;
}

export function CompactInterface({
  settings,
  onSettingsChange,
  onOpenFullSettings,
  className = ''
}: CompactInterfaceProps) {
  const auth = useAuth();

  // Show login prompt if user is not authenticated
  if (!auth.user || !settings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to manage your privacy settings.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Privacy Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Quick privacy controls. For comprehensive settings,
              <Button
                variant="ghost"
                className="p-0 h-auto ml-1"
                onClick={onOpenFullSettings}
              >
                open full privacy panel
              </Button>.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Quick Visibility Settings */}
      <VisibilityControls
        settings={settings}
        onSettingChange={(key, value) => {
          const newSettings = { ...settings, [key]: value };
          onSettingsChange(newSettings);
        }}
      />

      {/* Quick Data Usage Settings */}
      <DataUsageControls
        settings={settings}
        onSettingChange={(key, value) => {
          const newSettings = { ...settings, [key]: value };
          onSettingsChange(newSettings);
        }}
        onConsentChange={(type, granted) => {
          // Handle consent changes - this would need to be implemented
          // based on the specific consent type
          // Handle consent changes - implementation would go here
          if (process.env.NODE_ENV === 'development') {
            console.log('Consent change:', type, granted);
          }
        }}
        onOpenConsentModal={(type) => {
          // Handle opening consent modal - this would need to be implemented
          // Handle opening consent modal - implementation would go here
          if (process.env.NODE_ENV === 'development') {
            console.log('Open consent modal for:', type);
          }
        }}
      />

      {/* Quick Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
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
                onCheckedChange={(checked) => {
                  const newSettings = {
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      email_notifications: checked
                    }
                  };
                  onSettingsChange(newSettings);
                }}
                aria-label="Email notifications toggle"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Security Alerts</Label>
                <p className="text-sm text-gray-600">
                  Important security notifications
                </p>
              </div>
              <Switch
                checked={settings.notification_preferences.security_alerts}
                onCheckedChange={(checked) => {
                  const newSettings = {
                    ...settings,
                    notification_preferences: {
                      ...settings.notification_preferences,
                      security_alerts: checked
                    }
                  };
                  onSettingsChange(newSettings);
                }}
                aria-label="Security alerts toggle"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Full Settings Button */}
      {onOpenFullSettings && (
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="outline"
              onClick={onOpenFullSettings}
              className="w-full"
            >
              <Settings className="h-4 w-4 mr-2" />
              Open Full Privacy Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
