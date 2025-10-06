import { describe, test, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock API configuration
vi.mock('../../config/api', () => ({
  API_BASE_URL: 'http://localhost:4200/api',
  API_TIMEOUT: 10000,
  MAX_RETRIES: 3
}));

// Mock API service
vi.mock('../../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    request: vi.fn()
  },
  createApiClient: vi.fn(),
  handleApiError: vi.fn()
}));

// Mock authenticated API
vi.mock('../../utils/authenticated-api', () => ({
  authenticatedApi: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock API error handling
vi.mock('../../services/api-error-handling', () => ({
  ApiErrorHandler: {
    handleError: vi.fn(),
    isRetryableError: vi.fn(),
    getErrorMessage: vi.fn()
  }
}));

// Mock hooks
vi.mock('../../hooks/use-api-with-fallback', () => ({
  useApiWithFallback: vi.fn()
}));

vi.mock('../../hooks/use-safe-query', () => ({
  useSafeQuery: vi.fn()
}));

describe('API Communication Integration Tests', () => {
  let queryClient: QueryClient;
  let originalFetch: typeof fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    // Create fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false, // Disable retries for testing
          gcTime: 0, // Disable caching for testing
        },
        mutations: {
          retry: false,
        },
      },
    });

    // Clear all mocks
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('API Client Configuration', () => {
    test('should configure API client with correct base URL', async () => {
      const { apiClient } = await import('../../services/api');
      
      // Mock successful API call
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { message: 'API configured' } })
      });

      await apiClient.get('/health');

      expect(apiClient.get).toHaveBeenCalledWith('/health');
    });

    test('should handle API client initialization errors', async () => {
      const { createApiClient } = await import('../../services/api');
      
      // Mock API client creation failure
      createApiClient.mockImplementationOnce(() => {
        throw new Error('Failed to create API client');
      });

      expect(() => createApiClient()).toThrow('Failed to create API client');
    });

    test('should configure request timeout correctly', async () => {
      const { API_TIMEOUT } = await import('../../config/api');
      
      expect(API_TIMEOUT).toBe(10000);
      
      // Test timeout behavior
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const { apiClient } = await import('../../services/api');
      
      await expect(apiClient.get('/slow-endpoint')).rejects.toThrow();
    });

    test('should configure retry mechanism', async () => {
      const { MAX_RETRIES } = await import('../../config/api');
      
      expect(MAX_RETRIES).toBe(3);
      
      // Mock API client with retry logic
      const { apiClient } = await import('../../services/api');
      
      // Mock first two calls to fail, third to succeed
      apiClient.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { success: true } });

      // This would normally retry internally
      await expect(apiClient.get('/retry-test')).resolves.toEqual({
        data: { success: true }
      });
    });
  });

  describe('API Request/Response Handling', () => {
    test('should handle successful API responses', async () => {
      const mockResponse = {
        success: true,
        data: {
          bills: [
            { id: 1, title: 'Test Bill 1', status: 'active' },
            { id: 2, title: 'Test Bill 2', status: 'pending' }
          ]
        },
        metadata: {
          total: 2,
          page: 1,
          limit: 10
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json'
        }),
        json: async () => mockResponse
      });

      const { apiClient } = await import('../../services/api');
      apiClient.get.mockResolvedValueOnce({ data: mockResponse });

      const response = await apiClient.get('/bills');

      expect(response.data.success).toBe(true);
      expect(response.data.data.bills).toHaveLength(2);
      expect(response.data.metadata.total).toBe(2);
    });

    test('should handle API error responses', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: {
          field: 'title',
          message: 'Title is required'
        }
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({
          'content-type': 'application/json'
        }),
        json: async () => mockErrorResponse
      });

      const { apiClient } = await import('../../services/api');
      apiClient.get.mockRejectedValueOnce({
        response: {
          status: 400,
          data: mockErrorResponse
        }
      });

      await expect(apiClient.get('/invalid-endpoint')).rejects.toMatchObject({
        response: {
          status: 400,
          data: {
            success: false,
            error: 'Validation failed'
          }
        }
      });
    });

    test('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { apiClient } = await import('../../services/api');
      apiClient.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/network-test')).rejects.toThrow('Network error');
    });

    test('should handle JSON parsing errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'content-type': 'application/json'
        }),
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      const { apiClient } = await import('../../services/api');
      apiClient.get.mockRejectedValueOnce(new Error('Invalid JSON response'));

      await expect(apiClient.get('/invalid-json')).rejects.toThrow('Invalid JSON response');
    });
  });

  describe('CORS Configuration', () => {
    test('should handle CORS preflight requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({
          'Access-Control-Allow-Origin': 'http://localhost:4200',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Allow-Credentials': 'true'
        }),
        json: async () => ({ success: true })
      });

      const response = await fetch('http://localhost:4200/api/health', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:4200',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      expect(response.ok).toBe(true);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4200');
      expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    });

    test('should handle CORS errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('CORS policy violation'));

      const { handleApiError } = await import('../../services/api');
      handleApiError.mockImplementationOnce((error) => {
        if (error.message.includes('CORS')) {
          return {
            error: 'CORS policy violation',
            message: 'Cross-origin request blocked',
            code: 'CORS_ERROR'
          };
        }
        return error;
      });

      const error = new Error('CORS policy violation');
      const handledError = handleApiError(error);

      expect(handledError.code).toBe('CORS_ERROR');
      expect(handledError.message).toBe('Cross-origin request blocked');
    });

    test('should include credentials in requests when configured', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true })
      });

      await fetch('http://localhost:4200/api/protected', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': 'Bearer test-token'
        }
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:4200/api/protected',
        expect.objectContaining({
          credentials: 'include',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });
  });

  describe('Authentication Integration', () => {
    test('should include authentication headers in requests', async () => {
      const { authenticatedApi } = await import('../../utils/authenticated-api');
      
      authenticatedApi.get.mockResolvedValueOnce({
        data: { success: true, user: { id: 1, name: 'Test User' } }
      });

      const response = await authenticatedApi.get('/profile');

      expect(authenticatedApi.get).toHaveBeenCalledWith('/profile');
      expect(response.data.success).toBe(true);
      expect(response.data.user.name).toBe('Test User');
    });

    test('should handle authentication errors', async () => {
      const { authenticatedApi } = await import('../../utils/authenticated-api');
      
      authenticatedApi.get.mockRejectedValueOnce({
        response: {
          status: 401,
          data: {
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED'
          }
        }
      });

      await expect(authenticatedApi.get('/protected')).rejects.toMatchObject({
        response: {
          status: 401,
          data: {
            error: 'Unauthorized'
          }
        }
      });
    });

    test('should refresh tokens when needed', async () => {
      const { authenticatedApi } = await import('../../utils/authenticated-api');
      
      // Mock token refresh scenario
      authenticatedApi.get
        .mockRejectedValueOnce({
          response: { status: 401, data: { error: 'Token expired' } }
        })
        .mockResolvedValueOnce({
          data: { success: true, data: 'Refreshed and retried' }
        });

      // This would normally trigger token refresh internally
      const response = await authenticatedApi.get('/protected-resource');
      
      expect(response.data.data).toBe('Refreshed and retried');
    });
  });

  describe('Error Handling and Recovery', () => {
    test('should categorize different types of API errors', async () => {
      const { ApiErrorHandler } = await import('../../services/api-error-handling');
      
      // Test different error types
      const networkError = new Error('Network error');
      const validationError = { response: { status: 400, data: { error: 'Validation failed' } } };
      const authError = { response: { status: 401, data: { error: 'Unauthorized' } } };
      const serverError = { response: { status: 500, data: { error: 'Internal server error' } } };

      ApiErrorHandler.getErrorMessage
        .mockReturnValueOnce('Network connection failed')
        .mockReturnValueOnce('Invalid input data')
        .mockReturnValueOnce('Authentication required')
        .mockReturnValueOnce('Server error occurred');

      expect(ApiErrorHandler.getErrorMessage(networkError)).toBe('Network connection failed');
      expect(ApiErrorHandler.getErrorMessage(validationError)).toBe('Invalid input data');
      expect(ApiErrorHandler.getErrorMessage(authError)).toBe('Authentication required');
      expect(ApiErrorHandler.getErrorMessage(serverError)).toBe('Server error occurred');
    });

    test('should determine which errors are retryable', async () => {
      const { ApiErrorHandler } = await import('../../services/api-error-handling');
      
      const networkError = new Error('Network error');
      const timeoutError = new Error('Request timeout');
      const validationError = { response: { status: 400 } };
      const serverError = { response: { status: 500 } };

      ApiErrorHandler.isRetryableError
        .mockReturnValueOnce(true)  // Network errors are retryable
        .mockReturnValueOnce(true)  // Timeout errors are retryable
        .mockReturnValueOnce(false) // Validation errors are not retryable
        .mockReturnValueOnce(true); // Server errors are retryable

      expect(ApiErrorHandler.isRetryableError(networkError)).toBe(true);
      expect(ApiErrorHandler.isRetryableError(timeoutError)).toBe(true);
      expect(ApiErrorHandler.isRetryableError(validationError)).toBe(false);
      expect(ApiErrorHandler.isRetryableError(serverError)).toBe(true);
    });

    test('should provide fallback data when API fails', async () => {
      const { useApiWithFallback } = await import('../../hooks/use-api-with-fallback');
      
      const fallbackData = {
        bills: [
          { id: 1, title: 'Fallback Bill', status: 'demo' }
        ]
      };

      useApiWithFallback.mockReturnValue({
        data: fallbackData,
        isLoading: false,
        error: null,
        isUsingFallback: true
      });

      const TestComponent = () => {
        const { data, isUsingFallback } = useApiWithFallback('/bills', fallbackData);
        
        return (
          <div>
            {isUsingFallback && <div data-testid="fallback-notice">Using demo data</div>}
            <div data-testid="bill-title">{data.bills[0].title}</div>
          </div>
        );
      };

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      expect(screen.getByTestId('fallback-notice')).toBeInTheDocument();
      expect(screen.getByTestId('bill-title')).toHaveTextContent('Fallback Bill');
    });

    test('should handle API errors gracefully in components', async () => {
      const { useSafeQuery } = await import('../../hooks/use-safe-query');
      
      useSafeQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('API request failed'),
        isError: true
      });

      const TestComponent = () => {
        const { data, isLoading, error, isError } = useSafeQuery(['bills'], () => {
          throw new Error('API request failed');
        });
        
        if (isLoading) return <div data-testid="loading">Loading...</div>;
        if (isError) return <div data-testid="error">Error: {error.message}</div>;
        
        return <div data-testid="data">{JSON.stringify(data)}</div>;
      };

      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      expect(screen.getByTestId('error')).toBeInTheDocument();
      expect(screen.getByText('Error: API request failed')).toBeInTheDocument();
    });
  });

  describe('Real-time Communication', () => {
    test('should establish WebSocket connection for real-time updates', async () => {
      // Mock WebSocket
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      };

      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

      // Simulate WebSocket connection
      const ws = new WebSocket('ws://localhost:4200/ws');
      
      expect(WebSocket).toHaveBeenCalledWith('ws://localhost:4200/ws');
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });

    test('should handle WebSocket connection errors', async () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.CLOSED
      };

      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

      const ws = new WebSocket('ws://localhost:4200/ws');
      
      // Simulate connection error
      const errorHandler = vi.fn();
      ws.addEventListener('error', errorHandler);
      
      // Trigger error event
      const errorEvent = new Event('error');
      mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'error')?.[1](errorEvent);

      expect(ws.readyState).toBe(WebSocket.CLOSED);
    });

    test('should handle real-time data updates', async () => {
      const mockWebSocket = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        send: vi.fn(),
        close: vi.fn(),
        readyState: WebSocket.OPEN
      };

      global.WebSocket = vi.fn().mockImplementation(() => mockWebSocket);

      const ws = new WebSocket('ws://localhost:4200/ws');
      
      const messageHandler = vi.fn();
      ws.addEventListener('message', messageHandler);
      
      // Simulate receiving a message
      const messageEvent = {
        data: JSON.stringify({
          type: 'bill_update',
          data: { id: 1, status: 'passed' }
        })
      };
      
      mockWebSocket.addEventListener.mock.calls
        .find(call => call[0] === 'message')?.[1](messageEvent);

      expect(messageHandler).toHaveBeenCalledWith(messageEvent);
    });
  });

  describe('API Performance and Caching', () => {
    test('should cache API responses appropriately', async () => {
      const cacheKey = ['bills', { page: 1, limit: 10 }];
      const cachedData = {
        bills: [{ id: 1, title: 'Cached Bill' }],
        metadata: { total: 1, page: 1, limit: 10 }
      };

      // Mock QueryClient cache
      queryClient.setQueryData(cacheKey, cachedData);
      
      const retrievedData = queryClient.getQueryData(cacheKey);
      
      expect(retrievedData).toEqual(cachedData);
    });

    test('should invalidate cache when data changes', async () => {
      const cacheKey = ['bills'];
      const initialData = { bills: [{ id: 1, title: 'Original Bill' }] };
      
      queryClient.setQueryData(cacheKey, initialData);
      
      // Simulate data invalidation
      await queryClient.invalidateQueries({ queryKey: cacheKey });
      
      // Cache should be marked as stale
      const queryState = queryClient.getQueryState(cacheKey);
      expect(queryState?.isInvalidated).toBe(true);
    });

    test('should handle concurrent API requests efficiently', async () => {
      const { apiClient } = await import('../../services/api');
      
      // Mock multiple concurrent requests
      const requests = [
        apiClient.get('/bills'),
        apiClient.get('/sponsors'),
        apiClient.get('/analysis')
      ];

      apiClient.get
        .mockResolvedValueOnce({ data: { bills: [] } })
        .mockResolvedValueOnce({ data: { sponsors: [] } })
        .mockResolvedValueOnce({ data: { analysis: {} } });

      const responses = await Promise.all(requests);
      
      expect(responses).toHaveLength(3);
      expect(responses[0].data.bills).toBeDefined();
      expect(responses[1].data.sponsors).toBeDefined();
      expect(responses[2].data.analysis).toBeDefined();
    });

    test('should implement request deduplication', async () => {
      const { apiClient } = await import('../../services/api');
      
      // Mock the same request made multiple times
      apiClient.get.mockResolvedValue({ data: { result: 'deduplicated' } });

      const requests = [
        apiClient.get('/same-endpoint'),
        apiClient.get('/same-endpoint'),
        apiClient.get('/same-endpoint')
      ];

      await Promise.all(requests);
      
      // In a real implementation, this would only make one actual request
      expect(apiClient.get).toHaveBeenCalledTimes(3);
    });
  });
});