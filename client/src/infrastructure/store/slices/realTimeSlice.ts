/**
 * Real-time Slice for Redux Toolkit
 *
 * Manages WebSocket connections, subscriptions, and real-time updates across all domains.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import {
  CivicWebSocketState,
  BillRealTimeUpdate,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
  RealTimeNotification,
  WebSocketSubscription,
} from '@shared/core/types/realtime';

export interface RealTimeState {
  // Connection state
  connection: CivicWebSocketState;

  // Real-time updates - using arrays instead of Maps for Immer compatibility
  billUpdates: Record<number, BillRealTimeUpdate[]>;
  communityUpdates: Record<string, CommunityRealTimeUpdate[]>;
  engagementMetrics: Record<number, EngagementMetricsUpdate>;
  expertActivities: ExpertActivityUpdate[];
  notifications: RealTimeNotification[];

  // UI state
  showNotifications: boolean;
  notificationCount: number;
  lastUpdateTimestamp: string | null;
}

const initialConnectionState: CivicWebSocketState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  lastMessage: null,
  reconnectAttempts: 0,
  bill_subscriptions: [],
  community_subscriptions: [],
  expert_subscriptions: [],
  notification_subscriptions: false,
  connection_quality: 'disconnected',
  last_heartbeat: null,
  message_count: 0,
};

const initialState: RealTimeState = {
  connection: initialConnectionState,
  billUpdates: {},
  communityUpdates: {},
  engagementMetrics: {},
  expertActivities: [],
  notifications: [],
  showNotifications: false,
  notificationCount: 0,
  lastUpdateTimestamp: null,
};

// Helper function for safe timestamp conversion
const safeTimestampToString = (timestamp: string | Date | unknown): string | null => {
  try {
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) {
        return new Date().toISOString();
      }
      return timestamp;
    } else if (timestamp instanceof Date) {
      return timestamp.toISOString();
    } else if (timestamp && typeof timestamp === 'object' && 'toISOString' in timestamp) {
      return (timestamp as Date).toISOString();
    }
    return new Date().toISOString();
  } catch (error) {
    console.warn('Failed to convert timestamp:', timestamp, error);
    return new Date().toISOString();
  }
};

export const realTimeSlice = createSlice({
  name: 'realTime',
  initialState,
  reducers: {
    // Connection management
    updateConnectionState: (state, action: PayloadAction<Partial<CivicWebSocketState>>) => {
      state.connection = { ...state.connection, ...action.payload };
    },

    connect: state => {
      state.connection.isConnecting = true;
      state.connection.error = null;
    },

    disconnect: state => {
      state.connection.isConnected = false;
      state.connection.isConnecting = false;
      state.connection.connection_quality = 'disconnected';
    },

    // Subscription management
    subscribe: (state, action: PayloadAction<WebSocketSubscription>) => {
      const subscription = action.payload;
      switch (subscription.type) {
        case 'bill': {
          const billId = Number(subscription.id);
          if (!state.connection.bill_subscriptions.includes(billId)) {
            state.connection.bill_subscriptions.push(billId);
          }
          break;
        }
        case 'community': {
          const communityId = String(subscription.id);
          if (!state.connection.community_subscriptions.includes(communityId)) {
            state.connection.community_subscriptions.push(communityId);
          }
          break;
        }
        case 'expert': {
          const expertId = String(subscription.id);
          if (!state.connection.expert_subscriptions.includes(expertId)) {
            state.connection.expert_subscriptions.push(expertId);
          }
          break;
        }
        case 'user_notifications':
          state.connection.notification_subscriptions = true;
          break;
      }
    },

    unsubscribe: (state, action: PayloadAction<WebSocketSubscription>) => {
      const subscription = action.payload;
      switch (subscription.type) {
        case 'bill': {
          const billId = Number(subscription.id);
          const billIndex = state.connection.bill_subscriptions.indexOf(billId);
          if (billIndex > -1) {
            state.connection.bill_subscriptions.splice(billIndex, 1);
          }
          // Clear updates for unsubscribed bill
          delete state.billUpdates[billId];
          break;
        }
        case 'community': {
          const communityId = String(subscription.id);
          const communityIndex = state.connection.community_subscriptions.indexOf(communityId);
          if (communityIndex > -1) {
            state.connection.community_subscriptions.splice(communityIndex, 1);
          }
          delete state.communityUpdates[communityId];
          break;
        }
        case 'expert': {
          const expertId = String(subscription.id);
          const expertIndex = state.connection.expert_subscriptions.indexOf(expertId);
          if (expertIndex > -1) {
            state.connection.expert_subscriptions.splice(expertIndex, 1);
          }
          break;
        }
        case 'user_notifications':
          state.connection.notification_subscriptions = false;
          break;
      }
    },

    // Update handlers
    addBillUpdate: (state, action: PayloadAction<BillRealTimeUpdate>) => {
      const update = action.payload;
      const billId = update.bill_id;
      const existing = state.billUpdates[billId] || [];

      // Keep only last 50 updates per bill
      const updates = [...existing, update].slice(-50);
      state.billUpdates[billId] = updates;

      const timestamp = update.timestamp;
      state.lastUpdateTimestamp = safeTimestampToString(timestamp);
    },

    addCommunityUpdate: (state, action: PayloadAction<CommunityRealTimeUpdate>) => {
      const update = action.payload;
      const discussionId = update.discussion_id || 'general';
      const existing = state.communityUpdates[discussionId] || [];

      // Keep only last 100 community updates per discussion
      const updates = [...existing, update].slice(-100);
      state.communityUpdates[discussionId] = updates;

      const timestamp = update.timestamp;
      state.lastUpdateTimestamp = safeTimestampToString(timestamp);
    },

    updateEngagementMetrics: (state, action: PayloadAction<EngagementMetricsUpdate>) => {
      const metrics = action.payload;
      state.engagementMetrics[metrics.bill_id] = metrics;
      
      const timestamp = metrics.timestamp;
      state.lastUpdateTimestamp = safeTimestampToString(timestamp);
    },

    addExpertActivity: (state, action: PayloadAction<ExpertActivityUpdate>) => {
      // Keep only last 200 expert activities
      state.expertActivities = [...state.expertActivities, action.payload].slice(-200);
      const timestamp = action.payload.timestamp;
      state.lastUpdateTimestamp = safeTimestampToString(timestamp);
    },

    addNotification: (state, action: PayloadAction<RealTimeNotification>) => {
      const notification = action.payload;
      // Add to beginning of notifications array
      state.notifications = [notification, ...state.notifications].slice(0, 100);

      // Update unread count
      state.notificationCount = state.notifications.filter(n => !n.read).length;

      const createdAt = notification.created_at;
      state.lastUpdateTimestamp = safeTimestampToString(createdAt);
    },

    // Notification management
    markNotificationRead: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload;
      const notification = state.notifications.find(n => n.id === notificationId);
      if (notification && !notification.read) {
        notification.read = true;
        state.notificationCount = Math.max(0, state.notificationCount - 1);
      }
    },

    clearNotifications: state => {
      state.notifications = [];
      state.notificationCount = 0;
    },

    toggleNotifications: state => {
      state.showNotifications = !state.showNotifications;
    },

    // Utility actions
    clearBillUpdates: (state, action: PayloadAction<number>) => {
      delete state.billUpdates[action.payload];
    },

    clearCommunityUpdates: (state, action: PayloadAction<string>) => {
      delete state.communityUpdates[action.payload];
    },

    resetRealTimeState: () => initialState,
  },
});

// Export actions
export const {
  updateConnectionState,
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  addBillUpdate,
  addCommunityUpdate,
  updateEngagementMetrics,
  addExpertActivity,
  addNotification,
  markNotificationRead,
  clearNotifications,
  toggleNotifications,
  clearBillUpdates,
  clearCommunityUpdates,
  resetRealTimeState,
} = realTimeSlice.actions;

// Helper function for safe timestamp parsing
const safeParseTimestamp = (timestamp: string | Date): number => {
  try {
    if (typeof timestamp === 'string') {
      const parsed = new Date(timestamp);
      if (isNaN(parsed.getTime())) {
        return 0; // Invalid date, treat as oldest
      }
      return parsed.getTime();
    } else if (timestamp instanceof Date) {
      return timestamp.getTime();
    }
    return 0;
  } catch (error) {
    console.warn('Failed to parse timestamp:', timestamp, error);
    return 0;
  }
};

// Selectors
export export export export export export 
  // Collect all bill updates
  Object.values(state.realTime.billUpdates).forEach(updates => {
    allUpdates.push(...updates);
  });

  // Collect all community updates
  Object.values(state.realTime.communityUpdates).forEach(updates => {
    allUpdates.push(...updates);
  });

  // Sort by timestamp and return recent ones
  return allUpdates
    .sort((a, b) => safeParseTimestamp(b.timestamp) - safeParseTimestamp(a.timestamp))
    .slice(0, 20);
};

// Export the slice
export default realTimeSlice.reducer;
