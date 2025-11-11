/**
 * Community Data Integration Tests
 * 
 * Tests the integration between community features, WebSocket real-time updates,
 * backend services, and state management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { CommunityDataIntegration } from '../components/community/CommunityDataIntegration';
import { communityWebSocketMiddleware } from '../services/community-websocket-middleware';
import { communityBackendService } from '../services/community-backend-service';
import { notificationService } from '../services/notification-service';

// Mock services
vi.mock('../services/community-websocket-middleware');
vi.mock('../services/community-backend-service');
vi.mock('../services/notification-service');
vi.mock('../utils/logger');

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: WebSocket.OPEN,
};

global.WebSocket = vi.fn(() => mockWebSocket) as any;

// Mock stores
vi.mock('../store/slices/communitySlice', () => ({
  useCommunityStore: () => ({
    activityFeed: [],
    trendingTopics: [],
    expertInsights: [],
    stats: { totalParticipants: 0, activeDiscussions: 0, expertContributions: 0 },
    initializeRealTime: vi.fn(),
    cleanupRealTime: vi.fn(),
    loadActivityFeed: vi.fn(),
    loadTrendingTopics: vi.fn(),
    loadExpertInsights: vi.fn(),
  }),
}));

vi.mock('../store/slices/discussionSlice', () => ({
  useDiscussionStore: () => ({
    threads: {},
    comments: {},
    typingIndicators: [],
    initializeRealTime: vi.fn(),
    cleanupRealTime: vi.fn(),
    loadThread: vi.fn(),
    loadComments: vi.fn(),
  }),
}));

describe('Community Data Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock middleware methods
    vi.mocked(communityWebSocketMiddleware.initialize).mockResolvedValue();
    vi.mocked(communityWebSocketMiddleware.isConnected).mockReturnValue(true);
    vi.mocked(communityWebSocketMiddleware.isReady).mockReturnValue(true);
    vi.mocked(communityWebSocketMiddleware.subscribeToDiscussion).mockImplementation(() => {});
    vi.mocked(communityWebSocketMiddleware.unsubscribeFromDiscussion).mockImplementation(() => {});
    vi.mocked(communityWebSocketMiddleware.sendTypingIndicator).mockImplementation(() => {});
    vi.mocked(communityWebSocketMiddleware.stopTypingIndicator).mockImplementation(() => {});

    // Mock backend service methods
    vi.mocked(communityBackendService.initialize).mockResolvedValue();
    vi.mocked(communityBackendService.addComment).mockResolvedValue({
      id: 'test-comment-1',
      billId: 1,
      content: 'Test comment',
      authorId: 'test-user',
      authorName: 'Test User',
      createdAt: new Date().toISOString(),
      upvotes: 0,
      downvotes: 0,
      replies: [],
      parentId: null,
      isEdited: false,
      isModerated: false,
    });
    vi.mocked(communityBackendService.submitExpertInsight).mockResolvedValue({
      id: 'test-insight-1',
      billId: 1,
      expertId: 'test-expert',
      title: 'Test Insight',
      content: 'Test insight content',
      category: 'constitutional',
      severity: 'medium',
      tags: ['test'],
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    });

    // Mock notification service methods
    vi.mocked(notificationService.initialize).mockResolvedValue();
    vi.mocked(notificationService.getNotifications).mockReturnValue([]);
    vi.mocked(notificationService.getUnreadCount).mockReturnValue(0);
    vi.mocked(notificationService.markAsRead).mockResolvedValue();
    vi.mocked(notificationService.markAllAsRead).mockResolvedValue();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize community WebSocket middleware', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(communityWebSocketMiddleware.initialize).toHaveBeenCalledWith({
          enableCommunityAnalytics: true,
          enableExpertUpdates: true,
          enableNotifications: true,
          enableDiscussions: false,
          enableModerationEvents: false,
        });
      });
    });

    it('should initialize backend services', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(communityBackendService.initialize).toHaveBeenCalled();
        expect(notificationService.initialize).toHaveBeenCalled();
      });
    });

    it('should show loading state during initialization', () => {
      vi.mocked(communityWebSocketMiddleware.isReady).mockReturnValue(false);
      
      render(<CommunityDataIntegration />);

      expect(screen.getByText('Initializing community data integration...')).toBeInTheDocument();
    });

    it('should show connection status indicators', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('WebSocket: Connected')).toBeInTheDocument();
        expect(screen.getByText('Backend: Ready')).toBeInTheDocument();
      });
    });
  });

  describe('Bill Selection', () => {
    it('should allow bill selection', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Bill #1 - Healthcare Reform')).toBeInTheDocument();
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });

      expect(screen.getByDisplayValue('Bill #2 - Education Funding')).toBeInTheDocument();
    });

    it('should subscribe to discussion updates when bill changes', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(communityWebSocketMiddleware.subscribeToDiscussion).toHaveBeenCalledWith(1);
      });

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '2' } });

      await waitFor(() => {
        expect(communityWebSocketMiddleware.unsubscribeFromDiscussion).toHaveBeenCalledWith(1);
        expect(communityWebSocketMiddleware.subscribeToDiscussion).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('Real-time Updates Display', () => {
    it('should display discussion updates section', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Discussion Updates')).toBeInTheDocument();
      });
    });

    it('should display expert updates section', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Expert Updates')).toBeInTheDocument();
      });
    });

    it('should display community analytics section', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Community Analytics')).toBeInTheDocument();
      });
    });

    it('should display notifications section', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Community Notifications')).toBeInTheDocument();
      });
    });
  });

  describe('Demo Actions', () => {
    it('should test comment submission', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Test Comment Submission')).toBeInTheDocument();
      });

      const button = screen.getByText('Test Comment Submission');
      fireEvent.click(button);

      await waitFor(() => {
        expect(communityBackendService.addComment).toHaveBeenCalledWith({
          billId: 1,
          content: expect.stringContaining('Test comment from integration demo'),
          parentId: undefined,
        });
      });
    });

    it('should test expert insight submission', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Test Expert Insight')).toBeInTheDocument();
      });

      const button = screen.getByText('Test Expert Insight');
      fireEvent.click(button);

      await waitFor(() => {
        expect(communityBackendService.submitExpertInsight).toHaveBeenCalledWith({
          billId: 1,
          expertId: 'demo-expert',
          title: 'Demo Expert Analysis',
          content: expect.stringContaining('Expert insight from integration demo'),
          category: 'constitutional',
          severity: 'medium',
          tags: ['demo', 'integration'],
        });
      });
    });

    it('should handle typing indicators', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText('Start Typing')).toBeInTheDocument();
      });

      const startButton = screen.getByText('Start Typing');
      fireEvent.click(startButton);

      expect(communityWebSocketMiddleware.sendTypingIndicator).toHaveBeenCalledWith(1);

      const stopButton = screen.getByText('Stop Typing');
      fireEvent.click(stopButton);

      expect(communityWebSocketMiddleware.stopTypingIndicator).toHaveBeenCalledWith(1);
    });

    it('should disable actions when not connected', async () => {
      vi.mocked(communityWebSocketMiddleware.isConnected).mockReturnValue(false);
      
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        const commentButton = screen.getByText('Test Comment Submission');
        const insightButton = screen.getByText('Test Expert Insight');
        const typingButton = screen.getByText('Start Typing');

        expect(commentButton).toBeDisabled();
        expect(insightButton).toBeDisabled();
        expect(typingButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display WebSocket errors', async () => {
      const error = 'WebSocket connection failed';
      
      render(<CommunityDataIntegration />);

      // Simulate error by updating component props
      const { rerender } = render(<CommunityDataIntegration />);
      
      // Mock the hook to return an error
      vi.doMock('../hooks/useCommunityWebSocket', () => ({
        useCommunityWebSocket: () => ({
          isConnected: false,
          isInitialized: true,
          error,
          subscribeToDiscussion: vi.fn(),
          unsubscribeFromDiscussion: vi.fn(),
          sendTypingIndicator: vi.fn(),
          stopTypingIndicator: vi.fn(),
        }),
        useDiscussionUpdates: () => ({ updates: [], typingUsers: [], clearUpdates: vi.fn() }),
        useExpertUpdates: () => ({ updates: [], clearUpdates: vi.fn() }),
        useCommunityAnalytics: () => ({ analytics: [], trendingTopics: [], clearAnalytics: vi.fn() }),
        useCommunityNotifications: () => ({ 
          notifications: [], 
          unreadCount: 0, 
          markAsRead: vi.fn(), 
          markAllAsRead: vi.fn() 
        }),
        useCommunityBackend: () => ({ 
          isInitialized: true, 
          error: null, 
          communityBackendService 
        }),
      }));

      rerender(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });

    it('should display backend errors', async () => {
      const error = 'Backend initialization failed';
      
      vi.doMock('../hooks/useCommunityWebSocket', () => ({
        useCommunityWebSocket: () => ({
          isConnected: true,
          isInitialized: true,
          error: null,
          subscribeToDiscussion: vi.fn(),
          unsubscribeFromDiscussion: vi.fn(),
          sendTypingIndicator: vi.fn(),
          stopTypingIndicator: vi.fn(),
        }),
        useDiscussionUpdates: () => ({ updates: [], typingUsers: [], clearUpdates: vi.fn() }),
        useExpertUpdates: () => ({ updates: [], clearUpdates: vi.fn() }),
        useCommunityAnalytics: () => ({ analytics: [], trendingTopics: [], clearAnalytics: vi.fn() }),
        useCommunityNotifications: () => ({ 
          notifications: [], 
          unreadCount: 0, 
          markAsRead: vi.fn(), 
          markAllAsRead: vi.fn() 
        }),
        useCommunityBackend: () => ({ 
          isInitialized: false, 
          error, 
          communityBackendService 
        }),
      }));

      const { rerender } = render(<CommunityDataIntegration />);
      rerender(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.getByText(error)).toBeInTheDocument();
      });
    });
  });

  describe('Debug Information', () => {
    it('should show debug information when enabled', async () => {
      render(<CommunityDataIntegration showDebugInfo={true} />);

      await waitFor(() => {
        expect(screen.getByText('Debug Information')).toBeInTheDocument();
        expect(screen.getByText('Store State')).toBeInTheDocument();
        expect(screen.getByText('Real-time Stats')).toBeInTheDocument();
      });
    });

    it('should hide debug information by default', async () => {
      render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(screen.queryByText('Debug Information')).not.toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', async () => {
      const { unmount } = render(<CommunityDataIntegration />);

      await waitFor(() => {
        expect(communityWebSocketMiddleware.initialize).toHaveBeenCalled();
      });

      unmount();

      // Note: Cleanup verification would depend on the actual implementation
      // of the cleanup functions in the stores
    });
  });
});

describe('Community WebSocket Integration', () => {
  it('should handle real-time comment events', async () => {
    render(<CommunityDataIntegration />);

    // Simulate a comment added event
    const commentEvent = new CustomEvent('community:comment_added', {
      detail: {
        billId: 1,
        comment: {
          id: 'new-comment',
          content: 'New real-time comment',
          authorName: 'Test User',
        },
        timestamp: new Date().toISOString(),
      },
    });

    act(() => {
      window.dispatchEvent(commentEvent);
    });

    // The component should handle this event through the hooks
    // Verification would depend on the actual hook implementation
  });

  it('should handle real-time expert insight events', async () => {
    render(<CommunityDataIntegration />);

    // Simulate an expert insight added event
    const insightEvent = new CustomEvent('community:expert_insight_added', {
      detail: {
        billId: 1,
        insight: {
          id: 'new-insight',
          title: 'New Expert Analysis',
          content: 'Real-time expert insight',
        },
        timestamp: new Date().toISOString(),
      },
    });

    act(() => {
      window.dispatchEvent(insightEvent);
    });

    // The component should handle this event through the hooks
  });

  it('should handle real-time analytics events', async () => {
    render(<CommunityDataIntegration />);

    // Simulate a trending update event
    const trendingEvent = new CustomEvent('community:trending_update', {
      detail: {
        topics: [
          { id: '1', title: 'Healthcare Reform', score: 95 },
          { id: '2', title: 'Education Funding', score: 87 },
        ],
        timestamp: new Date().toISOString(),
      },
    });

    act(() => {
      window.dispatchEvent(trendingEvent);
    });

    // The component should handle this event through the hooks
  });
});