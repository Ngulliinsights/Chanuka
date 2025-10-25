import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'wouter';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import { ImplementationWorkarounds } from '../components/bills/implementation-workarounds';
import {
  FileText,
  Calendar, 
  Users, 
  Building, 
  TrendingUp, 
  AlertTriangle,
  ExternalLink,
  Eye,
  MessageSquare,
  Share2
} from 'lucide-react';

interface Bill {
  id: string;
  title: string;
  summary: string;
  status: 'draft' | 'committee' | 'voting' | 'passed' | 'failed';
  introduced_date: string;
  sponsor: string;
  cosponsors: number;
  committee: string;
  full_text: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
    analysis?: {
      complexity: number;
      impact: string;
      concerns: string[];
    };
  }>;
  voting_record?: {
    yes_votes: number;
    no_votes: number;
    abstentions: number;
  };
  transparency_score?: number;
  conflict_indicators?: {
    financial_interests: number;
    industry_alignment: number;
    disclosure_gaps: number;
  };
  actions?: Array<{
    title: string;
    date: string;
    description: string;
    status: 'completed' | 'current' | 'upcoming';
  }>;
}

const BillDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // XSS Protection: Configure DOMPurify with strict settings
  // This removes all potentially dangerous HTML elements and attributes
  const sanitizeConfig = useMemo(() => ({
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['class'],
    KEEP_CONTENT: true,
    // Prevent DOM clobbering attacks
    SANITIZE_DOM: true,
    // Remove all data attributes that could be exploited
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  }), []);

  // Sanitization utility function with validation
  // This wraps DOMPurify to provide type safety and null checking
  const sanitizeHTML = useCallback((dirty: string | undefined | null): string => {
    if (!dirty || typeof dirty !== 'string') {
      return '';
    }
    
    // Trim whitespace to prevent layout issues
    const trimmed = dirty.trim();
    
    // Return empty string for empty input
    if (!trimmed) {
      return '';
    }
    
    // Apply DOMPurify with our strict configuration
    return DOMPurify.sanitize(trimmed, sanitizeConfig);
  }, [sanitizeConfig]);

  // Memoized function to prevent unnecessary re-renders
  const fetchBill = useCallback(async () => {
    if (!id) {
      setError('No bill ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/bills/${id}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Bill not found');
        } else if (response.status >= 500) {
          throw new Error('Server error occurred. Please try again later.');
        } else {
          throw new Error(`Failed to fetch bill: ${response.statusText}`);
        }
      }

      const billData = await response.json();
      
      // Sanitize all user-generated content before setting state
      // This is our defense-in-depth approach: sanitize at the boundary
      const sanitizedBill: Bill = {
        ...billData,
        title: sanitizeHTML(billData.title),
        summary: sanitizeHTML(billData.summary),
        sponsor: sanitizeHTML(billData.sponsor),
        committee: sanitizeHTML(billData.committee),
        full_text: sanitizeHTML(billData.full_text),
        sections: billData.sections?.map((section: any) => ({
          ...section,
          title: sanitizeHTML(section.title),
          content: sanitizeHTML(section.content),
          analysis: section.analysis ? {
            ...section.analysis,
            impact: sanitizeHTML(section.analysis.impact),
            concerns: section.analysis.concerns?.map((c: string) => sanitizeHTML(c)) || []
          } : undefined
        })) || []
      };
      
      setBill(sanitizedBill);
    } catch (error) {
      console.error('Error fetching bill:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [id, sanitizeHTML]);

  useEffect(() => {
    fetchBill();
  }, [fetchBill]);

  // Status color mapping with type safety
  const getStatusColor = useCallback((status: string) => {
    const statusColors = {
      passed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      voting: 'bg-blue-100 text-blue-800',
      committee: 'bg-yellow-100 text-yellow-800',
      draft: 'bg-gray-100 text-gray-800'
    } as const;

    return statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  }, []);

  // Date formatting with error handling
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  // Safe percentage calculation with validation
  const calculateVotingPercentage = useCallback((yesVotes: number, noVotes: number, abstentions: number) => {
    // Validate inputs are numbers
    const yes = Number(yesVotes) || 0;
    const no = Number(noVotes) || 0;
    const abs = Number(abstentions) || 0;
    
    const totalVotes = yes + no + abs;
    
    // Prevent division by zero
    if (totalVotes === 0) {
      return 0;
    }
    
    // Ensure result is between 0 and 100
    const percentage = Math.round((yes / totalVotes) * 100);
    return Math.max(0, Math.min(100, percentage));
  }, []);

  // Loading state with semantic HTML
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" role="status" aria-label="Loading">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-gray-600">Loading bill details...</p>
        </div>
      </div>
    );
  }

  // Error state with recovery options
  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Bill</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex justify-center gap-4">
            <Button onClick={fetchBill} variant="outline">
              Try Again
            </Button>
            <Link to="/bills">
              <Button>Back to Bills</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Bill not found state
  if (!bill) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Bill Not Found</h1>
          <p className="text-gray-600 mb-6">The requested bill could not be found.</p>
          <Link to="/bills">
            <Button>Back to Bills</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <header className="mb-6">
        <nav className="text-sm mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li><Link to="/" className="text-blue-600 hover:underline">Home</Link></li>
            <li aria-hidden="true" className="text-gray-400">›</li>
            <li><Link to="/bills" className="text-blue-600 hover:underline">Bills</Link></li>
            <li aria-hidden="true" className="text-gray-400">›</li>
            <li className="font-medium text-gray-900" aria-current="page">{bill.title}</li>
          </ol>
        </nav>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{bill.title}</h1>
          <Badge className={getStatusColor(bill.status)}>
            {bill.status.charAt(0).toUpperCase() + bill.status.slice(1)}
          </Badge>
        </div>

        {/* Using dangerouslySetInnerHTML safely with pre-sanitized content */}
        <div 
          className="text-gray-700 text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: bill.summary }}
        />
      </header>

      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" aria-labelledby="quick-stats-heading">
        <h2 id="quick-stats-heading" className="sr-only">Bill Statistics</h2>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm text-gray-600">Introduced</span>
            </div>
            <div className="text-lg font-semibold">
              {formatDate(bill.introduced_date)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm text-gray-600">Co-sponsors</span>
            </div>
            <div className="text-lg font-semibold">{bill.cosponsors || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Building className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm text-gray-600">Committee</span>
            </div>
            <div className="text-lg font-semibold">{bill.committee}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-gray-500" aria-hidden="true" />
              <span className="text-sm text-gray-600">Transparency</span>
            </div>
            <div className="text-lg font-semibold">
              {bill.transparency_score ? `${bill.transparency_score}/10` : 'N/A'}
            </div>
          </CardContent>
        </Card>
      </section>

      {bill.conflict_indicators && (
        <section className="mb-6">
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <div className="flex-1">
                  <h3 className="font-semibold text-orange-800 mb-2">Transparency Considerations</h3>
                  <p className="text-orange-700 text-sm mb-3 leading-relaxed">
                    This bill has been flagged for potential conflicts of interest that may require additional scrutiny from constituents and oversight bodies.
                  </p>
                  <Link to={`/bills/${id}/sponsorship-analysis`}>
                    <Button variant="outline" size="sm" className="text-orange-800 border-orange-300 hover:bg-orange-100">
                      <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                      View Detailed Sponsorship Analysis
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      <main>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="voting">Voting</TabsTrigger>
            <TabsTrigger value="workarounds">Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bill Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Sponsor Information</h3>
                    <dl className="space-y-2">
                      <div className="flex flex-col sm:flex-row">
                        <dt className="font-medium sm:w-32 mb-1 sm:mb-0">Primary Sponsor:</dt>
                        <dd>{bill.sponsor}</dd>
                      </div>
                      <div className="flex flex-col sm:flex-row">
                        <dt className="font-medium sm:w-32 mb-1 sm:mb-0">Co-sponsors:</dt>
                        <dd>{bill.cosponsors}</dd>
                      </div>
                      <div className="flex flex-col sm:flex-row">
                        <dt className="font-medium sm:w-32 mb-1 sm:mb-0">Committee:</dt>
                        <dd>{bill.committee}</dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-3">Timeline</h3>
                    <dl className="space-y-2">
                      <div className="flex flex-col sm:flex-row">
                        <dt className="font-medium sm:w-32 mb-1 sm:mb-0">Introduced:</dt>
                        <dd>{formatDate(bill.introduced_date)}</dd>
                      </div>
                      <div className="flex flex-col sm:flex-row">
                        <dt className="font-medium sm:w-32 mb-1 sm:mb-0">Current Status:</dt>
                        <dd className="capitalize">{bill.status}</dd>
                      </div>
                    </dl>
                  </div>
                </div>

                {bill.conflict_indicators && (
                  <>
                    <Separator className="my-6" />
                    <div>
                      <h3 className="font-semibold mb-4">Transparency Indicators</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Financial Interests</div>
                          <Progress 
                            value={bill.conflict_indicators.financial_interests} 
                            className="mb-2" 
                            aria-label={`Financial interests concern level: ${bill.conflict_indicators.financial_interests}%`}
                          />
                          <div className="text-sm text-gray-500">{bill.conflict_indicators.financial_interests}% concern level</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Industry Alignment</div>
                          <Progress 
                            value={bill.conflict_indicators.industry_alignment} 
                            className="mb-2"
                            aria-label={`Industry alignment: ${bill.conflict_indicators.industry_alignment}%`}
                          />
                          <div className="text-sm text-gray-500">{bill.conflict_indicators.industry_alignment}% alignment</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-2">Disclosure Gaps</div>
                          <Progress 
                            value={bill.conflict_indicators.disclosure_gaps} 
                            className="mb-2"
                            aria-label={`Disclosure gaps: ${bill.conflict_indicators.disclosure_gaps}%`}
                          />
                          <div className="text-sm text-gray-500">{bill.conflict_indicators.disclosure_gaps}% gaps identified</div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <Link to={`/bills/${id}/sponsorship-analysis`}>
                    <Button variant="outline">
                      <Users className="h-4 w-4 mr-2" aria-hidden="true" />
                      Sponsorship Analysis
                    </Button>
                  </Link>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                    Full Text
                  </Button>
                  <Button variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" />
                    Comments
                  </Button>
                  <Button variant="outline">
                    <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sections" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bill Sections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {bill.sections.map((section, index) => (
                    <article key={section.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <header className="mb-3">
                        <h3 className="font-semibold text-lg">Section {index + 1}: {section.title}</h3>
                      </header>
                      <div 
                        className="prose prose-sm max-w-none mb-4"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />

                      {section.analysis && (
                        <div className="bg-gray-50 p-4 rounded border-l-4 border-blue-200">
                          <h4 className="font-medium mb-3 text-blue-900">Analysis</h4>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-4">
                              <span className="font-medium min-w-20">Complexity:</span>
                              <div className="flex items-center gap-2 flex-1">
                                <Progress 
                                  value={section.analysis.complexity} 
                                  className="flex-1 max-w-32" 
                                  aria-label={`Complexity: ${section.analysis.complexity}%`}
                                />
                                <span className="text-gray-600">{section.analysis.complexity}%</span>
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Impact:</span>
                              <span className="ml-2 text-gray-700">{section.analysis.impact}</span>
                            </div>
                            {section.analysis.concerns.length > 0 && (
                              <div>
                                <div className="font-medium mb-2">Concerns:</div>
                                <ul className="list-disc list-inside ml-2 space-y-1 text-gray-700">
                                  {section.analysis.concerns.map((concern, idx) => (
                                    <li key={idx}>{concern}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bill Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Detailed Analysis Coming Soon</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                    Comprehensive analysis including impact assessment, stakeholder effects, and implementation considerations will be available here.
                  </p>
                  <Link to={`/bills/${id}/sponsorship-analysis`}>
                    <Button>
                      View Sponsorship Analysis
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="voting" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voting Information</CardTitle>
              </CardHeader>
              <CardContent>
                {bill.voting_record ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-6 bg-green-50 rounded-lg border border-green-100">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                          {bill.voting_record.yes_votes.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-green-700">Yes Votes</div>
                      </div>
                      <div className="text-center p-6 bg-red-50 rounded-lg border border-red-100">
                        <div className="text-3xl font-bold text-red-600 mb-2">
                          {bill.voting_record.no_votes.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-red-700">No Votes</div>
                      </div>
                      <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                        <div className="text-3xl font-bold text-gray-600 mb-2">
                          {bill.voting_record.abstentions.toLocaleString()}
                        </div>
                        <div className="text-sm font-medium text-gray-700">Abstentions</div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-4">Voting Progress</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Support Level</span>
                          <span>
                            {calculateVotingPercentage(
                              bill.voting_record.yes_votes,
                              bill.voting_record.no_votes,
                              bill.voting_record.abstentions
                            )}%
                          </span>
                        </div>
                        <Progress 
                          value={calculateVotingPercentage(
                            bill.voting_record.yes_votes,
                            bill.voting_record.no_votes,
                            bill.voting_record.abstentions
                          )} 
                          className="h-4"
                          aria-label={`Support level: ${calculateVotingPercentage(
                            bill.voting_record.yes_votes,
                            bill.voting_record.no_votes,
                            bill.voting_record.abstentions
                          )}%`}
                        />
                        <div className="text-sm text-gray-600">
                          Total votes cast: {(bill.voting_record.yes_votes + bill.voting_record.no_votes + bill.voting_record.abstentions).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No Voting Data Available</h3>
                    <p className="text-gray-600 max-w-md mx-auto leading-relaxed">
                      This bill has not yet proceeded to a vote, or voting information is not currently available in our system.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workarounds" className="space-y-6">
            <ImplementationWorkarounds billId={id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default BillDetail;