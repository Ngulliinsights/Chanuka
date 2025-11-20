/**
 * Mock Data Loaders and Caching
 * 
 * Provides data loading strategies, caching mechanisms, and error handling
 * for mock data integration throughout the application.
 */

import { logger } from '@client/utils/logger';

// Import all mock data
import { mockBills, mockBillsStats } from './bills';
import { mockUsers, mockExpertUsers, mockModeratorUsers, mockCurrentUser } from './users';
import { mockExperts, mockOfficialExperts, mockExpertCredibilityMetrics } from './experts';
import { 
  mockActivityItems, 
  mockTrendingTopics, 
  mockExpertInsights, 
  mockCampaigns, 
  mockPetitions, 
  mockCommunityStats,
  mockLocalImpactMetrics 
} from './community';
import { 
  mockDiscussionThreads, 
  mockComments, 
  mockCommentReports, 
  mockModerationActions,
  mockTypingIndicators 
} from './discussions';
import {
  mockLiveEngagementMetrics,
  mockPersonalEngagementScore,
  mockCommunitysentimentAnalysis,
  mockExpertVerificationMetrics,
  mockEngagementStatistics,
  mockTemporalAnalyticsData,
  mockUserEngagementProfile,
  mockCivicEngagementGoals,
  mockEngagementNotifications
} from './analytics';
import { mockRealTimeEvents, mockConnectionStatus } from './realtime';

/**
 * Cache configuration
 */
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached items
}

/**
 * Cache entry
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Simple in-memory cache implementation
 */
class MockDataCache {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private maxSize = 100;

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Global cache instance
 */
const cache = new MockDataCache();

/**
 * Loading state management
 */
interface LoadingState {
  isLoading: boolean;
  error: string | null;
  lastLoaded: string | null;
}

const loadingStates = new Map<string, LoadingState>();

/**
 * Set loading state
 */
const setLoadingState = (key: string, state: Partial<LoadingState>): void => {
  const currentState = loadingStates.get(key) || {
    isLoading: false,
    error: null,
    lastLoaded: null
  };
  
  loadingStates.set(key, { ...currentState, ...state });
};

/**
 * Get loading state
 */
const getLoadingState = (key: string): LoadingState => {
  return loadingStates.get(key) || {
    isLoading: false,
    error: null,
    lastLoaded: null
  };
};

/**
 * Simulate network delay
 */
const simulateNetworkDelay = (min: number = 100, max: number = 500): Promise<void> => {
  const delay = Math.random() * (max - min) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Simulate network errors
 */
const simulateNetworkError = (errorRate: number = 0.05): void => {
  if (Math.random() < errorRate) {
    throw new Error('Simulated network error');
  }
};

/**
 * Generic data loader with caching and error handling
 */
const createDataLoader = <T>(
  key: string,
  dataProvider: () => T,
  options: {
    cacheTTL?: number;
    errorRate?: number;
    minDelay?: number;
    maxDelay?: number;
  } = {}
) => {
  return async (): Promise<T> => {
    const cacheKey = `loader_${key}`;
    
    // Check cache first
    const cachedData = cache.get<T>(cacheKey);
    if (cachedData) {
      logger.debug(`Cache hit for ${key}`, { component: 'MockDataLoader' });
      return cachedData;
    }

    // Set loading state
    setLoadingState(key, { isLoading: true, error: null });

    try {
      // Simulate network delay
      await simulateNetworkDelay(options.minDelay, options.maxDelay);
      
      // Simulate potential network errors
      simulateNetworkError(options.errorRate);
      
      // Get data
      const data = dataProvider();
      
      // Cache the data
      cache.set(cacheKey, data, options.cacheTTL);
      
      // Update loading state
      setLoadingState(key, {
        isLoading: false,
        error: null,
        lastLoaded: new Date().toISOString()
      });

      logger.info(`Data loaded successfully for ${key}`, { 
        component: 'MockDataLoader',
        dataSize: Array.isArray(data) ? data.length : 1
      });

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      setLoadingState(key, {
        isLoading: false,
        error: errorMessage,
        lastLoaded: null
      });

      logger.error(`Failed to load data for ${key}`, {
        component: 'MockDataLoader',
        error: errorMessage
      });

      throw error;
    }
  };
};

/**
 * Data loaders for different data types
 */
export const dataLoaders = {
  // Bills data
  bills: createDataLoader('bills', () => mockBills, { cacheTTL: 2 * 60 * 1000 }),
  billsStats: createDataLoader('billsStats', () => mockBillsStats, { cacheTTL: 1 * 60 * 1000 }),
  
  // User data
  users: createDataLoader('users', () => mockUsers),
  expertUsers: createDataLoader('expertUsers', () => mockExpertUsers),
  moderatorUsers: createDataLoader('moderatorUsers', () => mockModeratorUsers),
  currentUser: createDataLoader('currentUser', () => mockCurrentUser),
  
  // Expert data
  experts: createDataLoader('experts', () => mockExperts),
  officialExperts: createDataLoader('officialExperts', () => mockOfficialExperts),
  expertCredibilityMetrics: createDataLoader('expertCredibilityMetrics', () => mockExpertCredibilityMetrics),
  
  // Community data
  activityItems: createDataLoader('activityItems', () => mockActivityItems, { cacheTTL: 30 * 1000 }),
  trendingTopics: createDataLoader('trendingTopics', () => mockTrendingTopics, { cacheTTL: 1 * 60 * 1000 }),
  expertInsights: createDataLoader('expertInsights', () => mockExpertInsights),
  campaigns: createDataLoader('campaigns', () => mockCampaigns),
  petitions: createDataLoader('petitions', () => mockPetitions),
  communityStats: createDataLoader('communityStats', () => mockCommunityStats, { cacheTTL: 30 * 1000 }),
  localImpactMetrics: createDataLoader('localImpactMetrics', () => mockLocalImpactMetrics),
  
  // Discussion data
  discussionThreads: createDataLoader('discussionThreads', () => mockDiscussionThreads),
  comments: createDataLoader('comments', () => mockComments),
  commentReports: createDataLoader('commentReports', () => mockCommentReports),
  moderationActions: createDataLoader('moderationActions', () => mockModerationActions),
  typingIndicators: createDataLoader('typingIndicators', () => mockTypingIndicators, { cacheTTL: 10 * 1000 }),
  
  // Analytics data
  liveEngagementMetrics: createDataLoader('liveEngagementMetrics', () => mockLiveEngagementMetrics, { cacheTTL: 30 * 1000 }),
  personalEngagementScore: createDataLoader('personalEngagementScore', () => mockPersonalEngagementScore),
  communitysentimentAnalysis: createDataLoader('communitysentimentAnalysis', () => mockCommunitysentimentAnalysis, { cacheTTL: 1 * 60 * 1000 }),
  expertVerificationMetrics: createDataLoader('expertVerificationMetrics', () => mockExpertVerificationMetrics),
  engagementStatistics: createDataLoader('engagementStatistics', () => mockEngagementStatistics),
  temporalAnalyticsData: createDataLoader('temporalAnalyticsData', () => mockTemporalAnalyticsData),
  userEngagementProfile: createDataLoader('userEngagementProfile', () => mockUserEngagementProfile),
  civicEngagementGoals: createDataLoader('civicEngagementGoals', () => mockCivicEngagementGoals),
  engagementNotifications: createDataLoader('engagementNotifications', () => mockEngagementNotifications, { cacheTTL: 30 * 1000 }),
  
  // Real-time data
  realTimeEvents: createDataLoader('realTimeEvents', () => mockRealTimeEvents, { cacheTTL: 10 * 1000 }),
  connectionStatus: createDataLoader('connectionStatus', () => mockConnectionStatus, { cacheTTL: 5 * 1000 })
};

/**
 * Batch data loader for loading multiple data types
 */
export const loadBatchData = async (keys: (keyof typeof dataLoaders)[]): Promise<Record<string, any>> => {
  const results: Record<string, any> = {};
  const promises = keys.map(async (key) => {
    try {
      results[key] = await dataLoaders[key]();
    } catch (error) {
      logger.error(`Failed to load ${key} in batch`, { 
        component: 'MockDataLoader',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      results[key] = null;
    }
  });

  await Promise.all(promises);
  return results;
};

/**
 * Initialize all essential data
 */
export const initializeEssentialData = async (): Promise<void> => {
  const essentialKeys: (keyof typeof dataLoaders)[] = [
    'bills',
    'billsStats',
    'currentUser',
    'communityStats',
    'liveEngagementMetrics'
  ];

  logger.info('Initializing essential mock data', { 
    component: 'MockDataLoader',
    keys: essentialKeys
  });

  try {
    await loadBatchData(essentialKeys);
    logger.info('Essential mock data initialized successfully', { 
      component: 'MockDataLoader'
    });
  } catch (error) {
    logger.error('Failed to initialize essential mock data', {
      component: 'MockDataLoader',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

/**
 * Preload data for better performance
 */
export const preloadData = async (keys: (keyof typeof dataLoaders)[]): Promise<void> => {
  logger.info('Preloading mock data', { 
    component: 'MockDataLoader',
    keys
  });

  // Load data in background without waiting
  keys.forEach(key => {
    dataLoaders[key]().catch(error => {
      logger.warn(`Failed to preload ${key}`, {
        component: 'MockDataLoader',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    });
  });
};

/**
 * Clear all cached data
 */
export const clearCache = (): void => {
  cache.clear();
  loadingStates.clear();
  logger.info('Mock data cache cleared', { component: 'MockDataLoader' });
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: cache.size(),
    loadingStates: Array.from(loadingStates.entries()).map(([key, state]) => ({
      key,
      ...state
    }))
  };
};

/**
 * Validate data integrity
 */
export const validateDataIntegrity = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  try {
    // Check bills data
    if (!mockBills || mockBills.length === 0) {
      errors.push('Bills data is empty or invalid');
    }

    // Check users data
    if (!mockUsers || mockUsers.length === 0) {
      errors.push('Users data is empty or invalid');
    }

    // Check experts data
    if (!mockExperts || mockExperts.length === 0) {
      errors.push('Experts data is empty or invalid');
    }

    // Check community data
    if (!mockActivityItems || mockActivityItems.length === 0) {
      errors.push('Activity items data is empty or invalid');
    }

    // Check discussion data
    if (!mockDiscussionThreads || Object.keys(mockDiscussionThreads).length === 0) {
      errors.push('Discussion threads data is empty or invalid');
    }

    logger.info('Data integrity validation completed', {
      component: 'MockDataLoader',
      valid: errors.length === 0,
      errorCount: errors.length
    });

    return {
      valid: errors.length === 0,
      errors
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Validation error: ${errorMessage}`);
    
    return {
      valid: false,
      errors
    };
  }
};

/**
 * Export loading state utilities
 */
export const loadingStateUtils = {
  getLoadingState,
  setLoadingState
};