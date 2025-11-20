import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '@client/hooks/useAuth';
import * as api from '@/services/api';
import { logger } from '@client/utils/logger';

// Mock the API service
vi.mock('../../../services/api', () => ({
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  getCurrentUser: vi.fn(),
  refresh_token: vi.fn()
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

describe('useAuth Hook', () => {
  let queryClient: QueryClient;
  let wrapper: React.FC<{ children: React.ReactNode }>;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });

    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    // Reset localStorage mock
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('initialization', () => {
    it('should initialize with no user when no token exists', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    it('should attempt to load user when token exists', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen'
      };

      mockLocalStorage.getItem.mockReturnValue('mock-token');
      (api.getCurrentUser as any).mockResolvedValue({
        success: true,
        data: mockUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle invalid token on initialization', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      (api.getCurrentUser as any).mockRejectedValue(new Error('Invalid token'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen'
      };

      const mockLoginResponse = {
        success: true,
        data: {
          user: mockUser,
          token: 'new-token',
          refresh_token: 'refresh-token'
        }
      };

      (api.login as any).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(loginResult.success).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-token');
    });

    it('should handle login failure', async () => {
      const mockLoginResponse = {
        success: false,
        error: 'Invalid credentials'
      };

      (api.login as any).mockResolvedValue(mockLoginResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toBe('Invalid credentials');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle network errors during login', async () => {
      (api.login as any).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const loginResult = await result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
        expect(loginResult.success).toBe(false);
        expect(loginResult.error).toContain('Network error');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('register', () => {
    it('should register successfully', async () => {
      const mockUser = {
        id: '1',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'citizen'
      };

      const mockRegisterResponse = {
        success: true,
        data: {
          user: mockUser,
          token: 'new-token',
          refresh_token: 'refresh-token',
          requiresVerification: true
        }
      };

      (api.register as any).mockResolvedValue(mockRegisterResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const registerResult = await result.current.register({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          first_name: 'New',
          last_name: 'User',
          role: 'citizen'
        });
        expect(registerResult.success).toBe(true);
        expect(registerResult.requiresVerification).toBe(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
    });

    it('should handle registration validation errors', async () => {
      const mockRegisterResponse = {
        success: false,
        error: 'Email already exists'
      };

      (api.register as any).mockResolvedValue(mockRegisterResponse);

      const { result } = renderHook(() => useAuth(), { wrapper });

      await act(async () => {
        const registerResult = await result.current.register({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          first_name: 'Test',
          last_name: 'User',
          role: 'citizen'
        });
        expect(registerResult.success).toBe(false);
        expect(registerResult.error).toBe('Email already exists');
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      // Setup authenticated state
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen'
      };

      mockLocalStorage.getItem.mockReturnValue('mock-token');
      (api.getCurrentUser as any).mockResolvedValue({
        success: true,
        data: mockUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      // Mock logout API
      (api.logout as any).mockResolvedValue({ success: true });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should handle logout errors gracefully', async () => {
      // Setup authenticated state
      mockLocalStorage.getItem.mockReturnValue('mock-token');
      (api.getCurrentUser as any).mockResolvedValue({
        success: true,
        data: { id: '1', email: 'test@example.com' }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      // Mock logout failure
      (api.logout as any).mockRejectedValue(new Error('Logout failed'));

      await act(async () => {
        await result.current.logout();
      });

      // Should still clear local state even if API call fails
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
    });
  });

  describe('token refresh', () => {
    it('should refresh token automatically', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'citizen'
      };

      // Initial token is expired
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-token')
        .mockReturnValueOnce('valid-refresh-token');

      (api.getCurrentUser as any).mockRejectedValueOnce(new Error('Token expired'));
      (api.refresh_token as any).mockResolvedValue({
        success: true,
        data: {
          user: mockUser,
          token: 'new-token',
          refresh_token: 'new-refresh-token'
        }
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-token');
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
    });

    it('should handle refresh token failure', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-token')
        .mockReturnValueOnce('expired-refresh-token');

      (api.getCurrentUser as any).mockRejectedValue(new Error('Token expired'));
      (api.refresh_token as any).mockRejectedValue(new Error('Refresh token expired'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });

      expect(result.current.isAuthenticated).toBe(false);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('user permissions', () => {
    it('should check user roles correctly', async () => {
      const mockAdminUser = {
        id: '1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      };

      mockLocalStorage.getItem.mockReturnValue('admin-token');
      (api.getCurrentUser as any).mockResolvedValue({
        success: true,
        data: mockAdminUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockAdminUser);
      });

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('citizen')).toBe(false);
      expect(result.current.isAdmin).toBe(true);
    });

    it('should check permissions correctly', async () => {
      const mockExpertUser = {
        id: '1',
        email: 'expert@example.com',
        name: 'Expert User',
        role: 'expert'
      };

      mockLocalStorage.getItem.mockReturnValue('expert-token');
      (api.getCurrentUser as any).mockResolvedValue({
        success: true,
        data: mockExpertUser
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).toEqual(mockExpertUser);
      });

      expect(result.current.hasPermission('create_analysis')).toBe(true);
      expect(result.current.hasPermission('admin_access')).toBe(false);
    });
  });

  describe('loading states', () => {
    it('should handle loading states correctly', async () => {
      let resolveGetUser: (value: any) => void;
      const getUserPromise = new Promise(resolve => {
        resolveGetUser = resolve;
      });

      mockLocalStorage.getItem.mockReturnValue('mock-token');
      (api.getCurrentUser as any).mockReturnValue(getUserPromise);

      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();

      await act(async () => {
        resolveGetUser!({
          success: true,
          data: { id: '1', email: 'test@example.com' }
        });
        await getUserPromise;
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeDefined();
    });

    it('should handle mutation loading states', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      let resolveLogin: (value: any) => void;
      const loginPromise = new Promise(resolve => {
        resolveLogin = resolve;
      });

      (api.login as any).mockReturnValue(loginPromise);

      await act(() => {
        result.current.login({
          email: 'test@example.com',
          password: 'password123'
        });
      });

      expect(result.current.isLoggingIn).toBe(true);

      await act(async () => {
        resolveLogin!({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com' },
            token: 'token'
          }
        });
        await loginPromise;
      });

      expect(result.current.isLoggingIn).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-token');
      (api.getCurrentUser as any).mockRejectedValue(new Error('Unauthorized'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeDefined();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should clear errors on successful operations', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      // Simulate an error
      await act(async () => {
        (api.login as any).mockRejectedValue(new Error('Login failed'));
        await result.current.login({
          email: 'test@example.com',
          password: 'wrong'
        });
      });

      expect(result.current.error).toBeDefined();

      // Successful login should clear error
      await act(async () => {
        (api.login as any).mockResolvedValue({
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com' },
            token: 'token'
          }
        });
        await result.current.login({
          email: 'test@example.com',
          password: 'correct'
        });
      });

      expect(result.current.error).toBeNull();
    });
  });
});

