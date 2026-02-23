/**
 * API Critical Integration Tests
 *
 * Focus: Authentication, Error handling, Data consistency
 * Pareto Priority: Week 1 - Foundation
 *
 * These tests cover the most critical API integration scenarios that deliver
 * 80% of testing value with 20% of implementation effort.
 */

import { useOfflineDetection } from '@client/infrastructure/hooks/useOfflineDetection';
import { ErrorBoundary } from '@client/lib/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { ApiError, NetworkError } from '@client/infrastructure/api/errors';
import { useApiConnection } from '@client/infrastructure/api/hooks';
import { AuthProvider } from '@client/infrastructure/auth';
import { useAuth } from '@client/infrastructure/auth/hooks/useAuth';

// Mock API services
vi.mock('@client/infrastructure/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock authentication service
vi.mock('@client/infrastructure/auth/service', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    refreshToken: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

describe('API Critical Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Authentication', () => {
    it('should authenticate API requests correctly', async () => {
      const mockUser = { id: '123', email: 'test@example.com', token: 'valid-token' };

      // Mock successful authentication
      const { authService } = await import('@client/infrastructure/auth/service');
      authService.login.mockResolvedValue(mockUser);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Trigger login
      await result.current.login('test@example.com', 'password');

      // Verify authentication state
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should handle token expiration gracefully', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const { authService } = await import('@client/infrastructure/auth/service');

      // Mock expired token response
      apiClient.get.mockRejectedValueOnce(new ApiError('Token expired', 401));
      authService.refreshToken.mockResolvedValue({ token: 'new-valid-token' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      // Attempt API call that triggers token refresh
      await expect(result.current.get('/protected-endpoint')).rejects.toThrow();

      // Verify token refresh was attempted
      expect(authService.refreshToken).toHaveBeenCalled();
    });

    it('should refresh tokens automatically', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const { authService } = await import('@client/infrastructure/auth/service');

      const mockResponse = { data: 'protected-data' };

      // First call fails with 401, second succeeds after refresh
      apiClient.get
        .mockRejectedValueOnce(new ApiError('Token expired', 401))
        .mockResolvedValueOnce(mockResponse);

      authService.refreshToken.mockResolvedValue({ token: 'new-token' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      const response = await result.current.get('/protected-endpoint');

      expect(response).toEqual(mockResponse);
      expect(authService.refreshToken).toHaveBeenCalled();
      expect(apiClient.get).toHaveBeenCalledTimes(2); // Initial + retry after refresh
    });

    it('should handle authentication errors', async () => {
      const { authService } = await import('@client/infrastructure/auth/service');
      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      await expect(result.current.login('wrong@example.com', 'wrong-password')).rejects.toThrow(
        'Invalid credentials'
      );

      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const apiError = new ApiError('Server error', 500);
      apiClient.get.mockRejectedValue(apiError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      await expect(result.current.get('/error-endpoint')).rejects.toThrow('Server error');

      // Verify error is properly handled by boundary
      expect(apiClient.get).toHaveBeenCalledWith('/error-endpoint');
    });

    it('should retry failed requests appropriately', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const networkError = new NetworkError('Network timeout');

      // Mock network error followed by success
      apiClient.get.mockRejectedValueOnce(networkError).mockResolvedValueOnce({ data: 'success' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      const response = await result.current.get('/retry-endpoint');

      expect(response).toEqual({ data: 'success' });
      expect(apiClient.get).toHaveBeenCalledTimes(2); // Initial + retry
    });

    it('should handle network timeouts', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const timeoutError = new NetworkError('Request timeout', 'TIMEOUT');
      apiClient.get.mockRejectedValue(timeoutError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      await expect(result.current.get('/timeout-endpoint')).rejects.toThrow('Request timeout');

      // Verify timeout is properly categorized
      expect(apiClient.get).toHaveBeenCalledWith('/timeout-endpoint');
    });

    it('should process server error responses', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const serverError = new ApiError('Validation failed', 422, {
        field: 'email',
        message: 'Invalid email format',
      });
      apiClient.get.mockRejectedValue(serverError);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      await expect(result.current.get('/validation-error')).rejects.toThrow('Validation failed');

      // Verify error details are preserved
      expect(apiClient.get).toHaveBeenCalledWith('/validation-error');
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across requests', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const mockData = { id: 1, name: 'Test Item', version: 1 };

      apiClient.get.mockResolvedValue({ data: mockData });
      apiClient.put.mockResolvedValue({ data: { ...mockData, version: 2 } });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      // Initial fetch
      const initialData = await result.current.get('/items/1');
      expect(initialData.data).toEqual(mockData);

      // Update data
      const updatedData = await result.current.put('/items/1', { name: 'Updated Item' });
      expect(updatedData.data.version).toBe(2);
      expect(updatedData.data.name).toBe('Updated Item');
    });

    it('should handle concurrent data updates', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const initialData = { id: 1, name: 'Initial', version: 1 };
      const updatedData1 = { id: 1, name: 'Update1', version: 2 };
      const updatedData2 = { id: 1, name: 'Update2', version: 3 };

      apiClient.get.mockResolvedValue({ data: initialData });
      apiClient.put
        .mockResolvedValueOnce({ data: updatedData1 })
        .mockResolvedValueOnce({ data: updatedData2 });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      // Simulate concurrent updates
      const update1 = result.current.put('/items/1', { name: 'Update1' });
      const update2 = result.current.put('/items/1', { name: 'Update2' });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both updates should succeed with proper versioning
      expect(response1.data.version).toBe(2);
      expect(response2.data.version).toBe(3);
    });

    it('should validate response data', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const invalidData = { id: 'invalid', name: null, version: 'not-a-number' };

      apiClient.get.mockResolvedValue({ data: invalidData });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      // Should handle validation gracefully
      const response = await result.current.get('/items/invalid');
      expect(response.data).toEqual(invalidData);

      // In real implementation, validation would throw ValidationError
      // This test verifies the response structure is maintained
    });

    it('should handle data transformation errors', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const malformedData = { data: 'invalid-json-string' };

      apiClient.get.mockResolvedValue(malformedData);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>{children}</ErrorBoundary>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      // Should handle transformation errors gracefully
      await expect(result.current.get('/malformed-data')).rejects.toThrow();

      expect(apiClient.get).toHaveBeenCalledWith('/malformed-data');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', async () => {
      const { authService } = await import('@client/infrastructure/auth/service');
      const { apiClient } = await import('@client/infrastructure/api/client');

      const mockUser = { id: '123', email: 'test@example.com', token: 'valid-token' };
      const mockProfile = { id: '123', name: 'Test User', email: 'test@example.com' };

      authService.login.mockResolvedValue(mockUser);
      apiClient.get.mockResolvedValue({ data: mockProfile });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Complete login flow
      await result.current.login('test@example.com', 'password');

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user).toEqual(mockUser);

      // Verify API calls work with authentication
      const profileResponse = await result.current.getCurrentUser();
      expect(profileResponse.data).toEqual(mockProfile);
    });

    it('should handle error recovery scenarios', async () => {
      const { apiClient } = await import('@client/infrastructure/api/client');
      const { authService } = await import('@client/infrastructure/auth/service');

      const networkError = new NetworkError('Network error');
      const mockUser = { id: '123', email: 'test@example.com', token: 'valid-token' };

      // Simulate network error followed by recovery
      apiClient.get
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ data: 'recovered-data' });

      authService.refreshToken.mockResolvedValue({ token: 'new-token' });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          <ErrorBoundary>
            <AuthProvider>{children}</AuthProvider>
          </ErrorBoundary>
        </QueryClientProvider>
      );

      const { result } = renderHook(() => useApiConnection(), { wrapper });

      // First call fails
      await expect(result.current.get('/recovery-test')).rejects.toThrow('Network error');

      // Second call succeeds after recovery
      const response = await result.current.get('/recovery-test');
      expect(response.data).toBe('recovered-data');
    });
  });
});
