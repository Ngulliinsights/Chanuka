/**
 * Data Usage Report Dashboard
 * Transparent reporting of how user data is collected, used, and shared
 */

import {
  Database,
  BarChart3,
  Shield,
  Download,
  Eye,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash,
  RefreshCw,
} from 'lucide-react';
import React from 'react';
import { useEffect } from 'react';


import { useAuth } from '@client/core/auth';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { dataRetentionService, retentionUtils } from '@client/lib/services/dataRetentionService';
import { privacyAnalyticsService } from '@client/lib/services/privacyAnalyticsService';
import { useDashboardLoading, useDashboardError, useDashboardRefresh } from '@client/lib/ui/dashboard/hooks';
import { logger } from '@client/lib/utils/logger';
import { privacyCompliance } from '@client/lib/utils/privacy-compliance';

import { Globe } from '../icons/ChanukaIcons';

interface DataUsageStats {
  totalDataPoints: number;
  categoriesTracked: number;
  retentionCompliance: number;
  anonymizedPercentage: number;
  consentedPercentage: number;
  lastUpdated: string;
}

interface DataCategory {
  id: string;
  name: string;
  description: string;
  dataPoints: number;
  sizeBytes: number;
  lastAccessed: string;
  retentionExpiry: string;
  purposes: string[];
  legalBasis: string;
  thirdPartySharing: boolean;
  canExport: boolean;
  canDelete: boolean;
}

export function DataUsageReportDashboard() {
  const auth = useAuth();
  const { loading, setLoading } = useDashboardLoading(true);
  const { error, setError, handleError } = useDashboardError(null);
  const { refreshing, runRefresh } = useDashboardRefresh();
  const [stats, setStats] = React.useState<DataUsageStats | null>(null);
  const [categories, setCategories] = React.useState<DataCategory[]>([]);
  const [selectedPeriod, setSelectedPeriod] = React.useState<'7d' | '30d' | '90d' | '1y'>('30d');

  useEffect(() => {
    loadDataUsageReport();
  }, [selectedPeriod, auth.user]);

  const loadDataUsageReport = async () => {
    if (!auth.user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load data retention summary with error handling
      const retentionSummary = await dataRetentionService.getUserDataSummary(auth.user.id);

      // Load analytics metrics with fallback to empty metrics
      const analyticsMetrics = privacyAnalyticsService.getAnalyticsMetrics() || {
        totalEvents: 0,
        anonymizedEvents: 0,
        consentedEvents: 0,
      };

      // Load privacy compliance data
      const privacyPolicySummary = privacyCompliance.generatePrivacyPolicySummary();

      // Transform data for display with safe fallbacks
      const transformedCategories: DataCategory[] = Object.entries(
        retentionSummary.categories || {}
      ).map(([id, data]) => ({
        id,
        name: id.charAt(0).toUpperCase() + id.slice(1).replace('_', ' '),
        description: getDataCategoryDescription(id),
        dataPoints: data.recordCount || 0,
        sizeBytes: data.sizeBytes || 0,
        lastAccessed: new Date().toISOString(),
        retentionExpiry:
          data.retentionExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        purposes: getDataCategoryPurposes(id),
        legalBasis: getDataCategoryLegalBasis(id),
        thirdPartySharing: getThirdPartySharing(id),
        canExport: data.canDelete !== false,
        canDelete: data.canDelete !== false,
      }));

      // Calculate statistics with safe math operations
      const totalDataPoints = transformedCategories.reduce((sum, cat) => sum + cat.dataPoints, 0);
      const retentionCompliant = transformedCategories.filter(
        cat => new Date(cat.retentionExpiry) > new Date()
      ).length;

      const usageStats: DataUsageStats = {
        totalDataPoints,
        categoriesTracked: transformedCategories.length,
        retentionCompliance:
          transformedCategories.length > 0
            ? Math.round((retentionCompliant / transformedCategories.length) * 100)
            : 100,
        anonymizedPercentage:
          analyticsMetrics.totalEvents > 0
            ? Math.round((analyticsMetrics.anonymizedEvents / analyticsMetrics.totalEvents) * 100)
            : 0,
        consentedPercentage:
          analyticsMetrics.totalEvents > 0
            ? Math.round((analyticsMetrics.consentedEvents / analyticsMetrics.totalEvents) * 100)
            : 0,
        lastUpdated: new Date().toISOString(),
      };

      setStats(usageStats);
      setCategories(transformedCategories);
    } catch (err) {
      handleError(err, { component: 'DataUsageReportDashboard' });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => runRefresh(loadDataUsageReport);

  const handleExportData = async (categoryId?: string) => {
    if (!auth.user) return;

    try {
      const categories = categoryId
        ? [categoryId]
        : ['profile', 'activity', 'analytics', 'communications'];

      await auth.requestDataExport('json', categories);

      logger.info('Data export requested', {
        component: 'DataUsageReportDashboard',
        categories,
      });
    } catch (err) {
      logger.error('Data export failed', {
        component: 'DataUsageReportDashboard',
        error: err,
      });
      alert('Failed to export data. Please try again or contact support.');
    }
  };

  const handleDeleteData = async (categoryId: string) => {
    if (!auth.user) return;

    const categoryName = categories.find(c => c.id === categoryId)?.name || categoryId;
    const confirmed = window.confirm(
      `Are you sure you want to delete all ${categoryName} data? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await auth.requestDataDeletion('30days', [categoryId]);

      logger.info('Data deletion requested', {
        component: 'DataUsageReportDashboard',
        category: categoryId,
      });

      // Refresh the report to show updated data
      await loadDataUsageReport();
    } catch (err) {
      logger.error('Data deletion failed', {
        component: 'DataUsageReportDashboard',
        error: err,
      });
      alert('Failed to delete data. Please try again or contact support.');
    }
  };

  // Helper function to provide clear descriptions for each data category
  const getDataCategoryDescription = (id: string): string => {
    const descriptions: Record<string, string> = {
      profile: 'Basic account information including name, email, and preferences',
      activity: 'Your interactions with bills, comments, votes, and civic engagement',
      analytics: 'Usage patterns and behavioral data to improve the platform',
      security: 'Login attempts, security events, and audit trails',
      communications: 'Email notifications and communication history',
      temporary: 'Session data, cache, and temporary files',
    };
    return descriptions[id] || 'Data category information';
  };

  // Helper function to explain what each data category is used for
  const getDataCategoryPurposes = (id: string): string[] => {
    const purposes: Record<string, string[]> = {
      profile: ['Account management', 'Personalization', 'Communication'],
      activity: ['Civic transparency', 'Platform improvement', 'Community features'],
      analytics: ['Performance optimization', 'Feature development', 'User experience'],
      security: ['Fraud prevention', 'Security monitoring', 'Compliance'],
      communications: ['Service notifications', 'Updates', 'Support'],
      temporary: ['Session management', 'Performance', 'Functionality'],
    };
    return purposes[id] || ['Platform functionality'];
  };

  // Helper function to identify the legal justification for processing each data type
  const getDataCategoryLegalBasis = (id: string): string => {
    const legalBasis: Record<string, string> = {
      profile: 'Contract performance',
      activity: 'Public interest (civic transparency)',
      analytics: 'Consent',
      security: 'Legal obligation',
      communications: 'Consent',
      temporary: 'Legitimate interest',
    };
    return legalBasis[id] || 'Legitimate interest';
  };

  // Helper function to indicate whether data is shared with third parties
  const getThirdPartySharing = (id: string): boolean => {
    const sharing: Record<string, boolean> = {
      profile: false,
      activity: false,
      analytics: true, // Analytics data is shared with analytics providers
      security: false,
      communications: false,
      temporary: false,
    };
    return sharing[id] || false;
  };

  // Loading state with skeleton UI
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Error state with helpful message
  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load data usage report: {error}
          <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-4">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Not authenticated state
  if (!auth.user || !stats) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Please log in to view your data usage report.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector and refresh button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Data Usage Report
          </h2>
          <p className="text-gray-600 mt-1">
            Transparent view of how your data is collected, used, and protected
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="period-select" className="sr-only">
            Select time period
          </label>
          <select
            id="period-select"
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
            className="border rounded-md px-3 py-2 text-sm"
            aria-label="Select reporting period"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Overview - Key metrics at a glance */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Data Points</p>
                <p className="text-2xl font-bold">{stats.totalDataPoints.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Categories Tracked</p>
                <p className="text-2xl font-bold">{stats.categoriesTracked}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Anonymized</p>
                <p className="text-2xl font-bold">{stats.anonymizedPercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Retention Compliant</p>
                <p className="text-2xl font-bold">{stats.retentionCompliance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Report Tabs */}
      <Tabs defaultValue="categories" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="categories">Data Categories</TabsTrigger>
          <TabsTrigger value="purposes">Usage Purposes</TabsTrigger>
          <TabsTrigger value="retention">Retention Policy</TabsTrigger>
          <TabsTrigger value="sharing">Third-Party Sharing</TabsTrigger>
        </TabsList>

        {/* Data Categories Tab - Shows what data we have about the user */}
        <TabsContent value="categories">
          <div className="space-y-4">
            {categories.map(category => (
              <Card key={category.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={category.legalBasis === 'Consent' ? 'default' : 'secondary'}>
                        {category.legalBasis}
                      </Badge>
                      {category.thirdPartySharing && (
                        <Badge variant="outline">
                          <Globe className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Data Points</p>
                      <p className="text-lg font-semibold">
                        {category.dataPoints.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Storage Size</p>
                      <p className="text-lg font-semibold">
                        {retentionUtils.formatFileSize(category.sizeBytes)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Retention Expires</p>
                      <p className="text-lg font-semibold">
                        {retentionUtils.daysUntilExpiry(category.retentionExpiry)} days
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Purposes</p>
                    <div className="flex flex-wrap gap-1">
                      {category.purposes.map(purpose => (
                        <Badge key={purpose} variant="outline" className="text-xs">
                          {purpose}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {category.canExport && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleExportData(category.id)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    )}
                    {category.canDelete && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteData(category.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Usage Purposes Tab - Explains why we collect data */}
        <TabsContent value="purposes">
          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Data</CardTitle>
              <CardDescription>
                Detailed breakdown of data usage purposes and legal basis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Primary Purposes</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Platform Functionality</p>
                        <p className="text-sm text-gray-600">
                          Essential features and user experience
                        </p>
                      </div>
                      <Badge>Contract</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Civic Transparency</p>
                        <p className="text-sm text-gray-600">
                          Public engagement and democratic participation
                        </p>
                      </div>
                      <Badge>Public Interest</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Analytics & Improvement</p>
                        <p className="text-sm text-gray-600">
                          Platform optimization and feature development
                        </p>
                      </div>
                      <Badge>Consent</Badge>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Data Processing Activities</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-2">Collection</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Account registration information</li>
                        <li>• Platform interaction data</li>
                        <li>• Technical usage metrics</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-2">Processing</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Personalization algorithms</li>
                        <li>• Analytics and reporting</li>
                        <li>• Security monitoring</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-2">Storage</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Encrypted database storage</li>
                        <li>• Automated backup systems</li>
                        <li>• Geographic data residency</li>
                      </ul>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <h5 className="font-medium mb-2">Sharing</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>• Analytics service providers</li>
                        <li>• Research institutions (anonymized)</li>
                        <li>• No advertising networks</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Retention Policy Tab - Shows how long data is kept */}
        <TabsContent value="retention">
          <Card>
            <CardHeader>
              <CardTitle>Data Retention Policies</CardTitle>
              <CardDescription>How long we keep different types of data and why</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dataRetentionService.getRetentionPolicies().map(policy => (
                  <div key={policy.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{policy.name}</h4>
                      <Badge variant="outline">
                        {retentionUtils.formatRetentionPeriod(policy.retentionPeriod)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{policy.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium mb-1">Legal Basis</p>
                        <p className="text-gray-600">{policy.legalBasis}</p>
                      </div>
                      <div>
                        <p className="font-medium mb-1">Auto Delete</p>
                        <p className="text-gray-600">{policy.autoDelete ? 'Yes' : 'Manual only'}</p>
                      </div>
                    </div>

                    {policy.exceptions.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-sm mb-1">Exceptions</p>
                        <div className="flex flex-wrap gap-1">
                          {policy.exceptions.map(exception => (
                            <Badge key={exception} variant="outline" className="text-xs">
                              {exception}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Third-Party Sharing Tab - Transparency about data sharing */}
        <TabsContent value="sharing">
          <Card>
            <CardHeader>
              <CardTitle>Third-Party Data Sharing</CardTitle>
              <CardDescription>
                When and how we share your data with external services
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Privacy Commitment:</strong> We never sell your personal data to
                    advertisers or data brokers. All third-party sharing is limited to essential
                    services and research purposes.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Analytics Services</h4>
                      <Badge>Consent Required</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Anonymized usage data shared with analytics providers to improve platform
                      performance
                    </p>
                    <div className="text-sm">
                      <p className="font-medium mb-1">Data Shared</p>
                      <p className="text-gray-600">
                        Page views, feature usage, performance metrics (anonymized)
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Research Institutions</h4>
                      <Badge>Consent Required</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Aggregated civic engagement data shared with academic researchers studying
                      democracy
                    </p>
                    <div className="text-sm">
                      <p className="font-medium mb-1">Data Shared</p>
                      <p className="text-gray-600">
                        Aggregated participation patterns, demographic trends (anonymized)
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">Service Providers</h4>
                      <Badge variant="secondary">Contractual</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      Essential service providers with data processing agreements
                    </p>
                    <div className="text-sm">
                      <p className="font-medium mb-1">Services</p>
                      <p className="text-gray-600">
                        Email delivery, cloud hosting, security monitoring
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Data Protection Measures</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• All third parties sign data processing agreements</li>
                    <li>• Data is anonymized or pseudonymized when possible</li>
                    <li>• Regular audits of third-party data handling</li>
                    <li>• Immediate notification of any data breaches</li>
                    <li>• Right to withdraw consent at any time</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions section - Quick access to data rights */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management Actions</CardTitle>
          <CardDescription>Exercise your data rights and manage your information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => handleExportData()}>
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
            <Button variant="outline" onClick={() => window.open('/privacy-policy', '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              Privacy Policy
            </Button>
            <Button variant="outline" onClick={() => window.open('/contact', '_blank')}>
              <Info className="h-4 w-4 mr-2" />
              Contact Privacy Officer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated timestamp */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(stats.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}
