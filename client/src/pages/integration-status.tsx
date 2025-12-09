/**
 * Integration Status Dashboard
 * 
 * Development-only page to monitor the integration of orphaned modules
 * Shows real-time status of Tier 1 integrations and system health
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

import { useIntegratedServices } from '@client/hooks/useIntegratedServices';
import { ErrorBoundary } from '@client/core/error/components/ErrorBoundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@client/shared/design-system/primitives/card';
import { Badge } from '@client/shared/design-system/primitives/badge';
import { Button } from '@client/shared/design-system/primitives/button';
import { Progress } from '@client/shared/design-system/primitives/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system/primitives/tabs';
import { Alert, AlertDescription } from '@client/shared/design-system/primitives/alert';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  Shield, 
  Lock, 
  Smartphone, 
  Palette,
  Activity,
  BarChart3
} from 'lucide-react';

export default function IntegrationStatusPage() {
  const { isReady, status, error, services, security, privacy, mobile } = useIntegratedServices();

  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page is only available in development mode.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'loading': return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'loading': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const overallProgress = Object.values(status).filter(s => s === 'success').length / Object.keys(status).length * 100;

  return (
    <>
      <Helmet>
        <title>Integration Status - Chanuka Platform</title>
        <meta name="description" content="Development dashboard for monitoring orphaned module integration status" />
      </Helmet>

      <ErrorBoundary>
        <div className="min-h-screen bg-background">
          <div className="container mx-auto px-4 py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center">
                  <Activity className="h-8 w-8 mr-3 text-blue-600" />
                  Integration Status Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Monitor Tier 1 orphaned module integration progress
                </p>
              </div>
              <Badge variant={isReady ? "default" : error ? "destructive" : "secondary"}>
                {isReady ? 'All Systems Ready' : error ? 'Integration Error' : 'Integrating...'}
              </Badge>
            </div>

            {/* Overall Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Overall Integration Progress
                </CardTitle>
                <CardDescription>
                  Tier 1 integration status: {Math.round(overallProgress)}% complete
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Progress value={overallProgress} className="h-3 mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(status).filter(s => s === 'success').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Integrated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.values(status).filter(s => s === 'loading').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Loading</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {Object.values(status).filter(s => s === 'error').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">
                      {Object.values(status).filter(s => s === 'pending').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Alert */}
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Integration Error:</strong> {error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Module Status Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card className={getStatusColor(status.security)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Security
                  </CardTitle>
                  <CardDescription>XSS protection, validation, CSP</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {getStatusIcon(status.security)}
                    <Badge variant="outline">{status.security}</Badge>
                  </div>
                  {security.isReady && (
                    <div className="mt-3 space-y-1 text-xs">
                      <div>✓ CSP Manager</div>
                      <div>✓ DOM Sanitizer</div>
                      <div>✓ Input Validator</div>
                      <div>✓ Password Validator</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={getStatusColor(status.privacy)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Privacy
                  </CardTitle>
                  <CardDescription>GDPR compliance, analytics</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {getStatusIcon(status.privacy)}
                    <Badge variant="outline">{status.privacy}</Badge>
                  </div>
                  {privacy.isReady && (
                    <div className="mt-3 space-y-1 text-xs">
                      <div>✓ Privacy Analytics</div>
                      <div>✓ Consent Management</div>
                      <div>✓ Data Export/Delete</div>
                      <div>✓ Anonymization</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={getStatusColor(status.mobile)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Smartphone className="h-5 w-5 mr-2" />
                    Mobile
                  </CardTitle>
                  <CardDescription>Device detection, touch handling</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {getStatusIcon(status.mobile)}
                    <Badge variant="outline">{status.mobile}</Badge>
                  </div>
                  {mobile.isReady && (
                    <div className="mt-3 space-y-1 text-xs">
                      <div>✓ Device Detector</div>
                      <div>✓ Touch Handler</div>
                      <div>✓ Responsive Utils</div>
                      <div>✓ Performance Optimizer</div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={getStatusColor(status.ui)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Palette className="h-5 w-5 mr-2" />
                    UI System
                  </CardTitle>
                  <CardDescription>Design system, components</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    {getStatusIcon(status.ui)}
                    <Badge variant="outline">{status.ui}</Badge>
                  </div>
                  {status.ui === 'success' && (
                    <div className="mt-3 space-y-1 text-xs">
                      <div>✓ Unified Components</div>
                      <div>✓ Responsive Design</div>
                      <div>✓ Accessibility</div>
                      <div>✓ Error Recovery</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Detailed Status */}
            <Tabs defaultValue="services" className="space-y-4">
              <TabsList>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="pages">New Pages</TabsTrigger>
                <TabsTrigger value="navigation">Navigation</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Integrated Services</CardTitle>
                    <CardDescription>
                      Status of individual service integrations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(services).map(([key, service]) => (
                        <div key={key} className="flex items-center justify-between p-3 border rounded">
                          <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                          <Badge variant={service ? "default" : "secondary"}>
                            {service ? 'Available' : 'Not Available'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="pages" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>New Pages Added</CardTitle>
                    <CardDescription>
                      Pages created as part of the integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">Performance Dashboard</div>
                          <div className="text-sm text-muted-foreground">/performance</div>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">Analytics Dashboard</div>
                          <div className="text-sm text-muted-foreground">/analytics</div>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">Privacy Center</div>
                          <div className="text-sm text-muted-foreground">/privacy-center</div>
                        </div>
                        <Badge variant="default">Active</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="navigation" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Navigation Updates</CardTitle>
                    <CardDescription>
                      New navigation items added to the sidebar
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          <span>Analytics</span>
                        </div>
                        <Badge variant="default">Added</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 mr-2" />
                          <span>Performance</span>
                        </div>
                        <Badge variant="default">Added</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center">
                          <Lock className="h-4 w-4 mr-2" />
                          <span>Privacy Center</span>
                        </div>
                        <Badge variant="default">Added</Badge>
                      </div>
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