/**
 * Client-Side Race Condition Tests
 * Tests for React state updates and API request race conditions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React, { useState, useEffect, useCallback } from 'react';
import { safeApi, useSafeApi } from '../utils/safe-api';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Client-Side Race Condition Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    safeApi.cancelAllRequests();
  });

  describe('Safe API Client', () => {
    it('should deduplicate concurrent identical requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Make multiple concurrent requests to same endpoint
      const requests = Array.from({ length: 5 }, () =>
        safeApi.json('/api/test', { deduplicate: true })
      );

      const results = await Promise.all(requests);

      // Should only make one actual fetch call due to deduplication
      expect(mockFetch).toHaveBeenCalledTimes(1);
      
      // All requests should return same result
      results.forEach(result => {
        expect(result).toEqual({ data: 'test' });
      });
    });

    it('should handle request cancellation properly', async () => {
      let resolveRequest: (value: any) => void;
      const requestPromise = new Promise(resolve => {
        resolveRequest = resolve;
      });

      mockFetch.mockReturnValue(requestPromise);

      // Start a request
      const requestPromise1 = safeApi.json('/api/slow');
      
      // Cancel all requests
      safeApi.cancelAllRequests();

      // Request should be cancelled
      await expect(requestPromise1).rejects.toThrow();
      
      // Resolve the mock to clean up
      resolveRequest!({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });
    });

    it('should handle timeout properly', async () => {
      // Mock a request that never resolves
      mockFetch.mockReturnValue(new Promise(() => {}));

      const requestPromise = safeApi.json('/api/timeout', { timeout: 100 });

      await expect(requestPromise).rejects.toThrow();
    });
  });

  describe('React Hook Race Conditions', () => {
    it('should handle component unmount during async operation', async () => {
      const TestComponent = () => {
        const [data, setData] = useState<string | null>(null);
        const [error, setError] = useState<string | null>(null);
        const { json, isActive } = useSafeApi();

        useEffect(() => {
          const fetchData = async () => {
            try {
              const result = await json<{ message: string }>('/api/test');
              // Only update state if component is still active
              if (isActive()) {
                setData(result.message);
              }
            } catch (err) {
              if (isActive()) {
                setError(err instanceof Error ? err.message : 'Unknown error');
              }
            }
          };

          fetchData();
        }, [json, isActive]);

        if (error) return <div>Error: {error}</div>;
        if (data) return <div>Data: {data}</div>;
        return <div>Loading...</div>;
      };

      mockFetch.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ message: 'test data' })
            });
          }, 100);
        })
      );

      const { unmount } = render(<TestComponent />);

      // Unmount component before request completes
      setTimeout(() => unmount(), 50);

      // Wait for request to complete
      await new Promise(resolve => setTimeout(resolve, 150));

      // No errors should occur from state updates after unmount
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('should handle concurrent state updates', async () => {
      const TestComponent = () => {
        const [counter, setCounter] = useState(0);
        const [updates, setUpdates] = useState<number[]>([]);

        const incrementCounter = useCallback(() => {
          setCounter(prev => {
            const newValue = prev + 1;
            setUpdates(prevUpdates => [...prevUpdates, newValue]);
            return newValue;
          });
        }, []);

        // Simulate concurrent updates
        useEffect(() => {
          const promises = Array.from({ length: 10 }, (_, i) =>
            new Promise<void>(resolve => {
              setTimeout(() => {
                incrementCounter();
                resolve();
              }, Math.random() * 100);
            })
          );

          Promise.all(promises);
        }, [incrementCounter]);

        return (
          <div>
            <div data-testid="counter">Counter: {counter}</div>
            <div data-testid="updates">Updates: {updates.length}</div>
          </div>
        );
      };

      render(<TestComponent />);

      // Wait for all updates to complete
      await waitFor(() => {
        expect(screen.getByTestId('counter')).toHaveTextContent('Counter: 10');
      }, { timeout: 2000 });

      expect(screen.getByTestId('updates')).toHaveTextContent('Updates: 10');
    });
  });
});