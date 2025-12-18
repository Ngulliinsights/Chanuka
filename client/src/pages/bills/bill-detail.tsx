/**
 * Comprehensive Bill Detail Page
 * 
 * Complete bill information with tabbed interface, expert analysis,
 * community engagement, and civic action guidance. Includes accessibility
 * features, structured data, and responsive design.
 */

import { ArrowLeft, AlertTriangle, Loader2, Star, Share2, MessageSquare, Users, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { AnalysisDashboard } from '@client/features/analysis/ui/dashboard';
import BillCommunityTab from '@client/features/bills/ui/detail/BillCommunityTab';
import BillFullTextTab from '@client/features/bills/ui/detail/BillFullTextTab';
import { BillHeader } from '@client/features/bills/ui/detail/BillHeader';
import BillOverviewTab from '@client/features/bills/ui/detail/BillOverviewTab';
import BillSponsorsTab from '@client/features/bills/ui/detail/BillSponsorsTab';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Tabs, TabsContent, TabsList, TabsTrigger } from '@client/shared/design-system';
import type { Bill } from '@client/types';
import { logger } from '@client/utils/logger';

export default function BillDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for development - replace with actual API call
  useEffect(() => {
    const loadBillData = async () => {
      if (!id) {
        setError('Bill ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        const demoBills = {
          '1': {
            id: '1',
            billNumber: 'HB-2024-001',
            title: 'Digital Privacy Protection and Data Rights Act',
            summary: 'A comprehensive bill to protect digital privacy rights, regulate data collection and processing by technology companies, and establish a framework for individual data ownership and control. This legislation aims to give citizens greater control over their personal information while promoting innovation in the digital economy.',
            category: 'Technology',
          },
          '2': {
            id: '2',
            billNumber: 'SB-2024-042',
            title: 'Climate Action and Renewable Energy Transition Act',
            summary: 'Establishes a comprehensive framework for transitioning to renewable energy sources, reducing carbon emissions by 50% by 2030, and creating green jobs. Includes provisions for carbon pricing, renewable energy incentives, and just transition support for affected communities.',
            category: 'Environment',
          },
          '3': {
            id: '3',
            billNumber: 'HB-2024-078',
            title: 'Healthcare Access and Affordability Enhancement Act',
            summary: 'Expands healthcare access through public option programs, reduces prescription drug costs through Medicare negotiation, and strengthens community health centers. Aims to reduce healthcare costs by 25% while improving access for underserved populations.',
            category: 'Healthcare',
          }
        };
        
        const selectedBillData = demoBills[id as keyof typeof demoBills] || demoBills['1'];
        const mockBill: Bill = {
          id: selectedBillData.id,
          title: selectedBillData.title,
          summary: selectedBillData.summary,
          status: 'INTRODUCED',
          category: selectedBillData.category,
          introducedDate: '2024-01-15T00:00:00Z',
          lastActionDate: '2024-01-20T14:30:00Z',
          sponsors: [
            {
              id: '1',
              name: 'Hon. Sarah Johnson',
              party: 'Democratic Party',
              district: 'Nairobi County',
              position: 'Member of Parliament',
              isPrimary: true
            },
            {
              id: '2',
              name: 'Hon. Michael Chen',
              party: 'Republican Party', 
              district: 'Mombasa County',
              position: 'Member of Parliament',
              isPrimary: false
            }
          ],
          comments: [],
          engagementMetrics: {
            billId: selectedBillData.id,
            views: 15420,
            saves: 892,
            comments: 156,
            shares: 234,
            timestamp: new Date().toISOString()
          }
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setBill(mockBill);
        
        logger.info('Bill loaded successfully', {
          component: 'BillDetail',
          billId: id,
          billTitle: mockBill.title
        });
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load bill';
        setError(errorMessage);
        logger.error('Failed to load bill', {
          component: 'BillDetail',
          billId: id,
          error: errorMessage
        });
      } finally {
        setLoading(false);
      }
    };

    loadBillData();
  }, [id]);

  // Handle tab changes with URL updates
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('tab', value);
    window.history.replaceState({}, '', url.toString());
  };

  // Initialize tab from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl && ['overview', 'analysis', 'conflict', 'full-text', 'sponsors', 'community', 'related'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground">Loading bill details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4 max-w-md">
            <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
            <h2 className="text-xl font-semibold">Bill Not Found</h2>
            <p className="text-muted-foreground">
              {error || 'The requested bill could not be found or may have been removed.'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => navigate('/bills')}>
                Browse Bills
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3">
          <Button 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="sm"
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Bill Header */}
        <BillHeader bill={bill} />

        {/* Legislative Actions Toolbar */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button
            onClick={() => {
              // Toggle save state and update count
              const newSaveCount = (bill.engagementMetrics?.saves ?? 0) + 1;
              setBill((prev: Bill | null) => prev ? { 
                ...prev, 
                engagementMetrics: prev.engagementMetrics ? 
                  { ...prev.engagementMetrics, saves: newSaveCount } : 
                  { billId: prev.id, views: 0, comments: 0, shares: 0, saves: newSaveCount, timestamp: new Date().toISOString() }
              } : null);
              // In real app, make API call to save/unsave bill
              console.log('Bill saved/unsaved');
            }}
          >
            <Star className="h-4 w-4 mr-2" />
            Save Bill
          </Button>
          <Button
            onClick={() => {
              // Share functionality
              if (navigator.share) {
                navigator.share({
                  title: bill.title,
                  text: bill.summary,
                  url: window.location.href,
                });
              } else {
                // Fallback: copy to clipboard
                navigator.clipboard.writeText(window.location.href);
                // Show toast notification
                console.log('Link copied to clipboard');
              }
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <div className="border-l" />
          <Button
            onClick={() => {
              // Navigate to comments section
              setActiveTab('community');
              // Scroll to comments
              setTimeout(() => {
                const commentsSection = document.getElementById('comments-section');
                if (commentsSection) {
                  commentsSection.scrollIntoView({ behavior: 'smooth' });
                }
              }, 100);
            }}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Comment
          </Button>
          <Button
            onClick={() => {
              // Navigate to community discussion
              navigate(`/community?bill=${id}`);
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Join Discussion
          </Button>
          <div className="border-l" />
          <Button 
            onClick={() => {
              // Navigate to full text tab
              setActiveTab('full-text');
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Read Full Text
          </Button>
        </div>

        {/* Constitutional Analysis Alert */}
        {/* Constitutional flags component to be integrated when available */}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8\">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="conflict">
                  <span className="hidden sm:inline">Conflict</span>
                  <span className="sm:hidden">COI</span>
                </TabsTrigger>
                <TabsTrigger value="full-text">Full Text</TabsTrigger>
                <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="related">Related</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <BillOverviewTab bill={bill} />
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6">
                {/* Bill Analysis Tab Content */}
                <div className="space-y-4">
                  <p className="text-muted-foreground">Analysis content goes here</p>
                </div>
              </TabsContent>

              <TabsContent value="conflict" className="space-y-6">
                <AnalysisDashboard bill={bill} />
              </TabsContent>

              <TabsContent value="full-text">
                <BillFullTextTab bill={bill} />
              </TabsContent>

              <TabsContent value="sponsors">
                <BillSponsorsTab bill={bill} />
              </TabsContent>

              <TabsContent value="community">
                <BillCommunityTab bill={bill} />
              </TabsContent>

              <TabsContent value="related">
                <div className="space-y-4">
                  <p className="text-muted-foreground">Related bills content goes here</p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Pretext Detection & Civic Remediation */}
            {/* Component to be added when available */}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Engagement Stats</CardTitle>
                <CardDescription>Community interaction metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-primary))]">
                      {(bill.engagementMetrics?.views ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Views</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-success))]">
                      {(bill.engagementMetrics?.saves ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Saves</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-accent))]">
                      {(bill.engagementMetrics?.comments ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Comments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-info))]">
                      {(bill.engagementMetrics?.shares ?? 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Shares</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bill Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bill Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Bill ID</div>
                  <div>{bill.id}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Introduced</div>
                  <div>{new Date(bill.introducedDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Last Action</div>
                  <div>{new Date(bill.lastActionDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Category</div>
                  <div className="capitalize">{bill.category}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Status</div>
                  <div className="capitalize">{bill.status}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

