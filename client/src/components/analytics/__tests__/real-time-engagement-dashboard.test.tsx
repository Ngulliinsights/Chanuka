/**
 * Real-Time Engagement Dashboard Tests
 * 
 * Tests for the Real-Time Engagement Analytics Dashboard component
 * including real-time updates, data visualization, and user interactions.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealTimeEngagementDashboard } from '../real-time-engagement-dashboard';
import { useRealTimeEngagement } from '@client/hooks/useRealTimeEngagement';
import { useWebSocket } from '@client/hooks/useWebSocket';

// Mock the hooks
vi.mock('../../../hooks/useRealTimeEngagement');
vi.mock('../../../hooks/useWebSocket');
vi.mock('../../../utils/logger');

const mockUseRealTimeEngagement = vi.mocked(useRealTimeEngagement);
const mockUseWebSocket = vi.mocked(useWebSocket);

// Mock data
const mockEngagementData = {
  liveMetrics: {
    communityApproval: 0.73,
    totalParticipants: 1247,
    expertSupport: 0.68,
    activeDiscussions: 23,
    lastUpdated: '2024-01-01T12:00:00Z'
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
    trend: 'up' as const,
    methodology: {
      description: 'Test methodology description',
      factors: [
        {
          name: 'Participation',
          weight: 0.3,
          description: 'Regular engagement',
          currentScore: 850
        }
      ]
    }
  },
  sentiment: {
    overall: 'positive' as const,
    distribution: {
      positive: 0.58,
      neutral: 0.31,
      negative: 0.11
    },
    trending: [
      {
        topic: 'Healthcare Reform',
        sentiment: 'positive' as const,
        change: 12.5,
        volume: 342
      }
    ],
    polls: [
      {
        id: 'poll-1',
        question: 'Do you support the proposed healthcare bill?',
        responses: 1834,
        results: [
          { option: 'Strongly Support', votes: 687, percentage: 37.4 }
        ],
        endTime: '2024-01-02T12:00:00Z'
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
        specializations: ['Healthcare Policy'],
        recentContributions: 12,
        communityRating: 4.8
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
      }
    ],
    achievements: [
      {
        id: 'ach-1',
        name: 'First Comment',
        description: 'Made your first comment',
        icon: '💬',
        rarity: 'common' as const,
        unlockedBy: 1247
      }
    ],
    streaks: {
      current: 7,
      longest: 23,
      type: 'daily' as const
    }
  },
  temporal: {
    hourly: [
      { hour: 0, engagement: 50, participants: 20, sentiment: 0.5 }
    ],
    daily: [
      { date: '2024-01-01', engagement: 150, participants: 75, sentiment: 0.3 }
    ],
    weekly: [
      { week: 'Week 1', engagement: 400, participants: 200, sentiment: 0.2 }
    ]
  }
};

describe('RealTimeEngagementDashboard', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Mock WebSocket hook
    mockUseWebSocket.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      error: null,
      reconnectAttempts: 0,
      lastMessage: null,
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      subscribeToBill: vi.fn(),
      unsubscribeFromBill: vi.fn(),
      subscribedBills: [],
      addMessageHandler: vi.fn(() => vi.fn())
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => 'mock-token'),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn()
      },
      writable: true
    });

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: null,
      loading: true,
      error: null,
      isConnected: false,
      lastUpdated: null,
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    expect(screen.getByText('Loading engagement analytics...')).toBeInTheDocument();
  });

  it('renders error state when there is an error', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: null,
      loading: false,
      error: 'Failed to load data',
      isConnected: false,
      lastUpdated: null,
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders dashboard with engagement data', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Check header
    expect(screen.getByText('Real-Time Engagement Analytics')).toBeInTheDocument();
    
    // Check live metrics
    expect(screen.getByText('73.0%')).toBeInTheDocument(); // Community approval
    expect(screen.getByText('1.2K')).toBeInTheDocument(); // Total participants
    expect(screen.getByText('68.0%')).toBeInTheDocument(); // Expert support
    expect(screen.getByText('2,847')).toBeInTheDocument(); // Personal score
    
    // Check connection status
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('displays personal engagement score breakdown', async () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Should show personal score in overview
    expect(screen.getByText('Your Engagement Score')).toBeInTheDocument();
    expect(screen.getByText('2,847')).toBeInTheDocument();
    expect(screen.getByText('Rank #42 of 5.4K')).toBeInTheDocument();
  });

  it('shows community sentiment analysis', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Check sentiment tab
    const sentimentTab = screen.getByRole('tab', { name: /sentiment/i });
    fireEvent.click(sentimentTab);
    
    expect(screen.getByText('Community Sentiment')).toBeInTheDocument();
    expect(screen.getByText('POSITIVE')).toBeInTheDocument();
  });

  it('displays expert verification metrics', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Check experts tab
    const expertsTab = screen.getByRole('tab', { name: /experts/i });
    fireEvent.click(expertsTab);
    
    expect(screen.getByText('Expert Verification Stats')).toBeInTheDocument();
    expect(screen.getByText('127')).toBeInTheDocument(); // Total experts
    expect(screen.getByText('34')).toBeInTheDocument(); // Active experts
  });

  it('shows engagement leaderboard and gamification', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Check leaderboard tab
    const leaderboardTab = screen.getByRole('tab', { name: /leaderboard/i });
    fireEvent.click(leaderboardTab);
    
    expect(screen.getByText('Engagement Leaderboard')).toBeInTheDocument();
    expect(screen.getByText('CivicChampion')).toBeInTheDocument();
    expect(screen.getByText('4.5K')).toBeInTheDocument(); // Score
  });

  it('displays temporal analytics with different timeframes', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Check trends tab
    const trendsTab = screen.getByRole('tab', { name: /trends/i });
    fireEvent.click(trendsTab);
    
    expect(screen.getByText('Temporal Analytics')).toBeInTheDocument();
    
    // Should have timeframe selector
    const timeframeSelect = screen.getByRole('combobox');
    expect(timeframeSelect).toBeInTheDocument();
  });

  it('handles refresh button click', async () => {
    const mockRefresh = vi.fn();
    
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: mockRefresh,
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('handles export button click', async () => {
    const mockExportData = vi.fn();
    
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: mockExportData,
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    const exportButton = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(mockExportData).toHaveBeenCalledWith('csv');
    });
  });

  it('shows connection status correctly', () => {
    // Test connected state
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    const { rerender } = render(<RealTimeEngagementDashboard />);
    expect(screen.getByText('Live')).toBeInTheDocument();

    // Test disconnected state
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: false,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    rerender(<RealTimeEngagementDashboard />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('handles bill-specific context', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard billId={12345} />);
    
    // Should render without errors with bill context
    expect(screen.getByText('Real-Time Engagement Analytics')).toBeInTheDocument();
  });

  it('formats numbers correctly', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Check number formatting
    expect(screen.getByText('1.2K')).toBeInTheDocument(); // 1247 participants
    expect(screen.getByText('2,847')).toBeInTheDocument(); // Personal score
  });

  it('shows active polls when available', () => {
    mockUseRealTimeEngagement.mockReturnValue({
      data: mockEngagementData,
      loading: false,
      error: null,
      isConnected: true,
      lastUpdated: '2024-01-01T12:00:00Z',
      refresh: vi.fn(),
      exportData: vi.fn(),
      updateConfig: vi.fn()
    });

    render(<RealTimeEngagementDashboard />);
    
    // Should show active polls in overview
    expect(screen.getByText('Active Community Polls')).toBeInTheDocument();
    expect(screen.getByText('Do you support the proposed healthcare bill?')).toBeInTheDocument();
    expect(screen.getByText('1.8K responses')).toBeInTheDocument();
  });
});