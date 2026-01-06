/**
 * Data Usage Controls Component
 * Analytics, marketing, data sharing consents
 */

import { Database, Info } from 'lucide-react';
import React from 'react';

import { PrivacySettings, ConsentRecord } from '@/core/auth';
import { Button } from '@/shared/design-system/interactive/Button';
import { Switch } from '@/shared/design-system/interactive/Switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/design-system/typography/Card';
import { Label } from '@/shared/design-system/typography/Label';

interface DataUsageControlsProps {
  settings: PrivacySettings;
  onSettingChange: (key: keyof PrivacySettings, value: any) => void;
  onConsentChange: (type: ConsentRecord['consent_type'], granted: boolean) => void;
  onOpenConsentModal: (type: ConsentRecord['consent_type']) => void;
  className?: string;
}

export function DataUsageControls({
  settings,
  onSettingChange,
  onConsentChange,
  onOpenConsentModal,
  className = '',
}: DataUsageControlsProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Usage & Consent
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Analytics</Label>
              <p className="text-sm text-gray-600">
                Help us improve the platform by sharing usage analytics
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.analytics_consent}
                onCheckedChange={checked => onConsentChange('analytics', checked)}
                aria-label="Analytics consent toggle"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenConsentModal('analytics')}
                aria-label="More information about analytics"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Marketing Communications</Label>
              <p className="text-sm text-gray-600">
                Receive updates about new features and civic engagement opportunities
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.marketing_consent}
                onCheckedChange={checked => onConsentChange('marketing', checked)}
                aria-label="Marketing consent toggle"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenConsentModal('marketing')}
                aria-label="More information about marketing"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Data Sharing</Label>
              <p className="text-sm text-gray-600">
                Allow sharing anonymized data with research institutions
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.data_sharing_consent}
                onCheckedChange={checked => onConsentChange('data_sharing', checked)}
                aria-label="Data sharing consent toggle"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenConsentModal('data_sharing')}
                aria-label="More information about data sharing"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Location Tracking</Label>
              <p className="text-sm text-gray-600">
                Use your location to show relevant local legislation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={settings.location_tracking}
                onCheckedChange={checked => onConsentChange('location', checked)}
                aria-label="Location tracking toggle"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenConsentModal('location')}
                aria-label="More information about location tracking"
              >
                <Info className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Third-Party Integrations</Label>
              <p className="text-sm text-gray-600">
                Allow integration with external services for enhanced functionality
              </p>
            </div>
            <Switch
              checked={settings.third_party_integrations}
              onCheckedChange={checked => onSettingChange('third_party_integrations', checked)}
              aria-label="Third-party integrations toggle"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
