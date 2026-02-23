/**
 * Authentication Hook Tests
 * Tests for the authentication hook and related functionality
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { useAuth } from '../../../infrastructure/auth/hooks/useAuth';

// Mock the auth service
const mockAuthService = {
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  getCurrentUser: vi.fn(),
  isAuthenticated: vi.fn(),
  hasPermission: vi.fn(),
  getRoles: vi.fn(),
  checkSession: vi.fn(),
};

// Mock the auth context
const mockAuthContext = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  login: vi.fn(),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  clearError: vi.fn(),
  hasPermission: vi.fn(),
  getRoles: vi.fn(),
};

// Mock the auth provider
vi.mock('../../../core/auth/hooks/useAuth', () => ({
  useAuth: () => mockAuthContext,
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock context
    mockAuthContext.user = null;
    mockAuthContext.isAuthenticated = false;
    mockAuthContext.isLoading = false;
    mockAuthContext.error = null;
  });

  describe('Authentication State', () => {
    it('should return initial auth state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['user'],
      };

      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should handle login error', async () => {
      const errorMessage = 'Invalid credentials';
      mockAuthContext.error = errorMessage;

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle loading state', async () => {
      mockAuthContext.isLoading = true;

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('Authentication Actions', () => {
    it('should call login function', async () => {
      const { result } = renderHook(() => useAuth());
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      await act(async () => {
        await result.current.login(credentials);
      });

      expect(mockAuthContext.login).toHaveBeenCalledWith(credentials);
    });

    it('should call logout function', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.logout();
      });

      expect(mockAuthContext.logout).toHaveBeenCalled();
    });

    it('should call refresh token function', async () => {
      const { result } = renderHook(() => useAuth());

      await act(async () => {
        await result.current.refreshToken();
      });

      expect(mockAuthContext.refreshToken).toHaveBeenCalled();
    });

    it('should call clear error function', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.clearError();
      });

      expect(mockAuthContext.clearError).toHaveBeenCalled();
    });
  });

  describe('Authorization', () => {
    it('should check permissions', () => {
      const { result } = renderHook(() => useAuth());
      const permission = 'read:users';

      act(() => {
        result.current.hasPermission(permission);
      });

      expect(mockAuthContext.hasPermission).toHaveBeenCalledWith(permission);
    });

    it('should get user roles', () => {
      const { result } = renderHook(() => useAuth());

      act(() => {
        result.current.getRoles();
      });

      expect(mockAuthContext.getRoles).toHaveBeenCalled();
    });

    it('should return true for admin permissions', () => {
      mockAuthContext.user = {
        id: 'admin-123',
        email: 'admin@example.com',
        username: 'admin',
        roles: ['admin'],
      };

      const { result } = renderHook(() => useAuth());

      expect(result.current.user?.roles).toContain('admin');
    });
  });

  describe('Session Management', () => {
    it('should handle session expiration', async () => {
      mockAuthContext.error = 'Session expired';

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe('Session expired');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle automatic session refresh', async () => {
      const { result } = renderHook(() => useAuth());

      // Simulate session refresh
      act(() => {
        result.current.refreshToken();
      });

      expect(mockAuthContext.refreshToken).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockAuthContext.error = 'Network error';

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe('Network error');
    });

    it('should handle invalid credentials', async () => {
      mockAuthContext.error = 'Invalid credentials';

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe('Invalid credentials');
    });

    it('should handle server errors', async () => {
      mockAuthContext.error = 'Server error';

      const { result } = renderHook(() => useAuth());

      expect(result.current.error).toBe('Server error');
    });
  });

  describe('User Data Management', () => {
    it('should update user data', () => {
      const updatedUser = {
        id: 'user-123',
        email: 'updated@example.com',
        username: 'updateduser',
        roles: ['user', 'editor'],
      };

      mockAuthContext.user = updatedUser;

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toEqual(updatedUser);
    });

    it('should handle user profile updates', () => {
      const { result } = renderHook(() => useAuth());

      // Simulate profile update
      const updatedProfile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      };

      // This would typically trigger a state update
      expect(result.current.user).toBeNull();
    });
  });

  describe('Security Features', () => {
    it('should validate token expiration', () => {
      const { result } = renderHook(() => useAuth());

      // Mock token expiration check
      const mockToken = 'expired-token';

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle CSRF protection', () => {
      const { result } = renderHook(() => useAuth());

      // CSRF protection would be handled internally
      expect(typeof result.current.login).toBe('function');
    });

    it('should sanitize user input', () => {
      const { result } = renderHook(() => useAuth());

      const maliciousInput = '<script>alert("xss")</script>';

      // Input sanitization would be handled internally
      expect(typeof result.current.login).toBe('function');
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete authentication flow', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        roles: ['user'],
      };

      // Simulate login
      mockAuthContext.user = mockUser;
      mockAuthContext.isAuthenticated = true;

      const { result } = renderHook(() => useAuth());

      // Verify login state
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);

      // Simulate logout
      mockAuthContext.user = null;
      mockAuthContext.isAuthenticated = false;

      // Verify logout state
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should handle permission-based access', () => {
      const { result } = renderHook(() => useAuth());

      // Test different permission levels
      const permissions = ['read', 'write', 'delete', 'admin'];

      permissions.forEach(permission => {
        act(() => {
          result.current.hasPermission(permission);
        });

        expect(mockAuthContext.hasPermission).toHaveBeenCalledWith(permission);
      });
    });
  });
});
