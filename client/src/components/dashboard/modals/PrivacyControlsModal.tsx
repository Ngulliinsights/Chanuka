/**
 * Privacy Controls Modal Component
 * 
 * Allows users to manage their privacy settings and data visibility.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Users, 
  Lock,
  Info,
  AlertTriangle
} from 'lucide-react';
import { PrivacyControls } from '@client/types/user-dashboard';

interface PrivacyControlsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  controls: PrivacyControls;
  onUpdate: (controls: Partial<PrivacyControls>) => void;
}

export function PrivacyControlsModal({
  open,
  onOpenChange,
  controls,
  onUpdate
}: PrivacyControlsModalProps) {

  const handleVisibilityChange = (visibility: PrivacyControls['profileVisibility']) => {
    onUpdate({ profileVisibility: visibility });
  };

  const handleToggle = (key: keyof Omit<PrivacyControls, 'profileVisibility'>) => {
    onUpdate({ [key]: !controls[key] });
  };

  const privacyOptions = [
    {
      value: 'public' as const,
      label: 'Public',
      description: 'Anyone can see your profile and activity',
      icon: <Users className="h-4 w-4" />
    },
    {
      value: 'private' as const,
      label: 'Private',
      description: 'Only you can see your profile and activity',
      icon: <Lock className="h-4 w-4" />
    },
    {
      value: 'contacts' as const,
      label: 'Contacts Only',
      description: 'Only people you follow can see your activity',
      icon: <Eye className="h-4 w-4" />
    }
  ];

  const privacySettings = [
    {
      key: 'showActivity' as const,
      title: 'Show Activity History',
      description: 'Display your engagement history on your profile',
      icon: <Eye className="h-4 w-4" />
    },
    {
      key: 'showMetrics' as const,
      title: 'Show Civic Metrics',
      description: 'Display your civic impact score and achievements',
      icon: <Shield className="h-4 w-4" />
    },
    {
      key: 'showRecommendations' as const,
      title: 'Enable Recommendations',
      description: 'Allow AI to suggest relevant bills based on your activity',
      icon: <Info className="h-4 w-4" />
    },
    {
      key: 'allowDataExport' as const,
      title: 'Allow Data Export',
      description: 'Enable the ability to export your personal data',
      icon: <Eye className="h-4 w-4" />
    },
    {
      key: 'allowAnalytics' as const,
      title: 'Analytics Participation',
      description: 'Allow anonymous usage data to improve the platform',
      icon: <Shield className="h-4 w-4" />
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Controls
          </DialogTitle>
          <DialogDescription>
            Manage your privacy settings and control how your data is used and displayed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Profile Visibility</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Control who can see your profile and civic engagement activity.
              </p>
            </div>

            <Select
              value={controls.profileVisibility}
              onValueChange={handleVisibilityChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {privacyOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data Sharing Settings */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Data Sharing</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Control what information is displayed and how your data is used.
              </p>
            </div>

            <div className="space-y-4">
              {privacySettings.map((setting) => (
                <div
                  key={setting.key}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-muted-foreground mt-0.5">
                      {setting.icon}
                    </div>
                    <div>
                      <Label htmlFor={setting.key} className="font-medium">
                        {setting.title}
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {setting.description}
                      </p>
                    </div>
                  </div>
                  <Switch
                    id={setting.key}
                    checked={controls[setting.key]}
                    onCheckedChange={() => handleToggle(setting.key)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* GDPR Notice */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <h4 className="font-medium mb-2">Your Data Rights</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  Under GDPR and other privacy laws, you have the right to:
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Access your personal data</li>
                  <li>• Correct inaccurate data</li>
                  <li>• Delete your data</li>
                  <li>• Export your data</li>
                  <li>• Restrict data processing</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)}>
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}