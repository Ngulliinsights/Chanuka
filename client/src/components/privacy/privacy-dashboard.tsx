import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  Download, 
  Trash2, 
  Settings, 
  Eye, 
  Share2, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Cookie,
  Mail,
  Bell,
  Smartphone
} from 'lucide-react';
import { logger } from '../../utils/logger';

interface PrivacyPreferences {
  dataProcessing: {
    analytics: boolean;
    marketing: boolean;
    research: boolean;
    personalization: boolean;
  };
  dataSharing: {
    publicProfile: boolean;
    shareEngagement: boolean;
    shareComments: boolean;
    shareVotingHistory: boolean;
  };
  dataRetention: {
    keepComments: boolean;
    keepEngagementHistory: boolean;
    keepNotifications: boolean;
    retentionPeriodMonths: number;
  };
  communications: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    marketingEmails: boolean;
  };
  cookies: {
    essential: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
  };
}

interface PrivacyDashboard {
  privacyPreferences: PrivacyPreferences;
  complianceScore: number;
  dataRetentionPolicies: Array<{
    dataType: string;
    retentionPeriodDays: number;
    description: string;
    isActive: boolean;
  }>;
  userRights: {
    dataExport: boolean;
    dataDeletion: boolean;
    dataPortability: boolean;
    consentWithdrawal: boolean;
  };
  lastUpdated: string;
}

export function PrivacyDashboard() {
  const [dashboard, setDashboard] = useState<PrivacyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchPrivacyDashboard();
  }, []);

  const fetchPrivacyDashboard = async () => {
    try {
      const response = await fetch('/api/privacy/dashboard', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch privacy dashboard');
      }
      
      const data = await response.json();
      setDashboard(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const updatePreferences = async (section: keyof PrivacyPreferences, updates: any) => {
    if (!dashboard) return;

    setUpdating(true);
    try {
      const response = await fetch('/api/privacy/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ [section]: updates })
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }

      const updatedPrefs = await response.json();
      setDashboard(prev => prev ? {
        ...prev,
        privacyPreferences: updatedPrefs.data
      } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
    } finally {
      setUpdating(false);
    }
  };

  const exportData = async (format: 'json' | 'csv' = 'json') => {
    try {
      const response = await fetch('/api/privacy/data-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ format })
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-data-export-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  const deleteAllData = async () => {
    try {
      const response = await fetch('/api/privacy/data-deletion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ 
          confirmDeletion: true,
          keepAuditTrail: true,
          reason: 'User requested data deletion via privacy dashboard'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to delete data');
      }

      // Redirect to logout or home page after deletion
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="m-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!dashboard) {
    return (
      <Alert className="m-4">
        <Info className="h-4 w-4" />
        <AlertDescription>No privacy data available</AlertDescription>
      </Alert>
    );
  }

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Privacy Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage your privacy preferences and data rights</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className={`font-semibold ${getComplianceColor(dashboard.complianceScore)}`}>
            {dashboard.complianceScore}% GDPR Compliant
          </span>
        </div>
      </div>

      {/* Compliance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Privacy Compliance Score</span>
          </CardTitle>
          <CardDescription>
            Your current GDPR compliance level based on privacy settings and data practices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Overall Compliance</span>
              <span className={`font-bold ${getComplianceColor(dashboard.complianceScore)}`}>
                {dashboard.complianceScore}%
              </span>
            </div>
            <Progress value={dashboard.complianceScore} className="w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              {Object.entries(dashboard.userRights).map(([right, available]) => (
                <div key={right} className="flex items-center space-x-2">
                  {available ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm capitalize">
                    {right.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="preferences" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="data-rights">Data Rights</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
        </TabsList>

        {/* Privacy Preferences */}
        <TabsContent value="preferences" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Data Processing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>Data Processing</span>
                </CardTitle>
                <CardDescription>
                  Control how your data is processed for different purposes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(dashboard.privacyPreferences.dataProcessing).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </label>
                      <p className="text-xs text-gray-500">
                        {key === 'analytics' && 'Usage analytics and performance monitoring'}
                        {key === 'marketing' && 'Marketing communications and promotions'}
                        {key === 'research' && 'Research and product improvement'}
                        {key === 'personalization' && 'Personalized content and recommendations'}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        updatePreferences('dataProcessing', { ...dashboard.privacyPreferences.dataProcessing, [key]: checked })
                      }
                      disabled={updating}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Data Sharing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Share2 className="h-5 w-5" />
                  <span>Data Sharing</span>
                </CardTitle>
                <CardDescription>
                  Control what information is shared publicly or with other users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(dashboard.privacyPreferences.dataSharing).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </label>
                      <p className="text-xs text-gray-500">
                        {key === 'publicProfile' && 'Make your profile visible to other users'}
                        {key === 'shareEngagement' && 'Share your bill engagement statistics'}
                        {key === 'shareComments' && 'Allow others to see your comments'}
                        {key === 'shareVotingHistory' && 'Share your voting and tracking history'}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        updatePreferences('dataSharing', { ...dashboard.privacyPreferences.dataSharing, [key]: checked })
                      }
                      disabled={updating}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Cookie className="h-5 w-5" />
                  <span>Cookie Preferences</span>
                </CardTitle>
                <CardDescription>
                  Manage cookie usage for different website functions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(dashboard.privacyPreferences.cookies).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium capitalize">
                        {key} Cookies
                      </label>
                      <p className="text-xs text-gray-500">
                        {key === 'essential' && 'Required for basic website functionality (cannot be disabled)'}
                        {key === 'analytics' && 'Help us understand how you use the website'}
                        {key === 'marketing' && 'Used for advertising and marketing purposes'}
                        {key === 'preferences' && 'Remember your settings and preferences'}
                      </p>
                    </div>
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => 
                        updatePreferences('cookies', { ...dashboard.privacyPreferences.cookies, [key]: checked })
                      }
                      disabled={updating || key === 'essential'}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Rights */}
        <TabsContent value="data-rights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Export Your Data</span>
                </CardTitle>
                <CardDescription>
                  Download a copy of all your personal data (GDPR Article 15)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600">
                  You have the right to receive a copy of your personal data in a structured, 
                  commonly used format. This includes your profile, comments, engagement history, 
                  and preferences.
                </p>
                <div className="flex space-x-2">
                  <Button onClick={() => exportData('json')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export as JSON
                  </Button>
                  <Button onClick={() => exportData('csv')} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export as CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trash2 className="h-5 w-5 text-red-600" />
                  <span>Delete Your Data</span>
                </CardTitle>
                <CardDescription>
                  Permanently delete all your personal data (GDPR Article 17)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> This action cannot be undone. All your data, 
                    including profile, comments, and engagement history will be permanently deleted.
                  </AlertDescription>
                </Alert>
                {!showDeleteConfirm ? (
                  <Button 
                    onClick={() => setShowDeleteConfirm(true)} 
                    variant="destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete All My Data
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600">
                      Are you absolutely sure? This action cannot be undone.
                    </p>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={deleteAllData} 
                        variant="destructive" 
                        size="sm"
                      >
                        Yes, Delete Everything
                      </Button>
                      <Button 
                        onClick={() => setShowDeleteConfirm(false)} 
                        variant="outline" 
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Data Retention */}
        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Data Retention Policies</span>
              </CardTitle>
              <CardDescription>
                How long different types of data are kept on our systems
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {dashboard.dataRetentionPolicies.map((policy) => (
                  <div key={policy.dataType} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium capitalize">
                        {policy.dataType.replace(/_/g, ' ')}
                      </h4>
                      <p className="text-sm text-gray-600">{policy.description}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant={policy.isActive ? "default" : "secondary"}>
                        {policy.retentionPeriodDays} days
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium mb-2">Your Retention Preferences</h4>
                <div className="space-y-2">
                  {Object.entries(dashboard.privacyPreferences.dataRetention).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </span>
                      <span className="text-sm font-medium">
                        {typeof value === 'boolean' ? (value ? 'Keep' : 'Delete') : `${value} months`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Communications */}
        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <span>Communication Preferences</span>
              </CardTitle>
              <CardDescription>
                Control how we communicate with you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(dashboard.privacyPreferences.communications).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {key === 'emailNotifications' && <Mail className="h-4 w-4 text-gray-500" />}
                    {key === 'pushNotifications' && <Bell className="h-4 w-4 text-gray-500" />}
                    {key === 'smsNotifications' && <Smartphone className="h-4 w-4 text-gray-500" />}
                    {key === 'marketingEmails' && <Mail className="h-4 w-4 text-gray-500" />}
                    <div>
                      <label className="text-sm font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </label>
                      <p className="text-xs text-gray-500">
                        {key === 'emailNotifications' && 'Receive email notifications for bill updates'}
                        {key === 'pushNotifications' && 'Receive browser push notifications'}
                        {key === 'smsNotifications' && 'Receive SMS notifications (if phone provided)'}
                        {key === 'marketingEmails' && 'Receive marketing and promotional emails'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={value}
                    onCheckedChange={(checked) => 
                      updatePreferences('communications', { ...dashboard.privacyPreferences.communications, [key]: checked })
                    }
                    disabled={updating}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date(dashboard.lastUpdated).toLocaleString()}
      </div>
    </div>
  );
}