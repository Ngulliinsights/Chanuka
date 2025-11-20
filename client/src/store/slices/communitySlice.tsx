/**
 * Community State Management - React Query Implementation
 * 
 * Architecture Overview:
 * This implementation uses React Query for server state and React Context for UI state,
 * providing a clean separation of concerns with automatic caching, background refetching,
 * and optimistic updates. The design emphasizes type safety, error resilience, and
 * performance optimization.
 * 
 * Key Features:
 * - Automatic background refetching with smart intervals
 * - Built-in loading and error states per query
 * - Optimistic updates for instant UI feedback
 * - Memory efficient with automatic garbage collection
 * - Real-time update handling via WebSocket integration
 * - Comprehensive error handling and retry logic
 */

import {
  useQuery,
  useQueryClient,
  QueryClient
} from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode
} from 'react';
import type {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  Campaign,
  Petition,
  CommunityStats,
  CommunityFilters,
  LocalImpactMetrics,
  TrendingAlgorithmConfig
} from '../../types/community';

// ============================================================================
// Type Definitions
// ============================================================================

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}

interface ApiError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: Record<string, any>;
}

// ============================================================================
// API Client with Error Handling
// ============================================================================

class CommunityApiClient {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/api/community') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
          code: errorData.code,
          statusCode: response.status,
          details: errorData
        } as ApiError;
      }

      return response.json();
    } catch (error) {
      // Rethrow ApiError as-is, wrap other errors
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        message: error instanceof Error ? error.message : 'Network request failed',
        code: 'NETWORK_ERROR'
      } as ApiError;
    }
  }

  async fetchActivityFeed(
    filters: CommunityFilters, 
    page: number, 
    limit: number
  ): Promise<PaginatedResponse<ActivityItem>> {
    return this.request('/activity', {
      method: 'POST',
      body: JSON.stringify({ filters, page, limit })
    });
  }

  async fetchTrendingTopics(): Promise<TrendingTopic[]> {
    return this.request('/trending');
  }

  async fetchExpertInsights(filters: CommunityFilters): Promise<ExpertInsight[]> {
    return this.request('/insights', {
      method: 'POST',
      body: JSON.stringify(filters)
    });
  }

  async fetchCampaigns(): Promise<Campaign[]> {
    return this.request('/campaigns');
  }

  async fetchPetitions(): Promise<Petition[]> {
    return this.request('/petitions');
  }

  async fetchStats(): Promise<CommunityStats> {
    return this.request('/stats');
  }

  async fetchLocalImpact(): Promise<LocalImpactMetrics> {
    return this.request('/local-impact');
  }
}

// Singleton instance for the entire app
const communityApi = new CommunityApiClient();

// ============================================================================
// Query Keys Factory - Type-safe cache management
// ============================================================================

export const communityKeys = {
  all: ['community'] as const,
  
  activity: (filters: CommunityFilters, page: number) => 
    [...communityKeys.all, 'activity', filters, page] as const,
  
  activityByFilter: (filters: CommunityFilters) => 
    [...communityKeys.all, 'activity', filters] as const,
  
  trending: () => 
    [...communityKeys.all, 'trending'] as const,
  
  insights: (filters: CommunityFilters) => 
    [...communityKeys.all, 'insights', filters] as const,
  
  campaigns: () => 
    [...communityKeys.all, 'campaigns'] as const,
  
  campaignById: (id: string) => 
    [...communityKeys.campaigns(), id] as const,
  
  petitions: () => 
    [...communityKeys.all, 'petitions'] as const,
  
  petitionById: (id: string) => 
    [...communityKeys.petitions(), id] as const,
  
  stats: () => 
    [...communityKeys.all, 'stats'] as const,
  
  localImpact: () => 
    [...communityKeys.all, 'local-impact'] as const,
};

// ============================================================================
// Default Configurations
// ============================================================================

const DEFAULT_FILTERS: CommunityFilters = {
  contentTypes: ['comments', 'discussions', 'expert_insights', 'campaigns', 'petitions'],
  policyAreas: [],
  timeRange: 'week',
  geography: {
    states: [],
    districts: [],
    counties: []
  },
  expertLevel: ['official', 'domain', 'identity', 'community'],
  sortBy: 'trending',
  showLocalOnly: false
};

const DEFAULT_TRENDING_CONFIG: TrendingAlgorithmConfig = {
  velocityWeight: 0.4,
  diversityWeight: 0.3,
  substanceWeight: 0.3,
  decayRate: 0.1,
  minimumActivity: 5,
  timeWindow: 24
};

const REFETCH_INTERVALS = {
  ACTIVITY: 30000,      // 30 seconds - most dynamic
  TRENDING: 60000,      // 1 minute - frequently changing
  INSIGHTS: 60000,      // 1 minute - moderately dynamic
  CAMPAIGNS: 120000,    // 2 minutes - less frequent updates
  PETITIONS: 120000,    // 2 minutes - less frequent updates
  STATS: 300000,        // 5 minutes - relatively stable
  LOCAL_IMPACT: 300000, // 5 minutes - relatively stable
} as const;

// ============================================================================
// UI State Context - Client-side state management
// ============================================================================

interface CommunityUIState {
  filters: CommunityFilters;
  currentPage: number;
  itemsPerPage: number;
  trendingConfig: TrendingAlgorithmConfig;
  isRealTimeEnabled: boolean;
}

interface CommunityUIContextValue extends CommunityUIState {
  setFilters: (filters: Partial<CommunityFilters>) => void;
  setPage: (page: number) => void;
  setItemsPerPage: (count: number) => void;
  setTrendingConfig: (config: Partial<TrendingAlgorithmConfig>) => void;
  toggleRealTime: () => void;
  resetFilters: () => void;
  resetToDefaults: () => void;
}

const CommunityUIContext = createContext<CommunityUIContextValue | null>(null);

export function CommunityUIProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<CommunityFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [trendingConfig, setTrendingConfigState] = useState<TrendingAlgorithmConfig>(DEFAULT_TRENDING_CONFIG);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  // Memoized setter functions to prevent unnecessary re-renders
  const setFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1); // Reset pagination when filters change
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setItemsPerPageCallback = useCallback((count: number) => {
    setItemsPerPage(count);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const setTrendingConfig = useCallback((config: Partial<TrendingAlgorithmConfig>) => {
    setTrendingConfigState(prev => ({ ...prev, ...config }));
  }, []);

  const toggleRealTime = useCallback(() => {
    setIsRealTimeEnabled(prev => !prev);
  }, []);

  const resetFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPage(1);
  }, []);

  const resetToDefaults = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setCurrentPage(1);
    setItemsPerPage(20);
    setTrendingConfigState(DEFAULT_TRENDING_CONFIG);
    setIsRealTimeEnabled(true);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<CommunityUIContextValue>(
    () => ({
      filters,
      currentPage,
      itemsPerPage,
      trendingConfig,
      isRealTimeEnabled,
      setFilters,
      setPage,
      setItemsPerPage: setItemsPerPageCallback,
      setTrendingConfig,
      toggleRealTime,
      resetFilters,
      resetToDefaults,
    }),
    [
      filters,
      currentPage,
      itemsPerPage,
      trendingConfig,
      isRealTimeEnabled,
      setFilters,
      setPage,
      setItemsPerPageCallback,
      setTrendingConfig,
      toggleRealTime,
      resetFilters,
      resetToDefaults,
    ]
  );

  return (
    <CommunityUIContext.Provider value={value}>
      {children}
    </CommunityUIContext.Provider>
  );
}

function useCommunityUI() {
  const context = useContext(CommunityUIContext);
  if (!context) {
    throw new Error('useCommunityUI must be used within CommunityUIProvider');
  }
  return context;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates a trending score for topics based on multiple weighted factors.
 * Higher scores indicate more trending topics that should appear first.
 * 
 * The algorithm considers:
 * - Velocity: How quickly engagement is growing
 * - Diversity: How many different users are engaging
 * - Substance: Quality and depth of engagement
 * - Time decay: Recent topics are prioritized
 */
function calculateTrendingScore(
  topic: TrendingTopic, 
  config: TrendingAlgorithmConfig
): number {
  const now = Date.now();
  const topicTime = new Date(topic.timestamp).getTime();
  const hoursSinceCreation = (now - topicTime) / (1000 * 60 * 60);
  
  // Apply exponential decay - older content loses relevance over time
  const decayFactor = Math.exp(-config.decayRate * hoursSinceCreation);
  
  // Normalize metrics to 0-1 range for fair weighting
  const normalizedVelocity = Math.min(topic.velocity / 100, 1);
  const normalizedDiversity = Math.min(topic.diversity / 100, 1);
  const normalizedSubstance = Math.min(topic.substance / 100, 1);
  
  // Calculate weighted score
  const rawScore = 
    (normalizedVelocity * config.velocityWeight) +
    (normalizedDiversity * config.diversityWeight) +
    (normalizedSubstance * config.substanceWeight);
  
  // Apply decay and filter low-activity topics
  const finalScore = topic.activityCount >= config.minimumActivity 
    ? rawScore * decayFactor * 100
    : 0;
  
  return Math.round(finalScore * 100) / 100;
}

/**
 * Determines if an error should trigger a retry.
 * Network errors and 5xx server errors should retry, but 4xx client errors should not.
 */
function shouldRetry(error: unknown): boolean {
  if (!error) return true;
  
  const apiError = error as ApiError;
  if (!apiError.statusCode) return true; // Network errors should retry
  
  // Don't retry client errors (4xx), do retry server errors (5xx)
  return apiError.statusCode >= 500;
}

// ============================================================================
// React Query Hooks - Individual data fetching hooks
// ============================================================================

/**
 * Fetches and manages the community activity feed with pagination.
 * Automatically refetches every 30 seconds to provide near real-time updates.
 * Uses placeholder data to prevent UI flickering during pagination.
 */
export function useActivityFeed() {
  const { filters, currentPage, itemsPerPage, isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.activity(filters, currentPage),
    queryFn: () => communityApi.fetchActivityFeed(filters, currentPage, itemsPerPage),
    
    // Enable background refetching only when real-time is enabled
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.ACTIVITY : false,
    
    // Keep previous page data visible while fetching next page
    placeholderData: (previousData) => previousData,
    
    // Data is considered fresh for 20 seconds
    staleTime: 20000,
    
    // Retry up to 3 times for failed requests
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
    
    // Use exponential backoff for retries
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetches trending topics and calculates their scores client-side.
 * This allows for real-time score recalculation without server round-trips
 * when the trending algorithm configuration changes.
 */
export function useTrendingTopics() {
  const { trendingConfig, isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.trending(),
    queryFn: communityApi.fetchTrendingTopics,
    
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.TRENDING : false,
    staleTime: 30000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
    
    // Transform and sort topics by calculated trending score
    select: useCallback((data: TrendingTopic[]) => {
      return data
        .map(topic => ({
          ...topic,
          trendingScore: calculateTrendingScore(topic, trendingConfig)
        }))
        .sort((a, b) => b.trendingScore - a.trendingScore)
        .slice(0, 10); // Return only top 10 trending topics
    }, [trendingConfig]),
  });
}

/**
 * Fetches expert insights with client-side filtering and sorting.
 * Prioritizes insights with higher community validation scores.
 */
export function useExpertInsights() {
  const { filters, isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.insights(filters),
    queryFn: () => communityApi.fetchExpertInsights(filters),
    
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.INSIGHTS : false,
    staleTime: 30000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
    
    // Filter and sort insights client-side for immediate updates
    select: useCallback((data: ExpertInsight[]) => {
      let filtered = [...data];
      
      // Apply expert level filtering
      if (filters.expertLevel && filters.expertLevel.length > 0) {
        filtered = filtered.filter(insight =>
          filters.expertLevel!.includes(insight.verificationType as any)
        );
      }
      
      // Sort by validation score (highest first)
      filtered.sort((a, b) => 
        b.communityValidation.validationScore - a.communityValidation.validationScore
      );
      
      return filtered.slice(0, 10); // Top 10 insights
    }, [filters.expertLevel]),
  });
}

/**
 * Fetches active campaigns with automatic filtering.
 */
export function useCampaigns() {
  const { isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.campaigns(),
    queryFn: communityApi.fetchCampaigns,
    
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.CAMPAIGNS : false,
    staleTime: 60000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
    
    // Only show active campaigns
    select: (data) => data.filter(campaign => campaign.status === 'active'),
  });
}

/**
 * Fetches active petitions with automatic filtering.
 */
export function usePetitions() {
  const { isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.petitions(),
    queryFn: communityApi.fetchPetitions,
    
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.PETITIONS : false,
    staleTime: 60000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
    
    // Only show active petitions
    select: (data) => data.filter(petition => petition.status === 'active'),
  });
}

/**
 * Fetches community-wide statistics.
 */
export function useCommunityStats() {
  const { isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.stats(),
    queryFn: communityApi.fetchStats,
    
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.STATS : false,
    staleTime: 120000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
  });
}

/**
 * Fetches local impact metrics for the user's geographic area.
 */
export function useLocalImpact() {
  const { isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.localImpact(),
    queryFn: communityApi.fetchLocalImpact,
    
    refetchInterval: isRealTimeEnabled ? REFETCH_INTERVALS.LOCAL_IMPACT : false,
    staleTime: 120000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
  });
}

// ============================================================================
// Compound Hook - Aggregate all community data
// ============================================================================

/**
 * Convenience hook that aggregates all community data in one place.
 * Use this when you need multiple data sources in a single component.
 * For components that only need specific data, use individual hooks instead
 * to avoid unnecessary subscriptions and re-renders.
 */
export function useCommunityData() {
  const ui = useCommunityUI();
  
  // Fetch all data using individual hooks
  const activityFeed = useActivityFeed();
  const trendingTopics = useTrendingTopics();
  const expertInsights = useExpertInsights();
  const campaigns = useCampaigns();
  const petitions = usePetitions();
  const stats = useCommunityStats();
  const localImpact = useLocalImpact();

  // Compute aggregate loading and error states
  const aggregateState = useMemo(() => ({
    isAnyLoading: 
      activityFeed.isLoading || 
      trendingTopics.isLoading || 
      expertInsights.isLoading || 
      campaigns.isLoading || 
      petitions.isLoading || 
      stats.isLoading || 
      localImpact.isLoading,
    
    hasAnyError: !!(
      activityFeed.error || 
      trendingTopics.error || 
      expertInsights.error || 
      campaigns.error || 
      petitions.error || 
      stats.error || 
      localImpact.error
    ),
    
    // Array of all errors for detailed error reporting
    errors: [
      activityFeed.error,
      trendingTopics.error,
      expertInsights.error,
      campaigns.error,
      petitions.error,
      stats.error,
      localImpact.error,
    ].filter(Boolean) as ApiError[],
  }), [
    activityFeed.isLoading,
    activityFeed.error,
    trendingTopics.isLoading,
    trendingTopics.error,
    expertInsights.isLoading,
    expertInsights.error,
    campaigns.isLoading,
    campaigns.error,
    petitions.isLoading,
    petitions.error,
    stats.isLoading,
    stats.error,
    localImpact.isLoading,
    localImpact.error,
  ]);

  return {
    // UI state and controls
    ...ui,
    
    // Individual query results
    activityFeed,
    trendingTopics,
    expertInsights,
    campaigns,
    petitions,
    stats,
    localImpact,
    
    // Aggregate states
    ...aggregateState,
  };
}

// ============================================================================
// Real-Time Updates Hook
// ============================================================================

/**
 * Hook for handling real-time updates via WebSocket or Server-Sent Events.
 * This provides manual control over cache updates when real-time events occur,
 * allowing for instant UI updates without waiting for the next refetch interval.
 * 
 * Usage:
 * ```tsx
 * const { handleRealTimeUpdate } = useCommunityRealTimeUpdates();
 * 
 * useEffect(() => {
 *   const ws = new WebSocket('ws://...');
 *   ws.onmessage = (event) => {
 *     handleRealTimeUpdate(JSON.parse(event.data));
 *   };
 *   return () => ws.close();
 * }, []);
 * ```
 */
export function useCommunityRealTimeUpdates() {
  const queryClient = useQueryClient();

  const handleRealTimeUpdate = useCallback((update: { 
    type: string; 
    payload: any;
    timestamp?: string;
  }) => {
    const { type, payload } = update;
    
    switch (type) {
      case 'new_activity':
        // Invalidate all activity queries to trigger a refetch
        queryClient.invalidateQueries({ 
          queryKey: [...communityKeys.all, 'activity'] 
        });
        break;
        
      case 'trending_update':
        // Directly update the trending topics cache for instant update
        queryClient.setQueryData(
          communityKeys.trending(), 
          (old: TrendingTopic[] | undefined) => {
            if (!old) return [payload];
            // Merge new topic or update existing one
            const exists = old.find(t => t.id === payload.id);
            return exists
              ? old.map(t => t.id === payload.id ? payload : t)
              : [payload, ...old];
          }
        );
        break;
        
      case 'expert_insight':
        // Invalidate insights to refetch with new data
        queryClient.invalidateQueries({ 
          queryKey: [...communityKeys.all, 'insights'] 
        });
        break;
        
      case 'campaign_update':
        // Optimistically update specific campaign in cache
        queryClient.setQueryData(
          communityKeys.campaigns(),
          (old: Campaign[] | undefined) => {
            if (!old) return [payload];
            return old.map(campaign => 
              campaign.id === payload.id ? { ...campaign, ...payload } : campaign
            );
          }
        );
        break;
        
      case 'petition_signature':
        // Optimistically update petition signature count
        queryClient.setQueryData(
          communityKeys.petitions(),
          (old: Petition[] | undefined) => {
            if (!old) return [payload];
            return old.map(petition =>
              petition.id === payload.id 
                ? { 
                    ...petition, 
                    signatureCount: payload.signatureCount,
                    signatures: payload.signatures 
                  }
                : petition
            );
          }
        );
        break;
        
      case 'stats_update':
        // Directly update community stats
        queryClient.setQueryData(communityKeys.stats(), payload);
        break;
        
      case 'local_impact_update':
        // Update local impact metrics
        queryClient.setQueryData(communityKeys.localImpact(), payload);
        break;
        
      default:
        console.warn('Unknown real-time update type:', type);
    }
  }, [queryClient]);

  // Force refetch all community data
  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: communityKeys.all });
  }, [queryClient]);

  // Prefetch specific data to warm the cache
  const prefetchActivity = useCallback(async (
    filters: CommunityFilters, 
    page: number = 1,
    itemsPerPage: number = 20
  ) => {
    await queryClient.prefetchQuery({
      queryKey: communityKeys.activity(filters, page),
      queryFn: () => communityApi.fetchActivityFeed(filters, page, itemsPerPage),
      staleTime: 20000,
    });
  }, [queryClient]);

  return { 
    handleRealTimeUpdate, 
    refetchAll,
    prefetchActivity,
  };
}

// ============================================================================
// Query Client Configuration
// ============================================================================

/**
 * Creates a configured QueryClient instance for the app.
 * Centralizes all default query and mutation options.
 */
export function createCommunityQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Global defaults for all queries
        staleTime: 30000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      },
      mutations: {
        // Global defaults for all mutations
        retry: 1,
      },
    },
  });
}

// ============================================================================
// Exports
// ============================================================================

export { 
  useCommunityUI,
  communityApi as api,
};

export type { 
  CommunityUIContextValue,
  ApiError,
  PaginatedResponse,
};