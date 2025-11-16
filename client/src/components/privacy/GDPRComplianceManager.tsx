/**
 * GDPR Compliance Manager
 * Comprehensive GDPR compliance features including data export, deletion, and consent management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { 
  Shield, 
  Download, 
  Trash2, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Info,
  Eye,
  Settings,
  Globe,
  Lock,
  Users,
  Database,
  Mail,
  Phone
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { privacyCompliance } from '../../utils/privacy-compliance';
import { dataRetentionService } from '../../services/dataRetentionService';
import { logger } from '../../utils/logger';

interface GDPRRights {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
  lastExercised?: string;
  status?: 'available' | 'pending' | 'completed' | 'not_applicable';
}

interface ConsentStatus {
  category: string;
  granted: boolean;
  grantedAt?: string;
  withdrawnAt?: string;
  version: string;
  canWithdraw: boolean;
}

interface DataProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  recipients: string[];
  retentionPeriod: string;
  automated: boolean;
  profiling: boolean;
}

export function GDPRComplianceManager() {
  const auth = useAuth();
  const [loading, setLoading] = useState(true);
  const [gdprRights, setGdprRights] = useState<GDPRRights[]>([]);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus[]>([]);
  const [processingActivities, setProcessingActivities] = useState<DataProcessingActivity[]>([]);
  const [complianceScore, setComplianceScore] = useState(0);
  const [activeTab, setActiveTab] = useState('rights');

  useEffect(() => {
    if (auth.user) {
      loadGDPRData();
    }
  }, [auth.user]);

  const loadGDPRData = async () => {
    if (!auth.user) return;

    setLoading(true);
    try {
      // Load GDPR rights status
      const rights: GDPRRights[] = [
        {
          id: 'access',
          name: 'Right of Access',
          description: 'Request a copy of your personal data',
          icon: <Eye className="h-5 w-5" />,
          available: true,
          status: 'available',
        },
        {
          id: 'rectification',
          name: 'Right to Rectification',
          description: 'Correct inaccurate personal data',
          icon: <Settings className="h-5 w-5" />,
          available: true,
          status: 'available',
        },
        {
          id: 'erasure',
          name: 'Right to Erasure',
          description: 'Request deletion of your personal data',
          icon: <Trash2 className="h-5 w-5" />,
          available: true,
          status: 'available',
        },
        {
          id: 'portability',
          name: 'Right to Data Portability',
          description: 'Receive your data in a portable format',
          icon: <Download className="h-5 w-5" />,
          available: true,
          status: 'available',
        },
        {
          id: 'restriction',
          name: 'Right to Restrict Processing',
          description: 'Limit how we process your data',
          icon: <Lock className="h-5 w-5" />,
          available: true,
          status: 'available',
        },
        {
          id: 'objection',
          name: 'Right to Object',
          description: 'Object to processing based on legitimate interests',
          icon: <Shield className="h-5 w-5" />,
          available: true,
          status: 'available',
        },
        {
          id: 'automated_decision',
          name: 'Rights Related to Automated Decision Making',
          description: 'Rights regarding automated processing and profiling',
          icon: <Database className="h-5 w-5" />,
          available: false,
          status: 'not_applicable',
        },
      ];

      // Load consent status
      const consents: ConsentStatus[] = [
        {
          category: 'Analytics',
          granted: auth.user.privacy_settings?.analytics_consent || false,
          grantedAt: auth.user.privacy_settings?.analytics_consent ? new Date().toISOString() : undefined,
          version: '1.0.0',
          canWithdraw: true,
        },
        {
          category: 'Marketing',
          granted: auth.user.privacy_settings?.marketing_consent || false,
          grantedAt: auth.user.privacy_settings?.marketing_consent ? new Date().toISOString() : undefined,
          version: '1.0.0',
          canWithdraw: true,
        },
        {
          category: 'Data Sharing',
          granted: auth.user.privacy_settings?.data_sharing_consent || false,
          grantedAt: auth.user.privacy_settings?.data_sharing_consent ? new Date().toISOString() : undefined,
          version: '1.0.0',
          canWithdraw: true,
        },
        {
          category: 'Location Tracking',
          granted: auth.user.privacy_settings?.location_tracking || false,
          grantedAt: auth.user.privacy_settings?.location_tracking ? new Date().toISOString() : undefined,
          version: '1.0.0',
          canWithdraw: true,
        },
      ];

      // Load processing activities
      const activities: DataProcessingActivity[] = [
        {
          id: 'account_management',
          name: 'Account Management',
          purpose: 'Provide platform services and manage user accounts',
          legalBasis: 'Contract performance (GDPR Art. 6(1)(b))',
          dataCategories: ['Profile information', 'Authentication data'],
          recipients: ['Internal systems', 'Cloud hosting provider'],
          retentionPeriod: '2 years after account closure',
          automated: false,
          profiling: false,
        },
        {
          id: 'civic_engagement',
          name: 'Civic Engagement Tracking',
          purpose: 'Enable democratic participation and civic transparency',
          legalBasis: 'Public interest (GDPR Art. 6(1)(e))',
          dataCategories: ['Activity data', 'Comments', 'Voting records'],
          recipients: ['Public records', 'Research institutions (anonymized)'],
          retentionPeriod: '5 years for civic transparency',
          automated: false,
          profiling: false,
        },
        {
          id: 'analytics',
          name: 'Platform Analytics',
          purpose: 'Improve platform performance and user experience',
          legalBasis: 'Consent (GDPR Art. 6(1)(a))',
          dataCategories: ['Usage patterns', 'Performance metrics'],
          recipients: ['Analytics service providers'],
          retentionPeriod: '2 years',
          automated: true,
          profiling: false,
        },
        {
          id: 'security',
          name: 'Security Monitoring',
          purpose: 'Protect platform and user security',
          legalBasis: 'Legitimate interest (GDPR Art. 6(1)(f))',
          dataCategories: ['Security logs', 'Access patterns'],
          recipients: ['Security service providers'],
          retentionPeriod: '7 years',
          automated: true,
          profiling: false,
        },
      ];

      // Calculate compliance score
      const grantedConsents = consents.filter(c => c.granted).length;
      const availableRights = rights.filter(r => r.available).length;
      const score = Math.round(((grantedConsents + availableRights) / (consents.length + rights.length)) * 100);

      setGdprRights(rights);
      setConsentStatus(consents);
      setProcessingActivities(activities);
      setComplianceScore(score);
    } catch (error) {
      logger.error('Failed to load GDPR data', {
        component: 'GDPRComplianceManager',
        error,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExerciseRight = async (rightId: string) => {
    if (!auth.user) return;

    try {
      switch (rightId) {
        case 'access':
          await handleDataAccess();
          break;
        case 'portability':
          await handleDataPortability();
          break;
        case 'erasure':
          await handleDataErasure();
          break;
        case 'restriction':
          await handleProcessingRestriction();
          break;
        case 'objection':
          await handleProcessingObjection();
          break;
        default:
          logger.warn('Unknown GDPR right', { rightId });
      }
    } catch (error) {
      logger.error('Failed to exercise GDPR right', {
        component: 'GDPRComplianceManager',
        rightId,
        error,
      });
    }
  };

  const handleDataAccess = async () => {
    if (!auth.user) return;

    const confirmed = window.confirm(
      'This will generate a comprehensive report of all your personal data. You will receive an email when it\'s ready. Continue?'
    );

    if (!confirmed) return;

    await auth.requestDataExport('json', ['profile', 'activity', 'analytics', 'communications']);
    
    // Update right status
    setGdprRights(prev => prev.map(right => 
      right.id === 'access' 
        ? { ...right, status: 'pending', lastExercised: new Date().toISOString() }
        : right
    ));

    logger.info('Data access request submitted', {
      component: 'GDPRComplianceManager',
      userId: auth.user.id,
    });
  };

  const handleDataPortability = async () => {
    if (!auth.user) return;

    const format = window.prompt('Choose export format (json, csv, xml):', 'json');
    if (!format || !['json', 'csv', 'xml'].includes(format)) return;

    await auth.requestDataExport(format as any, ['profile', 'activity']);
    
    setGdprRights(prev => prev.map(right => 
      right.id === 'portability' 
        ? { ...right, status: 'pending', lastExercised: new Date().toISOString() }
        : right
    ));

    logger.info('Data portability request submitted', {
      component: 'GDPRComplianceManager',
      format,
      userId: auth.user.id,
    });
  };

  const handleDataErasure = async () => {
    if (!auth.user) return;

    const confirmed = window.confirm(
      'WARNING: This will permanently delete your account and all associated data. This action cannot be undone. Are you sure?'
    );

    if (!confirmed) return;

    const secondConfirm = window.confirm(
      'This is your final confirmation. Your account and all data will be permanently deleted. Continue?'
    );

    if (!secondConfirm) return;

    await auth.requestDataDeletion('30days', ['profile', 'activity', 'analytics', 'communications']);
    
    setGdprRights(prev => prev.map(right => 
      right.id === 'erasure' 
        ? { ...right, status: 'pending', lastExercised: new Date().toISOString() }
        : right
    ));

    logger.info('Data erasure request submitted', {
      component: 'GDPRComplianceManager',
      userId: auth.user.id,
    });
  };

  const handleProcessingRestriction = async () => {
    const reason = window.prompt(
      'Please specify the reason for restricting processing:\n1. Accuracy dispute\n2. Unlawful processing\n3. No longer needed\n4. Objection pending\n\nEnter number (1-4):'
    );

    if (!reason || !['1', '2', '3', '4'].includes(reason)) return;

    const reasons = {
      '1': 'Accuracy dispute',
      '2': 'Unlawful processing',
      '3': 'No longer needed',
      '4': 'Objection pending',
    };

    // In production, this would submit a restriction request
    setGdprRights(prev => prev.map(right => 
      right.id === 'restriction' 
        ? { ...right, status: 'pending', lastExercised: new Date().toISOString() }
        : right
    ));

    logger.info('Processing restriction request submitted', {
      component: 'GDPRComplianceManager',
      reason: reasons[reason as keyof typeof reasons],
    });
  };

  const handleProcessingObjection = async () => {
    const grounds = window.prompt(
      'Please specify your grounds for objection (e.g., "I object to direct marketing" or "Processing not necessary for legitimate interests"):'
    );

    if (!grounds) return;

    // In production, this would submit an objection request
    setGdprRights(prev => prev.map(right => 
      right.id === 'objection' 
        ? { ...right, status: 'pending', lastExercised: new Date().toISOString() }
        : right
    ));

    logger.info('Processing objection submitted', {
      component: 'GDPRComplianceManager',
      grounds,
    });
  };

  const handleConsentChange = async (category: string, granted: boolean) => {
    if (!auth.user) return;

    try {
      const settingKey = category.toLowerCase().replace(' ', '_') + '_consent';
      await auth.updatePrivacySettings({ [settingKey]: granted });

      setConsentStatus(prev => prev.map(consent => 
        consent.category === category 
          ? { 
              ...consent, 
              granted, 
              grantedAt: granted ? new Date().toISOString() : consent.grantedAt,
              withdrawnAt: !granted ? new Date().toISOString() : undefined,
            }
          : consent
      ));

      logger.info('Consent updated', {
        component: 'GDPRComplianceManager',
        category,
        granted,
      });
    } catch (error) {
      logger.error('Failed to update consent', {
        component: 'GDPRComplianceManager',
        category,
        error,
      });
    }
  };

  const getRightStatusColor = (status?: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'completed':
        return 'text-blue-600';
      case 'not_applicable':
        return 'text-gray-400';
      default:
        return 'text-gray-600';
    }
  };

  const getRightStatusBadge = (status?: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default">Available</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline">Completed</Badge>;
      case 'not_applicable':
        return <Badge variant="outline">N/A</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-24 bg-gray-200 rounded mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to access GDPR compliance features.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            GDPR Compliance Center
          </h2>
          <p className="text-gray-600 mt-1">
            Exercise your data protection rights under GDPR
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Compliance Score</p>
          <div className="flex items-center gap-2">
            <Progress value={complianceScore} className="w-24" />
            <span className="text-lg font-bold">{complianceScore}%</span>
          </div>
        </div>
      </div>

      {/* GDPR Notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Your Rights Under GDPR:</strong> As a data subject, you have specific rights regarding your personal data. 
          We are committed to facilitating the exercise of these rights in accordance with EU General Data Protection Regulation.
        </AlertDescription>
      </Alert>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="rights">Your Rights</TabsTrigger>
          <TabsTrigger value="consent">Consent Management</TabsTrigger>
          <TabsTrigger value="processing">Data Processing</TabsTrigger>
          <TabsTrigger value="contact">Contact DPO</TabsTrigger>
        </TabsList>

        {/* GDPR Rights */}
        <TabsContent value="rights">
          <div className="space-y-4">
            {gdprRights.map((right) => (
              <Card key={right.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${getRightStatusColor(right.status)}`}>
                        {right.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{right.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{right.description}</p>
                        {right.lastExercised && (
                          <p className="text-xs text-gray-500">
                            Last exercised: {new Date(right.lastExercised).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getRightStatusBadge(right.status)}
                      {right.available && right.status === 'available' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExerciseRight(right.id)}
                        >
                          Exercise Right
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Consent Management */}
        <TabsContent value="consent">
          <Card>
            <CardHeader>
              <CardTitle>Consent Management</CardTitle>
              <CardDescription>
                Manage your consent for different types of data processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {consentStatus.map((consent) => (
                  <div key={consent.category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium mb-1">{consent.category}</h4>
                      <div className="text-sm text-gray-600">
                        {consent.granted ? (
                          <p>
                            Consent granted on {consent.grantedAt ? new Date(consent.grantedAt).toLocaleDateString() : 'Unknown'}
                          </p>
                        ) : (
                          <p>Consent not granted</p>
                        )}
                        {consent.withdrawnAt && (
                          <p>Withdrawn on {new Date(consent.withdrawnAt).toLocaleDateString()}</p>
                        )}
                        <p className="mt-1">Version: {consent.version}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={consent.granted}
                        onCheckedChange={(checked) => handleConsentChange(consent.category, checked)}
                        disabled={!consent.canWithdraw}
                      />
                      {consent.granted && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Note:</strong> Withdrawing consent will not affect the lawfulness of processing based on consent before its withdrawal. 
                    Some processing may continue based on other legal grounds.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Data Processing Activities */}
        <TabsContent value="processing">
          <div className="space-y-4">
            {processingActivities.map((activity) => (
              <Card key={activity.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{activity.name}</CardTitle>
                    <div className="flex gap-2">
                      {activity.automated && (
                        <Badge variant="outline">Automated</Badge>
                      )}
                      {activity.profiling && (
                        <Badge variant="secondary">Profiling</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>{activity.purpose}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Legal Basis</h4>
                      <p className="text-sm text-gray-600">{activity.legalBasis}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Retention Period</h4>
                      <p className="text-sm text-gray-600">{activity.retentionPeriod}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Data Categories</h4>
                      <div className="flex flex-wrap gap-1">
                        {activity.dataCategories.map((category) => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Recipients</h4>
                      <div className="flex flex-wrap gap-1">
                        {activity.recipients.map((recipient) => (
                          <Badge key={recipient} variant="outline" className="text-xs">
                            {recipient}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Contact DPO */}
        <TabsContent value="contact">
          <Card>
            <CardHeader>
              <CardTitle>Contact Data Protection Officer</CardTitle>
              <CardDescription>
                Get in touch with our Data Protection Officer for privacy-related inquiries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Email</p>
                        <p className="text-sm text-gray-600">dpo@chanuka.ke</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Phone</p>
                        <p className="text-sm text-gray-600">+254 (0) 20 123 4567</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-medium">Response Time</p>
                        <p className="text-sm text-gray-600">Within 30 days (GDPR requirement)</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Common Inquiries</h4>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Data processing questions</li>
                      <li>• Privacy rights assistance</li>
                      <li>• Data breach notifications</li>
                      <li>• Consent management issues</li>
                      <li>• Third-party data sharing concerns</li>
                      <li>• Data retention policy questions</li>
                    </ul>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Supervisory Authority:</strong> If you are not satisfied with our response, you have the right to lodge a complaint 
                    with the Office of the Data Protection Commissioner of Kenya or your local supervisory authority.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button onClick={() => window.open('mailto:dpo@chanuka.ke', '_blank')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Email DPO
                  </Button>
                  <Button variant="outline" onClick={() => window.open('/privacy-policy', '_blank')}>
                    <FileText className="h-4 w-4 mr-2" />
                    Privacy Policy
                  </Button>
                  <Button variant="outline" onClick={() => window.open('/gdpr-compliance', '_blank')}>
                    <Globe className="h-4 w-4 mr-2" />
                    GDPR Compliance Statement
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}