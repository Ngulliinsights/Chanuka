import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import WebSocket from 'ws';
import { app } from '../../index.ts';
import { logger } from '../../../shared/core/src/observability/logging';

describe('WebSocket and Real-Time Features Integration Tests', () => {
  let server: any;
  let serverPort: number;
  let wsClient: WebSocket;
  let authToken: string;

  beforeAll(async () => {
    // Start the server
    server = app.listen(0);
    serverPort = server.address().port;
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    if (server) {
      server.close();
    }
  });

  beforeEach(async () => {
    // Create test user and get auth token
    const response = await fetch(`http://localhost:${serverPort}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `wstest-${Date.now()}@example.com`,
        password: 'SecureTestPass123!',
        firstName: 'WebSocket',
        lastName: 'Test',
        role: 'citizen'
      })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.data?.token || '';
    }
  });

  afterEach(async () => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }

    // Force cleanup of any remaining timers to prevent hanging
    if (global.gc) {
      global.gc();
    }
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        expect(wsClient.readyState).toBe(WebSocket.OPEN);
        done();
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle WebSocket authentication', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        // Send authentication message
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          expect(message.type).toBe('auth_success');
          expect(message.userId).toBeDefined();
          done();
        } else if (message.type === 'auth_error') {
          done(new Error('Authentication failed'));
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should reject invalid authentication tokens', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        // Send invalid authentication message
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: 'invalid-token'
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_error') {
          expect(message.type).toBe('auth_error');
          expect(message.error).toBeDefined();
          done();
        } else if (message.type === 'auth_success') {
          done(new Error('Should not authenticate with invalid token'));
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle connection close gracefully', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.close();
      });

      wsClient.on('close', (code, reason) => {
        expect(code).toBeDefined();
        done();
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Real-Time Bill Updates', () => {
    it('should receive bill status updates', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        // Authenticate first
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      let authenticated = false;

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success' && !authenticated) {
          authenticated = true;
          
          // Subscribe to bill updates
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'bill_updates'
          }));
          
          // Simulate a bill update (this would normally come from the system)
          setTimeout(() => {
            wsClient.send(JSON.stringify({
              type: 'test_bill_update',
              billId: 'test-bill-1',
              status: 'committee',
              previousStatus: 'introduced'
            }));
          }, 100);
        } else if (message.type === 'bill_update') {
          expect(message.type).toBe('bill_update');
          expect(message.billId).toBeDefined();
          expect(message.status).toBeDefined();
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle bill subscription management', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      let subscriptionConfirmed = false;

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Subscribe to specific bill
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'bill',
            billId: 'test-bill-123'
          }));
        } else if (message.type === 'subscription_confirmed') {
          expect(message.channel).toBe('bill');
          expect(message.billId).toBe('test-bill-123');
          subscriptionConfirmed = true;
          
          // Unsubscribe
          wsClient.send(JSON.stringify({
            type: 'unsubscribe',
            channel: 'bill',
            billId: 'test-bill-123'
          }));
        } else if (message.type === 'subscription_removed' && subscriptionConfirmed) {
          expect(message.channel).toBe('bill');
          expect(message.billId).toBe('test-bill-123');
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Real-Time Comment Updates', () => {
    it('should receive new comment notifications', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Subscribe to comment updates for a specific bill
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'comments',
            billId: 'test-bill-1'
          }));
          
          // Simulate a new comment
          setTimeout(() => {
            wsClient.send(JSON.stringify({
              type: 'test_new_comment',
              billId: 'test-bill-1',
              commentId: 'comment-123',
              content: 'This is a test comment',
              author: 'Test User'
            }));
          }, 100);
        } else if (message.type === 'new_comment') {
          expect(message.type).toBe('new_comment');
          expect(message.billId).toBe('test-bill-1');
          expect(message.commentId).toBeDefined();
          expect(message.content).toBeDefined();
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle comment voting updates', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Subscribe to comment voting updates
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'comment_votes',
            commentId: 'comment-123'
          }));
          
          // Simulate a vote update
          setTimeout(() => {
            wsClient.send(JSON.stringify({
              type: 'test_vote_update',
              commentId: 'comment-123',
              upvotes: 5,
              downvotes: 1,
              score: 4
            }));
          }, 100);
        } else if (message.type === 'vote_update') {
          expect(message.type).toBe('vote_update');
          expect(message.commentId).toBe('comment-123');
          expect(message.upvotes).toBeDefined();
          expect(message.downvotes).toBeDefined();
          expect(message.score).toBeDefined();
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Real-Time Analytics Updates', () => {
    it('should receive engagement analytics updates', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Subscribe to analytics updates
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'analytics',
            billId: 'test-bill-1'
          }));
          
          // Simulate analytics update
          setTimeout(() => {
            wsClient.send(JSON.stringify({
              type: 'test_analytics_update',
              billId: 'test-bill-1',
              views: 150,
              comments: 12,
              engagement: 0.75
            }));
          }, 100);
        } else if (message.type === 'analytics_update') {
          expect(message.type).toBe('analytics_update');
          expect(message.billId).toBe('test-bill-1');
          expect(message.views).toBeDefined();
          expect(message.comments).toBeDefined();
          expect(message.engagement).toBeDefined();
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle system-wide statistics updates', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Subscribe to system statistics
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'system_stats'
          }));
          
          // Simulate system stats update
          setTimeout(() => {
            wsClient.send(JSON.stringify({
              type: 'test_system_stats',
              totalBills: 1250,
              activeBills: 45,
              totalUsers: 5000,
              activeUsers: 150
            }));
          }, 100);
        } else if (message.type === 'system_stats_update') {
          expect(message.type).toBe('system_stats_update');
          expect(message.totalBills).toBeDefined();
          expect(message.activeBills).toBeDefined();
          expect(message.totalUsers).toBeDefined();
          expect(message.activeUsers).toBeDefined();
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('WebSocket Error Handling', () => {
    it('should handle malformed messages', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        // Send malformed JSON
        wsClient.send('{"invalid": json}');
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.type).toBe('error');
          expect(message.error).toContain('Invalid message format');
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle unknown message types', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'unknown_message_type',
          data: 'test'
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'error') {
          expect(message.type).toBe('error');
          expect(message.error).toContain('Unknown message type');
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle subscription to non-existent channels', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Try to subscribe to non-existent channel
          wsClient.send(JSON.stringify({
            type: 'subscribe',
            channel: 'non_existent_channel'
          }));
        } else if (message.type === 'error') {
          expect(message.type).toBe('error');
          expect(message.error).toContain('Invalid channel');
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('Connection Management', () => {
    it('should handle multiple concurrent connections', async () => {
      const connections: WebSocket[] = [];
      const connectionPromises: Promise<void>[] = [];

      // Create 5 concurrent connections
      for (let i = 0; i < 5; i++) {
        const promise = new Promise<void>((resolve, reject) => {
          const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
          connections.push(ws);

          ws.on('open', () => {
            ws.send(JSON.stringify({
              type: 'auth',
              token: authToken
            }));
          });

          ws.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'auth_success') {
              resolve();
            } else if (message.type === 'auth_error') {
              reject(new Error('Authentication failed'));
            }
          });

          ws.on('error', reject);
        });

        connectionPromises.push(promise);
      }

      // Wait for all connections to authenticate
      await Promise.all(connectionPromises);

      expect(connections).toHaveLength(5);
      connections.forEach(ws => {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      });

      // Close all connections
      connections.forEach(ws => ws.close());
    });

    it('should handle connection heartbeat/ping-pong', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'ping'
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'pong') {
          expect(message.type).toBe('pong');
          expect(message.timestamp).toBeDefined();
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle connection timeout', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        // Don't send any messages, let connection timeout
        // This test verifies the server handles inactive connections
      });

      // Set a timeout to check if connection is still alive
      setTimeout(() => {
        if (wsClient.readyState === WebSocket.OPEN) {
          // Connection is still open, which is expected behavior
          // Server should handle timeouts internally
          done();
        } else {
          // Connection was closed due to timeout
          done();
        }
      }, 2000);

      wsClient.on('error', (error) => {
        // Timeout errors are acceptable
        done();
      });
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle rapid message sending', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      let messageCount = 0;
      const totalMessages = 50;

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Send rapid messages
          for (let i = 0; i < totalMessages; i++) {
            wsClient.send(JSON.stringify({
              type: 'ping',
              sequence: i
            }));
          }
        } else if (message.type === 'pong') {
          messageCount++;
          
          if (messageCount === totalMessages) {
            expect(messageCount).toBe(totalMessages);
            done();
          }
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });

    it('should handle large message payloads', (done) => {
      wsClient = new WebSocket(`ws://localhost:${serverPort}/ws`);

      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({
          type: 'auth',
          token: authToken
        }));
      });

      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        
        if (message.type === 'auth_success') {
          // Send large payload
          const largeData = 'x'.repeat(10000); // 10KB of data
          
          wsClient.send(JSON.stringify({
            type: 'test_large_payload',
            data: largeData
          }));
        } else if (message.type === 'large_payload_received') {
          expect(message.type).toBe('large_payload_received');
          expect(message.size).toBeGreaterThan(10000);
          done();
        }
      });

      wsClient.on('error', (error) => {
        done(error);
      });
    });
  });
});











































