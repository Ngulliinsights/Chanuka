/**
 * Unified User Account Page
 * Consolidates profile management, dashboard, privacy, and accessibility settings
 */

import { Shield, User, BarChart3, Eye } from 'lucide-react';
import { useState } from 'react';

import AppLayout from '@client/shared/ui/layout/app-layout';

// Import consolidated components
import { UserDashboard } from '@client/shared/ui/dashboard';
import { PrivacyManager } from '@client/shared/ui/privacy';
import { Alert, AlertDescription } from '@client/shared/design-system';
import { Card, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { AccessibilitySettingsSection } from '@client/core/auth';
import { UserAccountIntegration } from '@client/core/auth';
import { UserProfileSection } from '@client/core/auth';
import { useAuth } from '@client/core/auth';

export default function UserAccountPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  if (!isAuthenticated || !user) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>Please log in to access your account settings.</AlertDescription>
          </Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout data-testid="user-account-layout">
      <UserAccountIntegration>
        <div className="container mx-auto py-8 px-4 max-w-7xl" data-testid="user-account-container">
          <div className="space-y-8">
            {/* Unified Header */}
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-blue-600" />
              <h1 className="mt-4 text-4xl font-bold text-slate-900">Account Management</h1>
              <p className="mt-2 text-lg text-slate-600">
                Manage your profile, dashboard, privacy, and accessibility preferences
              </p>
            </div>

            {/* Quick Navigation Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab('profile')}
              >
                <CardHeader className="text-center">
                  <User className="mx-auto h-8 w-8 text-blue-600" />
                  <CardTitle className="text-lg">Profile</CardTitle>
                  <CardDescription>Personal information and account settings</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab('dashboard')}
              >
                <CardHeader className="text-center">
                  <BarChart3 className="mx-auto h-8 w-8 text-green-600" />
                  <CardTitle className="text-lg">Dashboard</CardTitle>
                  <CardDescription>Activity, engagement, and civic metrics</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab('privacy')}
              >
                <CardHeader className="text-center">
                  <Shield className="mx-auto h-8 w-8 text-purple-600" />
                  <CardTitle className="text-lg">Privacy</CardTitle>
                  <CardDescription>Data protection and privacy controls</CardDescription>
                </CardHeader>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setActiveTab('accessibility')}
              >
                <CardHeader className="text-center">
                  <Eye className="mx-auto h-8 w-8 text-orange-600" />
                  <CardTitle className="text-lg">Accessibility</CardTitle>
                  <CardDescription>Accessibility and display preferences</CardDescription>
                </CardHeader>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="privacy">Privacy</TabsTrigger>
                <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
              </TabsList>

              <TabsContent value="profile">
                <UserProfileSection />
              </TabsContent>

              <TabsContent value="dashboard">
                <UserDashboard variant="section" />
              </TabsContent>

              <TabsContent value="privacy">
                <PrivacyManager
                  mode="compact"
                  settings={user.privacy_settings || null}
                  onSettingsChange={settings => {
                    // Handle settings change - this would typically call an API
                    console.log('Privacy settings updated:', settings);
                  }}
                  onOpenFullSettings={() => {
                    // Could navigate to full privacy settings page or open modal
                    console.log('Open full privacy settings');
                  }}
                />
              </TabsContent>

              <TabsContent value="accessibility">
                <AccessibilitySettingsSection />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </UserAccountIntegration>
    </AppLayout>
  );
}
