/**
 * Full Privacy Interface Component
 * Comprehensive interface with all privacy controls (tabs for visibility, data, notifications, cookies, rights)
 */

import { Shield, AlertTriangle } from 'lucide-react';
import React, { useState, useCallback, Suspense } from 'react';

import { useAuth } from '@client/infrastructure/auth';
import { PrivacySettings, ConsentRecord } from '@client/infrastructure/auth';

import { Alert, AlertDescription } from '@client/lib/design-system/feedback/Alert';
import { Badge } from '@client/lib/design-system/feedback/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system/interactive/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system/typography/Card';
import { logger } from '@client/lib/utils/logger';
const VisibilityControls = React.lazy(() =>
  import('./controls/VisibilityControls').then(module => ({ default: module.VisibilityControls }))
);
const DataUsageControls = React.lazy(() =>
  import('./controls/DataUsageControls').then(module => ({ default: module.DataUsageControls }))
);
const ConsentControls = React.lazy(() =>
  import('./controls/ConsentControls').then(module => ({ default: module.ConsentControls }))
);

interface FullInterfaceProps {
  settings: PrivacySettings | null;
  onSettingsChange: (settings: PrivacySettings) => void;
  className?: string;
}

export const FullInterface = React.memo<FullInterfaceProps>(function FullInterface({
  settings,
  onSettingsChange,
  className = '',
}) {
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentType, setConsentType] = useState<ConsentRecord['consent_type']>('analytics');
  // Export and deletion requests state for future implementation
  const [_exportRequests, setExportRequests] = useState<unknown[]>([]);
  const [_deletionRequests, setDeletionRequests] = useState<unknown[]>([]);

  const handleSettingChange = useCallback(
    async (key: keyof PrivacySettings, value: unknown) => {
      if (!settings) return;

      const newSettings = { ...settings, [key]: value };
      onSettingsChange(newSettings);

      try {
        const result = await auth.updatePrivacySettings({ [key]: value });
        if (!result.success) {
          // Revert on failure to maintain UI consistency
          onSettingsChange(settings);
          logger.error(
            'Failed to update privacy setting:',
            { component: 'FullInterface' },
            result.error
          );
        }
      } catch (error) {
        // Revert on error to prevent UI from showing incorrect state
        onSettingsChange(settings);
        logger.error('Privacy setting update failed:', { component: 'FullInterface' }, error);
      }
    },
    [settings, onSettingsChange, auth]
  );

  const handleNotificationChange = useCallback(
    async (key: keyof PrivacySettings['notification_preferences'], value: boolean) => {
      if (!settings) return;

      const newNotificationPrefs = {
        ...settings.notification_preferences,
        [key]: value,
      };

      await handleSettingChange('notification_preferences', newNotificationPrefs);
    },
    [settings, handleSettingChange]
  );

  const requestDataExport = useCallback(
    async (format: 'json' | 'csv' | 'xml') => {
      setLoading(true);
      try {
        const exportRequest = await auth.requestDataExport(format, [
          'profile',
          'activity',
          'analytics',
          'communications',
        ]);

        setExportRequests(prev => [...prev, exportRequest]);
      } catch (error) {
        logger.error('Data export request failed:', { component: 'FullInterface' }, error);
      } finally {
        setLoading(false);
      }
    },
    [auth]
  );

  const requestDataDeletion = useCallback(async () => {
    setLoading(true);
    try {
      const deletionRequest = await auth.requestDataDeletion('30days', [
        'profile',
        'activity',
        'analytics',
        'communications',
      ]);

      setDeletionRequests(prev => [...prev, deletionRequest]);
    } catch (error) {
      logger.error('Data deletion request failed:', { component: 'FullInterface' }, error);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  const openConsentModal = useCallback((type: ConsentRecord['consent_type']) => {
    setConsentType(type);
    setShowConsentModal(true);
  }, []);

  const handleConsentChange = useCallback(
    (type: ConsentRecord['consent_type'], granted: boolean) => {
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
    },
    [handleSettingChange]
  );

  // Show login prompt if user is not authenticated
  if (!auth.user || !settings) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Please log in to manage your privacy settings.</AlertDescription>
      </Alert>
    );
  }

  const cookieCategories: Array<{
    id: string;
    name: string;
    description: string;
    enabled: boolean;
  }> = [];

  // Loading component for lazy loaded tabs
  const TabLoadingFallback = () => (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <span className="ml-2">Loading...</span>
      </CardContent>
    </Card>
  );

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
            <Shield className="h-4 w-4" />
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
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
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
          <Suspense fallback={<TabLoadingFallback />}>
            <VisibilityControls settings={settings} onSettingChange={handleSettingChange} />
          </Suspense>
        </TabsContent>

        {/* Data Usage Tab */}
        <TabsContent value="data">
          <Suspense fallback={<TabLoadingFallback />}>
            <DataUsageControls
              settings={settings}
              onSettingChange={handleSettingChange}
              onConsentChange={handleConsentChange}
              onOpenConsentModal={openConsentModal}
            />
          </Suspense>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Suspense fallback={<TabLoadingFallback />}>
            <ConsentControls
              settings={settings}
              onNotificationChange={handleNotificationChange}
              onRequestDataExport={requestDataExport}
              onRequestDataDeletion={requestDataDeletion}
              loading={loading}
            />
          </Suspense>
        </TabsContent>

        {/* Cookies Tab */}
        <TabsContent value="cookies">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                Cookie Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cookieCategories.map((category: unknown) => (
                <div key={category.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{category.name}</h4>
                      {category.required && <Badge variant="secondary">Required</Badge>}
                    </div>
                    <input
                      type="checkbox"
                      checked={category.required || true}
                      disabled={category.required}
                      aria-label={`${category.name} cookie toggle`}
                      className="rounded"
                    />
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {category.cookies.map((cookie: unknown) => (
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
          <ConsentControls
            settings={settings}
            onNotificationChange={handleNotificationChange}
            onRequestDataExport={requestDataExport}
            onRequestDataDeletion={requestDataDeletion}
            loading={loading}
          />
        </TabsContent>
      </Tabs>

      {/* Consent Modal - Placeholder */}
      {showConsentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <h3>Consent Modal</h3>
            <p>Consent type: {consentType}</p>
            <button type="button" onClick={() => setShowConsentModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
