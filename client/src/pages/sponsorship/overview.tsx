
import {
  ArrowLeft,
  ChevronRight, 
  AlertTriangle, 
  DollarSign, 
  Users, 
  FileText 
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@client/shared/design-system';
import { Button } from '@client/shared/design-system';
import { Card, CardContent, CardHeader, CardTitle } from '@client/shared/design-system';
import { logger } from '@client/utils/logger';

interface OverviewProps { bill_id: string | undefined;
 }

interface AnalysisData {
  title: string;
  number: string;
  status: string;
  primarySponsor: {
    name: string;
    party: string;
    conflict_level: string;
    financial_exposure: number;
  };
  cosponsor: Array<{
    name: string;
    conflict_level: string;
    financial_exposure: number;
  }>;
  totalFinancialExposure: number;
  industryAlignment: number;
  sections: Array<{
    number: string;
    title: string;
    conflict_level: string;
  }>;
  analysisMetadata: {
    sponsorCount: number;
    conflictSections: number;
    riskLevel: string;
  };
}

export default function sponsorhipOverview({ bill_id  }: OverviewProps) { const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    let isMounted = true;

    const fetchAnalysisData = async () => {
      try {
        if (!isMounted) return;
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/bills/${bill_id}/sponsorship-analysis`, {
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch analysis: ${response.status}`);
        }

        const data = await response.json();
        
        // Only update state if component is still mounted
        if (isMounted && !abortController.signal.aborted) {
          setAnalysis(data);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        if (isMounted) {
          logger.error('Error fetching sponsorship analysis:', { component: 'Chanuka' }, err);
          setError(err instanceof Error ? err.message : 'Failed to load analysis');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (bill_id) {
      fetchAnalysisData();
    }

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [bill_id]);

  const getConflictLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRiskIcon = (level: string) => {
    const iconClass = level === 'high' ? 'text-red-600' : 
                     level === 'medium' ? 'text-yellow-600' : 'text-green-600';
    return <AlertTriangle className={`h-4 w-4 ${iconClass}`} />;
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading sponsorhip analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error Loading Analysis</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Analysis Available</h3>
          <p className="text-muted-foreground">sponsorhip analysis data is not available for this bills.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link to="/" className="hover:text-primary transition-colors">Home</Link>
        <span>›</span>
        <Link to={ `/bills/${bill_id }`} className="hover:text-primary transition-colors">Bills</Link>
        <span>›</span>
        <Link to={ `/bills/${bill_id }/sponsorship-analysis`} className="hover:text-primary transition-colors">Sponsorship Analysis</Link>
        <span>›</span>
        <span className="text-foreground">Overview</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <Link to={ `/bills/${bill_id }/sponsorship-analysis`} className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Analysis Navigation
        </Link>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          sponsorhip Overview
        </h1>
        <p className="text-muted-foreground">
          {analysis.title} ({analysis.number})
        </p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {getRiskIcon(analysis.analysisMetadata.riskLevel)}
              <Badge className={getConflictLevelColor(analysis.analysisMetadata.riskLevel)}>
                {analysis.analysisMetadata.riskLevel.toUpperCase()}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exposure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-2xl font-bold">
                ${(analysis.totalFinancialExposure / 1000000).toFixed(1)}M
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">sponsor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-2xl font-bold">
                {analysis.analysisMetadata.sponsorCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conflict Sections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-2xl font-bold">
                {analysis.analysisMetadata.conflictSections}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Primary Sponsor Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Primary Sponsor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">{analysis.primarySponsor.name}</h3>
              <p className="text-sm text-muted-foreground">{analysis.primarySponsor.party}</p>
              <div className="flex items-center gap-4 mt-2">
                <Badge className={getConflictLevelColor(analysis.primarySponsor.conflict_level)}>
                  {analysis.primarySponsor.conflict_level.toUpperCase()} RISK
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Financial Exposure: ${(analysis.primarySponsor.financial_exposure / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
            <Link to={ `/bills/${bill_id }/sponsorship-analysis/primary-sponsor`}>
              <Button variant="outline">
                View Details
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Co-sponsor Summary */}
      {analysis.cosponsor.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Co-sponsor ({analysis.cosponsor.length})
              </span>
              <Link to={ `/bills/${bill_id }/sponsorship-analysis/co-sponsors`}>
                <Button variant="outline" size="sm">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.cosponsor.slice(0, 3).map((sponsor, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{sponsor.name}</span>
                    <Badge className={`ml-2 ${getConflictLevelColor(sponsor.conflict_level)}`}>
                      {sponsor.conflict_level.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ${(sponsor.financial_exposure / 1000000).toFixed(1)}M
                  </span>
                </div>
              ))}
              {analysis.cosponsor.length > 3 && (
                <p className="text-sm text-muted-foreground text-center">
                  +{analysis.cosponsor.length - 3} more co-sponsor
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bill Sections with Conflicts */}
      {analysis.sections.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sections with Potential Conflicts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analysis.sections.map((section, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <span className="font-medium">Section {section.number}</span>
                    <p className="text-sm text-muted-foreground">{section.title}</p>
                  </div>
                  <Badge className={getConflictLevelColor(section.conflict_level)}>
                    {section.conflict_level.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Actions */}
      <div className="flex justify-between items-center">
        <Link to={ `/bills/${bill_id }/sponsorship-analysis`}>
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Navigation
          </Button>
        </Link>
        <Link to={ `/bills/${bill_id }/sponsorship-analysis/primary-sponsor`}>
          <Button>
            Next: Primary Sponsor
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

