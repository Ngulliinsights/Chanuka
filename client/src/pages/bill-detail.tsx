/**
 * Comprehensive Bill Detail Page
 * 
 * Complete bill information with tabbed interface, expert analysis,
 * community engagement, and civic action guidance. Includes accessibility
 * features, structured data, and responsive design.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Loader2, Star, Share2, MessageSquare, Users, FileText } from 'lucide-react';
import { UnifiedButton, UnifiedCard, UnifiedCardContent, UnifiedCardDescription, UnifiedCardHeader, UnifiedCardTitle, UnifiedToolbar, UnifiedToolbarButton, UnifiedToolbarSeparator } from '@client/components/ui/unified-components';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/components/ui/tabs';
import { Alert, AlertDescription } from '@client/components/ui/alert';

// Bill Detail Components
import { BillHeader } from '@client/components/bill-detail/BillHeader';
import BillOverviewTab from '@client/components/bill-detail/BillOverviewTab';
import BillAnalysisTab from '@client/components/bill-detail/BillAnalysisTab';
import BillFullTextTab from '@client/components/bill-detail/BillFullTextTab';
import BillSponsorsTab from '@client/components/bill-detail/BillSponsorsTab';
import BillCommunityTab from '@client/components/bill-detail/BillCommunityTab';
import BillRelatedTab from '@client/components/bill-detail/BillRelatedTab';
import { QuickActionsBar } from '@client/components/bill-detail/QuickActionsBar';
import { CivicActionGuidance } from '@client/components/bill-detail/CivicActionGuidance';
import { ConstitutionalAnalysisPanel } from '@client/components/bill-detail/ConstitutionalAnalysisPanel';
import { ExpertAnalysisCard } from '@client/components/bill-detail/ExpertAnalysisCard';
import { PretextDetectionPanel } from '@client/features/pretext-detection/components/PretextDetectionPanel';

// Hooks and Services
import { useAuth } from '@client/features/users/hooks/useAuth';
import { useBill } from '@client/features/bills/hooks/useBills';
import { logger } from '@client/utils/logger';

// Types
import type { Bill } from '@client/core/api/types';
import { BillStatus, UrgencyLevel, ComplexityLevel } from '@client/core/api/types';

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
        
        // Mock bill data - in production, this would be an API call
        const mockBill: Bill = {
          id: parseInt(id),
          billNumber: `HB-2024-${id.padStart(3, '0')}`,
          title: 'Digital Privacy Protection and Data Rights Act',
          summary: 'A comprehensive bill to protect digital privacy rights, regulate data collection and processing by technology companies, and establish a framework for individual data ownership and control. This legislation aims to give citizens greater control over their personal information while promoting innovation in the digital economy.',
          status: BillStatus.INTRODUCED,
          urgencyLevel: UrgencyLevel.HIGH,
          introducedDate: '2024-01-15T00:00:00Z',
          lastUpdated: '2024-01-20T14:30:00Z',
          sponsors: [
            {
              id: 1,
              name: 'Hon. Sarah Johnson',
              party: 'Democratic Party',
              district: 'Nairobi County',
              position: 'Member of Parliament',
              isPrimary: true
            },
            {
              id: 2,
              name: 'Hon. Michael Chen',
              party: 'Republican Party', 
              district: 'Mombasa County',
              position: 'Member of Parliament',
              isPrimary: false
            }
          ],
          constitutionalFlags: [
            {
              id: 1,
              type: 'Privacy Rights',
              description: 'This bill may impact constitutional privacy protections under Article 31',
              severity: 'medium',
              article: 'Article 31',
              clause: 'Privacy Rights',
              analysis: 'The bill strengthens privacy protections but may require constitutional review to ensure compatibility with existing frameworks.'
            }
          ],
          viewCount: 15420,
          saveCount: 892,
          commentCount: 156,
          shareCount: 234,
          policyAreas: ['Technology', 'Privacy Rights', 'Consumer Protection', 'Digital Economy'],
          complexity: ComplexityLevel.MEDIUM,
          readingTime: 12,
          fullText: `DIGITAL PRIVACY PROTECTION AND DATA RIGHTS ACT

PART I - PRELIMINARY PROVISIONS

1. SHORT TITLE AND COMMENCEMENT
This Act may be cited as the Digital Privacy Protection and Data Rights Act, 2024 and shall come into operation on such date as the Cabinet Secretary may, by notice in the Gazette, appoint.

2. INTERPRETATION
In this Act, unless the context otherwise requires—
"data controller" means a natural or legal person who determines the purposes and means of processing personal data;
"data processor" means a natural or legal person who processes personal data on behalf of a data controller;
"personal data" means any information relating to an identified or identifiable natural person;
"processing" means any operation performed on personal data, including collection, recording, organization, structuring, storage, adaptation, retrieval, consultation, use, disclosure, dissemination, restriction, erasure or destruction;

PART II - FUNDAMENTAL PRINCIPLES

3. LAWFULNESS, FAIRNESS AND TRANSPARENCY
Personal data shall be processed lawfully, fairly and in a transparent manner in relation to the data subject.

4. PURPOSE LIMITATION
Personal data shall be collected for specified, explicit and legitimate purposes and not further processed in a manner that is incompatible with those purposes.

5. DATA MINIMIZATION
Personal data shall be adequate, relevant and limited to what is necessary in relation to the purposes for which they are processed.

[Full text continues...]`,
          amendments: [
            {
              id: 1,
              billId: parseInt(id),
              number: 'Amendment 001',
              title: 'Data Retention Period Clarification',
              description: 'Clarifies the maximum data retention periods for different categories of personal data',
              proposedDate: '2024-01-18T00:00:00Z',
              status: 'proposed',
              sponsor: {
                id: 3,
                name: 'Hon. Emily Rodriguez',
                party: 'Green Party',
                district: 'Kisumu County',
                position: 'Member of Parliament'
              }
            }
          ]
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setBill(mockBill);
        
        logger.info('Bill loaded successfully', {
          component: 'BillDetail',
          billId: id,
          billNumber: mockBill.billNumber
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
    if (tabFromUrl && ['overview', 'analysis', 'full-text', 'sponsors', 'community', 'related'].includes(tabFromUrl)) {
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
              <UnifiedButton onClick={() => navigate(-1)} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </UnifiedButton>
              <UnifiedButton onClick={() => navigate('/bills')}>
                Browse Bills
              </UnifiedButton>
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
          <UnifiedButton 
            onClick={() => navigate(-1)} 
            variant="ghost" 
            size="sm"
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Bills
          </UnifiedButton>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Bill Header */}
        <BillHeader bill={bill} />

        {/* Legislative Actions Toolbar */}
        <UnifiedToolbar className="mb-6">
          <UnifiedToolbarButton
            onClick={() => {
              // Toggle save state and update count
              const newSaveCount = bill.saveCount + 1;
              setBill(prev => prev ? { ...prev, saveCount: newSaveCount } : null);
              // In real app, make API call to save/unsave bill
              console.log('Bill saved/unsaved');
            }}
          >
            <Star className="h-4 w-4 mr-2" />
            Save Bill
          </UnifiedToolbarButton>
          <UnifiedToolbarButton
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
          </UnifiedToolbarButton>
          <UnifiedToolbarSeparator />
          <UnifiedToolbarButton
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
          </UnifiedToolbarButton>
          <UnifiedToolbarButton
            onClick={() => {
              // Navigate to community discussion
              navigate(`/community?bill=${id}`);
            }}
          >
            <Users className="h-4 w-4 mr-2" />
            Join Discussion
          </UnifiedToolbarButton>
          <UnifiedToolbarSeparator />
          <UnifiedToolbarButton 
            variant="active"
            onClick={() => {
              // Navigate to full text tab
              setActiveTab('full-text');
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            Read Full Text
          </UnifiedToolbarButton>
        </UnifiedToolbar>

        {/* Constitutional Analysis Alert */}
        {bill.constitutionalFlags.length > 0 && (
          <Alert className="mb-6 border-yellow-200 bg-yellow-50">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              This bill has {bill.constitutionalFlags.length} constitutional consideration{bill.constitutionalFlags.length !== 1 ? 's' : ''} that require review.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
                <TabsTrigger value="full-text">Full Text</TabsTrigger>
                <TabsTrigger value="sponsors">Sponsors</TabsTrigger>
                <TabsTrigger value="community">Community</TabsTrigger>
                <TabsTrigger value="related">Related</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <BillOverviewTab bill={bill} />
              </TabsContent>

              <TabsContent value="analysis" className="space-y-6">
                <BillAnalysisTab bill={bill} />
                
                {/* Constitutional Analysis */}
                {bill.constitutionalFlags.length > 0 && (
                  <ConstitutionalAnalysisPanel bill={bill} />
                )}
                
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
                <BillRelatedTab />
              </TabsContent>
            </Tabs>

            {/* Pretext Detection & Civic Remediation */}
            <div className="mt-8">
              <PretextDetectionPanel 
                billId={id!} 
                billTitle={bill.title}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">

            {/* Quick Stats */}
            <UnifiedCard>
              <UnifiedCardHeader>
                <UnifiedCardTitle className="text-lg">Engagement Stats</UnifiedCardTitle>
                <UnifiedCardDescription>Community interaction metrics</UnifiedCardDescription>
              </UnifiedCardHeader>
              <UnifiedCardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-primary))]">
                      {bill.viewCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Views</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-success))]">
                      {bill.saveCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Saves</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-accent))]">
                      {bill.commentCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Comments</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-[hsl(var(--color-info))]">
                      {bill.shareCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-[hsl(var(--color-muted-foreground))]">Shares</div>
                  </div>
                </div>
              </UnifiedCardContent>
            </UnifiedCard>

            {/* Bill Metadata */}
            <UnifiedCard>
              <UnifiedCardHeader>
                <UnifiedCardTitle className="text-lg">Bill Information</UnifiedCardTitle>
              </UnifiedCardHeader>
              <UnifiedCardContent className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Bill Number</div>
                  <div>{bill.billNumber}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Introduced</div>
                  <div>{new Date(bill.introducedDate).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Last Updated</div>
                  <div>{new Date(bill.lastUpdated).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Reading Time</div>
                  <div>{bill.readingTime} minutes</div>
                </div>
                <div>
                  <div className="font-medium text-[hsl(var(--color-muted-foreground))]">Complexity</div>
                  <div className="capitalize">{bill.complexity}</div>
                </div>
              </UnifiedCardContent>
            </UnifiedCard>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <QuickActionsBar bill={bill} />
    </div>
  );
}

