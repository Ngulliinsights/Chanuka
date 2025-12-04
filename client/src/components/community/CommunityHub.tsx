/**
 * Community Hub - Main community engagement interface
 * 
 * Features:
 * - Activity feed with real-time updates
 * - Trending topics with velocity-based algorithm
 * - Expert insights with verification
 * - Action center with campaigns and petitions
 * - Local impact filtering
 * - Feed customization
 */

import { ThumbsUp } from 'lucide-react';
import {
  Activity,
  TrendingUp,
  Users,
  MapPin,
  Filter,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { useEffect, useState, useCallback, lazy, Suspense } from 'react';

import { useMediaQuery } from '@client/hooks/useMediaQuery';
import { cn } from '@client/lib/utils';

import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';



import ActivityFeed from './ActivityFeed';
import { CommunityErrorBoundary } from './CommunityErrorBoundary';
import { CommunityFilters } from './CommunityFilters';
import CommunityStats from './CommunityStats';
import { LocalImpactPanel } from './LocalImpactPanel';
import { TrendingTopics } from './TrendingTopics';

// Expert Insights Component
const ExpertInsights = ({ insights, compact }: { insights: any[]; compact?: boolean }) => {
  const mockInsights = [
    {
      id: 1,
      expert: 'Dr. Sarah Kimani',
      title: 'Constitutional Law Expert',
      insight: 'The Digital Privacy Act aligns well with Article 31 of the Constitution, strengthening privacy protections.',
      billId: 1,
      timestamp: '2024-01-20T10:30:00Z',
      likes: 45
    },
    {
      id: 2,
      expert: 'Prof. Michael Otieno',
      title: 'Economic Policy Analyst',
      insight: 'Healthcare reforms could reduce costs by 25% while improving access for underserved populations.',
      billId: 3,
      timestamp: '2024-01-19T14:20:00Z',
      likes: 67
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Expert Insights</h3>
        <Badge variant="secondary">{mockInsights.length} insights</Badge>
      </div>
      
      {mockInsights.slice(0, compact ? 2 : 4).map((insight) => (
        <Card key={insight.id} className="p-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{insight.expert.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-2">
              <div>
                <p className="font-medium text-sm">{insight.expert}</p>
                <p className="text-xs text-muted-foreground">{insight.title}</p>
              </div>
              <p className="text-sm text-gray-700">{insight.insight}</p>
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                <span>{new Date(insight.timestamp).toLocaleDateString()}</span>
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-3 w-3" />
                  <span>{insight.likes}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

// Action Center Component
const ActionCenter = ({ campaigns, petitions, compact }: { campaigns: any[]; petitions: any[]; compact?: boolean }) => {
  const mockCampaigns = [
    {
      id: 1,
      title: 'Support Digital Privacy Rights',
      description: 'Join the campaign to strengthen data protection laws',
      supporters: 1247,
      target: 2000,
      deadline: '2024-02-15T00:00:00Z'
    },
    {
      id: 2,
      title: 'Healthcare Access for All',
      description: 'Advocate for universal healthcare coverage',
      supporters: 892,
      target: 1500,
      deadline: '2024-02-28T00:00:00Z'
    }
  ];

  const mockPetitions = [
    {
      id: 1,
      title: 'Transparency in Government Contracts',
      signatures: 3456,
      target: 5000,
      daysLeft: 12
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Action Center</h3>
        <Badge variant="secondary">{mockCampaigns.length + mockPetitions.length} active</Badge>
      </div>
      
      {/* Campaigns */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-muted-foreground">Active Campaigns</h4>
        {mockCampaigns.slice(0, compact ? 1 : 2).map((campaign) => (
          <Card key={campaign.id} className="p-4">
            <div className="space-y-3">
              <div>
                <h5 className="font-medium">{campaign.title}</h5>
                <p className="text-sm text-muted-foreground">{campaign.description}</p>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{campaign.supporters.toLocaleString()} supporters</span>
                  <span>Goal: {campaign.target.toLocaleString()}</span>
                </div>
                <Progress value={(campaign.supporters / campaign.target) * 100} className="h-2" />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Ends {new Date(campaign.deadline).toLocaleDateString()}
                </span>
                <Button size="sm">Join Campaign</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Petitions */}
      {mockPetitions.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Petitions</h4>
          {mockPetitions.slice(0, compact ? 1 : 2).map((petition) => (
            <Card key={petition.id} className="p-4">
              <div className="space-y-3">
                <h5 className="font-medium">{petition.title}</h5>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{petition.signatures.toLocaleString()} signatures</span>
                    <span>Goal: {petition.target.toLocaleString()}</span>
                  </div>
                  <Progress value={(petition.signatures / petition.target) * 100} className="h-2" />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {petition.daysLeft} days left
                  </span>
                  <Button size="sm">Sign Petition</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

interface CommunityHubProps {
  className?: string;
}

function CommunityHubComponent({ className }: CommunityHubProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('feed');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocalImpact, setShowLocalImpact] = useState(false);

  // Mock data - delinked from backend
  const isLoading = false;
  const error = null;

  // Mock activity feed data
  const paginatedActivityFeed = [
    {
      id: '1',
      type: 'comment' as const,
      userId: 'user1',
      userName: 'John Doe',
      userAvatar: '',
      title: 'Comment on Environmental Bill',
      content: 'Great discussion on the new environmental bill!',
      timestamp: new Date().toISOString(),
      billId: 123,
      likes: 12,
      replies: 3,
      shares: 2,
      velocity: 85,
      diversity: 72,
      substance: 90,
      trendingScore: 85
    },
    {
      id: '2',
      type: 'discussion' as const,
      userId: 'user2',
      userName: 'Jane Smith',
      userAvatar: '',
      title: 'Tax Reform Discussion',
      content: 'What are your thoughts on the proposed tax reforms?',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      likes: 8,
      replies: 15,
      shares: 5,
      velocity: 65,
      diversity: 88,
      substance: 75,
      trendingScore: 65
    }
  ];

  // Mock trending topics
  const filteredTrendingTopics = [
    {
      id: '1',
      title: 'Environmental Protection Bill',
      description: 'Discussion about environmental protection legislation',
      category: 'bill' as const,
      billIds: [123],
      policyAreas: ['Environment'],
      activityCount: 45,
      participantCount: 32,
      expertCount: 5,
      velocity: 85,
      diversity: 72,
      substance: 90,
      trendingScore: 85,
      hourlyActivity: [5, 8, 12, 15, 10, 8, 6],
      dailyActivity: [45, 38, 52, 41],
      weeklyActivity: [280, 320, 290],
      geographicDistribution: [
        { state: 'CA', count: 15, percentage: 33 },
        { state: 'NY', count: 12, percentage: 27 },
        { state: 'TX', count: 10, percentage: 22 }
      ],
      timestamp: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Healthcare Reform',
      description: 'Healthcare policy reform discussions',
      category: 'policy_area' as const,
      billIds: [456],
      policyAreas: ['Healthcare'],
      activityCount: 32,
      participantCount: 28,
      expertCount: 3,
      velocity: 65,
      diversity: 88,
      substance: 75,
      trendingScore: 65,
      hourlyActivity: [3, 5, 8, 10, 6, 4, 2],
      dailyActivity: [32, 28, 35, 30],
      weeklyActivity: [200, 220, 210],
      geographicDistribution: [
        { state: 'FL', count: 8, percentage: 25 },
        { state: 'IL', count: 7, percentage: 22 },
        { state: 'PA', count: 6, percentage: 19 }
      ],
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      lastUpdated: new Date(Date.now() - 1800000).toISOString()
    }
  ];

  // Mock expert insights
  const filteredExpertInsights = [
    {
      id: '1',
      title: 'Analysis of Constitutional Implications',
      author: { name: 'Dr. Legal Expert', credentials: 'Constitutional Law Professor' },
      summary: 'This bill raises important questions about separation of powers...',
      communityValidation: { validationScore: 95, totalVotes: 120 }
    }
  ];

  // Mock campaigns and petitions
  const filteredCampaigns = [
    {
      id: '1',
      title: 'Support Clean Energy Initiative',
      description: 'Join the movement for renewable energy adoption',
      status: 'active',
      supporters: 1250,
      goal: 2000
    }
  ];

  const filteredPetitions = [
    {
      id: '1',
      title: 'Protect Local Parks',
      description: 'Stop the proposed development that threatens our community parks',
      status: 'active',
      signatures: 850,
      goal: 1000
    }
  ];

  const hasMoreItems = false;

  // Mock stats
  const stats = {
    totalMembers: 15420,
    activeDiscussions: 89,
    totalComments: 1247,
    trendingTopics: 15,
    expertContributions: 23,
    activeCampaigns: 8
  };

  // Sync loading state
  // Note: we now derive loading/error directly from `useCommunityData` (isLoading / error)

  // Mock functions - no backend dependency
  const loadTrendingTopics = useCallback(() => {
    console.log('Mock: Loading trending topics...');
  }, []);

  const setupRealTimeConnection = useCallback(() => {
    console.log('Mock: Setting up real-time connection...');
  }, []);

  // Initialize with mock setup
  useEffect(() => {
    setupRealTimeConnection();

    // Mock periodic updates
    const trendingInterval = setInterval(() => {
      loadTrendingTopics();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(trendingInterval);
    };
  }, [setupRealTimeConnection, loadTrendingTopics]);

  const handleRefresh = async () => {
    console.log('Mock: Refreshing data...');
  };

  const handleLoadMore = () => {
    console.log('Mock: Loading more items...');
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <Card className="chanuka-card">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-4">
              <p className="text-destructive">Error loading community data: {error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className={cn('container mx-auto px-4 py-6', className)}>
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              Community Hub
            </h1>
            <p className="text-muted-foreground">
              Connect, discuss, and take action on legislation that matters
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Live</span>
            </div>

            {/* Action Buttons */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLocalImpact(!showLocalImpact)}
              className={cn(showLocalImpact && 'bg-accent')}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Local Impact
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-accent')}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>

            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Community Stats */}
        <CommunityErrorBoundary context="CommunityStats">
          <CommunityStats stats={stats} />
        </CommunityErrorBoundary>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mb-6">
          <CommunityFilters onClose={() => setShowFilters(false)} />
        </div>
      )}

      {/* Local Impact Panel */}
      {showLocalImpact && (
        <div className="mb-6">
          <LocalImpactPanel onClose={() => setShowLocalImpact(false)} />
        </div>
      )}

      {/* Main Content */}
      <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-4')}>
        {/* Sidebar - Trending Topics and Expert Insights */}
        {!isMobile && (
          <div className="lg:col-span-1 space-y-6">
            {/* Trending Topics */}
            <Card className="chanuka-card">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Trending Now
                </h3>
                <CommunityErrorBoundary context="TrendingTopics">
                  <TrendingTopics
                    topics={filteredTrendingTopics.slice(0, 5)}
                    compact={true}
                  />
                </CommunityErrorBoundary>
              </CardContent>
            </Card>

            {/* Expert Insights Preview */}
            <Card className="chanuka-card">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Users className="h-5 w-5 text-blue-500" />
                  Expert Insights
                </h3>
                <CommunityErrorBoundary context="ExpertInsights">
                  <ExpertInsights
                    insights={filteredExpertInsights.slice(0, 3)}
                    compact={true}
                  />
                </CommunityErrorBoundary>
              </CardContent>
            </Card>

            {/* Action Center Preview */}
            <Card className="chanuka-card">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <Activity className="h-5 w-5 text-green-500" />
                  Take Action
                </h3>
                <CommunityErrorBoundary context="ActionCenter">
                  <ActionCenter
                    campaigns={filteredCampaigns.slice(0, 2)}
                    petitions={filteredPetitions.slice(0, 2)}
                    compact={true}
                  />
                </CommunityErrorBoundary>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Area */}
        <div className={cn('space-y-6', isMobile ? 'col-span-1' : 'lg:col-span-3')}>
          {isMobile ? (
            // Mobile: Tabbed Interface
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="feed" className="text-xs">
                  <MessageSquare className="h-4 w-4 mr-1" />
                  Feed
                </TabsTrigger>
                <TabsTrigger value="trending" className="text-xs">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="experts" className="text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  Experts
                </TabsTrigger>
                <TabsTrigger value="action" className="text-xs">
                  <Activity className="h-4 w-4 mr-1" />
                  Action
                </TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="mt-4">
                <CommunityErrorBoundary context="ActivityFeed">
                  <ActivityFeed
                      activities={paginatedActivityFeed}
                      loading={isLoading}
                      hasMore={hasMoreItems}
                      onLoadMore={handleLoadMore}
                    />
                </CommunityErrorBoundary>
              </TabsContent>

              <TabsContent value="trending" className="mt-4">
                <CommunityErrorBoundary context="TrendingTopics">
                  <TrendingTopics topics={filteredTrendingTopics} />
                </CommunityErrorBoundary>
              </TabsContent>

              <TabsContent value="experts" className="mt-4">
                <CommunityErrorBoundary context="ExpertInsights">
                  <ExpertInsights insights={filteredExpertInsights} />
                </CommunityErrorBoundary>
              </TabsContent>

              <TabsContent value="action" className="mt-4">
                <CommunityErrorBoundary context="ActionCenter">
                  <ActionCenter
                    campaigns={filteredCampaigns}
                    petitions={filteredPetitions}
                  />
                </CommunityErrorBoundary>
              </TabsContent>
            </Tabs>
          ) : (
            // Desktop: Activity Feed
            <CommunityErrorBoundary context="ActivityFeed">
              <ActivityFeed
                activities={paginatedActivityFeed}
                loading={isLoading}
                hasMore={hasMoreItems}
                onLoadMore={handleLoadMore}
              />
            </CommunityErrorBoundary>
          )}
        </div>
      </div>
    </div>
  );
}

export { CommunityHubComponent as CommunityHub };
export default CommunityHubComponent;