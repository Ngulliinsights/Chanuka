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

import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Activity,
  TrendingUp,
  Users,
  MapPin,
  Filter,
  RefreshCw,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@client/lib/utils';
import { useCommunityStore, useCommunitySelectors, useCommunityData, useCommunityRealTimeUpdates } from '@client/store/slices/communitySlice';
import { useMediaQuery } from '@client/hooks/useMediaQuery';
import ActivityFeed from './ActivityFeed';
import { TrendingTopics } from './TrendingTopics';
import { CommunityFilters } from './CommunityFilters';
import { LocalImpactPanel } from './LocalImpactPanel';
import CommunityStats from './CommunityStats';
import { CommunityErrorBoundary } from './CommunityErrorBoundary';

// Placeholder components for missing features
const ExpertInsights = ({ insights, compact }: { insights: any[]; compact?: boolean }) => (
  <div className="p-4 text-center text-muted-foreground">
    Expert Insights - Coming Soon ({insights?.length || 0} insights)
  </div>
);

const ActionCenter = ({ campaigns, petitions, compact }: { campaigns: any[]; petitions: any[]; compact?: boolean }) => (
  <div className="p-4 text-center text-muted-foreground">
    Action Center - Coming Soon ({campaigns?.length || 0} campaigns, {petitions?.length || 0} petitions)
  </div>
);

interface CommunityHubProps {
  className?: string;
}

function CommunityHubComponent({ className }: CommunityHubProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('feed');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocalImpact, setShowLocalImpact] = useState(false);

  // Use integrated hooks for data fetching
  const communityData = useCommunityData();
  const { refetchAll } = useCommunityRealTimeUpdates();

  const communityStore = useCommunityStore();
  const community = useCommunitySelectors();

  // Extract loading and error states
  const isLoading = communityData.isAnyLoading;
  const error = communityData.hasAnyError ? communityData.errors[0]?.message : null;

  // Map legacy prop names to the actual data returned by `useCommunityData`
  const paginatedActivityFeed = community.activityFeed?.data || [];
  const filteredTrendingTopics = community.trendingTopics?.data || [];
  const filteredExpertInsights = community.expertInsights?.data || [];
  const filteredCampaigns = community.campaigns?.data || [];
  const filteredPetitions = community.petitions?.data || [];
  const hasMoreItems = (community.activityFeed?.data?.length || 0) === community.itemsPerPage;
  const stats = community.stats?.data ?? {};

  // Sync loading state
  // Note: we now derive loading/error directly from `useCommunityData` (isLoading / error)

  // Memoize methods to prevent stale closures
  const loadTrendingTopics = useCallback(() => {
    // Invalidate trending topics query to trigger refetch
    refetchAll();
  }, [refetchAll]);

  // Memoize setup function to prevent recreating on every render
  const setupRealTimeConnection = useCallback(() => {
    // TODO: Implement WebSocket connection
    // This would connect to the existing WebSocket infrastructure
    // and handle real-time updates for community features
    console.log('Setting up real-time connection...');
  }, []);

  // Initialize real-time connection with proper dependencies
  useEffect(() => {
    setupRealTimeConnection();

    // Update trending scores periodically
    const trendingInterval = setInterval(() => {
      loadTrendingTopics();
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => {
      clearInterval(trendingInterval);
      // TODO: Cleanup WebSocket connection
    };
  }, [setupRealTimeConnection, loadTrendingTopics]);

  const handleRefresh = async () => {
    await refetchAll();
  };

  const handleLoadMore = () => {
    if (hasMoreItems && !isLoading) {
      communityStore.setPage((communityStore.currentPage || 1) + 1);
    }
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

export default CommunityHubComponent;