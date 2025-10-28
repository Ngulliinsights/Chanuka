import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BrowserLogger, detectEnvironment, getDefaultFeatureFlags, createBrowserLoggerWithLegacyFallback } from './browser-logger';

// Mock navigator and window for browser environment
const mockNavigator = {
  onLine: true,
  userAgent: 'test-user-agent',
  sendBeacon: vi.fn(),
};

const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  setInterval: vi.fn(),
  clearInterval: vi.fn(),
  location: { hostname: 'localhost', href: 'http://localhost:3000' },
  navigator: mockNavigator,
  fetch: vi.fn(),
};

Object.defineProperty(window, 'navigator', { value: mockNavigator });
Object.defineProperty(window, 'location', { value: mockWindow.location });
Object.defineProperty(window, 'addEventListener', { value: mockWindow.addEventListener });
Object.defineProperty(window, 'fetch', { value: mockWindow.fetch });

describe('BrowserLogger', () => {
  let logger: BrowserLogger;
  let mockLegacyLogger: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLegacyLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Mock fetch to resolve successfully
    mockWindow.fetch.mockResolvedValue({
      ok: true,
      status: 200,
    });

    // Reset process.env for each test
    delete (global as any).process;
    (global as any).process = { env: { NODE_ENV: 'development' } };

    logger = createBrowserLoggerWithLegacyFallback(mockLegacyLogger);
  });

  afterEach(() => {
    logger.destroy();
  });

  describe('Environment Detection', () => {
    it('should detect development environment', () => {
      (global as any).process.env.NODE_ENV = 'development';
      const env = detectEnvironment();
      expect(env.name).toBe('development');
      expect(env.isDevelopment).toBe(true);
      expect(env.features.serverSync).toBe(true);
    });

    it('should detect production environment', () => {
      (global as any).process.env.NODE_ENV = 'production';
      const env = detectEnvironment();
      expect(env.name).toBe('production');
      expect(env.isProduction).toBe(true);
    });

    it('should detect test environment', () => {
      (global as any).process.env.NODE_ENV = 'test';
      const env = detectEnvironment();
      expect(env.name).toBe('test');
      expect(env.isTest).toBe(true);
      expect(env.features.serverSync).toBe(false);
    });
  });

  describe('Feature Flags', () => {
    it('should generate default feature flags for development', () => {
      (global as any).process.env.NODE_ENV = 'development';
      const env = detectEnvironment();
      const flags = getDefaultFeatureFlags(env);

      expect(flags.unifiedLogging).toBe(true);
      expect(flags.serverSync).toBe(true);
      expect(flags.legacyFallback).toBe(true);
    });

    it('should allow dynamic feature flag updates', () => {
      logger.updateFeatureFlags({ serverSync: false });
      const config = logger.getConfig();
      expect(config.featureFlags.serverSync).toBe(false);
    });
  });

  describe('Logging Behavior', () => {
    it('should log to console and buffer when features enabled', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.info('Test message', { component: 'test' });

      expect(consoleSpy).toHaveBeenCalled();
      expect(logger.getConfig().featureFlags.unifiedLogging).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should fallback to legacy logger when enabled', () => {
      logger.info('Test message');

      expect(mockLegacyLogger.info).toHaveBeenCalledWith('Test message', undefined, undefined);
    });

    it('should not use legacy logger when disabled', () => {
      logger.updateFeatureFlags({ legacyFallback: false });
      logger.info('Test message');

      expect(mockLegacyLogger.info).not.toHaveBeenCalled();
    });
  });

  describe('Server Sync', () => {
    it('should send logs to server when online', async () => {
      logger.info('Server test message');
      await logger.flush();

      expect(mockWindow.fetch).toHaveBeenCalled();
    });

    it('should not send logs when server sync disabled', async () => {
      logger.updateFeatureFlags({ serverSync: false });
      logger.info('No sync message');
      await logger.flush();

      expect(mockWindow.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Performance Logging', () => {
    it('should include enhanced performance data', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.logPerformance('test-operation', 150.5, { custom: 'data' });

      expect(consoleSpy).toHaveBeenCalled();
      const callArgs = consoleSpy.mock.calls[0];
      // Check that the message contains the performance info
      expect(callArgs.some(arg => typeof arg === 'string' && arg.includes('Performance: test-operation completed in 150.50ms'))).toBe(true);

      consoleSpy.mockRestore();
    });

    it('should skip performance logging when disabled', () => {
      logger.updateFeatureFlags({ performanceMetrics: false });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      logger.logPerformance('test-operation', 100);

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Child Logger', () => {
    it('should create child logger with merged context', () => {
      const child = logger.child({ component: 'child' });
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      child.info('Child message');

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle server sync failures gracefully', async () => {
      mockWindow.fetch.mockRejectedValue(new Error('Network error'));

      logger.info('Error test message');
      await logger.flush();

      // Should not throw and should continue working
      expect(logger.getConfig().featureFlags.unifiedLogging).toBe(true);
    });
  });
});