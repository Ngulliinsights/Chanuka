/**
 * Privacy Center Page
 *
 * Comprehensive privacy management including:
 * - GDPR compliance dashboard
 * - Data usage reports
 * - Consent management
 * - Privacy settings
 */

import { Shield, FileText, Settings, Download, Eye, Lock } from 'lucide-react';
import React, { useState } from 'react';

import { ErrorBoundary } from '@client/infrastructure/error';
import { DataUsageReportDashboard } from '@client/infrastructure/security/ui/privacy/DataUsageReportDashboard';
import GDPRComplianceManager from '@client/infrastructure/security/ui/privacy/GDPRComplianceManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';

export default function PrivacyCenterPage() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <>
      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 space-y-6 bg-gradient-to-b from-brand-navy/5 to-transparent rounded-b-3xl">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                  <Shield className="h-8 w-8 mr-3 text-blue-600" />
                  Privacy Center
                </h1>
                <p className="text-muted-foreground mt-2">
                  Manage your privacy settings and data usage with full transparency
                </p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Lock className="h-3 w-3 mr-1" />
                GDPR Compliant
              </Badge>
            </div>

            {/* Privacy Status Alert */}
            <Alert className="border-blue-200 bg-blue-50">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Your privacy is protected. All data processing follows GDPR guidelines and your
                consent preferences.
              </AlertDescription>
            </Alert>

            {/* Main Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview" className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="compliance" className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Compliance
                </TabsTrigger>
                <TabsTrigger value="data-usage" className="flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Data Usage
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-green-600" />
                        Privacy Status
                      </CardTitle>
                      <CardDescription>Your current privacy protection level</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-green-600">Excellent</span>
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Protected
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        All privacy settings are optimally configured
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <FileText className="h-5 w-5 mr-2 text-blue-600" />
                        Data Collected
                      </CardTitle>
                      <CardDescription>Types of data we process</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Analytics Data</span>
                          <Badge variant="secondary">Anonymized</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Account Data</span>
                          <Badge variant="secondary">Encrypted</Badge>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Usage Patterns</span>
                          <Badge variant="secondary">Aggregated</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center">
                        <Download className="h-5 w-5 mr-2 text-purple-600" />
                        Your Rights
                      </CardTitle>
                      <CardDescription>GDPR rights and actions</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <Download className="h-4 w-4 mr-2" />
                        Export My Data
                      </Button>
                      <Button variant="outline" size="sm" className="w-full justify-start">
                        <FileText className="h-4 w-4 mr-2" />
                        View Data Report
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-red-600 hover:text-red-700"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Delete My Data
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="compliance" className="space-y-6">
                <GDPRComplianceManager />
              </TabsContent>

              <TabsContent value="data-usage" className="space-y-6">
                <DataUsageReportDashboard />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>
                      Configure your privacy preferences and data processing consent
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Privacy settings integration coming soon</p>
                      <p className="text-sm mt-2">
                        Advanced privacy controls will be available in the next update
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
}
