/**
 * Privacy Settings Page
 * Comprehensive privacy management interface
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { 
  Shield, 
  Database, 
  Cookie, 
  FileText, 
  Settings,
  Eye,
  Info,
  ExternalLink
} from 'lucide-react';
import { PrivacyControls } from '../components/auth/PrivacyControls';
import { DataUsageReportDashboard } from '../components/privacy/DataUsageReportDashboard';
import { GDPRComplianceManager } from '../components/privacy/GDPRComplianceManager';
import { useAuth } from '../hooks/use-auth';

export default function PrivacySettingsPage() {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!auth.user) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please log in to access your privacy settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-blue-600" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            Privacy & Data Protection
          </h1>
          <p className="mt-2 text-gray-600 max-w-2xl mx-auto">
            Manage your privacy settings, understand how your data is used, and exercise your rights 
            under data protection laws including GDPR.
          </p>
        </div>

        {/* Privacy Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('settings')}>
            <CardHeader className="text-center">
              <Settings className="mx-auto h-8 w-8 text-blue-600" />
              <CardTitle className="text-lg">Privacy Settings</CardTitle>
              <CardDescription>
                Control your privacy preferences and data sharing settings
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('data-usage')}>
            <CardHeader className="text-center">
              <Database className="mx-auto h-8 w-8 text-green-600" />
              <CardTitle className="text-lg">Data Usage Report</CardTitle>
              <CardDescription>
                See how your data is collected, used, and protected
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('gdpr')}>
            <CardHeader className="text-center">
              <Shield className="mx-auto h-8 w-8 text-purple-600" />
              <CardTitle className="text-lg">GDPR Rights</CardTitle>
              <CardDescription>
                Exercise your data protection rights under GDPR
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="data-usage">Data Usage</TabsTrigger>
            <TabsTrigger value="gdpr">GDPR Rights</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="space-y-6">
              {/* Privacy Commitment */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Our Privacy Commitment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">What We Promise</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>We never sell your personal data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>You control your privacy settings</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Transparent data usage reporting</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>GDPR and CCPA compliant</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-green-600 mt-1">✓</span>
                          <span>Data minimization principles</span>
                        </li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Your Rights</h4>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                          <Eye className="h-4 w-4 mt-1 text-blue-600" />
                          <span>Access your personal data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Settings className="h-4 w-4 mt-1 text-blue-600" />
                          <span>Correct inaccurate information</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Database className="h-4 w-4 mt-1 text-blue-600" />
                          <span>Export your data</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Shield className="h-4 w-4 mt-1 text-blue-600" />
                          <span>Delete your account</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <Cookie className="h-4 w-4 mt-1 text-blue-600" />
                          <span>Manage cookie preferences</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common privacy management tasks
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => setActiveTab('settings')}
                    >
                      <Settings className="h-6 w-6" />
                      <span className="text-sm">Update Settings</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => setActiveTab('data-usage')}
                    >
                      <Database className="h-6 w-6" />
                      <span className="text-sm">View Data Usage</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => setActiveTab('gdpr')}
                    >
                      <Shield className="h-6 w-6" />
                      <span className="text-sm">Exercise Rights</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2"
                      onClick={() => window.open('/privacy-policy', '_blank')}
                    >
                      <FileText className="h-6 w-6" />
                      <span className="text-sm">Privacy Policy</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Privacy Activity</CardTitle>
                  <CardDescription>
                    Your recent privacy-related actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Settings className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Privacy settings updated</p>
                        <p className="text-xs text-gray-600">Analytics consent granted</p>
                      </div>
                      <span className="text-xs text-gray-500">2 days ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Cookie className="h-5 w-5 text-green-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Cookie preferences saved</p>
                        <p className="text-xs text-gray-600">Functional cookies enabled</p>
                      </div>
                      <span className="text-xs text-gray-500">1 week ago</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <Eye className="h-5 w-5 text-purple-600" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Data usage report viewed</p>
                        <p className="text-xs text-gray-600">Transparency report accessed</p>
                      </div>
                      <span className="text-xs text-gray-500">2 weeks ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Privacy Settings Tab */}
          <TabsContent value="settings">
            <PrivacyControls />
          </TabsContent>

          {/* Data Usage Tab */}
          <TabsContent value="data-usage">
            <DataUsageReportDashboard />
          </TabsContent>

          {/* GDPR Rights Tab */}
          <TabsContent value="gdpr">
            <GDPRComplianceManager />
          </TabsContent>
        </Tabs>

        {/* Footer Information */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <p className="font-medium">Need Help with Privacy?</p>
                <p className="text-sm text-gray-600">
                  Contact our Data Protection Officer for assistance
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.open('mailto:dpo@chanuka.ke', '_blank')}>
                  <Info className="h-4 w-4 mr-2" />
                  Contact DPO
                </Button>
                <Button variant="outline" onClick={() => window.open('/privacy-policy', '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Privacy Policy
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}