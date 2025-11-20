/**
 * Privacy Controls Component
 * GDPR compliance and privacy settings management
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { 
  Shield, 
  Download, 
  Trash, 
  Eye, 
  Bell, 
  Database,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useAuth } from '@client/hooks/useAuth';
import { ConsentModal } from './ConsentModal';
import { 
  PrivacySettings, 
  DataExportRequest, 
  DataDeletionRequest,
  ConsentRecord 
} from '../../types/auth';
import { privacyCompliance } from '@client/utils/privacy-compliance';
import { logger } from '@client/utils/logger';

interface PrivacyControlsProps {
  className?: string;
}

export function PrivacyControls({ className = '' }: PrivacyControlsProps) {
  const auth = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentType, setConsentType] = useState<ConsentRecord['consent_type']>('analytics');
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [deletionRequests, setDeletionRequests] = useState<DataDeletionRequest[]>([]);

  // Initialize settings from user data
  useEffect(() => {
    // Type-safe check for privacy_settings property
    if (auth.user && 'privacy_settings' in auth.user) {
      setSettings(auth.user.privacy_settings as PrivacySettings);
    }
  }, [auth.user]);

  const handleSettingChange = async (key: keyof PrivacySettings, value: any) => {
    if (!settings) return;

    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      const result = await auth.updatePrivacySettings({ [key]: value });
      if (!result.success) {
        // Revert on failure to maintain UI consistency
        setSettings(settings);
        logger.error('Failed to update privacy setting:', { component: 'PrivacyControls' }, result.error);
      }
    } catch (error) {
      // Revert on error to prevent UI from showing incorrect state
      setSettings(settings);
      logger.error('Privacy setting update failed:', { component: 'PrivacyControls' }, error);
    }
  };

  const handleNotificationChange = async (key: keyof PrivacySettings['notification_preferences'], value: boolean) => {
    if (!settings) return;

    const newNotificationPrefs = {
      ...settings.notification_preferences,
      [key]: value,
    };

    await handleSettingChange('notification_preferences', newNotificationPrefs);
  };

  const requestDataExport = async (format: 'json' | 'csv' | 'xml') => {
    setLoading(true);
    try {
      const exportRequest = await auth.requestDataExport(format, [
        'profile',
        'activity',
        'analytics',
        'communications'
      ]);
      
      setExportRequests(prev => [...prev, exportRequest]);
    } catch (error) {
      logger.error('Data export request failed:', { component: 'PrivacyControls' }, error);
    } finally {
      setLoading(false);
    }
  };

  const requestDataDeletion = async () => {
    setLoading(true);
    try {
      const deletionRequest = await auth.requestDataDeletion('30days', [
        'profile',
        'activity',
        'analytics',
        'communications'
      ]);
      
      setDeletionRequests(prev => [...prev, deletionRequest]);
    } catch (error) {
      logger.error('Data deletion request failed:', { component: 'PrivacyControls' }, error);
    } finally {
      setLoading(false);
    }
  };

  const openConsentModal = (type: ConsentRecord['consent_type']) => {
    setConsentType(type);
    setShowConsentModal(true);
  };

  const handleConsentChange = (type: ConsentRecord['consent_type'], granted: boolean) => {
    switch (type) {
      case 'analytics':
        handleSettingChange('analytics_consent', granted);
        break;
      case 'marketing':
        handleSettingChange('marketing_consent', granted);
        break;
      case 'data_sharing':
        handleSettingChange('data_sharing_consent', granted);
        break;
      case 'location':
        handleSettingChange('location_tracking', granted);
        break;
    }
  };

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

  const cookieCategories = privacyCompliance.getCookieCategories();
  const dataRetentionInfo = privacyCompliance.getDataRetentionInfo();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Privacy Overview Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data Protection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              We are committed to protecting your privacy and giving you control over your data. 
              These settings help you manage how your information is collected, used, and shared.
              <a 
                href="/privacy-policy" 
                className="ml-1 text-blue-600 hover:underline inline-flex items-center"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read our Privacy Policy
                <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Privacy Settings Tabs */}
      <Tabs defaultValue="visibility" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visibility">Visibility</TabsTrigger>
          <TabsTrigger value="data">Data Usage</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="cookies">Cookies</TabsTrigger>
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
        </TabsList>

        {/* Profile Visibility Tab */}
        <TabsContent value="visibility">
          <Card>
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
                    <p className="text-sm text-gray-600">
                      Control who can see your profile information
                    </p>
                  </div>
                  <select
                    id="profile-visibility"
                    value={settings.profile_visibility}
                    onChange={(e) => handleSettingChange('profile_visibility', e.target.value)}
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
                    <p className="text-sm text-gray-600">
                      Control who can see your email address
                    </p>
                  </div>
                  <select
                    id="email-visibility"
                    value={settings.email_visibility}
                    onChange={(e) => handleSettingChange('email_visibility', e.target.value)}
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
                    onCheckedChange={(checked) => handleSettingChange('activity_tracking', checked)}
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
                    onCheckedChange={(checked) => handleSettingChange('personalized_content', checked)}
                    aria-label="Personalized content toggle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Usage Tab */}
        <TabsContent value="data">
          <Card>
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
                      onCheckedChange={(checked) => handleConsentChange('analytics', checked)}
                      aria-label="Analytics consent toggle"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConsentModal('analytics')}
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
                      onCheckedChange={(checked) => handleConsentChange('marketing', checked)}
                      aria-label="Marketing consent toggle"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConsentModal('marketing')}
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
                      onCheckedChange={(checked) => handleConsentChange('data_sharing', checked)}
                      aria-label="Data sharing consent toggle"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConsentModal('data_sharing')}
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
                      onCheckedChange={(checked) => handleConsentChange('location', checked)}
                      aria-label="Location tracking toggle"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openConsentModal('location')}
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
                    onCheckedChange={(checked) => handleSettingChange('third_party_integrations', checked)}
                    aria-label="Third-party integrations toggle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
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
                    onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('sms_notifications', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('bill_updates', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('comment_replies', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('expert_insights', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('security_alerts', checked)}
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
                    onCheckedChange={(checked) => handleNotificationChange('privacy_updates', checked)}
                    aria-label="Privacy updates toggle"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cookies Tab */}
        <TabsContent value="cookies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Cookie Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cookieCategories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{category.name}</h4>
                      {category.required && (
                        <Badge variant="secondary">Required</Badge>
                      )}
                    </div>
                    <Switch
                      checked={category.required || true}
                      disabled={category.required}
                      aria-label={`${category.name} cookie toggle`}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {category.cookies.map((cookie) => (
                      <Badge key={cookie} variant="outline" className="text-xs">
                        {cookie}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Your Rights Tab */}
        <TabsContent value="rights">
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
                    onClick={() => requestDataExport('json')}
                    disabled={loading}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export as JSON
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => requestDataExport('csv')}
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
                  onClick={requestDataDeletion}
                  disabled={loading}
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Request Account Deletion
                </Button>
              </div>

              {/* Data Retention Information */}
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Data Retention</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Information about how long we keep different types of data.
                </p>
                <div className="space-y-2">
                  {dataRetentionInfo.map((category) => (
                    <div key={category.id} className="flex justify-between items-center text-sm">
                      <span>{category.name}</span>
                      <Badge variant="outline">{category.retention_period}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        consentType={consentType}
        onConsent={(granted) => {
          handleConsentChange(consentType, granted);
          setShowConsentModal(false);
        }}
      />
    </div>
  );
}