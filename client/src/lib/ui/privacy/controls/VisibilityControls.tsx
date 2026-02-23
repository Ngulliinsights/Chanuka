/**
 * Visibility Controls Component
 * Profile and data visibility settings
 */

import { Eye } from 'lucide-react';
import React from 'react';

import { PrivacySettings } from '@client/infrastructure/auth';
import { Switch } from '@client/lib/design-system/interactive/Switch';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system/typography/Card';
import { Label } from '@client/lib/design-system/typography/Label';

interface VisibilityControlsProps {
  settings: PrivacySettings;
  onSettingChange: (key: keyof PrivacySettings, value: unknown) => void;
  className?: string;
}

export const VisibilityControls = React.memo<VisibilityControlsProps>(function VisibilityControls({
  settings,
  onSettingChange,
  className = '',
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Profile Visibility
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="profile-visibility" className="text-base font-medium">
                Profile Visibility
              </Label>
              <p className="text-sm text-gray-600">Control who can see your profile information</p>
            </div>
            <select
              id="profile-visibility"
              value={settings.profile_visibility}
              onChange={e => onSettingChange('profile_visibility', e.target.value)}
              className="border rounded-md px-3 py-2"
              aria-label="Profile visibility setting"
            >
              <option value="public">Public</option>
              <option value="registered">Registered Users Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="email-visibility" className="text-base font-medium">
                Email Visibility
              </Label>
              <p className="text-sm text-gray-600">Control who can see your email address</p>
            </div>
            <select
              id="email-visibility"
              value={settings.email_visibility}
              onChange={e => onSettingChange('email_visibility', e.target.value)}
              className="border rounded-md px-3 py-2"
              aria-label="Email visibility setting"
            >
              <option value="public">Public</option>
              <option value="registered">Registered Users Only</option>
              <option value="private">Private</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Activity Tracking</Label>
              <p className="text-sm text-gray-600">
                Allow tracking of your platform activity for personalization
              </p>
            </div>
            <Switch
              checked={settings.activity_tracking}
              onCheckedChange={checked => onSettingChange('activity_tracking', checked)}
              aria-label="Activity tracking toggle"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Personalized Content</Label>
              <p className="text-sm text-gray-600">
                Show personalized content based on your interests
              </p>
            </div>
            <Switch
              checked={settings.personalized_content}
              onCheckedChange={checked => onSettingChange('personalized_content', checked)}
              aria-label="Personalized content toggle"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
