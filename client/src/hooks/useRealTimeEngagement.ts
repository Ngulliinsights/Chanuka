/**
 * Real-Time Engagement Analytics Hook
 * 
 * Manages real-time engagement data, WebSocket subscriptions,
 * and analytics state for the engagement dashboard.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { logger } from '@client/utils/logger';

import {
  LiveEngagementMetrics,
  PersonalEngagementScore,
  CommunitysentimentAnalysis,
  ExpertVerificationMetrics,
  EngagementStatistics,
  TemporalAnalyticsData,
  RealTimeEngagementUpdate,
  EngagementAnalyticsConfig
} from '../types/engagement-analytics';

import { useWebSocket } from './useWebSocket';

interface RealTimeEngagementData {
  liveMetrics: LiveEngagementMetrics;
  personalScore: PersonalEngagementScore;
  sentiment: CommunitysentimentAnalysis;
  expertMetrics: ExpertVerificationMetrics;
  stats: EngagementStatistics;
  temporal: TemporalAnalyticsData;
}

interface UseRealTimeEngagementOptions {
  billId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableRealTime?: boolean;
}

interface UseRealTimeEngagementReturn {
  data: RealTimeEngagementData | null;
  loading: boolean;
  error: string | null;
  isConnected: boolean;
  lastUpdated: string | null;
  refresh: () => Promise<void>;
  exportData: (format: 'json' | 'csv') => Promise<void>;
  updateConfig: (config: Partial<EngagementAnalyticsConfig>) => void;
}

const DEFAULT_CONFIG: EngagementAnalyticsConfig = {
  updateInterval: 30000, // 30 seconds
  enableRealTime: true,
  enableNotifications: true,
  gamificationEnabled: true,
  sentimentAnalysisEnabled: true
};

export function useRealTimeEngagement(
  options: UseRealTimeEngagementOptions = {}
): UseRealTimeEngagementReturn {
  const {
    billId,
    autoRefresh = true,
    refreshInterval = 30000,
    enableRealTime = true
  } = options;

  const [data, setData] = useState<RealTimeEngagementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [config, setConfig] = useState<EngagementAnalyticsConfig>(DEFAULT_CONFIG);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // WebSocket integration
  const { 
    isConnected, 
    addMessageHandler, 
    sendMessage,
    subscribeToBill,
    unsubscribeFromBill
  } = useWebSocket({
    autoConnect: enableRealTime,
    token: localStorage.getItem('token') || undefined
  });

  // Handle real-time updates
  const handleRealTimeUpdate = useCallback((message: any) => {
    if (!isMountedRef.current) return;

    try {
      const update: RealTimeEngagementUpdate = message;
      
      setData(prevData => {
        if (!prevData) return prevData;

        const updatedData = { ...prevData };

        // Update live metrics
        if (update.data.liveMetrics) {
          updatedData.liveMetrics = {
            ...updatedData.liveMetrics,
            ...update.data.liveMetrics,
            lastUpdated: update.timestamp
          };
        }

        // Update sentiment data
        if (update.data.sentiment) {
          updatedData.sentiment = {
            ...updatedData.sentiment,
            ...update.data.sentiment
          };
        }

        // Update expert metrics
        if (update.data.expertMetrics) {
          updatedData.expertMetrics = {
            ...updatedData.expertMetrics,
            ...update.data.expertMetrics
          };
        }

        // Update engagement stats
        if (update.data.stats) {
          updatedData.stats = {
            ...updatedData.stats,
            ...update.data.stats
          };
        }

        return updatedData;
      });

      setLastUpdated(update.timestamp);
      logger.info('Real-time engagement update received:', { component: 'Chanuka' }, update.type);
    } catch (err) {
      logger.error('Failed to process real-time update:', { component: 'Chanuka' }, err);
    }
  }, []);

  // Set up WebSocket message handler
  useEffect(() => {
    if (!isConnected || !enableRealTime) return;

    const cleanup = addMessageHandler('engagement-analytics', (message) => {
      if (message.type === 'engagement_update' || 
          message.type === 'sentiment_update' ||
          message.type === 'expert_update' ||
          message.type === 'leaderboard_update') {
        handleRealTimeUpdate(message);
      }
    });

    // Subscribe to engagement analytics channel
    sendMessage({
      type: 'subscribe',
      data: { 
        channel: 'engagement_analytics',
        billId: billId || null
      }
    });

    // Subscribe to specific bill if provided
    if (billId) {
      subscribeToBill(billId);
    }

    return () => {
      cleanup();
      if (billId) {
        unsubscribeFromBill(billId);
      }
    };
  }, [isConnected, enableRealTime, billId, addMessageHandler, sendMessage, subscribeToBill, unsubscribeFromBill, handleRealTimeUpdate]);

  // Load engagement data from API
  const loadEngagementData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = billId 
        ? `/api/engagement/analytics/${billId}`
        : '/api/engagement/analytics';

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load engagement data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (isMountedRef.current) {
        setData(result.data);
        setLastUpdated(new Date().toISOString());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load engagement data';
      if (isMountedRef.current) {
        setError(errorMessage);
      }
      logger.error('Failed to load engagement analytics:', { component: 'Chanuka' }, err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [billId]);

  // Refresh data
  const refresh = useCallback(async () => {
    await loadEngagementData();
  }, [loadEngagementData]);

  // Export data
  const exportData = useCallback(async (format: 'json' | 'csv') => {
    try {
      const endpoint = billId 
        ? `/api/engagement/analytics/${billId}/export`
        : '/api/engagement/analytics/export';

      const response = await fetch(`${endpoint}?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `engagement-analytics-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Export failed');
      }
    } catch (err) {
      logger.error('Export failed:', { component: 'Chanuka' }, err);
      throw err;
    }
  }, [billId]);

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<EngagementAnalyticsConfig>) => {
    setConfig(prevConfig => ({
      ...prevConfig,
      ...newConfig
    }));
  }, []);

  // Set up auto-refresh
  useEffect(() => {
    if (!autoRefresh || !config.enableRealTime) return;

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          loadEngagementData().then(scheduleRefresh);
        }
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, config.enableRealTime, refreshInterval, loadEngagementData]);

  // Initial data load
  useEffect(() => {
    loadEngagementData();
  }, [loadEngagementData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    isConnected: isConnected && enableRealTime,
    lastUpdated,
    refresh,
    exportData,
    updateConfig
  };
}

// Mock data generator for development/testing
export function generateMockEngagementData(): RealTimeEngagementData {
  const now = new Date();
  
  return {
    liveMetrics: {
      communityApproval: 0.73,
      totalParticipants: 1247,
      expertSupport: 0.68,
      activeDiscussions: 23,
      lastUpdated: now.toISOString()
    },
    personalScore: {
      totalScore: 2847,
      breakdown: {
        participation: 850,
        quality: 920,
        expertise: 567,
        community: 510
      },
      rank: 42,
      totalUsers: 5432,
      trend: 'up',
      methodology: {
        description: 'Your civic engagement score is calculated based on participation frequency, contribution quality, expertise recognition, and community impact.',
        factors: [
          {
            name: 'Participation',
            weight: 0.3,
            description: 'Regular engagement with bills and discussions',
            currentScore: 850
          },
          {
            name: 'Quality',
            weight: 0.35,
            description: 'Quality of contributions as rated by community',
            currentScore: 920
          },
          {
            name: 'Expertise',
            weight: 0.2,
            description: 'Recognition as subject matter expert',
            currentScore: 567
          },
          {
            name: 'Community Impact',
            weight: 0.15,
            description: 'Influence on community discussions and decisions',
            currentScore: 510
          }
        ]
      }
    },
    sentiment: {
      overall: 'positive',
      distribution: {
        positive: 0.58,
        neutral: 0.31,
        negative: 0.11
      },
      trending: [
        {
          topic: 'Healthcare Reform',
          sentiment: 'positive',
          change: 12.5,
          volume: 342
        },
        {
          topic: 'Education Funding',
          sentiment: 'neutral',
          change: -3.2,
          volume: 189
        }
      ],
      polls: [
        {
          id: 'poll-1',
          question: 'Do you support the proposed healthcare bill?',
          responses: 1834,
          results: [
            { option: 'Strongly Support', votes: 687, percentage: 37.4 },
            { option: 'Somewhat Support', votes: 423, percentage: 23.1 },
            { option: 'Neutral', votes: 298, percentage: 16.2 },
            { option: 'Somewhat Oppose', votes: 234, percentage: 12.8 },
            { option: 'Strongly Oppose', votes: 192, percentage: 10.5 }
          ],
          endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
        }
      ]
    },
    expertMetrics: {
      totalExperts: 127,
      activeExperts: 34,
      averageCredibility: 8.3,
      verificationStats: {
        official: 23,
        domain: 67,
        identity: 37
      },
      topExperts: [
        {
          id: 'expert-1',
          name: 'Dr. Sarah Johnson',
          credibilityScore: 9.4,
          specializations: ['Healthcare Policy', 'Public Health'],
          recentContributions: 12,
          communityRating: 4.8
        },
        {
          id: 'expert-2',
          name: 'Prof. Michael Chen',
          credibilityScore: 9.1,
          specializations: ['Education Policy', 'Economics'],
          recentContributions: 8,
          communityRating: 4.7
        }
      ]
    },
    stats: {
      leaderboard: [
        {
          userId: 'user-1',
          username: 'CivicChampion',
          score: 4521,
          rank: 1,
          badge: 'legendary',
          contributions: { comments: 234, votes: 1456, shares: 89 }
        },
        {
          userId: 'user-2',
          username: 'PolicyWatcher',
          score: 3987,
          rank: 2,
          badge: 'epic',
          contributions: { comments: 189, votes: 1234, shares: 67 }
        }
      ],
      achievements: [
        {
          id: 'ach-1',
          name: 'First Comment',
          description: 'Made your first comment on a bill',
          icon: '💬',
          rarity: 'common',
          unlockedBy: 1247
        },
        {
          id: 'ach-2',
          name: 'Expert Recognition',
          description: 'Received expert endorsement',
          icon: '🏆',
          rarity: 'rare',
          unlockedBy: 89
        }
      ],
      streaks: {
        current: 7,
        longest: 23,
        type: 'daily'
      }
    },
    temporal: {
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        engagement: Math.floor(Math.random() * 100) + 50,
        participants: Math.floor(Math.random() * 50) + 20,
        sentiment: Math.random() * 2 - 1
      })),
      daily: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(now.getTime() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        engagement: Math.floor(Math.random() * 200) + 100,
        participants: Math.floor(Math.random() * 100) + 50,
        sentiment: Math.random() * 2 - 1
      })),
      weekly: Array.from({ length: 12 }, (_, i) => ({
        week: `Week ${i + 1}`,
        engagement: Math.floor(Math.random() * 500) + 300,
        participants: Math.floor(Math.random() * 200) + 100,
        sentiment: Math.random() * 2 - 1
      }))
    }
  };
}