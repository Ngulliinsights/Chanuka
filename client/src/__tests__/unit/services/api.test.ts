import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as api from '../../../services/api';
import { logger } from '@shared/core';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('API Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('authentication', () => {
    describe('login', () => {
      it('should login successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            user: {
              id: '1',
              email: 'test@example.com',
              name: 'Test User',
              role: 'citizen'
            },
            token: 'auth-token',
            refreshToken: 'refresh-token'
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await api.login({
          email: 'test@example.com',
          password: 'password123'
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password123'
          })
        });
      });

      it('should handle login failure', async () => {
        const mockResponse = {
          success: false,
          error: 'Invalid credentials'
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await api.login({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

        expect(result).toEqual(mockResponse);
      });

      it('should handle network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        await expect(api.login({
          email: 'test@example.com',
          password: 'password123'
        })).rejects.toThrow('Network error');
      });
    });

    describe('register', () => {
      it('should register successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            user: {
              id: '1',
              email: 'newuser@example.com',
              name: 'New User',
              role: 'citizen'
            },
            token: 'auth-token',
            requiresVerification: true
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await api.register({
          email: 'newuser@example.com',
          password: 'SecurePass123!',
          firstName: 'New',
          lastName: 'User',
          role: 'citizen'
        });

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            firstName: 'New',
            lastName: 'User',
            role: 'citizen'
          })
        });
      });

      it('should handle validation errors', async () => {
        const mockResponse = {
          success: false,
          error: 'Email already exists'
        };

        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await api.register({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'citizen'
        });

        expect(result).toEqual(mockResponse);
      });
    });

    describe('getCurrentUser', () => {
      it('should get current user with valid token', async () => {
        const mockUser = {
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'citizen'
        };

        mockLocalStorage.getItem.mockReturnValue('valid-token');
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockUser
          })
        });

        const result = await api.getCurrentUser();

        expect(result.data).toEqual(mockUser);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        });
      });

      it('should handle unauthorized access', async () => {
        mockLocalStorage.getItem.mockReturnValue('invalid-token');
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            success: false,
            error: 'Unauthorized'
          })
        });

        await expect(api.getCurrentUser()).rejects.toThrow();
      });

      it('should handle missing token', async () => {
        mockLocalStorage.getItem.mockReturnValue(null);

        await expect(api.getCurrentUser()).rejects.toThrow('No authentication token');
      });
    });

    describe('logout', () => {
      it('should logout successfully', async () => {
        mockLocalStorage.getItem.mockReturnValue('valid-token');
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true
          })
        });

        const result = await api.logout();

        expect(result.success).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        });
      });
    });

    describe('refreshToken', () => {
      it('should refresh token successfully', async () => {
        const mockResponse = {
          success: true,
          data: {
            user: { id: '1', email: 'test@example.com' },
            token: 'new-token',
            refreshToken: 'new-refresh-token'
          }
        };

        mockLocalStorage.getItem.mockReturnValue('refresh-token');
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResponse)
        });

        const result = await api.refreshToken();

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            refreshToken: 'refresh-token'
          })
        });
      });

      it('should handle expired refresh token', async () => {
        mockLocalStorage.getItem.mockReturnValue('expired-refresh-token');
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({
            success: false,
            error: 'Refresh token expired'
          })
        });

        await expect(api.refreshToken()).rejects.toThrow();
      });
    });
  });

  describe('bills API', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
    });

    describe('getBills', () => {
      it('should fetch bills with default parameters', async () => {
        const mockBills = {
          success: true,
          data: [
            { id: '1', title: 'Test Bill 1', status: 'introduced' },
            { id: '2', title: 'Test Bill 2', status: 'committee' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBills)
        });

        const result = await api.getBills();

        expect(result).toEqual(mockBills);
        expect(mockFetch).toHaveBeenCalledWith('/api/bills?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        });
      });

      it('should fetch bills with custom parameters', async () => {
        const mockBills = {
          success: true,
          data: [],
          pagination: {
            page: 2,
            limit: 10,
            total: 0,
            totalPages: 0
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBills)
        });

        const result = await api.getBills({
          page: 2,
          limit: 10,
          status: 'passed',
          category: 'technology',
          search: 'AI'
        });

        expect(result).toEqual(mockBills);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/bills?page=2&limit=10&status=passed&category=technology&search=AI',
          expect.any(Object)
        );
      });

      it('should handle bills fetch error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: () => Promise.resolve({
            success: false,
            error: 'Internal server error'
          })
        });

        await expect(api.getBills()).rejects.toThrow();
      });
    });

    describe('getBill', () => {
      it('should fetch single bill', async () => {
        const mockBill = {
          success: true,
          data: {
            id: '1',
            title: 'Test Bill',
            status: 'introduced',
            description: 'A test bill',
            sponsors: []
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockBill)
        });

        const result = await api.getBill('1');

        expect(result).toEqual(mockBill);
        expect(mockFetch).toHaveBeenCalledWith('/api/bills/1', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        });
      });

      it('should handle bill not found', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({
            success: false,
            error: 'Bill not found'
          })
        });

        await expect(api.getBill('999')).rejects.toThrow();
      });
    });

    describe('searchBills', () => {
      it('should search bills', async () => {
        const mockResults = {
          success: true,
          data: [
            { id: '1', title: 'AI Bill', status: 'introduced' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 1,
            totalPages: 1
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResults)
        });

        const result = await api.searchBills('artificial intelligence');

        expect(result).toEqual(mockResults);
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/bills/search?q=artificial%20intelligence&page=1&limit=20',
          expect.any(Object)
        );
      });

      it('should handle empty search results', async () => {
        const mockResults = {
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockResults)
        });

        const result = await api.searchBills('nonexistent term');

        expect(result.data).toHaveLength(0);
      });
    });
  });

  describe('sponsors API', () => {
    beforeEach(() => {
      mockLocalStorage.getItem.mockReturnValue('valid-token');
    });

    describe('getSponsors', () => {
      it('should fetch sponsors', async () => {
        const mockSponsors = {
          success: true,
          data: [
            { id: '1', name: 'Hon. John Doe', role: 'MP', party: 'Test Party' },
            { id: '2', name: 'Hon. Jane Smith', role: 'Senator', party: 'Other Party' }
          ],
          pagination: {
            page: 1,
            limit: 20,
            total: 2,
            totalPages: 1
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSponsors)
        });

        const result = await api.getSponsors();

        expect(result).toEqual(mockSponsors);
        expect(mockFetch).toHaveBeenCalledWith('/api/sponsors?page=1&limit=20', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        });
      });
    });

    describe('getSponsor', () => {
      it('should fetch single sponsor', async () => {
        const mockSponsor = {
          success: true,
          data: {
            id: '1',
            name: 'Hon. John Doe',
            role: 'MP',
            party: 'Test Party',
            constituency: 'Test Riding',
            bills: []
          }
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockSponsor)
        });

        const result = await api.getSponsor('1');

        expect(result).toEqual(mockSponsor);
        expect(mockFetch).toHaveBeenCalledWith('/api/sponsors/1', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-token',
            'Content-Type': 'application/json'
          }
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle network timeouts', async () => {
      mockFetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      await expect(api.getBills()).rejects.toThrow('Request timeout');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });

      await expect(api.getBills()).rejects.toThrow('Invalid JSON');
    });

    it('should handle server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({
          success: false,
          error: 'Database connection failed'
        })
      });

      await expect(api.getBills()).rejects.toThrow();
    });
  });

  describe('request interceptors', () => {
    it('should add authorization header when token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue('test-token');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      });

      await api.getBills();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should not add authorization header when no token exists', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await api.login({ email: 'test@example.com', password: 'password' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String)
          })
        })
      );
    });
  });

  describe('response interceptors', () => {
    it('should handle 401 responses by clearing tokens', async () => {
      mockLocalStorage.getItem.mockReturnValue('expired-token');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({
          success: false,
          error: 'Token expired'
        })
      });

      await expect(api.getBills()).rejects.toThrow();
      
      // Should clear tokens on 401
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });

    it('should retry requests with refreshed token', async () => {
      mockLocalStorage.getItem
        .mockReturnValueOnce('expired-token') // First call
        .mockReturnValueOnce('refresh-token') // Refresh token call
        .mockReturnValueOnce('new-token'); // Retry call

      // First request fails with 401
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ success: false, error: 'Token expired' })
        })
        // Refresh token succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { token: 'new-token', refreshToken: 'new-refresh-token' }
          })
        })
        // Retry succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] })
        });

      const result = await api.getBills();

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + refresh + retry
    });
  });
});











































