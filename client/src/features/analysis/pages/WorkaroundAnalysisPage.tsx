/**
 * WorkaroundAnalysisPage - Strategic Dashboard
 *
 * A standalone page for analyzing implementation workarounds across
 * the legislative system. Provides pattern analysis, trends, and
 * drill-down capabilities to individual bill analysis.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  TrendingUp,
  FileText,
  Shield,
  ArrowRight,
  Filter,
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
import type { ImplementationWorkaround } from '@client/features/analysis/types';

// Mock data for the strategic dashboard
const MOCK_WORKAROUNDS: ImplementationWorkaround[] = [
  {
    id: 'wa-fb-001',
    originalBillId: 'bill-fb-rejected-2023',
    workaroundBillId: 'bill-fb-002',
    originalBillTitle: 'Finance Bill 2023 (Rejected Provisions)',
    workaroundBillTitle: 'Finance Bill 2024 - Tax Amendments',
    detectionReason: 'Reintroduction of previously rejected VAT provisions on digital services',
    similarityScore: 85,
    workaroundType: 'legislative_repackaging',
    bypassMechanism: {
      primaryTactic: 'Splitting provisions across multiple budget lines',
      institutionalLevel: 'national',
      branchOfGovernment: 'legislature',
      timingStrategy: 'phased',
      scopeReduction: true,
      languageObfuscation: true,
      proceduralWorkaround: false,
    },
    similarityAnalysis: {
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
    verification_status: 'verified',
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
    circumventionPattern: {
      previousRejectionDetails: {
        rejectionType: 'public_opposition',
        rejectionDate: '2023-06-25',
        rejectionReason: 'Mass public protests against cost of living increases',
        oppositionSources: ['Civil Society', 'Youth Organizations', 'Business Community'],
      },
      workaroundStrategy: {
        authorityUsed: 'Budget Process - Treasury',
        justificationProvided: 'Revenue mobilization for development',
        publicParticipationBypassed: true,
        parliamentaryOversightBypassed: false,
        constitutionalConcerns: ['Article 201 - Public Finance Principles'],
      },
    },
    communityConfirmations: 156,
    reportedBy: { id: 'sys-001', name: 'AI Detection System', role: 'Automated Analysis' },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-02-01T14:30:00Z',
    // Legacy fields for chart compatibility
    originalProvision: 'VAT on digital services',
    workaroundMethod: 'Legislative repackaging in Finance Bill 2024',
    implementationDate: '2024-01-15',
    effectiveness: 0.85,
    relatedInterests: ['Technology', 'Digital Economy', 'Taxation'],
    description: 'Previously rejected tax provisions reintroduced with minor modifications',
  },
  {
    id: 'wa-exec-001',
    originalBillId: 'bill-housing-2022',
    workaroundBillId: 'exec-order-housing-2023',
    originalBillTitle: 'Affordable Housing Levy Bill 2022',
    workaroundBillTitle: 'Executive Order on Housing Fund Contributions',
    detectionReason: 'Implementation via executive directive after court challenge',
    similarityScore: 78,
    workaroundType: 'executive_directive',
    bypassMechanism: {
      primaryTactic: 'Presidential Directive under Article 132',
      institutionalLevel: 'national',
      branchOfGovernment: 'executive',
      timingStrategy: 'immediate',
      scopeReduction: false,
      languageObfuscation: false,
      proceduralWorkaround: true,
    },
    similarityAnalysis: {
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
    verification_status: 'verified',
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
    circumventionPattern: {
      previousRejectionDetails: {
        rejectionType: 'high_court_ruling',
        rejectionDate: '2023-07-15',
        rejectionReason: 'Mandatory levy declared unconstitutional without proper legislation',
        oppositionSources: ['COTU', 'Business Associations', 'Civil Liberties Organizations'],
      },
      workaroundStrategy: {
        authorityUsed: 'Presidential Executive Authority - Article 132',
        justificationProvided: 'Urgent housing development needs',
        publicParticipationBypassed: true,
        parliamentaryOversightBypassed: true,
        constitutionalConcerns: ['Article 210 - Taxation requires legislation'],
      },
    },
    communityConfirmations: 89,
    reportedBy: { id: 'expert-003', name: 'Legal Analyst', role: 'Expert Contributor' },
    created_at: '2023-08-01T08:00:00Z',
    updated_at: '2024-01-20T11:00:00Z',
    originalProvision: 'Housing Levy deduction',
    workaroundMethod: 'Executive directive implementation',
    implementationDate: '2023-08-01',
    effectiveness: 0.78,
    relatedInterests: ['Housing', 'Employment', 'Social Security'],
    description: 'Housing contribution implemented via executive order after court struck down levy',
  },
  {
    id: 'wa-reg-001',
    originalBillId: 'bill-data-2019',
    workaroundBillId: 'reg-data-2022',
    originalBillTitle: 'Data Protection (Amendment) Bill 2019',
    workaroundBillTitle: 'Data Protection Regulations 2022',
    detectionReason: 'Controversial provisions implemented through subsidiary legislation',
    similarityScore: 72,
    workaroundType: 'regulatory_implementation',
    bypassMechanism: {
      primaryTactic: 'Subsidiary legislation under existing Data Protection Act',
      institutionalLevel: 'national',
      branchOfGovernment: 'executive',
      timingStrategy: 'delayed',
      scopeReduction: true,
      languageObfuscation: true,
      proceduralWorkaround: false,
    },
    similarityAnalysis: {
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
    verification_status: 'pending',
    alertStatus: 'active',
    publicNotificationSent: false,
    evidenceDocuments: [],
    circumventionPattern: {
      previousRejectionDetails: {
        rejectionType: 'parliamentary_defeat',
        rejectionDate: '2020-03-10',
        rejectionReason: 'Privacy concerns from MPs and civil society',
        oppositionSources: ['Privacy Advocates', 'Tech Industry', 'Human Rights Organizations'],
      },
      workaroundStrategy: {
        authorityUsed: 'Regulatory Authority of Data Commissioner',
        justificationProvided: 'Implementation of existing Data Protection Act',
        publicParticipationBypassed: false,
        parliamentaryOversightBypassed: true,
        constitutionalConcerns: ['Article 31 - Right to Privacy'],
      },
    },
    communityConfirmations: 34,
    reportedBy: { id: 'user-456', name: 'Anonymous Contributor', role: 'Community Member' },
    created_at: '2022-11-01T09:00:00Z',
    updated_at: '2023-12-15T16:00:00Z',
    originalProvision: 'Data localization mandate',
    workaroundMethod: 'Regulatory implementation',
    implementationDate: '2022-11-01',
    effectiveness: 0.72,
    relatedInterests: ['Technology', 'Privacy', 'Business'],
    description: 'Data localization requirements implemented through regulations',
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
        acc[w.workaroundType] = (acc[w.workaroundType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const byBranch = MOCK_WORKAROUNDS.reduce(
      (acc, w) => {
        acc[w.bypassMechanism.branchOfGovernment] =
          (acc[w.bypassMechanism.branchOfGovernment] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const verified = MOCK_WORKAROUNDS.filter(w => w.verification_status === 'verified').length;
    const avgSimilarity =
      MOCK_WORKAROUNDS.reduce((sum, w) => sum + w.similarityScore, 0) / MOCK_WORKAROUNDS.length;

    return {
      total: MOCK_WORKAROUNDS.length,
      verified,
      pending: MOCK_WORKAROUNDS.length - verified,
      avgSimilarity: Math.round(avgSimilarity),
      byType,
      byBranch,
      publicParticipationBypassed: MOCK_WORKAROUNDS.filter(
        w => w.circumventionPattern.workaroundStrategy.publicParticipationBypassed
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
    date: w.created_at.split('T')[0],
    similarity: w.similarityScore,
    type: w.workaroundType,
    title: w.workaroundBillTitle.substring(0, 30) + '...',
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
                      {MOCK_WORKAROUNDS.filter(w => w.similarityScore > 75).length} of {stats.total}
                    </Badge>
                  </div>
                  <Progress
                    value={
                      (MOCK_WORKAROUNDS.filter(w => w.similarityScore > 75).length / stats.total) *
                      100
                    }
                    className="h-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Workarounds that closely match previously rejected provisions
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
                              workaround.verification_status === 'verified'
                                ? 'default'
                                : 'secondary'
                            }
                          >
                            {workaround.verification_status}
                          </Badge>
                          <Badge variant="outline">
                            {workaround.workaroundType.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-sm text-orange-600 font-semibold">
                            {workaround.similarityScore}% match
                          </span>
                        </div>
                        <h4 className="font-medium">{workaround.workaroundBillTitle}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {workaround.detectionReason}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>
                            Confirmations: <strong>{workaround.communityConfirmations}</strong>
                          </span>
                          <span>
                            Detected: {new Date(workaround.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link to={`/bills/${workaround.workaroundBillId}?tab=workarounds`}>
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
