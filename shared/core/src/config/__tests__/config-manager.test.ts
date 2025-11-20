/**
 * Configuration Manager Tests
 * 
 * Comprehensive tests for configuration management, validation, hot reloading,
 * and feature flag functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConfigManager } from '../index';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { logger } from '@shared/core/src/observability/logging';

// Mock file system operations
vi.mock('fs');
vi.mock('chokidar');

const mockFs = vi.mocked(fs);

describe('ConfigManager', () => {
  let configManager: ConfigManager;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.clearAllMocks();
    
    // Mock file system
    mockFs.existsSync = vi.fn().mockReturnValue(true);
    mockFs.readFileSync = vi.fn().mockReturnValue('');
    
    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.APP_NAME = 'test-app';
    process.env.APP_VERSION = '1.0.0';
    process.env.PORT = '3000';
    process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
    process.env.REDIS_URL = 'redis://localhost:6379';
    process.env.JWT_SECRET = 'test-jwt-secret';
    process.env.LOG_LEVEL = 'info';
  });

  afterEach(() => {
    cleanup();
    process.env = originalEnv;
    configManager?.destroy();
  
  });

  describe('Configuration Loading', () => {
    it('should load configuration from environment variables', () => {
      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.app.name).toBe('test-app');
      expect(config.app.version).toBe('1.0.0');
      expect(config.app.port).toBe(3000);
      expect(config.app.environment).toBe('test');
    });

    it('should apply default values for missing environment variables', () => {
      delete process.env.APP_NAME;
      delete process.env.PORT;

      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.app.name).toBe('app'); // default value
      expect(config.app.port).toBe(3000); // default value
    });

    it('should validate configuration schema', () => {
      process.env.PORT = 'invalid-port';

      expect(() => {
        configManager = new ConfigManager();
      }).toThrow();
    });

    it('should load configuration from .env files', () => {
      mockFs.readFileSync = vi.fn()
        .mockReturnValueOnce('APP_NAME=env-file-app\nPORT=4000')
        .mockReturnValue('');

      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.app.name).toBe('env-file-app');
      expect(config.app.port).toBe(4000);
    });

    it('should prioritize environment-specific .env files', () => {
      process.env.NODE_ENV = 'development';
      
      mockFs.readFileSync = vi.fn()
        .mockReturnValueOnce('APP_NAME=base-app\nPORT=3000') // .env
        .mockReturnValueOnce('APP_NAME=dev-app\nPORT=3001') // .env.development
        .mockReturnValue('');

      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.app.name).toBe('dev-app');
      expect(config.app.port).toBe(3001);
    });

    it('should handle missing .env files gracefully', () => {
      mockFs.existsSync = vi.fn().mockReturnValue(false);

      expect(() => {
        configManager = new ConfigManager();
      }).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate cache configuration', () => {
      process.env.CACHE_DEFAULT_TTL_SEC = '300';
      process.env.CACHE_MAX_MEMORY_MB = '100';
      process.env.CACHE_COMPRESSION_THRESHOLD = '1024';

      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.cache.defaultTtlSec).toBe(300);
      expect(config.cache.maxMemoryMB).toBe(100);
      expect(config.cache.compressionThreshold).toBe(1024);
    });

    it('should validate logging configuration', () => {
      process.env.LOG_LEVEL = 'debug';
      process.env.LOG_PRETTY = 'true';
      process.env.LOG_MAX_FILE_SIZE = '50mb';
      process.env.LOG_MAX_FILES = '10';

      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.log.level).toBe('debug');
      expect(config.log.pretty).toBe(true);
      expect(config.log.maxFileSize).toBe('50mb');
      expect(config.log.maxFiles).toBe(10);
    });

    it('should validate rate limiting configuration', () => {
      process.env.RATE_LIMIT_DEFAULT_MAX = '1000';
      process.env.RATE_LIMIT_DEFAULT_WINDOW_MS = '60000';
      process.env.RATE_LIMIT_ALGORITHM = 'token-bucket';

      configManager = new ConfigManager();
      const config = configManager.config;

      expect(config.rateLimit.defaultMax).toBe(1000);
      expect(config.rateLimit.defaultWindowMs).toBe(60000);
      expect(config.rateLimit.algorithm).toBe('token-bucket');
    });

    it('should reject invalid enum values', () => {
      process.env.LOG_LEVEL = 'invalid-level';

      expect(() => {
        configManager = new ConfigManager();
      }).toThrow();
    });

    it('should reject invalid numeric values', () => {
      process.env.PORT = '-1';

      expect(() => {
        configManager = new ConfigManager();
      }).toThrow();
    });

    it('should reject invalid URL formats', () => {
      process.env.DATABASE_URL = 'invalid-url';

      expect(() => {
        configManager = new ConfigManager();
      }).toThrow();
    });
  });

  describe('Feature Flags', () => {
    beforeEach(() => {
      process.env.FEATURES_TEST_FEATURE_ENABLED = 'true';
      process.env.FEATURES_TEST_FEATURE_ROLLOUT_PERCENTAGE = '50';
      process.env.FEATURES_TEST_FEATURE_ENABLED_FOR_USERS = 'user1,user2';
      
      configManager = new ConfigManager();
    });

    it('should check if feature is enabled globally', () => {
      expect(configManager.isFeatureEnabled('testFeature')).toBe(true);
    });

    it('should check feature rollout percentage', () => {
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(configManager.isFeatureEnabled('testFeature', `user${i}`));
      }
      
      const enabledCount = results.filter(Boolean).length;
      // Should be approximately 50% (allowing for some variance due to hashing)
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    it('should enable feature for specific users', () => {
      expect(configManager.isFeatureEnabled('testFeature', 'user1')).toBe(true);
      expect(configManager.isFeatureEnabled('testFeature', 'user2')).toBe(true);
    });

    it('should return false for disabled features', () => {
      process.env.FEATURES_DISABLED_FEATURE_ENABLED = 'false';
      configManager = new ConfigManager();

      expect(configManager.isFeatureEnabled('disabledFeature')).toBe(false);
      expect(configManager.isFeatureEnabled('disabledFeature', 'user1')).toBe(false);
    });

    it('should return false for non-existent features', () => {
      expect(configManager.isFeatureEnabled('nonExistentFeature')).toBe(false);
    });

    it('should handle percentage-based rollout consistently', () => {
      // Same user should always get the same result
      const user = 'consistent-user';
      const result1 = configManager.isFeatureEnabled('testFeature', user);
      const result2 = configManager.isFeatureEnabled('testFeature', user);
      
      expect(result1).toBe(result2);
    });
  });

  describe('Hot Reloading', () => {
    it('should enable hot reloading in development', () => {
      process.env.NODE_ENV = 'development';
      
      const chokidar = require('chokidar');
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn(),
      };
      chokidar.watch = vi.fn().mockReturnValue(mockWatcher);

      configManager = new ConfigManager();

      expect(chokidar.watch).toHaveBeenCalled();
      expect(mockWatcher.on).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should not enable hot reloading in production', () => {
      process.env.NODE_ENV = 'production';
      
      const chokidar = require('chokidar');
      chokidar.watch = vi.fn();

      configManager = new ConfigManager();

      expect(chokidar.watch).not.toHaveBeenCalled();
    });

    it('should emit config:changed event on file change', () => {
      process.env.NODE_ENV = 'development';
      
      const chokidar = require('chokidar');
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn(),
      };
      chokidar.watch = vi.fn().mockReturnValue(mockWatcher);

      configManager = new ConfigManager();
      
      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      const eventSpy = vi.fn();
      configManager.on('config:changed', eventSpy);

      // Simulate file change
      mockFs.readFileSync = vi.fn().mockReturnValue('APP_NAME=updated-app');
      changeHandler('.env');

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should reload configuration on file change', () => {
      process.env.NODE_ENV = 'development';
      
      const chokidar = require('chokidar');
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn(),
      };
      chokidar.watch = vi.fn().mockReturnValue(mockWatcher);

      configManager = new ConfigManager();
      
      const originalName = configManager.config.app.name;
      
      const changeHandler = mockWatcher.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      // Simulate file change with new content
      mockFs.readFileSync = vi.fn().mockReturnValue('APP_NAME=reloaded-app');
      changeHandler('.env');

      expect(configManager.config.app.name).toBe('reloaded-app');
      expect(configManager.config.app.name).not.toBe(originalName);
    });
  });

  describe('Runtime Dependency Validation', () => {
    it('should validate Redis connection', async () => {
      const mockRedis = {
        ping: vi.fn().mockResolvedValue('PONG'),
        disconnect: vi.fn(),
      };
      
      // Mock Redis import
      vi.doMock('ioredis', () => {
        return {
          default: vi.fn(() => mockRedis),
        };
      });

      configManager = new ConfigManager();
      
      // Should not throw for valid Redis connection
      expect(() => configManager.validateRuntimeDependencies()).not.toThrow();
    });

    it('should handle Redis connection failure gracefully', async () => {
      const mockRedis = {
        ping: vi.fn().mockRejectedValue(new Error('Connection failed')),
        disconnect: vi.fn(),
      };
      
      vi.doMock('ioredis', () => {
        return {
          default: vi.fn(() => mockRedis),
        };
      });

      configManager = new ConfigManager();
      
      // Should log warning but not throw
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      configManager.validateRuntimeDependencies();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection validation failed')
      );
    });

    it('should validate database connection string format', () => {
      process.env.DATABASE_URL = 'invalid-database-url';

      expect(() => {
        configManager = new ConfigManager();
      }).toThrow();
    });

    it('should validate required secrets are present', () => {
      delete process.env.JWT_SECRET;

      expect(() => {
        configManager = new ConfigManager();
      }).toThrow();
    });
  });

  describe('Configuration Override', () => {
    it('should allow runtime configuration override', () => {
      configManager = new ConfigManager();
      
      const originalPort = configManager.config.app.port;
      
      configManager.configure({
        app: {
          port: 4000,
        },
      });

      expect(configManager.config.app.port).toBe(4000);
      expect(configManager.config.app.port).not.toBe(originalPort);
    });

    it('should validate overridden configuration', () => {
      configManager = new ConfigManager();

      expect(() => {
        configManager.configure({
          app: {
            port: -1, // Invalid port
          },
        });
      }).toThrow();
    });

    it('should emit config:changed event on override', () => {
      configManager = new ConfigManager();
      
      const eventSpy = vi.fn();
      configManager.on('config:changed', eventSpy);

      configManager.configure({
        app: {
          port: 4000,
        },
      });

      expect(eventSpy).toHaveBeenCalled();
    });

    it('should merge overrides with existing configuration', () => {
      configManager = new ConfigManager();
      
      const originalName = configManager.config.app.name;
      
      configManager.configure({
        app: {
          port: 4000,
        },
      });

      expect(configManager.config.app.port).toBe(4000);
      expect(configManager.config.app.name).toBe(originalName); // Should remain unchanged
    });
  });

  describe('Error Handling', () => {
    it('should provide detailed validation errors', () => {
      process.env.PORT = 'invalid';
      process.env.LOG_LEVEL = 'invalid';

      try {
        configManager = new ConfigManager();
        expect.fail('Should have thrown validation error');
      } catch (error) {
        expect(error.message).toContain('Configuration validation failed');
        expect(error.message).toContain('port');
        expect(error.message).toContain('level');
      }
    });

    it('should handle circular references in configuration', () => {
      const circularConfig = { app: {} };
      circularConfig.app.self = circularConfig;

      configManager = new ConfigManager();

      expect(() => {
        configManager.configure(circularConfig);
      }).not.toThrow(); // Should handle gracefully
    });

    it('should handle malformed .env files', () => {
      mockFs.readFileSync = vi.fn().mockReturnValue('INVALID_ENV_FORMAT');

      expect(() => {
        configManager = new ConfigManager();
      }).not.toThrow(); // Should handle gracefully
    });
  });

  describe('Resource Management', () => {
    it('should cleanup watchers on destroy', () => {
      process.env.NODE_ENV = 'development';
      
      const chokidar = require('chokidar');
      const mockWatcher = {
        on: vi.fn().mockReturnThis(),
        close: vi.fn(),
      };
      chokidar.watch = vi.fn().mockReturnValue(mockWatcher);

      configManager = new ConfigManager();
      configManager.destroy();

      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should remove all event listeners on destroy', () => {
      configManager = new ConfigManager();
      
      const eventSpy = vi.fn();
      configManager.on('config:changed', eventSpy);

      configManager.destroy();
      
      // Emit event after destroy - should not be called
      configManager.emit('config:changed');
      expect(eventSpy).not.toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should cache configuration access', () => {
      configManager = new ConfigManager();
      
      const config1 = configManager.config;
      const config2 = configManager.config;

      expect(config1).toBe(config2); // Should be the same reference
    });

    it('should handle large configuration objects efficiently', () => {
      // Create large feature flag configuration
      for (let i = 0; i < 1000; i++) {
        process.env[`FEATURES_FEATURE_${i}_ENABLED`] = 'true';
        process.env[`FEATURES_FEATURE_${i}_ROLLOUT_PERCENTAGE`] = '50';
      }

      const startTime = Date.now();
      configManager = new ConfigManager();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should load in under 1 second
    });

    it('should optimize feature flag checks', () => {
      configManager = new ConfigManager();
      
      const startTime = Date.now();
      for (let i = 0; i < 10000; i++) {
        configManager.isFeatureEnabled('testFeature', `user${i % 100}`);
      }
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be very fast
    });
  });
});














































