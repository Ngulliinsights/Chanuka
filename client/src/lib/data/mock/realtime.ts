/**
 * Mock Real-time Data
 *
 * Simulates real-time updates for WebSocket integration, live metrics,
 * and dynamic content updates.
 */

import { faker } from '@faker-js/faker';

import { mockBills } from './bills';
import { mockExperts, mockOfficialExperts } from './experts';
import { generateId, generateDateInRange, weightedRandom } from './generators';
import { mockUsers } from './users';

// Seed faker for consistent data
faker.seed(12345);

const getIntId = (id: string | number): number => {
  return typeof id === 'string' ? parseInt(id, 10) || faker.number.int() : id;
};

const getUserName = (user: any): string => {
  if (user.name) return user.name;
  if (user.first_name && user.last_name) return `${user.first_name} ${user.last_name}`;
  return 'User';
};

/**
 * Real-time update event types
 */
export type RealTimeEventType =
  | 'bill_status_change'
  | 'bill_engagement_update'
  | 'new_comment'
  | 'comment_vote'
  | 'expert_contribution'
  | 'trending_update'
  | 'user_activity'
  | 'moderation_action'
  | 'system_notification';

/**
 * Real-time event interface
 */
export interface RealTimeEvent {
  id: string;
  type: RealTimeEventType;
  timestamp: string;
  data: any;
  userId?: string | number;
  billId?: number;
  priority: 'low' | 'medium' | 'high';
}

/**
 * Generate bill status change event
 */
export const generateBillStatusChangeEvent = (): RealTimeEvent => {
  const bill = faker.helpers.arrayElement(mockBills);
  const newStatus = faker.helpers.arrayElement([
    'committee',
    'passed',
    'failed',
    'signed',
    'vetoed',
  ]);

  return {
    id: generateId('event'),
    type: 'bill_status_change',
    timestamp: new Date().toISOString(),
    billId: getIntId(bill.id),
    priority: 'high',
    data: {
      bill_id: getIntId(bill.id),
      billNumber: bill.billNumber,
      billTitle: bill.title,
      oldStatus: bill.status,
      newStatus,
      statusChangeReason: faker.helpers.arrayElement([
        'Committee vote completed',
        'Floor vote scheduled',
        'Amendment approved',
        'Signed by Governor',
        'Veto override attempt',
      ]),
    },
  };
};

/**
 * Generate bill engagement update event
 */
export const generateBillEngagementUpdateEvent = (): RealTimeEvent => {
  const bill = faker.helpers.arrayElement(mockBills);
  const engagementType = faker.helpers.arrayElement(['view', 'save', 'comment', 'share']);

  const updates: any = {
    bill_id: getIntId(bill.id),
    billNumber: bill.billNumber,
    billTitle: bill.title,
  };

  switch (engagementType) {
    case 'view':
      updates.viewCount = (bill.viewCount || 0) + faker.number.int({ min: 1, max: 10 });
      break;
    case 'save':
      updates.saveCount = (bill.trackingCount || 0) + faker.number.int({ min: 1, max: 5 });
      break;
    case 'comment':
      updates.commentCount = (bill.commentCount || 0) + faker.number.int({ min: 1, max: 3 });
      break;
    case 'share':
      updates.shareCount = (bill.engagement?.shares || 0) + faker.number.int({ min: 1, max: 2 });
      break;
  }

  return {
    id: generateId('event'),
    type: 'bill_engagement_update',
    timestamp: new Date().toISOString(),
    billId: typeof bill.id === 'string' ? parseInt(bill.id, 10) || 0 : bill.id,
    priority: 'medium',
    data: updates,
  };
};

/**
 * Generate new comment event
 */
export const generateNewCommentEvent = (): RealTimeEvent => {
  const bill = faker.helpers.arrayElement(mockBills);
  const user = faker.helpers.arrayElement([...mockUsers, ...mockExperts, ...mockOfficialExperts]);
  const isExpert =
    mockExperts.some(e => e.id === user.id) || mockOfficialExperts.some(e => e.id === user.id);

  return {
    id: generateId('event'),
    type: 'new_comment',
    timestamp: new Date().toISOString(),
    userId: user.id,
    billId: typeof bill.id === 'string' ? parseInt(bill.id, 10) || 0 : bill.id,
    priority: isExpert ? 'high' : 'medium',
    data: {
      commentId: generateId('comment'),
      billId: typeof bill.id === 'string' ? parseInt(bill.id, 10) || 0 : bill.id,
      billTitle: bill.title,
      authorId: user.id,
      authorName: getUserName(user),
      authorAvatar: (user as any).avatar,
      isExpert,
      content: faker.lorem.paragraph(2),
      timestamp: new Date().toISOString(),
    },
  };
};

/**
 * Generate comment vote event
 */
export const generateCommentVoteEvent = (): RealTimeEvent => {
  const user = faker.helpers.arrayElement(mockUsers);
  const voteType = faker.helpers.arrayElement(['up', 'down']);

  return {
    id: generateId('event'),
    type: 'comment_vote',
    timestamp: new Date().toISOString(),
    userId: user.id,
    priority: 'low',
    data: {
      commentId: generateId('comment'),
      userId: user.id,
      voteType,
      newUpvotes: faker.number.int({ min: 0, max: 100 }),
      newDownvotes: faker.number.int({ min: 0, max: 20 }),
    },
  };
};

/**
 * Generate expert contribution event
 */
export const generateExpertContributionEvent = (): RealTimeEvent => {
  const expert = faker.helpers.arrayElement([...mockExperts, ...mockOfficialExperts]);
  const bill = faker.helpers.arrayElement(mockBills);
  const contributionType = faker.helpers.arrayElement([
    'analysis',
    'review',
    'amendment_suggestion',
  ]);

  return {
    id: generateId('event'),
    type: 'expert_contribution',
    timestamp: new Date().toISOString(),
    userId: expert.id,
    billId: typeof bill.id === 'string' ? parseInt(bill.id, 10) || 0 : bill.id,
    priority: 'high',
    data: {
      contributionId: generateId('contribution'),
      expertId: expert.id,
      expertName: expert.name,
      expertVerification: expert.verificationType,
      credibilityScore: expert.credibilityScore,
      billId: typeof bill.id === 'string' ? parseInt(bill.id, 10) || 0 : bill.id,
      billTitle: bill.title,
      contributionType,
      title: faker.helpers.arrayElement([
        'Constitutional Analysis',
        'Policy Impact Assessment',
        'Implementation Review',
        'Amendment Recommendation',
      ]),
      summary: faker.lorem.paragraph(1),
      confidence: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
    },
  };
};

/**
 * Generate trending update event
 */
export const generateTrendingUpdateEvent = (): RealTimeEvent => {
  const trendingItems = [
    { type: 'bill', title: 'Healthcare Reform Bill Gains Support' },
    { type: 'topic', title: 'Environmental Policy Discussion' },
    { type: 'campaign', title: 'Education Funding Initiative' },
    { type: 'expert_insight', title: 'Constitutional Analysis Trending' },
  ];

  const item = faker.helpers.arrayElement(trendingItems);

  return {
    id: generateId('event'),
    type: 'trending_update',
    timestamp: new Date().toISOString(),
    priority: 'medium',
    data: {
      trendingType: item.type,
      title: item.title,
      trendingScore: faker.number.float({ min: 0.7, max: 1.0, fractionDigits: 2 }),
      velocity: faker.number.float({ min: 0.5, max: 1.0, fractionDigits: 2 }),
      participantCount: faker.number.int({ min: 50, max: 500 }),
      timeWindow: '1h',
    },
  };
};

/**
 * Generate user activity event
 */
export const generateUserActivityEvent = (): RealTimeEvent => {
  const user = faker.helpers.arrayElement(mockUsers);
  const activities = ['login', 'bill_view', 'comment_post', 'vote_cast', 'share_action'];
  const activity = faker.helpers.arrayElement(activities);

  return {
    id: generateId('event'),
    type: 'user_activity',
    timestamp: new Date().toISOString(),
    userId: user.id,
    priority: 'low',
    data: {
      userId: user.id,
      userName: user.name || `${user.first_name} ${user.last_name}`,
      activity,
      details: {
        billId:
          activity.includes('bill') || activity.includes('comment') || activity.includes('vote')
            ? faker.number.int({ min: 1, max: 75 })
            : undefined,
        sessionDuration:
          activity === 'login' ? faker.number.int({ min: 300, max: 3600 }) : undefined,
      },
    },
  };
};

/**
 * Generate moderation action event
 */
export const generateModerationActionEvent = (): RealTimeEvent => {
  const moderator = faker.helpers.arrayElement(mockUsers);
  const actions = ['comment_hidden', 'comment_removed', 'user_warned', 'report_resolved'];
  const action = faker.helpers.arrayElement(actions);

  return {
    id: generateId('event'),
    type: 'moderation_action',
    timestamp: new Date().toISOString(),
    userId: moderator.id,
    priority: 'medium',
    data: {
      moderatorId: moderator.id,
      moderatorName: getUserName(moderator),
      action,
      targetId: generateId('target'),
      reason: faker.helpers.arrayElement([
        'Violation of community guidelines',
        'Spam content',
        'Inappropriate language',
        'Off-topic discussion',
      ]),
      automated: faker.datatype.boolean({ probability: 0.3 }),
    },
  };
};

/**
 * Generate system notification event
 */
export const generateSystemNotificationEvent = (): RealTimeEvent => {
  const notificationTypes = [
    'maintenance_scheduled',
    'feature_update',
    'policy_change',
    'security_alert',
    'performance_improvement',
  ];

  const type = faker.helpers.arrayElement(notificationTypes);

  const messages = {
    maintenance_scheduled: 'Scheduled maintenance tonight from 2-4 AM EST',
    feature_update: 'New expert verification features now available',
    policy_change: 'Updated community guidelines effective immediately',
    security_alert: 'Security enhancement: Two-factor authentication recommended',
    performance_improvement: 'Faster loading times and improved search functionality',
  };

  return {
    id: generateId('event'),
    type: 'system_notification',
    timestamp: new Date().toISOString(),
    priority: type === 'security_alert' ? 'high' : 'medium',
    data: {
      notificationType: type,
      title: faker.helpers.arrayElement([
        'System Update',
        'Important Notice',
        'Platform Enhancement',
        'Security Notice',
      ]),
      message: messages[type as keyof typeof messages],
      actionRequired: type === 'security_alert' || type === 'policy_change',
      dismissible: type !== 'security_alert',
    },
  };
};

/**
 * Generate a random real-time event
 */
export const generateRandomRealTimeEvent = (): RealTimeEvent => {
  const eventGenerators = [
    generateBillStatusChangeEvent,
    generateBillEngagementUpdateEvent,
    generateNewCommentEvent,
    generateCommentVoteEvent,
    generateExpertContributionEvent,
    generateTrendingUpdateEvent,
    generateUserActivityEvent,
    generateModerationActionEvent,
    generateSystemNotificationEvent,
  ];

  // Weight the events based on realistic frequency
  const weights = [5, 20, 25, 30, 8, 10, 35, 7, 3];

  const generator = weightedRandom(eventGenerators, weights);
  return generator();
};

/**
 * Generate a batch of real-time events
 */
export const generateRealTimeEventBatch = (count: number = 10): RealTimeEvent[] => {
  return Array.from({ length: count }, () => generateRandomRealTimeEvent());
};

/**
 * Real-time event simulator class
 */
export class RealTimeEventSimulator {
  private events: RealTimeEvent[] = [];
  private listeners: Array<(event: RealTimeEvent) => void> = [];
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(private eventInterval: number = 5000) {}

  /**
   * Start the event simulator
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      const event = generateRandomRealTimeEvent();
      this.events.push(event);
      this.notifyListeners(event);

      // Keep only last 100 events
      if (this.events.length > 100) {
        this.events = this.events.slice(-100);
      }
    }, this.eventInterval);
  }

  /**
   * Stop the event simulator
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: RealTimeEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: RealTimeEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): RealTimeEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: RealTimeEventType): RealTimeEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Manually trigger an event
   */
  triggerEvent(eventType: RealTimeEventType): void {
    let event: RealTimeEvent;

    switch (eventType) {
      case 'bill_status_change':
        event = generateBillStatusChangeEvent();
        break;
      case 'bill_engagement_update':
        event = generateBillEngagementUpdateEvent();
        break;
      case 'new_comment':
        event = generateNewCommentEvent();
        break;
      case 'expert_contribution':
        event = generateExpertContributionEvent();
        break;
      default:
        event = generateRandomRealTimeEvent();
    }

    this.events.push(event);
    this.notifyListeners(event);
  }

  private notifyListeners(event: RealTimeEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in real-time event listener:', error);
      }
    });
  }
}

/**
 * Connection status simulation
 */
export interface ConnectionStatus {
  connected: boolean;
  lastPing: string;
  latency: number;
  reconnectAttempts: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Generate connection status
 */
export const generateConnectionStatus = (): ConnectionStatus => {
  const connected = faker.datatype.boolean({ probability: 0.95 });
  const latency = connected ? faker.number.int({ min: 20, max: 200 }) : 0;

  let quality: ConnectionStatus['quality'] = 'excellent';
  if (latency > 150) quality = 'poor';
  else if (latency > 100) quality = 'fair';
  else if (latency > 50) quality = 'good';

  return {
    connected,
    lastPing: new Date().toISOString(),
    latency,
    reconnectAttempts: connected ? 0 : faker.number.int({ min: 1, max: 5 }),
    quality,
  };
};

/**
 * Default real-time simulator instance
 */
export const mockRealTimeSimulator = new RealTimeEventSimulator(3000);

/**
 * Initial batch of real-time events
 */
export const mockRealTimeEvents = generateRealTimeEventBatch(20);

/**
 * Mock connection status
 */
export const mockConnectionStatus = generateConnectionStatus();
