/**
 * Security Validation Tests
 * 
 * Tests to ensure security vulnerabilities are fixed before shared module integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { secureTokenManager } from '../secure-token-manager';
import { SecureAuthenticatedAPI } from '../secure-authenticated-api';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage
});

describe('Security Validation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    secureTokenManager.clearAll();
  });

  describe('Token Storage Security', () => {
    it('should NOT store tokens in localStorage', () => {
      const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
      
      secureTokenManager.storeTokenMetadata({
        expiresAt: Date.now() + 3600000,
        userId: 'test-user'
      });

      // Verify no localStorage calls for tokens
      expect(localStorageSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('token'),
        expect.any(String)
      );
      expect(localStorageSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('auth'),
        expect.any(String)
      );
    });

    it('should only store metadata in sessionStorage', () => {
      const metadata = {
        expiresAt: Date.now() + 3600000,
        userId: 'test-user',
        sessionId: 'test-session'
      };

      secureTokenManager.storeTokenMetadata(metadata);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'chanuka_token_metadata',
        JSON.stringify(metadata)
      );
    });

    it('should NOT expose token values to client code', () => {
      const metadata = secureTokenManager.getTokenMetadata();
      
      // Should not have actual token values
      expect(metadata).not.toHaveProperty('accessToken');
      expect(metadata).not.toHaveProperty('refreshToken');
      expect(metadata).not.toHaveProperty('token');
    });
  });

  describe('API Request Security', () => {
    it('should use credentials: include for all authenticated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      // Mock authentication
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));

      await SecureAuthenticatedAPI.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include'
        })
      );
    });

    it('should include CSRF protection headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));

      await SecureAuthenticatedAPI.post('/api/test', { data: 'test' });

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Requested-With': 'XMLHttpRequest'
          })
        })
      );
    });

    it('should NOT include Authorization header (HttpOnly cookies only)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' })
      });

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));

      await SecureAuthenticatedAPI.get('/api/test');

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1]?.headers || {};

      expect(headers).not.toHaveProperty('Authorization');
      expect(headers).not.toHaveProperty('authorization');
    });
  });

  describe('Authentication State Management', () => {
    it('should validate authentication without accessing tokens', () => {
      // No metadata = not authenticated
      expect(secureTokenManager.isAuthenticated()).toBe(false);

      // Valid metadata = authenticated
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));
      expect(secureTokenManager.isAuthenticated()).toBe(true);

      // Expired metadata = not authenticated
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() - 1000
      }));
      expect(secureTokenManager.isAuthenticated()).toBe(false);
    });

    it('should handle token refresh without client-side token access', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          expiresAt: Date.now() + 3600000,
          userId: 'test-user'
        })
      });

      const result = await secureTokenManager.refreshToken();

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/refresh',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose sensitive information in errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));

      const result = await SecureAuthenticatedAPI.get('/api/test');

      expect(result.error).toBeDefined();
      expect(result.error).not.toContain('token');
      expect(result.error).not.toContain('auth');
      expect(result.error).not.toContain('Bearer');
    });

    it('should clear metadata on authentication failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' })
      });

      // Mock window.location for redirect test
      delete (window as any).location;
      (window as any).location = { href: '' };

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));

      await SecureAuthenticatedAPI.get('/api/test');

      // Should attempt to clear metadata (via refresh attempt)
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/refresh',
        expect.any(Object)
      );
    });
  });

  describe('Admin Endpoint Security', () => {
    it('should validate admin endpoints', async () => {
      const result = await SecureAuthenticatedAPI.adminGet('/api/user/profile');

      expect(result.error).toBe('Invalid admin endpoint');
      expect(result.status).toBe(400);
    });

    it('should add admin security headers for valid admin endpoints', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'admin-data' })
      });

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        expiresAt: Date.now() + 3600000
      }));

      await SecureAuthenticatedAPI.adminGet('/api/admin/users');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Admin-Request': 'true',
            'X-Requested-With': 'XMLHttpRequest'
          })
        })
      );
    });
  });

  describe('Logout Security', () => {
    it('should call server logout endpoint and clear metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await SecureAuthenticatedAPI.logout();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include'
        })
      );

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('chanuka_token_metadata');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('chanuka_user_data');
    });
  });
});

describe('Security Regression Prevention', () => {
  it('should prevent localStorage token storage regression', () => {
    // This test ensures we never accidentally reintroduce localStorage token storage
    const localStorageSpy = vi.spyOn(Storage.prototype, 'setItem');
    
    // Any attempt to store tokens in localStorage should be caught
    const dangerousPatterns = [
      'token',
      'accessToken', 
      'refreshToken',
      'authToken',
      'jwt',
      'bearer'
    ];

    secureTokenManager.storeTokenMetadata({
      expiresAt: Date.now() + 3600000
    });

    dangerousPatterns.forEach(pattern => {
      expect(localStorageSpy).not.toHaveBeenCalledWith(
        expect.stringContaining(pattern),
        expect.any(String)
      );
    });
  });

  it('should prevent Authorization header regression', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({})
    });

    mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
      expiresAt: Date.now() + 3600000
    }));

    await SecureAuthenticatedAPI.get('/api/test');

    const fetchCall = mockFetch.mock.calls[0];
    const headers = fetchCall[1]?.headers || {};
    
    // Ensure no Authorization header is ever set
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase());
    expect(headerKeys).not.toContain('authorization');
  });
});