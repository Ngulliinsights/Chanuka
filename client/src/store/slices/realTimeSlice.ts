/**
 * Real-time Slice for WebSocket Integration
 * 
 * Manages real-time state for bill updates, community engagement,
 * and notification systems using Zustand for optimal performance.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import {
  CivicWebSocketState,
  BillRealTimeUpdate,
  CommunityRealTimeUpdate,
  EngagementMetricsUpdate,
  ExpertActivityUpdate,
  RealTimeNotification,
  WebSocketSubscription
} from '../../types/realtime';

interface RealTimeState {
  // Connection state
  connection: CivicWebSocketState;
  
  // Real-time updates
  billUpdates: Map<number, BillRealTimeUpdate[]>;
  communityUpdates: Map<string, CommunityRealTimeUpdate[]>;
  engagementMetrics: Map<number, EngagementMetricsUpdate>;
  expertActivities: ExpertActivityUpdate[];
  notifications: RealTimeNotification[];
  
  // UI state
  showNotifications: boolean;
  notificationCount: number;
  lastUpdateTimestamp: string | null;
}

interface RealTimeActions {
  // Connection management
  updateConnectionState: (state: Partial<CivicWebSocketState>) => void;
  connect: () => void;
  disconnect: () => void;
  
  // Subscription management
  subscribe: (subscription: WebSocketSubscription) => void;
  unsubscribe: (subscription: WebSocketSubscription) => void;
  
  // Update handlers
  addBillUpdate: (update: BillRealTimeUpdate) => void;
  addCommunityUpdate: (update: CommunityRealTimeUpdate) => void;
  updateEngagementMetrics: (metrics: EngagementMetricsUpdate) => void;
  addExpertActivity: (activity: ExpertActivityUpdate) => void;
  addNotification: (notification: RealTimeNotification) => void;
  
  // Notification management
  markNotificationRead: (notificationId: string) => void;
  clearNotifications: () => void;
  toggleNotifications: () => void;
  
  // Utility actions
  clearBillUpdates: (billId: number) => void;
  clearCommunityUpdates: (discussionId: string) => void;
  getRecentUpdates: (limit?: number) => (BillRealTimeUpdate | CommunityRealTimeUpdate)[];
}

const initialConnectionState: CivicWebSocketState = {
  isConnected: false,
  isConnecting: false,
  error: null,
  lastMessage: null,
  reconnectAttempts: 0,
  bill_subscriptions: new Set(),
  community_subscriptions: new Set(),
  expert_subscriptions: new Set(),
  notification_subscriptions: false,
  connection_quality: 'disconnected',
  last_heartbeat: null,
  message_count: 0
};

export const useRealTimeStore = create<RealTimeState & RealTimeActions>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      connection: initialConnectionState,
      billUpdates: new Map(),
      communityUpdates: new Map(),
      engagementMetrics: new Map(),
      expertActivities: [],
      notifications: [],
      showNotifications: false,
      notificationCount: 0,
      lastUpdateTimestamp: null,

      // Connection management
      updateConnectionState: (newState) =>
        set((state) => {
          state.connection = { ...state.connection, ...newState };
        }),

      connect: () =>
        set((state) => {
          // This will be handled by the WebSocket middleware
          // Just update local state to show connecting
          state.connection.isConnecting = true;
          state.connection.error = null;
        }),

      disconnect: () =>
        set((state) => {
          state.connection.isConnected = false;
          state.connection.isConnecting = false;
          state.connection.connection_quality = 'disconnected';
        }),

      // Subscription management
      subscribe: (subscription) =>
        set((state) => {
          // Track subscriptions locally and let middleware handle WebSocket
          switch (subscription.type) {
            case 'bill':
              state.connection.bill_subscriptions.add(Number(subscription.id));
              break;
            case 'community':
              state.connection.community_subscriptions.add(String(subscription.id));
              break;
            case 'expert':
              state.connection.expert_subscriptions.add(String(subscription.id));
              break;
            case 'user_notifications':
              state.connection.notification_subscriptions = true;
              break;
          }
        }),

      unsubscribe: (subscription) =>
        set((state) => {
          switch (subscription.type) {
            case 'bill':
              state.connection.bill_subscriptions.delete(Number(subscription.id));
              // Clear updates for unsubscribed bill
              state.billUpdates.delete(Number(subscription.id));
              break;
            case 'community':
              state.connection.community_subscriptions.delete(String(subscription.id));
              state.communityUpdates.delete(String(subscription.id));
              break;
            case 'expert':
              state.connection.expert_subscriptions.delete(String(subscription.id));
              break;
            case 'user_notifications':
              state.connection.notification_subscriptions = false;
              break;
          }
        }),

      // Update handlers
      addBillUpdate: (update) =>
        set((state) => {
          const billId = update.bill_id;
          const existing = state.billUpdates.get(billId) || [];
          
          // Keep only last 50 updates per bill
          const updates = [...existing, update].slice(-50);
          state.billUpdates.set(billId, updates);
          
          state.lastUpdateTimestamp = update.timestamp;
        }),

      addCommunityUpdate: (update) =>
        set((state) => {
          const discussionId = update.discussion_id || 'general';
          const existing = state.communityUpdates.get(discussionId) || [];
          
          // Keep only last 100 community updates per discussion
          const updates = [...existing, update].slice(-100);
          state.communityUpdates.set(discussionId, updates);
          
          state.lastUpdateTimestamp = update.timestamp;
        }),

      updateEngagementMetrics: (metrics) =>
        set((state) => {
          state.engagementMetrics.set(metrics.bill_id, metrics);
          state.lastUpdateTimestamp = metrics.timestamp;
        }),

      addExpertActivity: (activity) =>
        set((state) => {
          // Keep only last 200 expert activities
          state.expertActivities = [...state.expertActivities, activity].slice(-200);
          state.lastUpdateTimestamp = activity.timestamp;
        }),

      addNotification: (notification) =>
        set((state) => {
          // Add to beginning of notifications array
          state.notifications = [notification, ...state.notifications].slice(0, 100);
          
          // Update unread count
          state.notificationCount = state.notifications.filter(n => !n.read).length;
          
          state.lastUpdateTimestamp = notification.created_at;
        }),

      // Notification management
      markNotificationRead: (notificationId) =>
        set((state) => {
          const notification = state.notifications.find(n => n.id === notificationId);
          if (notification && !notification.read) {
            notification.read = true;
            state.notificationCount = Math.max(0, state.notificationCount - 1);
          }
        }),

      clearNotifications: () =>
        set((state) => {
          state.notifications = [];
          state.notificationCount = 0;
        }),

      toggleNotifications: () =>
        set((state) => {
          state.showNotifications = !state.showNotifications;
        }),

      // Utility actions
      clearBillUpdates: (billId) =>
        set((state) => {
          state.billUpdates.delete(billId);
        }),

      clearCommunityUpdates: (discussionId) =>
        set((state) => {
          state.communityUpdates.delete(discussionId);
        }),

      getRecentUpdates: (limit = 20) => {
        const state = get();
        const allUpdates: (BillRealTimeUpdate | CommunityRealTimeUpdate)[] = [];
        
        // Collect all bill updates
        state.billUpdates.forEach((updates) => {
          allUpdates.push(...updates);
        });
        
        // Collect all community updates
        state.communityUpdates.forEach((updates) => {
          allUpdates.push(...updates);
        });
        
        // Sort by timestamp and return recent ones
        return allUpdates
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
      }
    })),
    {
      name: 'chanuka-realtime-store',
      partialize: (state) => ({
        // Don't persist real-time data, only UI preferences
        showNotifications: state.showNotifications
      })
    }
  )
);

// Selectors for common use cases
export const selectConnectionState = () => useRealTimeStore(state => state.connection);
export const selectBillUpdates = (billId: number) => useRealTimeStore(state => state.billUpdates.get(billId) || []);
export const selectEngagementMetrics = (billId: number) => useRealTimeStore(state => state.engagementMetrics.get(billId));
export const selectUnreadNotifications = () => useRealTimeStore(state => 
  state.notifications.filter(n => !n.read)
);
export const selectNotificationCount = () => useRealTimeStore(state => state.notificationCount);
export const selectRecentActivity = () => useRealTimeStore(state => state.getRecentUpdates(10));

// Export the slice for Redux compatibility
export const realTimeSlice = {
  name: 'realTime',
  reducer: (state = {}, action: any) => {
    // This is a compatibility layer for Redux
    // The actual state management is handled by Zustand
    switch (action.type) {
      case 'realTime/billUpdate':
        useRealTimeStore.getState().addBillUpdate(action.payload);
        break;
      case 'realTime/communityUpdate':
        useRealTimeStore.getState().addCommunityUpdate(action.payload);
        break;
      case 'realTime/engagementUpdate':
        useRealTimeStore.getState().updateEngagementMetrics(action.payload);
        break;
      case 'realTime/expertActivity':
        useRealTimeStore.getState().addExpertActivity(action.payload);
        break;
      case 'realTime/notification':
        useRealTimeStore.getState().addNotification(action.payload);
        break;
      case 'realTime/updateConnectionState':
        useRealTimeStore.getState().updateConnectionState(action.payload);
        break;
    }
    return state;
  }
};