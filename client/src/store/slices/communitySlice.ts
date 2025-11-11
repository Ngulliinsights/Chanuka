/**
 * Community Hub State Management with Zustand
 * 
 * Manages community data, activity feeds, trending topics, expert insights,
 * campaigns, petitions, and local impact filtering.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { mockDataService } from '../../services/mockDataService';
import {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  Campaign,
  Petition,
  CommunityFilters,
  CommunityStats,
  LocalImpactMetrics,
  TrendingAlgorithmConfig
} from '../../types/community';

interface CommunityState {
  // Data
  activityFeed: ActivityItem[];
  trendingTopics: TrendingTopic[];
  expertInsights: ExpertInsight[];
  campaigns: Campaign[];
  petitions: Petition[];
  stats: CommunityStats;
  localImpact: LocalImpactMetrics | null;

  // UI State
  loading: boolean;
  error: string | null;

  // Filtering and preferences
  filters: CommunityFilters;
  trendingConfig: TrendingAlgorithmConfig;

  // Pagination
  currentPage: number;
  itemsPerPage: number;
  hasMoreItems: boolean;

  // Real-time updates
  lastUpdateTime: string | null;
  isConnected: boolean;
}

interface CommunityActions {
  // Data actions
  setActivityFeed: (items: ActivityItem[]) => void;
  addActivityItem: (item: ActivityItem) => void;
  updateActivityItem: (id: string, updates: Partial<ActivityItem>) => void;
  removeActivityItem: (id: string) => void;

  setTrendingTopics: (topics: TrendingTopic[]) => void;
  updateTrendingTopic: (id: string, updates: Partial<TrendingTopic>) => void;

  setExpertInsights: (insights: ExpertInsight[]) => void;
  addExpertInsight: (insight: ExpertInsight) => void;
  updateExpertInsight: (id: string, updates: Partial<ExpertInsight>) => void;

  setCampaigns: (campaigns: Campaign[]) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;

  setPetitions: (petitions: Petition[]) => void;
  updatePetition: (id: string, updates: Partial<Petition>) => void;

  setStats: (stats: CommunityStats) => void;
  setLocalImpact: (impact: LocalImpactMetrics | null) => void;

  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Filtering and preferences
  setFilters: (filters: Partial<CommunityFilters>) => void;
  clearFilters: () => void;
  setTrendingConfig: (config: Partial<TrendingAlgorithmConfig>) => void;

  // Pagination
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  loadMoreItems: () => void;

  // User interactions
  likeActivity: (id: string) => void;
  unlikeActivity: (id: string) => void;
  shareActivity: (id: string) => void;
  joinCampaign: (id: string) => void;
  signPetition: (id: string) => void;

  // Real-time updates
  handleRealTimeUpdate: (update: { type: string; data: any }) => void;
  setConnectionStatus: (connected: boolean) => void;
  
  // Mock data integration
  loadMockData: () => Promise<void>;
  refreshData: () => Promise<void>;

  // Trending algorithm
  calculateTrendingScore: (item: ActivityItem | TrendingTopic) => number;
  updateTrendingScores: () => void;

  // Local impact
  updateLocalImpact: (location: { state?: string; district?: string; county?: string }) => void;

  // Utility actions
  reset: () => void;
}

const initialFilters: CommunityFilters = {
  contentTypes: ['comments', 'discussions', 'expert_insights', 'campaigns', 'petitions'],
  policyAreas: [],
  timeRange: 'week',
  geography: {
    states: [],
    districts: [],
    counties: [],
  },
  expertLevel: ['official', 'domain', 'identity', 'community'],
  sortBy: 'trending',
  showLocalOnly: false,
};

const initialTrendingConfig: TrendingAlgorithmConfig = {
  velocityWeight: 0.4,
  diversityWeight: 0.3,
  substanceWeight: 0.3,
  decayRate: 0.1,
  minimumActivity: 5,
  timeWindow: 24,
};

const initialStats: CommunityStats = {
  totalMembers: 0,
  activeToday: 0,
  activeThisWeek: 0,
  totalDiscussions: 0,
  totalComments: 0,
  expertContributions: 0,
  activeCampaigns: 0,
  activePetitions: 0,
  lastUpdated: new Date().toISOString(),
};

const initialState: CommunityState = {
  // Data
  activityFeed: [],
  trendingTopics: [],
  expertInsights: [],
  campaigns: [],
  petitions: [],
  stats: initialStats,
  localImpact: null,

  // UI State
  loading: false,
  error: null,

  // Filtering and preferences
  filters: initialFilters,
  trendingConfig: initialTrendingConfig,

  // Pagination
  currentPage: 1,
  itemsPerPage: 20,
  hasMoreItems: true,

  // Real-time updates
  lastUpdateTime: null,
  isConnected: false,
};

export const useCommunityStore = create<CommunityState & CommunityActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Data actions
      setActivityFeed: (items) => set((state) => {
        state.activityFeed = items;
        state.hasMoreItems = items.length >= state.itemsPerPage;
      }),

      addActivityItem: (item) => set((state) => {
        state.activityFeed.unshift(item);
        // Update stats
        if (item.type === 'comment') {
          state.stats.totalComments += 1;
        } else if (item.type === 'discussion') {
          state.stats.totalDiscussions += 1;
        } else if (item.type === 'expert_contribution') {
          state.stats.expertContributions += 1;
        }
        state.stats.lastUpdated = new Date().toISOString();
      }),

      updateActivityItem: (id, updates) => set((state) => {
        const index = state.activityFeed.findIndex(item => item.id === id);
        if (index !== -1) {
          state.activityFeed[index] = { ...state.activityFeed[index], ...updates };
        }
      }),

      removeActivityItem: (id) => set((state) => {
        const index = state.activityFeed.findIndex(item => item.id === id);
        if (index !== -1) {
          const item = state.activityFeed[index];
          state.activityFeed.splice(index, 1);
          
          // Update stats
          if (item.type === 'comment') {
            state.stats.totalComments = Math.max(0, state.stats.totalComments - 1);
          } else if (item.type === 'discussion') {
            state.stats.totalDiscussions = Math.max(0, state.stats.totalDiscussions - 1);
          } else if (item.type === 'expert_contribution') {
            state.stats.expertContributions = Math.max(0, state.stats.expertContributions - 1);
          }
          state.stats.lastUpdated = new Date().toISOString();
        }
      }),

      setTrendingTopics: (topics) => set((state) => {
        state.trendingTopics = topics;
      }),

      updateTrendingTopic: (id, updates) => set((state) => {
        const index = state.trendingTopics.findIndex(topic => topic.id === id);
        if (index !== -1) {
          state.trendingTopics[index] = { ...state.trendingTopics[index], ...updates };
        }
      }),

      setExpertInsights: (insights) => set((state) => {
        state.expertInsights = insights;
      }),

      addExpertInsight: (insight) => set((state) => {
        state.expertInsights.unshift(insight);
        state.stats.expertContributions += 1;
        state.stats.lastUpdated = new Date().toISOString();
      }),

      updateExpertInsight: (id, updates) => set((state) => {
        const index = state.expertInsights.findIndex(insight => insight.id === id);
        if (index !== -1) {
          state.expertInsights[index] = { ...state.expertInsights[index], ...updates };
        }
      }),

      setCampaigns: (campaigns) => set((state) => {
        state.campaigns = campaigns;
        state.stats.activeCampaigns = campaigns.filter(c => c.status === 'active').length;
      }),

      updateCampaign: (id, updates) => set((state) => {
        const index = state.campaigns.findIndex(campaign => campaign.id === id);
        if (index !== -1) {
          state.campaigns[index] = { ...state.campaigns[index], ...updates };
          state.stats.activeCampaigns = state.campaigns.filter(c => c.status === 'active').length;
        }
      }),

      setPetitions: (petitions) => set((state) => {
        state.petitions = petitions;
        state.stats.activePetitions = petitions.filter(p => p.status === 'active').length;
      }),

      updatePetition: (id, updates) => set((state) => {
        const index = state.petitions.findIndex(petition => petition.id === id);
        if (index !== -1) {
          state.petitions[index] = { ...state.petitions[index], ...updates };
          state.stats.activePetitions = state.petitions.filter(p => p.status === 'active').length;
        }
      }),

      setStats: (stats) => set((state) => {
        state.stats = stats;
      }),

      setLocalImpact: (impact) => set((state) => {
        state.localImpact = impact;
      }),

      // Loading and error states
      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),

      setError: (error) => set((state) => {
        state.error = error;
      }),

      // Filtering and preferences
      setFilters: (newFilters) => set((state) => {
        state.filters = { ...state.filters, ...newFilters };
        state.currentPage = 1; // Reset to first page when filters change
      }),

      clearFilters: () => set((state) => {
        state.filters = initialFilters;
        state.currentPage = 1;
      }),

      setTrendingConfig: (config) => set((state) => {
        state.trendingConfig = { ...state.trendingConfig, ...config };
      }),

      // Pagination
      setCurrentPage: (page) => set((state) => {
        state.currentPage = page;
      }),

      setItemsPerPage: (count) => set((state) => {
        state.itemsPerPage = count;
        state.currentPage = 1;
      }),

      loadMoreItems: () => set((state) => {
        state.currentPage += 1;
      }),

      // User interactions
      likeActivity: (id) => set((state) => {
        const index = state.activityFeed.findIndex(item => item.id === id);
        if (index !== -1) {
          const item = state.activityFeed[index];
          if (!item.userHasLiked) {
            item.likes += 1;
            item.userHasLiked = true;
          }
        }
      }),

      unlikeActivity: (id) => set((state) => {
        const index = state.activityFeed.findIndex(item => item.id === id);
        if (index !== -1) {
          const item = state.activityFeed[index];
          if (item.userHasLiked) {
            item.likes = Math.max(0, item.likes - 1);
            item.userHasLiked = false;
          }
        }
      }),

      shareActivity: (id) => set((state) => {
        const index = state.activityFeed.findIndex(item => item.id === id);
        if (index !== -1) {
          state.activityFeed[index].shares += 1;
        }
      }),

      joinCampaign: (id) => set((state) => {
        const index = state.campaigns.findIndex(campaign => campaign.id === id);
        if (index !== -1) {
          const campaign = state.campaigns[index];
          campaign.participantCount += 1;
          campaign.currentCount += 1;
          campaign.progressPercentage = campaign.goal ? (campaign.currentCount / campaign.goal) * 100 : 0;
        }
      }),

      signPetition: (id) => set((state) => {
        const index = state.petitions.findIndex(petition => petition.id === id);
        if (index !== -1) {
          const petition = state.petitions[index];
          petition.currentSignatures += 1;
          petition.progressPercentage = (petition.currentSignatures / petition.goal) * 100;
        }
      }),

      // Real-time updates
      handleRealTimeUpdate: (update) => set((state) => {
        switch (update.type) {
          case 'new_activity':
            state.activityFeed.unshift(update.data);
            break;
          case 'activity_update':
            const activityIndex = state.activityFeed.findIndex(item => item.id === update.data.id);
            if (activityIndex !== -1) {
              state.activityFeed[activityIndex] = { ...state.activityFeed[activityIndex], ...update.data };
            }
            break;
          case 'trending_update':
            state.trendingTopics = update.data;
            break;
          case 'stats_update':
            state.stats = { ...state.stats, ...update.data };
            break;
        }
        state.lastUpdateTime = new Date().toISOString();
      }),

      setConnectionStatus: (connected) => set((state) => {
        state.isConnected = connected;
      }),

      // Trending algorithm
      calculateTrendingScore: (item) => {
        const config = get().trendingConfig;
        const now = new Date().getTime();
        const itemTime = new Date(item.timestamp).getTime();
        const hoursAgo = (now - itemTime) / (1000 * 60 * 60);
        
        // Apply time decay
        const timeDecay = Math.exp(-config.decayRate * hoursAgo);
        
        // Calculate weighted score
        const score = (
          item.velocity * config.velocityWeight +
          item.diversity * config.diversityWeight +
          item.substance * config.substanceWeight
        ) * timeDecay;
        
        return Math.max(0, score);
      },

      updateTrendingScores: () => set((state) => {
        const { calculateTrendingScore } = get();
        
        // Update activity feed trending scores
        state.activityFeed.forEach(item => {
          item.trendingScore = calculateTrendingScore(item);
        });
        
        // Update trending topics scores
        state.trendingTopics.forEach(topic => {
          topic.trendingScore = calculateTrendingScore(topic);
        });
        
        // Sort by trending score if that's the current sort
        if (state.filters.sortBy === 'trending') {
          state.activityFeed.sort((a, b) => b.trendingScore - a.trendingScore);
          state.trendingTopics.sort((a, b) => b.trendingScore - a.trendingScore);
        }
      }),

      // Local impact
      updateLocalImpact: (location) => set((state) => {
        // This would typically make an API call to get local impact data
        // For now, we'll just store the location preference
        if (state.localImpact) {
          state.localImpact = { ...state.localImpact, ...location };
        }
      }),

      // Mock data integration
      loadMockData: async () => {
        set((state) => {
          state.loading = true;
          state.error = null;
        });

        try {
          const [
            activityFeed,
            trendingTopics,
            expertInsights,
            campaigns,
            petitions,
            stats,
            localImpact
          ] = await Promise.all([
            mockDataService.loadData('activityItems'),
            mockDataService.loadData('trendingTopics'),
            mockDataService.loadData('expertInsights'),
            mockDataService.loadData('campaigns'),
            mockDataService.loadData('petitions'),
            mockDataService.loadData('communityStats'),
            mockDataService.loadData('localImpactMetrics')
          ]);

          set((state) => {
            state.activityFeed = activityFeed as ActivityItem[];
            state.trendingTopics = trendingTopics as TrendingTopic[];
            state.expertInsights = expertInsights as ExpertInsight[];
            state.campaigns = campaigns as Campaign[];
            state.petitions = petitions as Petition[];
            state.stats = stats as CommunityStats;
            state.localImpact = localImpact as LocalImpactMetrics;
            state.loading = false;
            state.error = null;
            state.lastUpdateTime = new Date().toISOString();
          });
        } catch (error) {
          set((state) => {
            state.loading = false;
            state.error = error instanceof Error ? error.message : 'Failed to load community data';
          });
        }
      },

      refreshData: async () => {
        const { loadMockData } = get();
        await loadMockData();
      },

      // Utility actions
      reset: () => set(() => ({ ...initialState })),
    })),
    {
      name: 'community-store',
    }
  )
);

// Selectors for computed values
export const useCommunitySelectors = () => {
  const state = useCommunityStore();

  // Filter activity feed based on current filters
  const filteredActivityFeed = state.activityFeed.filter(item => {
    // Content type filter - map activity types to content types
    if (state.filters.contentTypes.length > 0) {
      const contentTypeMap: Record<string, string> = {
        'comment': 'comments',
        'discussion': 'discussions', 
        'expert_contribution': 'expert_insights',
        'campaign_join': 'campaigns',
        'petition_sign': 'petitions',
        'bill_save': 'comments', // Map to comments for now
        'bill_share': 'comments' // Map to comments for now
      };
      
      const mappedType = contentTypeMap[item.type];
      if (!mappedType || !state.filters.contentTypes.includes(mappedType as any)) {
        return false;
      }
    }

    // Time range filter
    const now = new Date();
    const itemTime = new Date(item.timestamp);
    const timeDiff = now.getTime() - itemTime.getTime();
    
    switch (state.filters.timeRange) {
      case 'hour':
        if (timeDiff > 60 * 60 * 1000) return false;
        break;
      case 'day':
        if (timeDiff > 24 * 60 * 60 * 1000) return false;
        break;
      case 'week':
        if (timeDiff > 7 * 24 * 60 * 60 * 1000) return false;
        break;
      case 'month':
        if (timeDiff > 30 * 24 * 60 * 60 * 1000) return false;
        break;
    }

    // Geography filter
    if (state.filters.showLocalOnly && state.localImpact) {
      const hasLocalMatch = 
        (state.localImpact.state && item.location?.state === state.localImpact.state) ||
        (state.localImpact.district && item.location?.district === state.localImpact.district) ||
        (state.localImpact.county && item.location?.county === state.localImpact.county);
      
      if (!hasLocalMatch) return false;
    }

    // Expert level filter
    if (item.expertInfo) {
      if (!state.filters.expertLevel.includes(item.expertInfo.verificationType)) {
        return false;
      }
    } else if (!state.filters.expertLevel.includes('community')) {
      return false;
    }

    return true;
  });

  // Sort filtered activity feed
  const sortedActivityFeed = [...filteredActivityFeed].sort((a, b) => {
    switch (state.filters.sortBy) {
      case 'trending':
        return b.trendingScore - a.trendingScore;
      case 'recent':
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      case 'popular':
        const aPopularity = a.likes + a.replies + a.shares;
        const bPopularity = b.likes + b.replies + b.shares;
        return bPopularity - aPopularity;
      case 'local_impact':
        // Prioritize local content if location is set
        if (state.localImpact) {
          const aIsLocal = a.location?.state === state.localImpact.state;
          const bIsLocal = b.location?.state === state.localImpact.state;
          if (aIsLocal && !bIsLocal) return -1;
          if (!aIsLocal && bIsLocal) return 1;
        }
        return b.trendingScore - a.trendingScore;
      default:
        return 0;
    }
  });

  // Paginate activity feed
  const startIndex = (state.currentPage - 1) * state.itemsPerPage;
  const endIndex = startIndex + state.itemsPerPage;
  const paginatedActivityFeed = sortedActivityFeed.slice(0, endIndex);

  // Filter trending topics
  const filteredTrendingTopics = state.trendingTopics.filter(topic => {
    // Policy areas filter
    if (state.filters.policyAreas.length > 0) {
      const hasMatchingArea = state.filters.policyAreas.some(area =>
        topic.policyAreas.includes(area)
      );
      if (!hasMatchingArea) return false;
    }

    return true;
  });

  // Filter expert insights
  const filteredExpertInsights = state.expertInsights.filter(insight => {
    // Expert level filter
    if (!state.filters.expertLevel.includes(insight.verificationType)) {
      return false;
    }

    // Policy areas filter
    if (state.filters.policyAreas.length > 0) {
      const hasMatchingArea = state.filters.policyAreas.some(area =>
        insight.policyAreas.includes(area)
      );
      if (!hasMatchingArea) return false;
    }

    return true;
  });

  // Filter campaigns
  const filteredCampaigns = state.campaigns.filter(campaign => {
    // Only show active campaigns by default
    if (campaign.status !== 'active') return false;

    // Policy areas filter
    if (state.filters.policyAreas.length > 0) {
      const hasMatchingArea = state.filters.policyAreas.some(area =>
        campaign.policyAreas.includes(area)
      );
      if (!hasMatchingArea) return false;
    }

    return true;
  });

  // Filter petitions
  const filteredPetitions = state.petitions.filter(petition => {
    // Only show active petitions by default
    if (petition.status !== 'active') return false;

    // Policy areas filter
    if (state.filters.policyAreas.length > 0) {
      const hasMatchingArea = state.filters.policyAreas.some(area =>
        petition.policyAreas.includes(area)
      );
      if (!hasMatchingArea) return false;
    }

    return true;
  });

  return {
    ...state,
    filteredActivityFeed: sortedActivityFeed,
    paginatedActivityFeed,
    filteredTrendingTopics,
    filteredExpertInsights,
    filteredCampaigns,
    filteredPetitions,
    hasMoreItems: endIndex < sortedActivityFeed.length,
  };
};