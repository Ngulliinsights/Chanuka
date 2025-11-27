/**
 * Community State Management - React Query Implementation (Optimized)
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
 * 
 * Optimizations Applied:
 * - Eliminated redundant logging that could impact performance
 * - Improved type safety with stricter generics
 * - Enhanced error handling with better type guards
 * - Optimized query key generation for better cache hits
 * - Reduced unnecessary re-renders through better memoization
 * - Improved real-time update handling with batching support
 */

import {
  useQuery,
  useQueryClient,
  QueryClient,
  UseQueryResult
} from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
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
} from '@client/types/community';

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

// Type guard to check if an error is an ApiError
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

// Real-time update types for better type safety
type RealTimeUpdateType = 
  | 'new_activity'
  | 'trending_update'
  | 'expert_insight'
  | 'campaign_update'
  | 'petition_signature'
  | 'stats_update'
  | 'local_impact_update';

interface RealTimeUpdate {
  type: RealTimeUpdateType;
  payload: any;
  timestamp?: string;
}

// ============================================================================
// API Client with Error Handling
// ============================================================================

class CommunityApiClient {
  private baseUrl: string;
  private abortControllers: Map<string, AbortController>;
  
  constructor(baseUrl: string = '/api/community') {
    this.baseUrl = baseUrl;
    // Track abort controllers to enable request cancellation
    this.abortControllers = new Map();
  }

  /**
   * Creates a unique key for abort controller tracking
   */
  private getRequestKey(endpoint: string, options?: RequestInit): string {
    return `${endpoint}-${JSON.stringify(options?.body || '')}`;
  }

  /**
   * Cancels an in-flight request if it exists
   */
  public cancelRequest(endpoint: string, options?: RequestInit): void {
    const key = this.getRequestKey(endpoint, options);
    const controller = this.abortControllers.get(key);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(key);
    }
  }

  private async request<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<T> {
    const requestKey = this.getRequestKey(endpoint, options);
    
    // Cancel any existing request with the same key
    this.cancelRequest(endpoint, options);
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    this.abortControllers.set(requestKey, abortController);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        signal: abortController.signal,
      });

      // Clean up abort controller after request completes
      this.abortControllers.delete(requestKey);

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
      // Clean up on error
      this.abortControllers.delete(requestKey);
      
      // Don't throw on aborted requests - they're intentional
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw {
          message: 'Request cancelled',
          code: 'REQUEST_CANCELLED',
          statusCode: 499
        } as ApiError;
      }
      
      // Rethrow ApiError as-is, wrap other errors
      if (isApiError(error)) {
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
  ): Promise<ActivityItem[]> {
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

  /**
   * Cleanup method to abort all pending requests and clear the abort controllers map
   */
  cleanup(): void {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
  }
}

// Singleton instance for the entire app
const communityApi = new CommunityApiClient();

// ============================================================================
// Query Keys Factory - Type-safe cache management
// ============================================================================

/**
 * Centralized query key factory that ensures consistent cache key generation.
 * Using a factory pattern prevents typos and makes refactoring easier.
 */
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

  // Use refs to track if we're in the initial mount to avoid unnecessary operations
  const isInitialMount = useRef(true);
  
  // Memoized setter functions to prevent unnecessary re-renders
  const setFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    setFiltersState(prev => {
      // Only update if filters actually changed (shallow comparison)
      const merged = { ...prev, ...newFilters };
      if (JSON.stringify(prev) === JSON.stringify(merged)) {
        return prev;
      }
      return merged;
    });
    setCurrentPage(1); // Reset pagination when filters change
  }, []);

  const setPage = useCallback((page: number) => {
    setCurrentPage(prev => prev === page ? prev : page);
  }, []);

  const setItemsPerPageCallback = useCallback((count: number) => {
    setItemsPerPage(prev => {
      if (prev === count) return prev;
      setCurrentPage(1); // Reset to first page when changing page size
      return count;
    });
  }, []);

  const setTrendingConfig = useCallback((config: Partial<TrendingAlgorithmConfig>) => {
    setTrendingConfigState(prev => {
      const merged = { ...prev, ...config };
      if (JSON.stringify(prev) === JSON.stringify(merged)) {
        return prev;
      }
      return merged;
    });
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

  // Track when initial mount is complete
  if (isInitialMount.current) {
    isInitialMount.current = false;
  }

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

function useCommunityUI(): CommunityUIContextValue {
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
  
  if (!isApiError(error)) return true; // Network errors should retry
  
  // Don't retry cancelled requests
  if (error.statusCode === 499) return false;
  
  // Don't retry client errors (4xx), do retry server errors (5xx)
  return (error.statusCode ?? 0) >= 500;
}

// ============================================================================
// React Query Hooks - Individual data fetching hooks
// ============================================================================

/**
 * Fetches and manages the community activity feed with pagination.
 * Automatically refetches every 30 seconds to provide near real-time updates.
 * Uses placeholder data to prevent UI flickering during pagination.
 */
export function useActivityFeed(): UseQueryResult<ActivityItem[], ApiError> {
   const { filters, currentPage, itemsPerPage, isRealTimeEnabled } = useCommunityUI();

   return useQuery({
     queryKey: communityKeys.activity(filters, currentPage),
     queryFn: () => communityApi.fetchActivityFeed(filters, currentPage, itemsPerPage),

     // Enable background refetching only when real-time is enabled and no errors
     refetchInterval: (query) =>
       isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.ACTIVITY : false,

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
export function useTrendingTopics(): UseQueryResult<TrendingTopic[], ApiError> {
   const { trendingConfig, isRealTimeEnabled } = useCommunityUI();

   // Memoize the select function to prevent recalculation on every render
   const selectTopics = useCallback((data: TrendingTopic[]) => {
     return data
       .map(topic => ({
         ...topic,
         trendingScore: calculateTrendingScore(topic, trendingConfig)
       }))
       .sort((a, b) => b.trendingScore - a.trendingScore)
       .slice(0, 10); // Return only top 10 trending topics
   }, [trendingConfig]);

   return useQuery({
     queryKey: communityKeys.trending(),
     queryFn: communityApi.fetchTrendingTopics,

     refetchInterval: (query) =>
       isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.TRENDING : false,
     staleTime: 30000,

     retry: (failureCount, error) =>
       failureCount < 3 && shouldRetry(error),

     // Transform and sort topics by calculated trending score
     select: selectTopics,
   });
 }

/**
 * Fetches expert insights with client-side filtering and sorting.
 * Prioritizes insights with higher community validation scores.
 */
export function useExpertInsights(): UseQueryResult<ExpertInsight[], ApiError> {
   const { filters, isRealTimeEnabled } = useCommunityUI();

   // Memoize the select function to prevent recalculation on every render
   const selectInsights = useCallback((data: ExpertInsight[]) => {
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
   }, [filters.expertLevel]);

   return useQuery({
     queryKey: communityKeys.insights(filters),
     queryFn: () => communityApi.fetchExpertInsights(filters),

     refetchInterval: (query) =>
       isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.INSIGHTS : false,
     staleTime: 30000,

     retry: (failureCount, error) =>
       failureCount < 3 && shouldRetry(error),

     // Filter and sort insights client-side for immediate updates
     select: selectInsights,
   });
 }

/**
 * Fetches active campaigns with automatic filtering.
 */
export function useCampaigns(): UseQueryResult<Campaign[], ApiError> {
   const { isRealTimeEnabled } = useCommunityUI();

   // Memoize the select function
   const selectActiveCampaigns = useCallback((data: Campaign[]) =>
     data.filter(campaign => campaign.status === 'active'), []
   );

   return useQuery({
     queryKey: communityKeys.campaigns(),
     queryFn: communityApi.fetchCampaigns,

     refetchInterval: (query) =>
       isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.CAMPAIGNS : false,
     staleTime: 60000,

     retry: (failureCount, error) =>
       failureCount < 3 && shouldRetry(error),

     // Only show active campaigns
     select: selectActiveCampaigns,
   });
 }

/**
 * Fetches active petitions with automatic filtering.
 */
export function usePetitions(): UseQueryResult<Petition[], ApiError> {
  const { isRealTimeEnabled } = useCommunityUI();

  // Memoize the select function
  const selectActivePetitions = useCallback((data: Petition[]) =>
    data.filter(petition => petition.status === 'active'), []
  );

  return useQuery({
    queryKey: communityKeys.petitions(),
    queryFn: communityApi.fetchPetitions,

    refetchInterval: (query) =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.PETITIONS : false,
    staleTime: 60000,

    retry: (failureCount, error) =>
      failureCount < 3 && shouldRetry(error),

    // Only show active petitions
    select: selectActivePetitions,
  });
}

/**
 * Fetches community-wide statistics.
 */
export function useCommunityStats(): UseQueryResult<CommunityStats, ApiError> {
  const { isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.stats(),
    queryFn: communityApi.fetchStats,
    
    refetchInterval: (query) =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.STATS : false,
    staleTime: 120000,
    
    retry: (failureCount, error) => 
      failureCount < 3 && shouldRetry(error),
  });
}

/**
 * Fetches local impact metrics for the user's geographic area.
 */
export function useLocalImpact(): UseQueryResult<LocalImpactMetrics, ApiError> {
  const { isRealTimeEnabled } = useCommunityUI();
  
  return useQuery({
    queryKey: communityKeys.localImpact(),
    queryFn: communityApi.fetchLocalImpact,
    
    refetchInterval: (query) =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.LOCAL_IMPACT : false,
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

  // Compute aggregate loading and error states with better memoization
  const aggregateState = useMemo(() => {
    const errors = [
      activityFeed.error,
      trendingTopics.error,
      expertInsights.error,
      campaigns.error,
      petitions.error,
      stats.error,
      localImpact.error,
    ].filter((error): error is ApiError => error !== null && error !== undefined);

    return {
      isAnyLoading: 
        activityFeed.isLoading || 
        trendingTopics.isLoading || 
        expertInsights.isLoading || 
        campaigns.isLoading || 
        petitions.isLoading || 
        stats.isLoading || 
        localImpact.isLoading,
      
      hasAnyError: errors.length > 0,
      
      // Array of all errors for detailed error reporting
      errors,
    };
  }, [
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
 * Includes batching support to prevent excessive re-renders when many updates
 * arrive in quick succession.
 * 
 * Usage:
 * ```tsx
 * const { handleRealTimeUpdate, handleBatchUpdates } = useCommunityRealTimeUpdates();
 * 
 * useEffect(() => {
 *   const ws = new WebSocket('ws://...');
 *   const updateBuffer: RealTimeUpdate[] = [];
 *   
 *   ws.onmessage = (event) => {
 *     updateBuffer.push(JSON.parse(event.data));
 *     // Flush buffer every 100ms to batch updates
 *     if (updateBuffer.length === 1) {
 *       setTimeout(() => {
 *         handleBatchUpdates(updateBuffer);
 *         updateBuffer.length = 0;
 *       }, 100);
 *     }
 *   };
 *   return () => ws.close();
 * }, []);
 * ```
 */
export function useCommunityRealTimeUpdates() {
  const queryClient = useQueryClient();

  const handleRealTimeUpdate = useCallback((update: RealTimeUpdate) => {
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
        // Log unknown types in development only
        if (process.env.NODE_ENV === 'development') {
          console.warn('Unknown real-time update type:', type);
        }
    }
  }, [queryClient]);

  /**
   * Handles multiple real-time updates in a single batch to prevent
   * excessive re-renders. Groups updates by type and applies them together.
   */
  const handleBatchUpdates = useCallback((updates: RealTimeUpdate[]) => {
    // Group updates by type for more efficient processing
    const updatesByType = updates.reduce((acc, update) => {
      if (!acc[update.type]) {
        acc[update.type] = [];
      }
      acc[update.type].push(update.payload);
      return acc;
    }, {} as Record<RealTimeUpdateType, any[]>);

    // Process each type of update once
    Object.entries(updatesByType).forEach(([type, payloads]) => {
      switch (type as RealTimeUpdateType) {
        case 'new_activity':
          queryClient.invalidateQueries({
            queryKey: [...communityKeys.all, 'activity']
          });
          break;

        case 'trending_update':
          queryClient.setQueryData(
            communityKeys.trending(),
            (old: TrendingTopic[] | undefined) => {
              if (!old) return payloads;
              const updatedTopics = [...old];
              payloads.forEach(payload => {
                const index = updatedTopics.findIndex(t => t.id === payload.id);
                if (index >= 0) {
                  updatedTopics[index] = payload;
                } else {
                  updatedTopics.push(payload);
                }
              });
              return updatedTopics;
            }
          );
          break;

        case 'expert_insight':
          queryClient.invalidateQueries({
            queryKey: [...communityKeys.all, 'insights']
          });
          break;

        case 'campaign_update':
          queryClient.setQueryData(
            communityKeys.campaigns(),
            (old: Campaign[] | undefined) => {
              if (!old) return payloads;
              const campaignMap = new Map(old.map(c => [c.id, c]));
              payloads.forEach(payload => {
                const existing = campaignMap.get(payload.id);
                campaignMap.set(payload.id, existing ? { ...existing, ...payload } : payload);
              });
              return Array.from(campaignMap.values());
            }
          );
          break;

        case 'petition_signature':
          queryClient.setQueryData(
            communityKeys.petitions(),
            (old: Petition[] | undefined) => {
              if (!old) return payloads;
              const petitionMap = new Map(old.map(p => [p.id, p]));
              payloads.forEach(payload => {
                const existing = petitionMap.get(payload.id);
                if (existing) {
                  petitionMap.set(payload.id, {
                    ...existing,
                    currentSignatures: payload.currentSignatures
                  });
                }
              });
              return Array.from(petitionMap.values());
            }
          );
          break;

        case 'stats_update':
          // Take the most recent stats update
          queryClient.setQueryData(communityKeys.stats(), payloads[payloads.length - 1]);
          break;

        case 'local_impact_update':
          // Take the most recent local impact update
          queryClient.setQueryData(communityKeys.localImpact(), payloads[payloads.length - 1]);
          break;
      }
    });
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
    handleBatchUpdates,
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
        // Add network mode for better offline handling
        networkMode: 'online',
      },
      mutations: {
        // Global defaults for all mutations
        retry: 1,
        networkMode: 'online',
      },
    },
  });
}

// ============================================================================
// Backwards Compatibility Layer
// ============================================================================

/**
 * Hook that provides stable references to community data selectors.
 * This prevents unnecessary re-renders by memoizing the returned object.
 */
export function useCommunitySelectors() {
  const communityData = useCommunityData();

  return useMemo(() => ({
    activityFeed: communityData.activityFeed,
    trendingTopics: communityData.trendingTopics,
    expertInsights: communityData.expertInsights,
    campaigns: communityData.campaigns,
    petitions: communityData.petitions,
    stats: communityData.stats,
    localImpact: communityData.localImpact,
    // Computed values with stable references
    itemsPerPage: communityData.itemsPerPage,
    currentPage: communityData.currentPage,
  }), [
    communityData.activityFeed,
    communityData.trendingTopics,
    communityData.expertInsights,
    communityData.campaigns,
    communityData.petitions,
    communityData.stats,
    communityData.localImpact,
    communityData.itemsPerPage,
    communityData.currentPage,
  ]);
}

/**
 * Legacy hook for backwards compatibility - now delegates to useCommunityUI
 */
export function useCommunityStore() {
  return useCommunityUI();
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
  RealTimeUpdate,
  RealTimeUpdateType,
};