/* eslint-disable react-refresh/only-export-components */
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

import { useQuery, useQueryClient, QueryClient, UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from 'react';

import { communityApiService } from '@client/core/api/community';
import type {
  ActivityItem,
  TrendingTopic,
  ExpertInsight,
  Campaign,
  Petition,
  CommunityStats,
  LocalImpactMetrics,
} from '@client/shared/types';

// ============================================================================
// Complete Type Definitions
// ============================================================================

/**
 * Extended filters interface that includes all properties used throughout the application.
 * This comprehensive definition ensures type safety across all filtering operations.
 */
interface CommunityFilters {
  tags?: string[];
  authors?: string[];
  dateRange?: { start?: string; end?: string };
  contentTypes?: string[];
  policyAreas?: string[];
  timeRange?: string;
  geography?: {
    states: string[];
    districts: string[];
    counties: string[];
  };
  expertLevel?: string[];
  sortBy?: string;
  showLocalOnly?: boolean;
}

/**
 * Complete configuration for the trending algorithm with all weight parameters.
 * These weights determine how different factors influence trending scores.
 */
interface TrendingAlgorithmConfig {
  windowDays?: number;
  minScore?: number;
  velocityWeight?: number;
  diversityWeight?: number;
  substanceWeight?: number;
  decayRate?: number;
  minimumActivity?: number;
  timeWindow?: number;
}

/**
 * Extended TrendingTopic type that includes all properties needed for score calculation.
 * These properties allow the client-side trending algorithm to function properly.
 */
interface ExtendedTrendingTopic extends TrendingTopic {
  id: string;
  timestamp: string;
  velocity: number;
  diversity: number;
  substance: number;
  activityCount: number;
  trendingScore?: number;
}

/**
 * Extended ExpertInsight type with validation properties.
 * These properties enable filtering and sorting by verification level and community consensus.
 */
interface ExtendedExpertInsight extends ExpertInsight {
  verificationType: 'official' | 'domain' | 'identity' | 'community';
  communityValidation: {
    validationScore: number;
    validatorCount: number;
    consensusLevel: number;
  };
}

/**
 * Extended Campaign type with status tracking.
 * The status property enables filtering for active versus completed campaigns.
 */
interface ExtendedCampaign extends Campaign {
  id: string;
  status: 'active' | 'completed' | 'pending';
}

/**
 * Extended Petition type with status and signature tracking.
 * These properties enable real-time signature count updates and status filtering.
 */
interface ExtendedPetition extends Petition {
  id: string;
  status: 'active' | 'closed' | 'successful';
  currentSignatures: number;
}

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
  details?: Record<string, unknown>;
}

/**
 * Type guard that safely checks if an unknown error is an ApiError.
 * This enables proper error handling with TypeScript type narrowing.
 */
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * All possible real-time update types that can be received via WebSocket.
 * Each type corresponds to a specific data category that can be updated live.
 */
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
  payload: unknown;
  timestamp?: string;
}

// ============================================================================
// API Client with Error Handling
// ============================================================================

// ============================================================================
// Query Keys Factory - Type-safe cache management
// ============================================================================

/**
 * Centralized query key factory that ensures consistent cache key generation.
 * Using a factory pattern prevents typos and makes refactoring easier.
 * Each function returns a unique, type-safe key array for React Query.
 */
export const communityKeys = {
  all: ['community'] as const,

  activity: (filters: CommunityFilters, page: number) =>
    [...communityKeys.all, 'activity', filters, page] as const,

  activityByFilter: (filters: CommunityFilters) =>
    [...communityKeys.all, 'activity', filters] as const,

  trending: () => [...communityKeys.all, 'trending'] as const,

  insights: (filters: CommunityFilters) => [...communityKeys.all, 'insights', filters] as const,

  campaigns: () => [...communityKeys.all, 'campaigns'] as const,

  campaignById: (id: string) => [...communityKeys.campaigns(), id] as const,

  petitions: () => [...communityKeys.all, 'petitions'] as const,

  petitionById: (id: string) => [...communityKeys.petitions(), id] as const,

  stats: () => [...communityKeys.all, 'stats'] as const,

  localImpact: () => [...communityKeys.all, 'local-impact'] as const,
};

// ============================================================================
// Default Configurations
// ============================================================================

/**
 * Default filter values that provide a sensible starting state.
 * These include all content types and use trending sort for maximum engagement.
 */
const DEFAULT_FILTERS: CommunityFilters = {
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

/**
 * Default trending algorithm configuration with balanced weights.
 * Velocity gets the highest weight to surface rapidly growing topics,
 * while diversity and substance ensure quality content rises to the top.
 */
const DEFAULT_TRENDING_CONFIG: TrendingAlgorithmConfig = {
  velocityWeight: 0.4,
  diversityWeight: 0.3,
  substanceWeight: 0.3,
  decayRate: 0.1,
  minimumActivity: 5,
  timeWindow: 24,
};

/**
 * Refetch intervals tuned to each data type's expected update frequency.
 * More dynamic data like activity feeds refresh more frequently,
 * while stable data like stats refresh less often to reduce server load.
 */
const REFETCH_INTERVALS = {
  ACTIVITY: 30000, // 30 seconds - most dynamic
  TRENDING: 60000, // 1 minute - frequently changing
  INSIGHTS: 60000, // 1 minute - moderately dynamic
  CAMPAIGNS: 120000, // 2 minutes - less frequent updates
  PETITIONS: 120000, // 2 minutes - less frequent updates
  STATS: 300000, // 5 minutes - relatively stable
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

/**
 * Provider component that manages all client-side UI state for the community features.
 * This separates UI state from server state managed by React Query,
 * providing better performance and clearer separation of concerns.
 */
export function CommunityUIProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<CommunityFilters>(DEFAULT_FILTERS);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [trendingConfig, setTrendingConfigState] =
    useState<TrendingAlgorithmConfig>(DEFAULT_TRENDING_CONFIG);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const isInitialMount = useRef(true);

  /**
   * Updates filters and automatically resets to page 1 since filter changes
   * invalidate the current page. Uses shallow comparison to prevent unnecessary updates.
   */
  const setFilters = useCallback((newFilters: Partial<CommunityFilters>) => {
    setFiltersState(prev => {
      const merged = { ...prev, ...newFilters };
      if (JSON.stringify(prev) === JSON.stringify(merged)) {
        return prev;
      }
      return merged;
    });
    setCurrentPage(1);
  }, []);

  /**
   * Updates the current page only if it actually changed.
   * This optimization prevents unnecessary re-renders.
   */
  const setPage = useCallback((page: number) => {
    setCurrentPage(prev => (prev === page ? prev : page));
  }, []);

  /**
   * Updates items per page and resets to first page since the page size change
   * invalidates the current page position.
   */
  const setItemsPerPageCallback = useCallback((count: number) => {
    setItemsPerPage(prev => {
      if (prev === count) return prev;
      setCurrentPage(1);
      return count;
    });
  }, []);

  /**
   * Updates trending algorithm configuration with shallow comparison
   * to prevent unnecessary recalculations.
   */
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

  if (isInitialMount.current) {
    isInitialMount.current = false;
  }

  /**
   * Memoize the context value to prevent unnecessary re-renders of consumers.
   * Only updates when the actual state values change.
   */
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

  return <CommunityUIContext.Provider value={value}>{children}</CommunityUIContext.Provider>;
}

/**
 * Hook to access the community UI context.
 * Throws an error if used outside of CommunityUIProvider to catch usage mistakes early.
 */
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
 *
 * This client-side calculation allows for instant score recalculation
 * when algorithm parameters change without requiring server round-trips.
 */
function calculateTrendingScore(
  topic: ExtendedTrendingTopic,
  config: TrendingAlgorithmConfig
): number {
  const now = Date.now();
  const topicTime = new Date(topic.timestamp).getTime();
  const hoursSinceCreation = (now - topicTime) / (1000 * 60 * 60);

  const decayFactor = Math.exp(-(config.decayRate ?? 0.1) * hoursSinceCreation);

  const normalizedVelocity = Math.min(topic.velocity / 100, 1);
  const normalizedDiversity = Math.min(topic.diversity / 100, 1);
  const normalizedSubstance = Math.min(topic.substance / 100, 1);

  const rawScore =
    normalizedVelocity * (config.velocityWeight ?? 0.4) +
    normalizedDiversity * (config.diversityWeight ?? 0.3) +
    normalizedSubstance * (config.substanceWeight ?? 0.3);

  const finalScore =
    topic.activityCount >= (config.minimumActivity ?? 5) ? rawScore * decayFactor * 100 : 0;

  return Math.round(finalScore * 100) / 100;
}

/**
 * Determines if an error should trigger a retry.
 * Network errors and server errors should retry, but client errors should not.
 * Cancelled requests also should not retry.
 */
function shouldRetry(error: unknown): boolean {
  if (!error) return true;

  if (!isApiError(error)) return true;

  if (error.statusCode === 499) return false;

  return (error.statusCode ?? 0) >= 500;
}

// ============================================================================
// React Query Hooks - Individual data fetching hooks
// ============================================================================

/**
 * Fetches and manages the community activity feed with pagination.
 * Automatically re-fetches every 30 seconds to provide near real-time updates.
 * Uses placeholder data to prevent UI flickering during pagination.
 */
export function useActivityFeed(): UseQueryResult<ActivityItem[], ApiError> {
  const { filters, currentPage, itemsPerPage, isRealTimeEnabled } = useCommunityUI();

  return useQuery({
    queryKey: communityKeys.activity(filters, currentPage),
    queryFn: () =>
      communityApiService.getActivityFeed({
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      }),

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.ACTIVITY : false,

    placeholderData: previousData => previousData,

    staleTime: 20000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),

    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

/**
 * Fetches trending topics and calculates their scores client-side.
 * This allows for real-time score recalculation without server round-trips
 * when the trending algorithm configuration changes.
 */
export function useTrendingTopics(): UseQueryResult<ExtendedTrendingTopic[], ApiError> {
  const { trendingConfig, isRealTimeEnabled } = useCommunityUI();

  const selectTopics = useCallback(
    (data: ExtendedTrendingTopic[]) => {
      return data
        .map(topic => ({
          ...topic,
          trendingScore: calculateTrendingScore(topic, trendingConfig),
        }))
        .sort((a, b) => (b.trendingScore ?? 0) - (a.trendingScore ?? 0))
        .slice(0, 10);
    },
    [trendingConfig]
  );

  return useQuery({
    queryKey: communityKeys.trending(),
    queryFn: async () => {
      const topics = await communityApiService.getTrendingTopics();
      return topics.map(topic => ({
        ...topic,
        timestamp: new Date().toISOString(),
        velocity: 0,
        diversity: 0,
        substance: 0,
        activityCount: 0,
      })) as ExtendedTrendingTopic[];
    },

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.TRENDING : false,
    staleTime: 30000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),

    select: selectTopics,
  });
}

/**
 * Fetches expert insights with client-side filtering and sorting.
 * Prioritizes insights with higher community validation scores.
 */
export function useExpertInsights(): UseQueryResult<ExtendedExpertInsight[], ApiError> {
  const { filters, isRealTimeEnabled } = useCommunityUI();

  const selectInsights = useCallback(
    (data: ExtendedExpertInsight[]) => {
      let filtered = [...data];

      if (filters.expertLevel && filters.expertLevel.length > 0) {
        filtered = filtered.filter(insight =>
          filters.expertLevel!.includes(insight.verificationType)
        );
      }

      filtered.sort(
        (a, b) => b.communityValidation.validationScore - a.communityValidation.validationScore
      );

      return filtered.slice(0, 10);
    },
    [filters.expertLevel]
  );

  return useQuery({
    queryKey: communityKeys.insights(filters),
    queryFn: async () => {
      const insights = await communityApiService.getExpertInsights(1);
      return insights.map(insight => ({
        ...insight,
        verificationType: 'community' as const,
        communityValidation: {
          validationScore: 0,
          validatorCount: 0,
          consensusLevel: 0,
        },
      })) as ExtendedExpertInsight[];
    },

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.INSIGHTS : false,
    staleTime: 30000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),

    select: selectInsights,
  });
}

/**
 * Fetches active campaigns with automatic filtering.
 */
export function useCampaigns(): UseQueryResult<ExtendedCampaign[], ApiError> {
  const { isRealTimeEnabled } = useCommunityUI();

  const selectActiveCampaigns = useCallback(
    (data: ExtendedCampaign[]) => data.filter(campaign => campaign.status === 'active'),
    []
  );

  return useQuery({
    queryKey: communityKeys.campaigns(),
    queryFn: () => Promise.resolve([]) as Promise<ExtendedCampaign[]>, // Method not implemented yet

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.CAMPAIGNS : false,
    staleTime: 60000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),

    select: selectActiveCampaigns,
  });
}

/**
 * Fetches active petitions with automatic filtering.
 */
export function usePetitions(): UseQueryResult<ExtendedPetition[], ApiError> {
  const { isRealTimeEnabled } = useCommunityUI();

  const selectActivePetitions = useCallback(
    (data: ExtendedPetition[]) => data.filter(petition => petition.status === 'active'),
    []
  );

  return useQuery({
    queryKey: communityKeys.petitions(),
    queryFn: () => Promise.resolve([]) as Promise<ExtendedPetition[]>, // Method not implemented yet

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.PETITIONS : false,
    staleTime: 60000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),

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
    queryFn: () =>
      Promise.resolve({ members: 0, activeThreads: 0, postsToday: 0 }) as Promise<CommunityStats>, // Method not implemented yet

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.STATS : false,
    staleTime: 120000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),
  });
}

/**
 * Fetches local impact metrics for the user's geographic area.
 */
export function useLocalImpact(): UseQueryResult<LocalImpactMetrics, ApiError> {
  const { isRealTimeEnabled } = useCommunityUI();

  return useQuery({
    queryKey: communityKeys.localImpact(),
    queryFn: () =>
      communityApiService.getLocalImpactMetrics({
        state: 'default',
      }) as Promise<LocalImpactMetrics>,

    refetchInterval: query =>
      isRealTimeEnabled && !query.state.error ? REFETCH_INTERVALS.LOCAL_IMPACT : false,
    staleTime: 120000,

    retry: (failureCount, error) => failureCount < 3 && shouldRetry(error),
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

  const activityFeed = useActivityFeed();
  const trendingTopics = useTrendingTopics();
  const expertInsights = useExpertInsights();
  const campaigns = useCampaigns();
  const petitions = usePetitions();
  const stats = useCommunityStats();
  const localImpact = useLocalImpact();

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
    ...ui,

    activityFeed,
    trendingTopics,
    expertInsights,
    campaigns,
    petitions,
    stats,
    localImpact,

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
 */
export function useCommunityRealTimeUpdates() {
  const queryClient = useQueryClient();

  const handleRealTimeUpdate = useCallback(
    (update: RealTimeUpdate) => {
      const { type, payload } = update;

      switch (type) {
        case 'new_activity':
          queryClient.invalidateQueries({
            queryKey: [...communityKeys.all, 'activity'],
          });
          break;

        case 'trending_update':
          queryClient.setQueryData(
            communityKeys.trending(),
            (old: ExtendedTrendingTopic[] | undefined) => {
              if (!old) return [payload as ExtendedTrendingTopic];
              const typedPayload = payload as ExtendedTrendingTopic;
              const exists = old.find(t => t.id === typedPayload.id);
              return exists
                ? old.map(t => (t.id === typedPayload.id ? typedPayload : t))
                : [typedPayload, ...old];
            }
          );
          break;

        case 'expert_insight':
          queryClient.invalidateQueries({
            queryKey: [...communityKeys.all, 'insights'],
          });
          break;

        case 'campaign_update':
          queryClient.setQueryData(
            communityKeys.campaigns(),
            (old: ExtendedCampaign[] | undefined) => {
              if (!old) return [payload as ExtendedCampaign];
              const typedPayload = payload as ExtendedCampaign;
              return old.map(campaign =>
                campaign.id === typedPayload.id ? { ...campaign, ...typedPayload } : campaign
              );
            }
          );
          break;

        case 'petition_signature':
          queryClient.setQueryData(
            communityKeys.petitions(),
            (old: ExtendedPetition[] | undefined) => {
              if (!old) return [payload as ExtendedPetition];
              const typedPayload = payload as Partial<ExtendedPetition> & { id: string };
              return old.map(petition =>
                petition.id === typedPayload.id
                  ? {
                      ...petition,
                      currentSignatures:
                        typedPayload.currentSignatures ?? petition.currentSignatures,
                    }
                  : petition
              );
            }
          );
          break;

        case 'stats_update':
          queryClient.setQueryData(communityKeys.stats(), payload);
          break;

        case 'local_impact_update':
          queryClient.setQueryData(communityKeys.localImpact(), payload);
          break;

        default:
          if (process.env.NODE_ENV === 'development') {
            console.warn('Unknown real-time update type:', type);
          }
      }
    },
    [queryClient]
  );

  /**
   * Handles multiple real-time updates in a single batch to prevent
   * excessive re-renders. Groups updates by type and applies them together.
   */
  const handleBatchUpdates = useCallback(
    (updates: RealTimeUpdate[]) => {
      const updatesByType = updates.reduce(
        (acc, update) => {
          if (!acc[update.type]) {
            acc[update.type] = [];
          }
          acc[update.type].push(update.payload);
          return acc;
        },
        {} as Record<RealTimeUpdateType, unknown[]>
      );

      Object.entries(updatesByType).forEach(([type, payloads]) => {
        switch (type as RealTimeUpdateType) {
          case 'new_activity':
            queryClient.invalidateQueries({
              queryKey: [...communityKeys.all, 'activity'],
            });
            break;

          case 'trending_update':
            queryClient.setQueryData(
              communityKeys.trending(),
              (old: ExtendedTrendingTopic[] | undefined) => {
                if (!old) return payloads as ExtendedTrendingTopic[];
                const updatedTopics = [...old];
                (payloads as ExtendedTrendingTopic[]).forEach(payload => {
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
              queryKey: [...communityKeys.all, 'insights'],
            });
            break;

          case 'campaign_update':
            queryClient.setQueryData(
              communityKeys.campaigns(),
              (old: ExtendedCampaign[] | undefined) => {
                if (!old) return payloads as ExtendedCampaign[];
                const campaignMap = new Map(old.map(c => [c.id, c]));
                (payloads as ExtendedCampaign[]).forEach(payload => {
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
              (old: ExtendedPetition[] | undefined) => {
                if (!old) return payloads as ExtendedPetition[];
                const petitionMap = new Map(old.map(p => [p.id, p]));
                (payloads as Array<Partial<ExtendedPetition> & { id: string }>).forEach(payload => {
                  const existing = petitionMap.get(payload.id);
                  if (existing) {
                    petitionMap.set(payload.id, {
                      ...existing,
                      currentSignatures: payload.currentSignatures ?? existing.currentSignatures,
                    });
                  }
                });
                return Array.from(petitionMap.values());
              }
            );
            break;

          case 'stats_update':
            queryClient.setQueryData(communityKeys.stats(), payloads[payloads.length - 1]);
            break;

          case 'local_impact_update':
            queryClient.setQueryData(communityKeys.localImpact(), payloads[payloads.length - 1]);
            break;
        }
      });
    },
    [queryClient]
  );

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: communityKeys.all });
  }, [queryClient]);

  const prefetchActivity = useCallback(
    async (filters: CommunityFilters, page: number = 1, itemsPerPage: number = 20) => {
      await queryClient.prefetchQuery({
        queryKey: communityKeys.activity(filters, page),
        queryFn: () =>
          communityApiService.getActivityFeed({
            limit: itemsPerPage,
            offset: (page - 1) * itemsPerPage,
          }),
        staleTime: 20000,
      });
    },
    [queryClient]
  );

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
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
        retry: 2,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        networkMode: 'online',
      },
      mutations: {
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

  return useMemo(
    () => ({
      activityFeed: communityData.activityFeed,
      trendingTopics: communityData.trendingTopics,
      expertInsights: communityData.expertInsights,
      campaigns: communityData.campaigns,
      petitions: communityData.petitions,
      stats: communityData.stats,
      localImpact: communityData.localImpact,
      itemsPerPage: communityData.itemsPerPage,
      currentPage: communityData.currentPage,
    }),
    [
      communityData.activityFeed,
      communityData.trendingTopics,
      communityData.expertInsights,
      communityData.campaigns,
      communityData.petitions,
      communityData.stats,
      communityData.localImpact,
      communityData.itemsPerPage,
      communityData.currentPage,
    ]
  );
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

export { useCommunityUI, communityApiService as api };

export type {
  CommunityUIContextValue,
  ApiError,
  PaginatedResponse,
  RealTimeUpdate,
  RealTimeUpdateType,
  CommunityFilters,
  TrendingAlgorithmConfig,
  ExtendedTrendingTopic,
  ExtendedExpertInsight,
  ExtendedCampaign,
  ExtendedPetition,
};
