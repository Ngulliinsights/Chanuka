/**
 * WorkaroundAnalysisPage - Strategic Dashboard
 *
 * A standalone page for analyzing implementation workarounds across
 * the legislative system. Provides pattern analysis, trends, and
 * drill-down capabilities to individual bill analysis.
 */

import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  TrendingUp,
  FileText,
  Shield,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

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
import { Progress } from '@client/lib/design-system';



interface WorkaroundWithMetadata {
  id: string;
  // UI-specific fields
  similarity: number;
  billTitle: string;
  billId: string;
  originalBillReference?: {
    billId: string;
    billTitle: string;
    rejectionDate: string;
    rejectionType: string;
    rejectionDetails: string;
  };
  reason: string;
  type: string;
  mechanism: {
    primaryTactic?: string;
    institutionalLevel?: string;
    branchOfGovernment: 'legislature' | 'executive' | 'judiciary';
    timingStrategy?: string;
    scopeReduction?: boolean;
    languageObfuscation?: boolean;
    proceduralWorkaround?: boolean;
  };
  analysis: {
    textSimilarity: number;
    structuralSimilarity: number;
    intentSimilarity: number;
    keyDifferences: string[];
    commonElements: string[];
    policyObjectiveSimilarity: number;
    implementationPathSimilarity: number;
    stakeholderImpactSimilarity: number;
    enforcementMechanismSimilarity: number;
  };
  verificationStatus: 'verified' | 'pending';
  alertStatus?: string;
  publicNotificationSent?: boolean;
  evidenceDocuments?: Array<{
    type: string;
    url: string;
    description: string;
    dateIssued: string;
    issuingAuthority: string;
  }>;
  pattern: {
    authorityUsed?: string;
    justificationProvided?: string;
    publicParticipationBypassed: boolean;
    parliamentaryOversightBypassed: boolean;
    constitutionalConcerns?: string[];
    oppositionSources?: string[];
  };
  confirmations: number;
  reportedBy?: {
    id: string;
    name: string;
    role: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Mock data for the strategic dashboard
const MOCK_WORKAROUNDS: WorkaroundWithMetadata[] = [
  {
    id: 'wa-fb-001',
    billId: 'bill-fb-002',
    billTitle: 'Finance Bill 2024 - Tax Amendments',
    originalBillReference: {
      billId: 'bill-fb-rejected-2023',
      billTitle: 'Finance Bill 2023 (Rejected Provisions)',
      rejectionDate: '2023-06-25',
      rejectionType: 'public_opposition',
      rejectionDetails: 'Mass public protests against cost of living increases',
    },
    reason: 'Reintroduction of previously rejected VAT provisions on digital services',
    similarity: 85,
    type: 'legislative_repackaging',
    mechanism: {
      primaryTactic: 'Splitting provisions across multiple budget lines',
      institutionalLevel: 'national',
      branchOfGovernment: 'legislature',
      timingStrategy: 'phased',
      scopeReduction: true,
      languageObfuscation: true,
      proceduralWorkaround: false,
    },
    analysis: {
      textSimilarity: 72,
      structuralSimilarity: 88,
      intentSimilarity: 95,
      keyDifferences: ['Revenue thresholds adjusted', 'Phased implementation added'],
      commonElements: ['Digital services taxation', 'Platform liability'],
      policyObjectiveSimilarity: 92,
      implementationPathSimilarity: 78,
      stakeholderImpactSimilarity: 89,
      enforcementMechanismSimilarity: 75,
    },
    verificationStatus: 'verified',
    alertStatus: 'active',
    publicNotificationSent: true,
    evidenceDocuments: [
      {
        type: 'parliamentary_hansard',
        url: '/docs/hansard-2023-06-20.pdf',
        description: 'Parliamentary debate on original Finance Bill rejection',
        dateIssued: '2023-06-20',
        issuingAuthority: 'National Assembly',
      },
    ],
    pattern: {
      authorityUsed: 'Budget Process - Treasury',
      justificationProvided: 'Revenue mobilization for development',
      publicParticipationBypassed: true,
      parliamentaryOversightBypassed: false,
      constitutionalConcerns: ['Article 201 - Public Finance Principles'],
      oppositionSources: ['Civil Society', 'Youth Organizations', 'Business Community'],
    },
    confirmations: 156,
    reportedBy: { id: 'sys-001', name: 'AI Detection System', role: 'Automated Analysis' },
    createdAt: new Date('2024-01-15T10:00:00Z'),
    updatedAt: new Date('2024-02-01T14:30:00Z'),
  },
  {
    id: 'wa-exec-001',
    billId: 'exec-order-housing-2023',
    billTitle: 'Executive Order on Housing Fund Contributions',
    originalBillReference: {
      billId: 'bill-housing-2022',
      billTitle: 'Affordable Housing Levy Bill 2022',
      rejectionDate: '2023-07-15',
      rejectionType: 'high_court_ruling',
      rejectionDetails: 'Mandatory levy declared unconstitutional without proper legislation',
    },
    reason: 'Implementation via executive directive after court challenge',
    similarity: 78,
    type: 'executive_directive',
    mechanism: {
      primaryTactic: 'Presidential Directive under Article 132',
      institutionalLevel: 'national',
      branchOfGovernment: 'executive',
      timingStrategy: 'immediate',
      scopeReduction: false,
      languageObfuscation: false,
      proceduralWorkaround: true,
    },
    analysis: {
      textSimilarity: 65,
      structuralSimilarity: 70,
      intentSimilarity: 92,
      keyDifferences: ['Voluntary vs mandatory framing', 'Implementation timeline'],
      commonElements: ['1.5% contribution rate', 'Housing fund allocation'],
      policyObjectiveSimilarity: 95,
      implementationPathSimilarity: 60,
      stakeholderImpactSimilarity: 88,
      enforcementMechanismSimilarity: 45,
    },
    verificationStatus: 'verified',
    alertStatus: 'active',
    publicNotificationSent: true,
    evidenceDocuments: [
      {
        type: 'court_ruling',
        url: '/docs/high-court-housing-2023.pdf',
        description: 'High Court ruling on Housing Levy constitutionality',
        dateIssued: '2023-07-15',
        issuingAuthority: 'High Court of Kenya',
      },
    ],
    pattern: {
      authorityUsed: 'Presidential Executive Authority - Article 132',
      justificationProvided: 'Urgent housing development needs',
      publicParticipationBypassed: true,
      parliamentaryOversightBypassed: true,
      constitutionalConcerns: ['Article 210 - Taxation requires legislation'],
      oppositionSources: ['COTU', 'Business Associations', 'Civil Liberties Organizations'],
    },
    confirmations: 89,
    reportedBy: { id: 'expert-003', name: 'Legal Analyst', role: 'Expert Contributor' },
    createdAt: new Date('2023-08-01T08:00:00Z'),
    updatedAt: new Date('2024-01-20T11:00:00Z'),
  },
  {
    id: 'wa-reg-001',
    billId: 'reg-data-2022',
    billTitle: 'Data Protection Regulations 2022',
    originalBillReference: {
      billId: 'bill-data-2019',
      billTitle: 'Data Protection (Amendment) Bill 2019',
      rejectionDate: '2020-03-10',
      rejectionType: 'parliamentary_defeat',
      rejectionDetails: 'Privacy concerns from MPs and civil society',
    },
    reason: 'Controversial provisions implemented through subsidiary legislation',
    similarity: 72,
    type: 'regulatory_implementation',
    mechanism: {
      primaryTactic: 'Subsidiary legislation under existing Data Protection Act',
      institutionalLevel: 'national',
      branchOfGovernment: 'executive',
      timingStrategy: 'delayed',
      scopeReduction: true,
      languageObfuscation: true,
      proceduralWorkaround: false,
    },
    analysis: {
      textSimilarity: 55,
      structuralSimilarity: 68,
      intentSimilarity: 82,
      keyDifferences: ['Enforcement scope', 'Penalty structure'],
      commonElements: ['Data localization requirements', 'Cross-border transfer rules'],
      policyObjectiveSimilarity: 85,
      implementationPathSimilarity: 70,
      stakeholderImpactSimilarity: 78,
      enforcementMechanismSimilarity: 65,
    },
    verificationStatus: 'pending',
    alertStatus: 'active',
    publicNotificationSent: false,
    evidenceDocuments: [],
    pattern: {
      authorityUsed: 'Regulatory Authority of Data Commissioner',
      justificationProvided: 'Implementation of existing Data Protection Act',
      publicParticipationBypassed: false,
      parliamentaryOversightBypassed: true,
      constitutionalConcerns: ['Article 31 - Right to Privacy'],
      oppositionSources: ['Privacy Advocates', 'Tech Industry', 'Human Rights Organizations'],
    },
    confirmations: 34,
    reportedBy: { id: 'user-456', name: 'Anonymous Contributor', role: 'Community Member' },
    createdAt: new Date('2022-11-01T09:00:00Z'),
    updatedAt: new Date('2023-12-15T16:00:00Z'),
  },
];

// Chart colors
const COLORS = {
  legislative: 'hsl(220, 70%, 50%)',
  executive: 'hsl(0, 70%, 50%)',
  regulatory: 'hsl(45, 70%, 50%)',
  verified: 'hsl(120, 60%, 45%)',
  pending: 'hsl(45, 90%, 55%)',
  high: 'hsl(0, 70%, 55%)',
  medium: 'hsl(45, 80%, 50%)',
  low: 'hsl(120, 50%, 50%)',
};

export default function WorkaroundAnalysisPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Compute statistics
  const stats = useMemo(() => {
    const byType = MOCK_WORKAROUNDS.reduce(
      (acc, w) => {
        acc[w.type] = (acc[w.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byBranch = MOCK_WORKAROUNDS.reduce(
      (acc, w) => {
        acc[w.mechanism.branchOfGovernment] = (acc[w.mechanism.branchOfGovernment] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const verified = MOCK_WORKAROUNDS.filter(w => w.verificationStatus === 'verified').length;
    const avgSimilarity =
      MOCK_WORKAROUNDS.reduce((sum, w) => sum + w.similarity, 0) / MOCK_WORKAROUNDS.length;

    return {
      total: MOCK_WORKAROUNDS.length,
      verified,
      pending: MOCK_WORKAROUNDS.length - verified,
      avgSimilarity: Math.round(avgSimilarity),
      byType,
      byBranch,
      publicParticipationBypassed: MOCK_WORKAROUNDS.filter(
        w => w.pattern.publicParticipationBypassed
      ).length,
    };
  }, []);

  // Prepare chart data
  const typeChartData = Object.entries(stats.byType).map(([type, count]) => ({
    name: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
    fill:
      type.includes('legislative')
        ? COLORS.legislative
        : type.includes('executive')
          ? COLORS.executive
          : COLORS.regulatory,
  }));

  const branchChartData = Object.entries(stats.byBranch).map(([branch, count]) => ({
    name: branch.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: count,
  }));

  const timelineData = MOCK_WORKAROUNDS.map(w => ({
    date: w.createdAt.toISOString().split('T')[0],
    similarity: w.similarity,
    type: w.type,
    title: w.billTitle.substring(0, 30) + '...',
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-500" />
            Implementation Workaround Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Strategic dashboard for tracking constitutional bypass patterns across Kenyan
            legislation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            Last Updated: {new Date().toLocaleDateString()}
          </Badge>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Detected</span>
            </div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Implementation workarounds</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Verified</span>
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
            <div className="text-xs text-muted-foreground">Community confirmed</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Avg. Similarity</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.avgSimilarity}%</div>
            <div className="text-xs text-muted-foreground">Policy objective match</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">Participation Bypassed</span>
            </div>
            <div className="text-2xl font-bold text-red-600">
              {stats.publicParticipationBypassed}
            </div>
            <div className="text-xs text-muted-foreground">Without public input</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Type */}
            <Card>
              <CardHeader>
                <CardTitle>Workarounds by Type</CardTitle>
                <CardDescription>Distribution of bypass mechanisms used</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={typeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        dataKey="value"
                      >
                        {typeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* By Branch */}
            <Card>
              <CardHeader>
                <CardTitle>By Branch of Government</CardTitle>
                <CardDescription>Which branches are implementing workarounds</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill={COLORS.legislative} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Constitutional Bypass Patterns</CardTitle>
              <CardDescription>
                Analysis of common tactics used to circumvent democratic processes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Public Participation Bypassed</span>
                    <Badge variant="destructive">
                      {stats.publicParticipationBypassed} of {stats.total}
                    </Badge>
                  </div>
                  <Progress
                    value={(stats.publicParticipationBypassed / stats.total) * 100}
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Workarounds that avoided public participation requirements under Article 10
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">High Similarity Score (&gt;75%)</span>
                    <Badge variant="secondary">
                      {MOCK_WORKAROUNDS.filter(w => w.similarity > 75).length} of {stats.total}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (MOCK_WORKAROUNDS.filter(w => w.similarity > 75).length / stats.total) * 100
                    }
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Workarounds that closely match previously rejected provisions
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Parliamentary Oversight Bypassed</span>
                    <Badge variant="secondary">
                      {
                        MOCK_WORKAROUNDS.filter(w => w.pattern.parliamentaryOversightBypassed)
                          .length
                      }{' '}
                      of {stats.total}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (MOCK_WORKAROUNDS.filter(w => w.pattern.parliamentaryOversightBypassed)
                        .length /
                        stats.total) *
                      100
                    }
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Implementations that circumvented legislative review processes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detection Timeline</CardTitle>
              <CardDescription>
                Chronological view of detected implementation workarounds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Similarity']}
                      labelFormatter={label => `Date: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="similarity"
                      stroke={COLORS.legislative}
                      strokeWidth={2}
                      dot={{ fill: COLORS.legislative, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Detected Workarounds</CardTitle>
              <CardDescription>
                Click on a workaround to view full analysis on the bill page
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_WORKAROUNDS.map(workaround => (
                  <div
                    key={workaround.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={
                              workaround.verificationStatus === 'verified' ? 'default' : 'secondary'
                            }
                          >
                            {workaround.verificationStatus}
                          </Badge>
                          <Badge variant="outline">{workaround.type.replace(/_/g, ' ')}</Badge>
                          <span className="text-sm text-orange-600 font-semibold">
                            {workaround.similarity}% match
                          </span>
                        </div>
                        <h4 className="font-medium">{workaround.billTitle}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{workaround.reason}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Confirmations: <strong>{workaround.confirmations}</strong>
                          </span>
                          <span>
                            Detected: {workaround.createdAt.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link to={`/bills/${workaround.billId}?tab=workarounds`}>
                        <Button variant="outline" size="sm">
                          View Analysis
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}