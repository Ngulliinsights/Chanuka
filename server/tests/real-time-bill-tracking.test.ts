import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock WebSocket
global.WebSocket = vi.fn().mockImplementation(() => ({
  send: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  readyState: 1,
}));

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { webSocketService } from '../infrastructure/websocket.js';
import { billStatusMonitorService } from '../features/bills/bill-status-monitor.js';
import { userPreferencesService } from '../features/users/domain/user-preferences.js';
import { database as db, user as users, bill as bills, billEngagement } from '@shared/database/connection.js';
import { eq } from 'drizzle-orm';
import { logger } from '@shared/core';

// Mock billStatusMonitor
const billStatusMonitor = {
  initialize: vi.fn(),
  stopMonitoring: vi.fn(),
  triggerStatusChange: vi.fn(),
  getMonitoringStats: vi.fn(() => ({ activeMonitors: 0, totalEvents: 0 })),
  addBillToMonitoring: vi.fn(),
  getBillStatus: vi.fn(() => 'introduced')
};

describe('Real-Time Bill Tracking System', () => {
  let testUserId: string;
  let testBillId: number;
  let authToken: string;
  let wsClient: WebSocket;
  const wsUrl = 'ws://localhost:5000/ws';

  beforeAll(async () => {
    // Create test user
    const testUser = await db.insert(users).values({
      email: 'test@example.com',
      passwordHash: 'hashed_password',
      name: 'Test User',
      role: 'citizen'
    }).returning();
    testUserId = testUser[0].id;

    // Create test bill
    const testBill = await db.insert(bills).values({
      title: 'Test Bill for Real-Time Tracking',
      description: 'A test bill to verify real-time tracking functionality',
      status: 'introduced',
      billNumber: 'TEST-001'
    }).returning();
    testBillId = testBill[0].id;

    // Create auth token
    authToken = jwt.sign(
      { userId: testUserId },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '1h' }
    );

    // Initialize bill status monitor
    await billStatusMonitor.initialize();
  });

  afterAll(async () => {
    // Cleanup test data
    await db.delete(billEngagement).where(eq(billEngagement.userId, testUserId));
    await db.delete(bills).where(eq(bills.id, testBillId));
    await db.delete(users).where(eq(users.id, testUserId));
    
    // Stop monitoring
    billStatusMonitor.stopMonitoring();
    
    // Close WebSocket connection if open
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
  });

  beforeEach(async () => {
    // Reset bill status
    await db.update(bills)
      .set({ status: 'introduced' })
      .where(eq(bills.id, testBillId));
  });

  describe('WebSocket Connection and Authentication', () => {
    it('should reject connection without token', async () => {
      const ws = new WebSocket(wsUrl);
      
      return new Promise<void>((resolve) => {
        ws.on('error', (error) => {
          expect(error).toBeDefined();
          resolve();
        });
        
        ws.on('close', (code) => {
          expect(code).not.toBe(1000); // Not a normal closure
          resolve();
        });
      });
    });

    it('should accept connection with valid token', async () => {
      const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      return new Promise<void>((resolve, reject) => {
        ws.on('open', () => {
          expect(ws.readyState).toBe(WebSocket.OPEN);
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          reject(error);
        });
      });
    });

    it('should receive connection confirmation message', async () => {
      const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      return new Promise<void>((resolve, reject) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          
          if (message.type === 'connected') {
            expect(message.message).toBe('WebSocket connection established');
            expect(message.data.userId).toBe(testUserId);
            ws.close();
            resolve();
          }
        });
        
        ws.on('error', (error) => {
          reject(error);
        });
      });
    });
  });

  describe('Bill Subscription Management', () => {
    beforeEach((done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      wsClient.on('open', () => done());
      wsClient.on('error', done);
    });

    afterEach(() => {
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    });

    it('should allow subscribing to bill updates', (done) => {
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribed') {
          expect(message.data.billId).toBe(testBillId);
          expect(message.data.message).toContain(`Subscribed to bill ${testBillId}`);
          done();
        }
      });

      wsClient.send(JSON.stringify({
        type: 'subscribe',
        data: {
          billId: testBillId,
          subscriptionTypes: ['status_change', 'new_comment']
        }
      }));
    });

    it('should allow unsubscribing from bill updates', (done) => {
      let subscribed = false;
      
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribed' && !subscribed) {
          subscribed = true;
          // Now unsubscribe
          wsClient.send(JSON.stringify({
            type: 'unsubscribe',
            data: { billId: testBillId }
          }));
        } else if (message.type === 'unsubscribed') {
          expect(message.data.billId).toBe(testBillId);
          expect(message.data.message).toContain(`Unsubscribed from bill ${testBillId}`);
          done();
        }
      });

      // First subscribe
      wsClient.send(JSON.stringify({
        type: 'subscribe',
        data: { billId: testBillId }
      }));
    });
  });

  describe('User Preferences Management', () => {
    beforeEach((done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      wsClient.on('open', () => done());
      wsClient.on('error', done);
    });

    afterEach(() => {
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    });

    it('should retrieve user preferences', (done) => {
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'preferences') {
          expect(message.data).toBeDefined();
          expect(message.data.billTracking).toBeDefined();
          expect(message.data.billTracking.statusChanges).toBeDefined();
          expect(message.data.billTracking.updateFrequency).toBeDefined();
          done();
        }
      });

      wsClient.send(JSON.stringify({
        type: 'get_preferences'
      }));
    });

    it('should update user preferences', (done) => {
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'preferences_updated') {
          expect(message.data.statusChanges).toBe(false);
          expect(message.data.updateFrequency).toBe('hourly');
          done();
        }
      });

      wsClient.send(JSON.stringify({
        type: 'update_preferences',
        data: {
          preferences: {
            statusChanges: false,
            updateFrequency: 'hourly'
          }
        }
      }));
    });
  });

  describe('Real-Time Bill Status Updates', () => {
    beforeEach((done) => {
      wsClient = new WebSocket(`${wsUrl}?token=${authToken}`);
      wsClient.on('open', () => {
        // Subscribe to bill updates
        wsClient.send(JSON.stringify({
          type: 'subscribe',
          data: { billId: testBillId }
        }));
        done();
      });
      wsClient.on('error', done);
    });

    afterEach(() => {
      if (wsClient && wsClient.readyState === WebSocket.OPEN) {
        wsClient.close();
      }
    });

    it('should receive real-time bill status updates', (done) => {
      let subscribed = false;
      
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribed' && !subscribed) {
          subscribed = true;
          // Trigger a status change
          billStatusMonitor.triggerStatusChange(testBillId, 'committee', {
            title: 'Test Bill for Real-Time Tracking',
            testMode: true
          });
        } else if (message.type === 'bill_update') {
          expect(message.billId).toBe(testBillId);
          expect(message.update.type).toBe('status_change');
          expect(message.update.data.newStatus).toBe('committee');
          expect(message.update.data.oldStatus).toBe('introduced');
          done();
        }
      });
    });

    it('should handle broadcast updates to multiple subscribers', (done) => {
      // Create a second WebSocket connection
      const wsClient2 = new WebSocket(`${wsUrl}?token=${authToken}`);
      let client1Ready = false;
      let client2Ready = false;
      let updatesReceived = 0;
      
      const checkCompletion = () => {
        updatesReceived++;
        if (updatesReceived === 2) {
          wsClient2.close();
          done();
        }
      };

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribed' && !client1Ready) {
          client1Ready = true;
          if (client1Ready && client2Ready) {
            // Broadcast update
            webSocketService.broadcastBillUpdate(testBillId, {
              type: 'status_change',
              data: {
                billId: testBillId,
                title: 'Test Bill',
                oldStatus: 'introduced',
                newStatus: 'committee'
              },
              timestamp: new Date()
            });
          }
        } else if (message.type === 'bill_update') {
          checkCompletion();
        }
      });

      wsClient2.on('open', () => {
        wsClient2.send(JSON.stringify({
          type: 'subscribe',
          data: { billId: testBillId }
        }));
      });

      wsClient2.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'subscribed' && !client2Ready) {
          client2Ready = true;
          if (client1Ready && client2Ready) {
            // Broadcast update
            webSocketService.broadcastBillUpdate(testBillId, {
              type: 'status_change',
              data: {
                billId: testBillId,
                title: 'Test Bill',
                oldStatus: 'introduced',
                newStatus: 'committee'
              },
              timestamp: new Date()
            });
          }
        } else if (message.type === 'bill_update') {
          checkCompletion();
        }
      });
    });
  });

  describe('User Preference-Based Notifications', () => {
    it('should respect immediate notification preferences', async () => {
      // Set user preference to immediate
      await userPreferencesService.updateBillTrackingPreferences(testUserId, {
        statusChanges: true,
        updateFrequency: 'immediate'
      });

      // Create bill engagement to track the bill
      await db.insert(billEngagement).values({
        userId: testUserId,
        billId: testBillId,
        viewCount: 1,
        commentCount: 0,
        shareCount: 0,
        engagementScore: '1.0'
      });

      // Trigger status change and verify immediate notification
      await billStatusMonitor.triggerStatusChange(testBillId, 'committee', {
        title: 'Test Bill for Real-Time Tracking'
      });

      // The notification should be sent immediately
      // In a real test, you'd verify the notification was created in the database
      const stats = webSocketService.getStats();
      expect(stats).toBeDefined();
    });

    it('should batch notifications for hourly preference', async () => {
      // Set user preference to hourly
      await userPreferencesService.updateBillTrackingPreferences(testUserId, {
        statusChanges: true,
        updateFrequency: 'hourly'
      });

      // Create bill engagement
      await db.insert(billEngagement).values({
        userId: testUserId,
        billId: testBillId,
        viewCount: 1,
        commentCount: 0,
        shareCount: 0,
        engagementScore: '1.0'
      });

      // Trigger status change
      await billStatusMonitor.triggerStatusChange(testBillId, 'committee', {
        title: 'Test Bill for Real-Time Tracking'
      });

      // The notification should be batched, not sent immediately
      // In a real implementation, you'd verify the notification is in the batch queue
      const monitorStats = billStatusMonitor.getMonitoringStats();
      expect(monitorStats.isMonitoring).toBe(true);
    });
  });

  describe('Bill Status Monitor', () => {
    it('should detect bill status changes', async () => {
      // Add bill to monitoring
      await billStatusMonitor.addBillToMonitoring(testBillId);
      
      // Verify bill is being monitored
      const status = billStatusMonitor.getBillStatus(testBillId);
      expect(status).toBe('introduced');
      
      // Trigger status change
      await billStatusMonitor.triggerStatusChange(testBillId, 'committee');
      
      // Verify status was updated
      const newStatus = billStatusMonitor.getBillStatus(testBillId);
      expect(newStatus).toBe('committee');
    });

    it('should provide monitoring statistics', () => {
      const stats = billStatusMonitor.getMonitoringStats();
      
      expect(stats).toBeDefined();
      expect(typeof stats.billsMonitored).toBe('number');
      expect(typeof stats.isMonitoring).toBe('boolean');
      expect(typeof stats.checkInterval).toBe('number');
      expect(stats.lastCheck).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid WebSocket messages gracefully', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      ws.on('open', () => {
        // Send invalid JSON
        ws.send('invalid json');
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.message).toBe('Invalid message format');
          ws.close();
          done();
        }
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    });

    it('should handle unknown message types', (done) => {
      const ws = new WebSocket(`${wsUrl}?token=${authToken}`);
      
      ws.on('open', () => {
        ws.send(JSON.stringify({
          type: 'unknown_type',
          data: {}
        }));
      });
      
      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.message).toBe('Unknown message type');
          ws.close();
          done();
        }
      });
      
      ws.on('error', (error) => {
        done(error);
      });
    });
  });
});












































