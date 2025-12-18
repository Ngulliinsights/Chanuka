/**
 * Unified User Account Page
 * Consolidates profile management, dashboard, privacy, and accessibility settings
 */


import { Shield, User, BarChart3, Eye } from 'lucide-react';
import { useState } from 'react';

import { useAuth } from '@client/core/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import { Card, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system';
import { Alert, AlertDescription } from '@client/shared/design-system';

export default function UserAccountPage() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  if (!isAuthenticated || !user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>Please log in to access your account settings.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div data-testid="user-account-container">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
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
              {/* User profile section */}
              <div className="text-center py-8">
                <p className="text-muted-foreground">User profile information</p>
              </div>
            </TabsContent>

            <TabsContent value="dashboard">
              {/* User dashboard content */}
              <div className="text-center py-8">
                <p className="text-muted-foreground">Dashboard metrics and activity</p>
              </div>
            </TabsContent>

            <TabsContent value="privacy">
              {/* Privacy settings content */}
              <div className="text-center py-8">
                <p className="text-muted-foreground">Privacy and data protection settings</p>
              </div>
            </TabsContent>

            <TabsContent value="accessibility">
              {/* Accessibility settings would be implemented here */}
              <div className="text-center py-8">
                <p className="text-muted-foreground">Accessibility settings section</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}