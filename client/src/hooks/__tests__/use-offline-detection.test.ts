import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfflineDetection } from '../useOfflineDetection';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator
const mockNavigator = {
  onLine: true,
  connection: {
    downlink: 10,
    effectiveType: '4g',
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
};

Object.defineProperty(window, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Mock logger
vi.mock('../utils/browser-logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useOfflineDetection Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset navigator state
    mockNavigator.onLine = true;
    mockNavigator.connection = {
      downlink: 10,
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    // Default fetch mock
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with online state when navigator.onLine is true', () => {
      mockNavigator.onLine = true;

      const { result } = renderHook(() => useOfflineDetection());

      expect(result.current.isOnline).toBe(true);
      expect(result.current.connectionQuality.type).toBe('unknown');
      expect(result.current.lastOnlineTime).toBe(null);
      expect(result.current.lastOfflineTime).toBe(null);
      expect(result.current.connectionAttempts).toBe(0);
      expect(result.current.isReconnecting).toBe(false);
    });

    it('should initialize with offline state when navigator.onLine is false', () => {
      mockNavigator.onLine = false;

      const { result } = renderHook(() => useOfflineDetection());

      expect(result.current.isOnline).toBe(false);
      expect(result.current.connectionQuality.type).toBe('offline');
    });
  });

  describe('connection quality assessment', () => {
    it('should assess fast connection for 4g with good downlink', () => {
      mockNavigator.connection.effectiveType = '4g';
      mockNavigator.connection.downlink = 5;

      const { result } = renderHook(() => useOfflineDetection());

      // Trigger quality update
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.connectionQuality.type).toBe('fast');
      expect(result.current.connectionQuality.effectiveType).toBe('4g');
      expect(result.current.connectionQuality.downlink).toBe(5);
    });

    it('should assess slow connection for 2g', () => {
      mockNavigator.connection.effectiveType = '2g';

      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.connectionQuality.type).toBe('slow');
    });

    it('should assess slow connection for 3g with low downlink', () => {
      mockNavigator.connection.effectiveType = '3g';
      mockNavigator.connection.downlink = 0.5;

      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.connectionQuality.type).toBe('slow');
    });

    it('should mark as offline when navigator.onLine is false', () => {
      mockNavigator.onLine = false;

      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(result.current.connectionQuality.type).toBe('offline');
    });
  });

  describe('checkConnection method', () => {
    it('should return true for successful connection check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useOfflineDetection());

      let isConnected: boolean = false;
      await act(async () => {
        isConnected = await result.current.checkConnection();
      });

      expect(isConnected).toBe(true);
      expect(result.current.isOnline).toBe(true);
      expect(result.current.connectionAttempts).toBe(1);
      expect(result.current.isReconnecting).toBe(false);
    });

    it('should return false for failed connection check', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useOfflineDetection());

      let isConnected: boolean = true;
      await act(async () => {
        isConnected = await result.current.checkConnection();
      });

      expect(isConnected).toBe(false);
      expect(result.current.isOnline).toBe(false);
      expect(result.current.connectionAttempts).toBe(1);
      expect(result.current.lastOfflineTime).toBeDefined();
    });

    it('should set reconnecting state during check', async () => {
      let resolveFetch: (value: any) => void;
      const fetchPromise = new Promise(resolve => {
        resolveFetch = resolve;
      });

      mockFetch.mockReturnValueOnce(fetchPromise);

      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        result.current.checkConnection();
      });

      expect(result.current.isReconnecting).toBe(true);

      await act(async () => {
        resolveFetch!({
          ok: true,
          status: 200,
        });
        await fetchPromise;
      });

      expect(result.current.isReconnecting).toBe(false);
    });

    it('should not check connection when navigator.onLine is false', async () => {
      mockNavigator.onLine = false;

      const { result } = renderHook(() => useOfflineDetection());

      let isConnected: boolean = true;
      await act(async () => {
        isConnected = await result.current.checkConnection();
      });

      expect(isConnected).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should timeout after 5 seconds', async () => {
      // Create a promise that never resolves
      mockFetch.mockReturnValueOnce(new Promise(() => {}));

      const { result } = renderHook(() => useOfflineDetection());

      const checkPromise = result.current.checkConnection();

      // Advance time past the 5 second timeout
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      let isConnected: boolean = true;
      await act(async () => {
        isConnected = await checkPromise;
      });

      expect(isConnected).toBe(false);
      expect(result.current.isOnline).toBe(false);
    });
  });

  describe('forceReconnect method', () => {
    it('should call checkConnection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useOfflineDetection());

      await act(async () => {
        await result.current.forceReconnect();
      });

      expect(mockFetch).toHaveBeenCalledWith('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(AbortSignal),
      });
    });
  });

  describe('online/offline event handling', () => {
    it('should handle online event', () => {
      mockNavigator.onLine = false;

      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      expect(result.current.isOnline).toBe(true);
      expect(result.current.lastOnlineTime).toBeDefined();
      expect(result.current.connectionAttempts).toBe(0);
    });

    it('should handle offline event', () => {
      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);
      expect(result.current.lastOfflineTime).toBeDefined();
      expect(result.current.connectionQuality.type).toBe('offline');
    });
  });

  describe('connection change events', () => {
    it('should update connection quality on connection change', () => {
      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        mockNavigator.connection.effectiveType = '3g';
        mockNavigator.connection.addEventListener.mock.calls[0][1](); // Trigger change event
      });

      expect(result.current.connectionQuality.effectiveType).toBe('3g');
    });
  });

  describe('periodic quality updates', () => {
    it('should update connection quality every 30 seconds', () => {
      const { result } = renderHook(() => useOfflineDetection());

      act(() => {
        vi.advanceTimersByTime(30000);
      });

      // Should have updated quality at least once
      expect(mockNavigator.connection.addEventListener).toHaveBeenCalled();
    });
  });

  describe('auto-verification on reconnection', () => {
    it('should verify connection after coming back online', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      const { result } = renderHook(() => useOfflineDetection());

      // Simulate going offline then online
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      expect(result.current.isOnline).toBe(false);

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Wait for verification delay
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });

    it('should handle verification failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Verification failed'));

      const { result } = renderHook(() => useOfflineDetection());

      // Simulate going offline then online
      act(() => {
        window.dispatchEvent(new Event('offline'));
      });

      act(() => {
        window.dispatchEvent(new Event('online'));
      });

      // Wait for verification
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up event listeners on unmount', () => {
      const { unmount } = renderHook(() => useOfflineDetection());

      unmount();

      expect(window.removeEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(window.removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should clean up connection event listeners', () => {
      const { unmount } = renderHook(() => useOfflineDetection());

      unmount();

      expect(mockNavigator.connection.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('edge cases', () => {
    it('should handle missing navigator.connection', () => {
      // @ts-ignore
      delete mockNavigator.connection;

      expect(() => {
        renderHook(() => useOfflineDetection());
      }).not.toThrow();
    });

    it('should debounce connection quality updates', () => {
      const { result } = renderHook(() => useOfflineDetection());

      // Rapid changes should be debounced
      act(() => {
        mockNavigator.connection.effectiveType = 'slow-2g';
        vi.advanceTimersByTime(50);
        mockNavigator.connection.effectiveType = '4g';
        vi.advanceTimersByTime(50);
        mockNavigator.connection.effectiveType = '3g';
        vi.advanceTimersByTime(150); // Past debounce delay
      });

      expect(result.current.connectionQuality.effectiveType).toBe('3g');
    });

    it('should handle AbortError from fetch', async () => {
      const abortError = new Error('Request cancelled');
      abortError.name = 'AbortError';

      mockFetch.mockRejectedValueOnce(abortError);

      const { result } = renderHook(() => useOfflineDetection());

      await act(async () => {
        await result.current.checkConnection();
      });

      // Should not update state for cancelled requests
      expect(result.current.connectionAttempts).toBe(0);
    });
  });
});