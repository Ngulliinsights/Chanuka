import {
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  ArrowLeft,
  FileText,
  BarChart3,
} from 'lucide-react';
import React from 'react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

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
import { Progress } from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';

interface AnalysisData {
  id: string;
  title: string;
  summary: string;
  impactScore: number;
  complexityLevel: 'Low' | 'Medium' | 'High';
  stakeholders: string[];
  economicImpact: {
    estimatedCost: string;
    beneficiaries: number;
    timeframe: string;
  };
  constitutionalAnalysis: {
    compliance: 'Compliant' | 'Concerns' | 'Violations';
    articles: string[];
    notes: string;
  };
  publicSentiment: {
    support: number;
    opposition: number;
    neutral: number;
  };
  expertOpinions: Array<{
    expert: string;
    organization: string;
    stance: 'Support' | 'Oppose' | 'Neutral';
    summary: string;
  }>;
}

export default function BillAnalysis() {
  const { id } = useParams();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call with realistic data
    const loadAnalysis = async () => {
      setLoading(true);

      // Mock analysis data
      const mockAnalysis: AnalysisData = {
        id: id || '1',
        title: 'Digital Privacy Protection and Data Rights Act',
        summary:
          'This comprehensive legislation establishes robust data protection frameworks, enhances individual privacy rights, and creates regulatory oversight for digital platforms. The bill addresses growing concerns about data misuse while balancing innovation needs.',
        impactScore: 85,
        complexityLevel: 'High',
        stakeholders: [
          'Technology Companies',
          'Privacy Advocates',
          'Small Businesses',
          'Consumers',
          'Regulatory Bodies',
        ],
        economicImpact: {
          estimatedCost: 'KSh 2.5 Billion',
          beneficiaries: 45000000,
          timeframe: '3-5 years',
        },
        constitutionalAnalysis: {
          compliance: 'Compliant',
          articles: [
            'Article 31 (Privacy)',
            'Article 35 (Access to Information)',
            'Article 46 (Consumer Rights)',
          ],
          notes:
            'The bill strengthens constitutional privacy protections and aligns with international best practices.',
        },
        publicSentiment: {
          support: 68,
          opposition: 18,
          neutral: 14,
        },
        expertOpinions: [
          {
            expert: 'Dr. Sarah Kimani',
            organization: 'Kenya ICT Authority',
            stance: 'Support',
            summary:
              'Essential legislation that will position Kenya as a leader in digital rights protection while maintaining innovation incentives.',
          },
          {
            expert: 'Prof. Michael Otieno',
            organization: 'University of Nairobi Law School',
            stance: 'Support',
            summary:
              'Constitutionally sound approach that balances individual rights with economic development needs.',
          },
          {
            expert: 'Jane Wanjiku',
            organization: 'Kenya Association of Manufacturers',
            stance: 'Neutral',
            summary:
              'Supports privacy protection but recommends phased implementation to allow business adaptation.',
          },
        ],
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setAnalysis(mockAnalysis);
      setLoading(false);
    };

    loadAnalysis();
  }, [id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h2 className="text-xl font-semibold">Analysis Not Available</h2>
          <p className="text-muted-foreground">Unable to load analysis for this bill.</p>
          <Link to="/bills">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bills
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const getComplianceIcon = (compliance: string) => {
    switch (compliance) {
      case 'Compliant':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'Concerns':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'Violations':
        return <X className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          to={`/bills/${id}`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bill Details
        </Link>
        <h1 className="text-3xl font-bold mb-2">Bill Analysis</h1>
        <p className="text-muted-foreground">{analysis.title}</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Impact Score</p>
                <p className="text-2xl font-bold">{analysis.impactScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Complexity</p>
                <Badge
                  variant={
                    analysis.complexityLevel === 'High'
                      ? 'destructive'
                      : analysis.complexityLevel === 'Medium'
                        ? 'default'
                        : 'secondary'
                  }
                >
                  {analysis.complexityLevel}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Beneficiaries</p>
                <p className="text-2xl font-bold">
                  {(analysis.economicImpact.beneficiaries / 1000000).toFixed(1)}M
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Est. Cost</p>
                <p className="text-lg font-bold">{analysis.economicImpact.estimatedCost}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="constitutional">Constitutional</TabsTrigger>
          <TabsTrigger value="economic">Economic Impact</TabsTrigger>
          <TabsTrigger value="sentiment">Public Sentiment</TabsTrigger>
          <TabsTrigger value="experts">Expert Opinions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Executive Summary</CardTitle>
              <CardDescription>Key findings and analysis overview</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed mb-6">{analysis.summary}</p>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Key Stakeholders</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.stakeholders.map((stakeholder, index) => (
                      <Badge key={index} variant="outline">
                        {stakeholder}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="constitutional" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getComplianceIcon(analysis.constitutionalAnalysis.compliance)}
                <span>Constitutional Analysis</span>
              </CardTitle>
              <CardDescription>
                Assessment of constitutional compliance and implications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert
                className={`mb-4 ${
                  analysis.constitutionalAnalysis.compliance === 'Compliant'
                    ? 'border-green-200 bg-green-50'
                    : analysis.constitutionalAnalysis.compliance === 'Concerns'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-red-200 bg-red-50'
                }`}
              >
                <AlertDescription>
                  <strong>Status:</strong> {analysis.constitutionalAnalysis.compliance}
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Relevant Constitutional Articles</h4>
                  <div className="space-y-2">
                    {analysis.constitutionalAnalysis.articles.map((article, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{article}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Analysis Notes</h4>
                  <p className="text-gray-700">{analysis.constitutionalAnalysis.notes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="economic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Economic Impact Assessment</CardTitle>
              <CardDescription>Financial implications and cost-benefit analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 border rounded-lg">
                  <DollarSign className="h-8 w-8 mx-auto text-green-600 mb-2" />
                  <h4 className="font-semibold">Estimated Cost</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {analysis.economicImpact.estimatedCost}
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                  <h4 className="font-semibold">Beneficiaries</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {analysis.economicImpact.beneficiaries.toLocaleString()}
                  </p>
                </div>

                <div className="text-center p-4 border rounded-lg">
                  <Clock className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                  <h4 className="font-semibold">Implementation</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {analysis.economicImpact.timeframe}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Public Sentiment Analysis</CardTitle>
              <CardDescription>Community opinion and engagement metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Support</span>
                    <span className="text-sm text-green-600">
                      {analysis.publicSentiment.support}%
                    </span>
                  </div>
                  <Progress value={analysis.publicSentiment.support} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Opposition</span>
                    <span className="text-sm text-red-600">
                      {analysis.publicSentiment.opposition}%
                    </span>
                  </div>
                  <Progress value={analysis.publicSentiment.opposition} className="h-2" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Neutral</span>
                    <span className="text-sm text-gray-600">
                      {analysis.publicSentiment.neutral}%
                    </span>
                  </div>
                  <Progress value={analysis.publicSentiment.neutral} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experts" className="space-y-6">
          <div className="space-y-4">
            {analysis.expertOpinions.map((opinion, index) => (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">{opinion.expert}</h4>
                      <p className="text-sm text-muted-foreground">{opinion.organization}</p>
                    </div>
                    <Badge
                      variant={
                        opinion.stance === 'Support'
                          ? 'default'
                          : opinion.stance === 'Oppose'
                            ? 'destructive'
                            : 'secondary'
                      }
                    >
                      {opinion.stance}
                    </Badge>
                  </div>
                  <p className="text-gray-700">{opinion.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
