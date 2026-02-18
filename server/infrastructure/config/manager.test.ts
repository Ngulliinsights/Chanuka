/**
 * Configuration Manager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigurationManager, ConfigurationError, ConfigurationValidationError, ConfigurationEncryptionError } from './index';
import { ObservabilityStack } from '../observability/core/types';
import * as path from 'path';
import * as fs from 'fs';

// Mock dependencies
vi.mock('fs');
vi.mock('dotenv');
vi.mock('dotenv-expand');
vi.mock('chokidar');

describe('ConfigurationManager', () => {
  let manager: ConfigurationManager;
  let mockObservability: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock observability
    mockObservability = {
      getLogger: vi.fn().mockReturnValue({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
      }),
      getMetrics: vi.fn().mockReturnValue({
        counter: vi.fn(),
        histogram: vi.fn()
      })
    };

    // Setup mock env vars
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    process.env.JWT_SECRET = '12345678901234567890123456789012'; // 32 chars
    
    // Create manager instance
    manager = new ConfigurationManager({}, mockObservability);
  });

  afterEach(() => {
    manager.destroy();
    delete process.env.APP_NAME;
    delete process.env.CACHE_PROVIDER;
  });

  describe('load()', () => {
    it('should load default configuration successfully', async () => {
      const result = await manager.load();
      
      if (result.isErr()) {
        process.stdout.write('Load Error: ' + JSON.stringify(result.error, null, 2) + '\n');
        process.stdout.write('Env: ' + JSON.stringify({
          DB: process.env.DATABASE_URL,
          JWT: process.env.JWT_SECRET
        }, null, 2) + '\n');
      }
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const config = result.value;
        expect(config).toBeDefined();
        expect(config.app).toBeDefined();
        expect(config.app.environment).toBe('test'); // Default or from NODE_ENV
      }
    });

    it('should load configuration from environment variables', async () => {
      // Mock environment variables
      process.env.APP_NAME = 'TestApp';
      process.env.CACHE_PROVIDER = 'redis';
      
      // Re-create manager to pick up env vars? 
      // Actually buildConfigFromEnv uses process.env
      
      const result = await manager.load();
      expect(result.isOk()).toBe(true);
      
      if (result.isOk()) {
        const config = result.value;
        expect(config.app.name).toBe('TestApp');
        expect(config.cache.provider).toBe('redis');
      }
    });

    it('should validate configuration and fail if invalid', async () => {
      // Mock environment variables with invalid values
      process.env.CACHE_PROVIDER = 'invalid-provider'; // Schema expects enum
      
      const result = await manager.load();
      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        const error = result.error;
        expect(error).toBeInstanceOf(ConfigurationError);
        expect(error.message).toContain('Configuration validation failed');
      }
    });
  });

  describe('Encryption', () => {
    it('should encrypt and decrypt values', () => {
      const setKeyResult = manager.setEncryptionKey('12345678901234567890123456789012'); // 32 chars
      expect(setKeyResult.isOk()).toBe(true);

      const value = 'secret-value';
      const encResult = manager.encryptValue('test.path', value);
      
      expect(encResult.isOk()).toBe(true);
      const encrypted = encResult.unwrap();
      expect(encrypted).not.toBe(value);
      expect(encrypted).toMatch(/^ENC:/);

      const decResult = manager.decryptValue(encrypted);
      expect(decResult.isOk()).toBe(true);
      expect(decResult.unwrap()).toBe(value);
    });

    it('should fail encryption without key', () => {
      const result = manager.encryptValue('test', 'value');
      expect(result.isErr()).toBe(true);
      expect(result.error.message).toContain('Encryption key not set');
    });
  });

  describe('Feature Flags', () => {
    beforeEach(async () => {
      await manager.load();
    });

    it('should check if feature is enabled', () => {
      // Use default features
      const result = manager.isFeatureEnabled('new-dashboard'); // Assuming this exists in defaults or mocked
      // If not in defaults, we might need to inject it
      
      // Let's use configure to add a feature for testing
      manager.configure({
        features: {
          'test-feature': {
            enabled: true,
            rolloutPercentage: 100,
            enabledForUsers: []
          }
        }
      });

      const enabled = manager.isFeatureEnabled('test-feature');
      expect(enabled.enabled).toBe(true);
    });

    it('should handle rollout percentage', () => {
      manager.configure({
        features: {
          'rollout-feature': {
            enabled: true,
            rolloutPercentage: 50,
            enabledForUsers: []
          }
        }
      });

      // Same user should get consistent result
      const context1 = { user_id: 'user1' };
      const res1 = manager.isFeatureEnabled('rollout-feature', context1);
      const res2 = manager.isFeatureEnabled('rollout-feature', context1);
      
      expect(res1.enabled).toBe(res2.enabled);
    });
  });
});
