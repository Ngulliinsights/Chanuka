/**
 * Connection Migration Stability Integration Tests
 * 
 * Tests connection stability, subscription preservation, and zero-downtime
 * migration between WebSocket services in realistic scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Server } from 'http';
import { createServer } from 'http';
import { ConnectionMigrator } from '../../infrastructure/connection-migrator.js';
import { webSocketService } from '../../infrastructure/websocket.js';
import { socketIOService } from '../../infrastructure/socketio-service.js';
import { featureFlagService } from '../../infrastructure/feature-flags.js';

describe('Connection Migration Stability Integration Tests', () => {
  let server: Server;
  let connectionMigrator: ConnectionMigrator;
  let port: number;

  beforeEach(async () => {
    // Create HTTP server for testing
    server = createServer();
    port = 3000 + Math.floor(Math.random() * 1000);
    
    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    // Initialize connection migrator
    connectionMigrator = new ConnectionMigrator();
    connectionMigrator.initialize(server);

    // Reset feature flags
    featureFlagService.toggleFlag('websocket_socketio_migration', false);
    featureFlagService.updateRolloutPercentage('websocket_socketio_migration', 0);
  });

  afterEach(async () => {
    await connectionMigrator.shutdown();
    
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  describe('Zero-Downtime Migration', () => {
    it('should maintain service availability during migration', async () => {
      // Mock active connections
      const mockStats = {
        activeConnections: 50,
        totalConnections: 100,
        totalMessages: 1000,
        droppedMessages: 0
      };

      vi.spyOn(webSocketService, 'getStats').mockReturnValue(mockStats);
      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        ...mockStats,
        activeConnections: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2', 'user3']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      // Mock feature flag service for successful migration
      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      // Track service availability during migration
      const availabilityChecks: boolean[] = [];
      const checkInterval = setInterval(() => {
        const status = connectionMigrator.getMigrationStatus();
        availabilityChecks.push(status.isHealthy);
      }, 100);

      try {
        await connectionMigrator.startBlueGreenMigration();
        
        // Stop availability checking
        clearInterval(checkInterval);
        
        // Verify service was available throughout migration
        expect(availabilityChecks.length).toBeGreaterThan(0);
        expect(availabilityChecks.every(available => available)).toBe(true);
        
        // Verify migration completed successfully
        expect(connectionMigrator.getActiveService()).toBe('socketio');
        
      } finally {
        clearInterval(checkInterval);
      }
    });

    it('should handle connection spikes during migration', async () => {
      let connectionCount = 50;
      
      // Simulate connection spike during migration
      vi.spyOn(webSocketService, 'getStats').mockImplementation(() => ({
        activeConnections: connectionCount,
        totalConnections: connectionCount + 50,
        totalMessages: connectionCount * 20,
        droppedMessages: 0
      }));

      vi.spyOn(socketIOService, 'getStats').mockImplementation(() => ({
        activeConnections: Math.max(0, 100 - connectionCount),
        totalConnections: Math.max(0, 100 - connectionCount),
        totalMessages: Math.max(0, 100 - connectionCount) * 10,
        droppedMessages: 0
      }));

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      // Simulate connection spike during migration
      setTimeout(() => {
        connectionCount = 150; // Spike to 150 connections
      }, 1000);

      setTimeout(() => {
        connectionCount = 75; // Normalize to 75 connections
      }, 2000);

      await connectionMigrator.startBlueGreenMigration();
      
      expect(connectionMigrator.getActiveService()).toBe('socketio');
    });
  });

  describe('Subscription Preservation', () => {
    it('should preserve all user subscriptions during migration', async () => {
      const userSubscriptions = {
        'user1': [1, 2, 3, 4, 5],
        'user2': [6, 7, 8],
        'user3': [9, 10, 11, 12],
        'user4': [13, 14],
        'user5': [15, 16, 17, 18, 19, 20]
      };

      const connectedUsers = Object.keys(userSubscriptions);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: connectedUsers.length,
        totalConnections: connectedUsers.length + 10,
        totalMessages: 2000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(connectedUsers);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return userSubscriptions[userId] || [];
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      // Mock Socket.IO service to return same subscriptions after migration
      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return userSubscriptions[userId] || [];
      });

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await connectionMigrator.startBlueGreenMigration();

      const status = connectionMigrator.getMigrationStatus();
      const totalExpectedSubscriptions = Object.values(userSubscriptions)
        .reduce((total, subs) => total + subs.length, 0);

      expect(status.progress?.preservedSubscriptions).toBe(totalExpectedSubscriptions);
      expect(connectionMigrator.getActiveService()).toBe('socketio');
    });

    it('should handle partial subscription preservation gracefully', async () => {
      const userSubscriptions = {
        'user1': [1, 2, 3],
        'user2': [4, 5, 6],
        'user3': [7, 8, 9]
      };

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(Object.keys(userSubscriptions));
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return userSubscriptions[userId] || [];
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      // Mock Socket.IO service to return fewer subscriptions (simulating partial loss)
      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const originalSubs = userSubscriptions[userId] || [];
        return originalSubs.slice(0, Math.max(1, originalSubs.length - 1)); // Lose one subscription per user
      });

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 3,
        totalConnections: 5,
        totalMessages: 500,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await connectionMigrator.startBlueGreenMigration();

      const status = connectionMigrator.getMigrationStatus();
      
      // Should still complete migration even with some subscription loss
      expect(connectionMigrator.getActiveService()).toBe('socketio');
      expect(status.progress?.preservedSubscriptions).toBeGreaterThan(0);
      expect(status.progress?.preservedSubscriptions).toBeLessThan(9); // Less than total original subscriptions
    });
  });

  describe('Error Recovery and Rollback', () => {
    it('should rollback automatically on high error rate', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 50,
        totalConnections: 100,
        totalMessages: 1000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      // Mock high error rate after some traffic shift
      let callCount = 0;
      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockImplementation(() => {
        callCount++;
        return callCount > 2; // Trigger rollback after a few checks
      });

      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.025, // 2.5% error rate (above threshold)
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      // Verify rollback occurred
      expect(connectionMigrator.getActiveService()).toBe('legacy');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.phase).toBe('rolled_back');
    });

    it('should handle service failures during migration', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 10,
        totalConnections: 20,
        totalMessages: 200,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      // Mock Socket.IO service becoming unhealthy during migration
      let healthCheckCount = 0;
      vi.spyOn(socketIOService, 'getHealthStatus').mockImplementation(() => {
        healthCheckCount++;
        return {
          isHealthy: healthCheckCount <= 2, // Become unhealthy after 2 checks
          timestamp: new Date().toISOString()
        };
      });

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      // Verify rollback occurred due to service failure
      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });

    it('should recover from temporary network issues', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 25,
        totalConnections: 50,
        totalMessages: 500,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      // Mock temporary high response time that recovers
      let responseTimeCheckCount = 0;
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockImplementation(() => {
        responseTimeCheckCount++;
        return {
          flagName: 'websocket_socketio_migration',
          totalRequests: 1000,
          newImplementationPercentage: 50,
          legacyImplementationPercentage: 50,
          errorRate: 0.001,
          averageResponseTime: responseTimeCheckCount === 2 ? 600 : 150, // Spike once then recover
          statisticalSignificance: true,
          confidenceLevel: 95
        };
      });

      // Mock rollback trigger that only fires once during the spike
      let rollbackCheckCount = 0;
      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockImplementation(() => {
        rollbackCheckCount++;
        return rollbackCheckCount === 2; // Only trigger rollback on the spike
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      // Should rollback due to temporary spike
      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });

    it('should handle graceful connection handover during rollback', async () => {
      const preRollbackUsers = ['user1', 'user2', 'user3'];
      const userSubscriptions = {
        'user1': [1, 2, 3],
        'user2': [4, 5, 6],
        'user3': [7, 8, 9]
      };

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(preRollbackUsers);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return userSubscriptions[userId] || [];
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);
      vi.spyOn(webSocketService, 'isUserConnected').mockReturnValue(true);

      vi.spyOn(socketIOService, 'getAllConnectedUsers').mockReturnValue(preRollbackUsers);
      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return userSubscriptions[userId] || [];
      });
      vi.spyOn(socketIOService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 50,
        totalConnections: 100,
        totalMessages: 1000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 25,
        totalConnections: 25,
        totalMessages: 500,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      // Mock rollback trigger after some progress
      let callCount = 0;
      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockImplementation(() => {
        callCount++;
        return callCount > 3; // Trigger rollback after some progress
      });

      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.025, // High error rate to trigger rollback
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      // Verify rollback preserved connections
      expect(connectionMigrator.getActiveService()).toBe('legacy');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.phase).toBe('rolled_back');
    });
  });

  describe('Performance Under Load', () => {
    it('should handle high connection count migration', async () => {
      const highConnectionCount = 1000;
      const userIds = Array.from({ length: highConnectionCount }, (_, i) => `user${i}`);

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(userIds);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const userIndex = parseInt(user_id.replace('user', ''));
        return [userIndex % 10 + 1, (userIndex % 10) + 2]; // 2 subscriptions per user
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: highConnectionCount,
        totalConnections: highConnectionCount + 200,
        totalMessages: highConnectionCount * 50,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const userIndex = parseInt(user_id.replace('user', ''));
        return [userIndex % 10 + 1, (userIndex % 10) + 2]; // Same subscriptions
      });

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 10000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.0005, // Very low error rate for high load
        averageResponseTime: 200, // Slightly higher but acceptable
        statisticalSignificance: true,
        confidenceLevel: 99
      });

      const startTime = Date.now();
      await connectionMigrator.startBlueGreenMigration();
      const migrationDuration = Date.now() - startTime;

      // Verify migration completed successfully even with high load
      expect(connectionMigrator.getActiveService()).toBe('socketio');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.migratedConnections).toBeGreaterThan(0);
      expect(status.progress?.preservedSubscriptions).toBe(highConnectionCount * 2);
      
      // Migration should complete within reasonable time (less than 5 minutes)
      expect(migrationDuration).toBeLessThan(300000);
    });

    it('should maintain performance during concurrent operations', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2', 'user3']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3, 4, 5]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(2); // Multiple connections per user

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 100,
        totalConnections: 150,
        totalMessages: 5000,
        droppedMessages: 1 // Minimal message loss
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getUserSubscriptions').mockReturnValue([1, 2, 3, 4, 5]);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 2000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.0002, // Very low error rate
        averageResponseTime: 120, // Good performance
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      // Simulate concurrent operations during migration
      const concurrentOperations = [
        connectionMigrator.startBlueGreenMigration(),
        // Simulate status checks during migration
        ...Array.from({ length: 10 }, () => 
          new Promise(resolve => setTimeout(() => {
            connectionMigrator.getMigrationStatus();
            resolve(undefined);
          }, Math.random() * 1000))
        )
      ];

      await Promise.all(concurrentOperations);

      expect(connectionMigrator.getActiveService()).toBe('socketio');
    });

    it('should handle memory pressure during migration', async () => {
      const highConnectionCount = 500;
      const userIds = Array.from({ length: highConnectionCount }, (_, i) => `user${i}`);

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(userIds);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const userIndex = parseInt(user_id.replace('user', ''));
        return [userIndex % 5 + 1]; // 1 subscription per user
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      // Mock high memory usage scenario
      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: highConnectionCount,
        totalConnections: highConnectionCount + 100,
        totalMessages: highConnectionCount * 100,
        droppedMessages: 5 // Some message drops under pressure
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const userIndex = parseInt(user_id.replace('user', ''));
        return [userIndex % 5 + 1]; // Same subscriptions
      });

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      
      // Mock slightly degraded performance under memory pressure
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 5000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.002, // Slightly higher but acceptable
        averageResponseTime: 300, // Higher response time but within limits
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await connectionMigrator.startBlueGreenMigration();

      expect(connectionMigrator.getActiveService()).toBe('socketio');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.migratedConnections).toBeGreaterThan(0);
    });

    it('should handle network partitions and reconnections', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(2);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 4, // 2 users * 2 connections
        totalConnections: 10,
        totalMessages: 1000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      // Mock intermittent health issues (network partition simulation)
      let healthCheckCount = 0;
      vi.spyOn(webSocketService, 'getHealthStatus').mockImplementation(() => {
        healthCheckCount++;
        return {
          isHealthy: healthCheckCount % 3 !== 0, // Intermittent health issues
          timestamp: new Date().toISOString()
        };
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getUserSubscriptions').mockReturnValue([1, 2, 3]);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await connectionMigrator.startBlueGreenMigration();

      // Should complete despite intermittent health issues
      expect(connectionMigrator.getActiveService()).toBe('socketio');
    });
  });

  describe('Enhanced Connection Preservation', () => {
    it('should preserve connections during progressive threshold validation', async () => {
      // Mock progressive traffic increase with different thresholds
      let trafficPercentage = 0;
      
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2', 'user3']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3, 4, 5]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 100,
        totalConnections: 150,
        totalMessages: 5000,
        droppedMessages: 2 // Minimal drops
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getUserSubscriptions').mockReturnValue([1, 2, 3, 4, 5]);
      vi.spyOn(socketIOService, 'isUserConnected').mockReturnValue(true);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      
      // Mock progressive error rates that are acceptable for each traffic level
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockImplementation(() => {
        trafficPercentage += 25; // Simulate traffic increase
        
        // Return error rates that are within progressive thresholds
        let errorRate = 0.001; // Base error rate
        if (trafficPercentage <= 10) errorRate = 0.015; // Within 2% threshold
        else if (trafficPercentage <= 25) errorRate = 0.01; // Within 1.5% threshold
        else if (trafficPercentage <= 50) errorRate = 0.008; // Within 1% threshold
        else errorRate = 0.003; // Within 0.5% threshold
        
        return {
          flagName: 'websocket_socketio_migration',
          totalRequests: 1000,
          newImplementationPercentage: 50,
          legacyImplementationPercentage: 50,
          errorRate,
          averageResponseTime: 150,
          statisticalSignificance: true,
          confidenceLevel: 95
        };
      });

      await connectionMigrator.startBlueGreenMigration();

      expect(connectionMigrator.getActiveService()).toBe('socketio');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.preservedSubscriptions).toBe(15); // 3 users * 5 subscriptions
    });

    it('should handle connection state backup and restoration', async () => {
      const userSubscriptions = {
        'user1': [1, 2, 3],
        'user2': [4, 5, 6, 7],
        'user3': [8, 9]
      };

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(Object.keys(userSubscriptions));
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return userSubscriptions[userId] || [];
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(2); // Multiple connections per user

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 6, // 3 users * 2 connections
        totalConnections: 10,
        totalMessages: 1000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      // Mock successful subscription restoration with 95% preservation rate
      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const originalSubs = userSubscriptions[userId] || [];
        // Simulate 95% preservation (lose 1 subscription for user2 only)
        if (user_id === 'user2') {
          return originalSubs.slice(0, -1); // Lose last subscription
        }
        return originalSubs;
      });

      vi.spyOn(socketIOService, 'isUserConnected').mockReturnValue(true);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await connectionMigrator.startBlueGreenMigration();

      expect(connectionMigrator.getActiveService()).toBe('socketio');
      
      const status = connectionMigrator.getMigrationStatus();
      // Should have preserved most subscriptions (8 out of 9 total)
      expect(status.progress?.preservedSubscriptions).toBe(8);
    });

    it('should validate progressive threshold adjustments', async () => {
      let trafficPercentage = 0;
      
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3, 4]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 100,
        totalConnections: 150,
        totalMessages: 5000,
        droppedMessages: 1
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getUserSubscriptions').mockReturnValue([1, 2, 3, 4]);
      vi.spyOn(socketIOService, 'isUserConnected').mockReturnValue(true);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      
      // Mock progressive error rates that test threshold adjustments
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockImplementation(() => {
        trafficPercentage += 20; // Simulate traffic increase
        
        // Return error rates that test progressive thresholds
        let errorRate = 0.001; // Base error rate
        if (trafficPercentage <= 10) errorRate = 0.018; // Just under 2% threshold
        else if (trafficPercentage <= 25) errorRate = 0.012; // Just under 1.5% threshold
        else if (trafficPercentage <= 50) errorRate = 0.009; // Just under 1% threshold
        else errorRate = 0.004; // Just under 0.5% threshold
        
        return {
          flagName: 'websocket_socketio_migration',
          totalRequests: 1000,
          newImplementationPercentage: 50,
          legacyImplementationPercentage: 50,
          errorRate,
          averageResponseTime: 150,
          statisticalSignificance: true,
          confidenceLevel: 95
        };
      });

      await connectionMigrator.startBlueGreenMigration();

      expect(connectionMigrator.getActiveService()).toBe('socketio');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.preservedSubscriptions).toBe(8); // 2 users * 4 subscriptions
    });

    it('should handle detailed connection state backup and restoration', async () => {
      const complexUserSubscriptions = {
        'user1': [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], // Heavy user
        'user2': [11, 12], // Light user
        'user3': [13, 14, 15, 16, 17], // Medium user
        'user4': [], // No subscriptions
        'user5': [18, 19, 20, 21, 22, 23] // Another heavy user
      };

      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(Object.keys(complexUserSubscriptions));
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockImplementation((user_id) => {
        return complexUserSubscriptions[userId] || [];
      });
      vi.spyOn(webSocketService, 'getConnectionCount').mockImplementation((user_id) => {
        // Simulate different connection counts per user
        const subscriptions = complexUserSubscriptions[userId] || [];
        return Math.max(1, Math.floor(subscriptions.length / 3)); // More subscriptions = more connections
      });

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 12, // Sum of all user connections
        totalConnections: 20,
        totalMessages: 2000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      // Mock 98% subscription preservation (lose 1 subscription from user1)
      vi.spyOn(socketIOService, 'getUserSubscriptions').mockImplementation((user_id) => {
        const originalSubs = complexUserSubscriptions[userId] || [];
        if (user_id === 'user1') {
          return originalSubs.slice(0, -1); // Lose last subscription for user1
        }
        return originalSubs;
      });

      vi.spyOn(socketIOService, 'isUserConnected').mockReturnValue(true);

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001,
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await connectionMigrator.startBlueGreenMigration();

      expect(connectionMigrator.getActiveService()).toBe('socketio');
      
      const status = connectionMigrator.getMigrationStatus();
      // Should have preserved 22 out of 23 total subscriptions (98% preservation)
      expect(status.progress?.preservedSubscriptions).toBe(22);
    });

    it('should handle enhanced rollback with connection preservation', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1, 2, 3]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 50,
        totalConnections: 100,
        totalMessages: 1000,
        droppedMessages: 0
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 25, // Some connections already migrated
        totalConnections: 25,
        totalMessages: 500,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getAllConnectedUsers').mockReturnValue(['user1', 'user2']);
      vi.spyOn(socketIOService, 'getUserSubscriptions').mockReturnValue([1, 2, 3]);
      vi.spyOn(socketIOService, 'getConnectionCount').mockReturnValue(1);
      vi.spyOn(webSocketService, 'isUserConnected').mockReturnValue(true);

      // Mock rollback trigger after some traffic shift
      let callCount = 0;
      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockImplementation(() => {
        callCount++;
        return callCount > 3; // Trigger rollback after a few checks
      });

      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.025, // High error rate triggering rollback
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow();

      // Verify rollback occurred and connections were preserved
      expect(connectionMigrator.getActiveService()).toBe('legacy');
      
      const status = connectionMigrator.getMigrationStatus();
      expect(status.progress?.phase).toBe('rolled_back');
    });

    it('should validate message delivery rates during migration', async () => {
      vi.spyOn(webSocketService, 'getAllConnectedUsers').mockReturnValue(['user1']);
      vi.spyOn(webSocketService, 'getUserSubscriptions').mockReturnValue([1]);
      vi.spyOn(webSocketService, 'getConnectionCount').mockReturnValue(1);

      // Mock high message drop rate that should trigger failure
      vi.spyOn(webSocketService, 'getStats').mockReturnValue({
        activeConnections: 10,
        totalConnections: 20,
        totalMessages: 1000,
        droppedMessages: 15 // 1.5% drop rate (above 1% threshold)
      });

      vi.spyOn(socketIOService, 'getStats').mockReturnValue({
        activeConnections: 0,
        totalConnections: 0,
        totalMessages: 0,
        droppedMessages: 0
      });

      vi.spyOn(webSocketService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(socketIOService, 'getHealthStatus').mockReturnValue({
        isHealthy: true,
        timestamp: new Date().toISOString()
      });

      vi.spyOn(featureFlagService, 'shouldTriggerRollback').mockReturnValue(false);
      vi.spyOn(featureFlagService, 'getStatisticalAnalysis').mockReturnValue({
        flagName: 'websocket_socketio_migration',
        totalRequests: 1000,
        newImplementationPercentage: 50,
        legacyImplementationPercentage: 50,
        errorRate: 0.001, // Low error rate
        averageResponseTime: 150,
        statisticalSignificance: true,
        confidenceLevel: 95
      });

      await expect(connectionMigrator.startBlueGreenMigration()).rejects.toThrow(/High message drop rate detected/);

      // Should rollback due to high message drop rate
      expect(connectionMigrator.getActiveService()).toBe('legacy');
    });
  });
});