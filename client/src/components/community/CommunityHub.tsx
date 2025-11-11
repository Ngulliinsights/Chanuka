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

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  MapPin, 
  Filter,
  RefreshCw,
  Settings,
  Bell,
  MessageSquare,
  Heart,
  Share2,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useCommunityStore, useCommunitySelectors } from '../../store/slices/communitySlice';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { ActivityFeed } from './ActivityFeed';
import { TrendingTopics } from './TrendingTopics';
import { ExpertInsights } from './ExpertInsights';
import { ActionCenter } from './ActionCenter';
import { CommunityFilters } from './CommunityFilters';
import { LocalImpactPanel } from './LocalImpactPanel';
import { CommunityStats } from './CommunityStats';

interface CommunityHubProps {
  className?: string;
}

export function CommunityHub({ className }: CommunityHubProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeTab, setActiveTab] = useState('feed');
  const [showFilters, setShowFilters] = useState(false);
  const [showLocalImpact, setShowLocalImpact] = useState(false);

  const {
    loading,
    error,
    stats,
    isConnected,
    setLoading,
    setError,
    handleRealTimeUpdate,
    setConnectionStatus,
    updateTrendingScores,
  } = useCommunityStore();

  const {
    paginatedActivityFeed,
    filteredTrendingTopics,
    filteredExpertInsights,
    filteredCampaigns,
    filteredPetitions,
    hasMoreItems,
  } = useCommunitySelectors();

  // Initialize data and real-time connection
  useEffect(() => {
    const initializeCommunityHub = async () => {
      setLoading(true);
      try {
        // TODO: Load initial data from API
        await loadInitialData();
        
        // TODO: Establish WebSocket connection for real-time updates
        setupRealTimeConnection();
        
        // Update trending scores periodically
        const trendingInterval = setInterval(() => {
          updateTrendingScores();
        }, 5 * 60 * 1000); // Every 5 minutes

        return () => {
          clearInterval(trendingInterval);
          // TODO: Cleanup WebSocket connection
        };
      } catch (err) {
        setError('Failed to load community data');
      } finally {
        setLoading(false);
      }
    };

    initializeCommunityHub();
  }, [setLoading, setError, updateTrendingScores]);

  const loadInitialData = async () => {
    // TODO: Implement API calls to load:
    // - Activity feed
    // - Trending topics
    // - Expert insights
    // - Campaigns and petitions
    // - Community stats
    // - Local impact data
    
    // Mock data for now
    console.log('Loading initial community data...');
  };

  const setupRealTimeConnection = () => {
    // TODO: Implement WebSocket connection
    // This would connect to the existing WebSocket infrastructure
    // and handle real-time updates for community features
    
    setConnectionStatus(true);
    console.log('Setting up real-time connection...');
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await loadInitialData();
      updateTrendingScores();
    } catch (err) {
      setError('Failed to refresh community data');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMoreItems && !loading) {
      useCommunityStore.getState().loadMoreItems();
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
                <RefreshCw className="h-4 w-4 mr-2" />
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
              <div className={cn(
                'w-2 h-2 rounded-full',
                isConnected ? 'bg-green-500' : 'bg-red-500'
              )} />
              <span className="text-muted-foreground">
                {isConnected ? 'Live' : 'Offline'}
              </span>
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

            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Community Stats */}
        <CommunityStats stats={stats} />
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
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-500" />
                  Trending Now
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrendingTopics 
                  topics={filteredTrendingTopics.slice(0, 5)} 
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Expert Insights Preview */}
            <Card className="chanuka-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Expert Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ExpertInsights 
                  insights={filteredExpertInsights.slice(0, 3)} 
                  compact={true}
                />
              </CardContent>
            </Card>

            {/* Action Center Preview */}
            <Card className="chanuka-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Take Action
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ActionCenter 
                  campaigns={filteredCampaigns.slice(0, 2)}
                  petitions={filteredPetitions.slice(0, 2)}
                  compact={true}
                />
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
                <ActivityFeed 
                  activities={paginatedActivityFeed}
                  loading={loading}
                  hasMore={hasMoreItems}
                  onLoadMore={handleLoadMore}
                />
              </TabsContent>

              <TabsContent value="trending" className="mt-4">
                <TrendingTopics topics={filteredTrendingTopics} />
              </TabsContent>

              <TabsContent value="experts" className="mt-4">
                <ExpertInsights insights={filteredExpertInsights} />
              </TabsContent>

              <TabsContent value="action" className="mt-4">
                <ActionCenter 
                  campaigns={filteredCampaigns}
                  petitions={filteredPetitions}
                />
              </TabsContent>
            </Tabs>
          ) : (
            // Desktop: Activity Feed
            <ActivityFeed 
              activities={paginatedActivityFeed}
              loading={loading}
              hasMore={hasMoreItems}
              onLoadMore={handleLoadMore}
            />
          )}
        </div>
      </div>
    </div>
  );
}