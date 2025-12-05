import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock dependencies before importing the module under test
vi.mock('../secure-storage', () => ({
    tokenStorage: {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
    },
}));

vi.mock('../logger-unified', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
    },
}));

vi.mock('../error-system', () => ({
    createError: vi.fn((message, context) => ({
        message,
        errorId: 'test-error-id',
        statusCode: 500,
        code: 'TEST_ERROR',
        domain: 'COMPONENT',
        severity: 'MEDIUM',
        timestamp: new Date(),
        retryable: false,
        recoverable: false,
    })),
    safeAsync: vi.fn(async (operation) => {
        try {
            const result = await operation();
            return { success: true, data: result };
        } catch (error) {
            return {
                success: false, error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    errorId: 'test-error-id',
                    statusCode: 500,
                    code: 'TEST_ERROR',
                    domain: 'COMPONENT',
                    severity: 'MEDIUM',
                    timestamp: new Date(),
                    retryable: false,
                    recoverable: false,
                }
            };
        }
    }),
    ErrorDomain: {
        COMPONENT: 'COMPONENT',
        API: 'API',
        AUTHENTICATION: 'AUTHENTICATION',
        NETWORK: 'NETWORK',
        STORAGE: 'STORAGE',
        VALIDATION: 'VALIDATION',
    },
    ErrorSeverity: {
        LOW: 'LOW',
        MEDIUM: 'MEDIUM',
        HIGH: 'HIGH',
        CRITICAL: 'CRITICAL',
    },
}));

// Import after mocks
import { tokenManager } from '../storage';
import { secureStorage } from '../storage';
import { logger } from '../logger';
import { ErrorFactory, ErrorDomain, ErrorSeverity } from '../../core/error';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.location
const mockLocation = { href: '' };
Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
});

describe('SecureTokenManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();

        // Reset storage mocks
        vi.mocked(tokenStorage.setItem).mockResolvedValue();
        vi.mocked(tokenStorage.getItem).mockResolvedValue(null);
        vi.mocked(tokenStorage.removeItem).mockImplementation(() => { });

        // Reset fetch mock
        mockFetch.mockReset();

        // Reset location
        mockLocation.href = '';
    });

    afterEach(() => {
        vi.useRealTimers();
        tokenManager.cleanup();
    });

    describe('storeTokenMetadata', () => {
        it('should store token metadata and user data successfully', async () => {
            const metadata = {
                expiresAt: Date.now() + 3600000,
                userId: 'user123',
                sessionId: 'session456',
            };
            const userData = {
                id: 'user123',
                email: 'test@example.com',
                role: 'citizen',
            };

            await tokenManager.storeTokenMetadata(metadata, userData);

            expect(tokenStorage.setItem).toHaveBeenCalledWith(
                'chanuka_token_metadata',
                expect.any(String)
            );
            expect(tokenStorage.setItem).toHaveBeenCalledWith(
                'chanuka_user_data',
                expect.any(String)
            );
            expect(logger.info).toHaveBeenCalledWith(
                'Token metadata stored securely',
                expect.objectContaining({
                    component: 'SecureTokenManager',
                    hasUserData: true,
                })
            );
        });

        it('should handle storage errors gracefully', async () => {
            const metadata = {
                expiresAt: Date.now() + 3600000,
            };

            vi.mocked(tokenStorage.setItem).mockRejectedValue(new Error('Storage failed'));

            await secureTokenManager.storeTokenMetadata(metadata);

            expect(logger.error).toHaveBeenCalledWith(
                'Failed to store token metadata',
                { component: 'SecureTokenManager' },
                expect.any(Error)
            );
        });

        it('should schedule token refresh for future expiration', async () => {
          const futureTime = Date.now() + 3600000; // 1 hour from now
          const metadata = { expiresAt: futureTime };
    
          const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({}),
          };
          mockFetch.mockResolvedValue(mockResponse);
    
          await secureTokenManager.storeTokenMetadata(metadata);
    
          // Should schedule refresh 5 minutes before expiration
          const expectedRefreshTime = futureTime - Date.now() - 300000;
          vi.advanceTimersByTime(expectedRefreshTime);
    
          // Wait for the scheduled refresh to execute
          await vi.runOnlyPendingTimersAsync();
    
          expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', expect.any(Object));
        });
    });

    describe('getTokenMetadata', () => {
        it('should return parsed metadata when available', async () => {
            const metadata = {
                expiresAt: Date.now() + 3600000,
                userId: 'user123',
            };
            const metadataString = JSON.stringify(metadata);

            vi.mocked(tokenStorage.getItem).mockResolvedValue(metadataString);

            const result = await secureTokenManager.getTokenMetadata();

            expect(result).toEqual(metadata);
            expect(tokenStorage.getItem).toHaveBeenCalledWith('chanuka_token_metadata');
        });

        it('should return null when no metadata exists', async () => {
            vi.mocked(tokenStorage.getItem).mockResolvedValue(null);

            const result = await secureTokenManager.getTokenMetadata();

            expect(result).toBeNull();
        });

        it('should handle JSON parse errors', async () => {
            vi.mocked(tokenStorage.getItem).mockResolvedValue('invalid json');

            const result = await secureTokenManager.getTokenMetadata();

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('getUserData', () => {
        it('should return parsed user data when available', async () => {
            const userData = {
                id: 'user123',
                email: 'test@example.com',
                role: 'citizen',
            };
            const userDataString = JSON.stringify(userData);

            vi.mocked(tokenStorage.getItem).mockImplementation((key) => {
                if (key === 'chanuka_user_data') return Promise.resolve(userDataString);
                return Promise.resolve(null);
            });

            const result = await secureTokenManager.getUserData();

            expect(result).toEqual(userData);
        });

        it('should return null when no user data exists', async () => {
            vi.mocked(tokenStorage.getItem).mockResolvedValue(null);

            const result = await secureTokenManager.getUserData();

            expect(result).toBeNull();
        });
    });

    describe('clearAll', () => {
        it('should clear all stored data and cancel timeouts', async () => {
            // Set up some data first
            const metadata = { expiresAt: Date.now() + 3600000 };
            await secureTokenManager.storeTokenMetadata(metadata);

            await secureTokenManager.clearAll();

            expect(tokenStorage.removeItem).toHaveBeenCalledWith('chanuka_token_metadata');
            expect(tokenStorage.removeItem).toHaveBeenCalledWith('chanuka_user_data');
            expect(logger.info).toHaveBeenCalledWith('Token metadata cleared', {
                component: 'SecureTokenManager',
            });
        });
    });

    describe('validateTokenStatus', () => {
        it('should return valid status for unexpired token', async () => {
            const metadata = { expiresAt: Date.now() + 3600000 };
            vi.mocked(tokenStorage.getItem).mockResolvedValue(JSON.stringify(metadata));

            const result = await secureTokenManager.validateTokenStatus();

            expect(result.isValid).toBe(true);
            expect(result.isExpired).toBe(false);
            expect(result.needsRefresh).toBe(false);
            expect(result.timeUntilExpiry).toBeGreaterThan(0);
        });

        it('should return expired status for expired token', async () => {
            const metadata = { expiresAt: Date.now() - 1000 };
            vi.mocked(tokenStorage.getItem).mockResolvedValue(JSON.stringify(metadata));

            const result = await secureTokenManager.validateTokenStatus();

            expect(result.isValid).toBe(false);
            expect(result.isExpired).toBe(true);
            expect(result.needsRefresh).toBe(true);
        });

        it('should return needs refresh for token expiring soon', async () => {
            const metadata = { expiresAt: Date.now() + 200000 }; // Less than 5 minutes
            vi.mocked(tokenStorage.getItem).mockResolvedValue(JSON.stringify(metadata));

            const result = await secureTokenManager.validateTokenStatus();

            expect(result.isValid).toBe(true);
            expect(result.isExpired).toBe(false);
            expect(result.needsRefresh).toBe(true);
        });

        it('should return invalid status when no metadata exists', async () => {
            vi.mocked(tokenStorage.getItem).mockResolvedValue(null);

            const result = await secureTokenManager.validateTokenStatus();

            expect(result.isValid).toBe(false);
            expect(result.isExpired).toBe(true);
            expect(result.needsRefresh).toBe(true);
        });
    });

    describe('isAuthenticated', () => {
        it('should return true for valid token', async () => {
            const metadata = { expiresAt: Date.now() + 3600000 };
            vi.mocked(tokenStorage.getItem).mockResolvedValue(JSON.stringify(metadata));

            const result = await secureTokenManager.isAuthenticated();

            expect(result).toBe(true);
        });

        it('should return false for invalid token', async () => {
            vi.mocked(tokenStorage.getItem).mockResolvedValue(null);

            const result = await secureTokenManager.isAuthenticated();

            expect(result).toBe(false);
        });
    });

    describe('refreshToken', () => {
      it('should successfully refresh token', async () => {
        const mockResponse = {
          ok: true,
          json: vi.fn().mockResolvedValue({
            expiresAt: Date.now() + 3600000,
            userId: 'user123',
            sessionId: 'session456',
            user: { id: 'user123', email: 'test@example.com', role: 'citizen' },
          }),
        };
        mockFetch.mockResolvedValue(mockResponse);
  
        // Don't mock safeAsync for this test to let the actual operation run
        vi.mocked(safeAsync).mockImplementation(async (operation) => {
          try {
            const result = await operation();
            return { success: true, data: result };
          } catch (error) {
            return { success: false, error };
          }
        });
  
        const result = await secureTokenManager.refreshToken();
  
        expect(result).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
          }),
        });
      });

        it('should handle refresh failure', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            vi.mocked(safeAsync).mockResolvedValue({
                success: false,
                error: {
                    message: 'Network error',
                    errorId: 'test-error-id',
                    statusCode: 500,
                    code: 'TEST_ERROR',
                    domain: ErrorDomain.COMPONENT,
                    severity: ErrorSeverity.MEDIUM,
                    timestamp: new Date(),
                    retryable: false,
                    recoverable: false,
                    metadata: {},
                    logError: vi.fn(),
                    toJSON: vi.fn(),
                    withContext: vi.fn(),
                    withCause: vi.fn(),
                } as any,
            });

            const result = await secureTokenManager.refreshToken();

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalled();
        });

        it('should prevent concurrent refresh requests', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({}),
            };
            mockFetch.mockResolvedValue(mockResponse);

            // Don't mock safeAsync to let actual operation run
            vi.mocked(safeAsync).mockImplementation(async (operation) => {
                try {
                    const result = await operation();
                    return { success: true, data: result };
                } catch (error) {
                    return { success: false, error };
                }
            });

            // Start two concurrent refreshes
            const promise1 = secureTokenManager.refreshToken();
            const promise2 = secureTokenManager.refreshToken();

            const [result1, result2] = await Promise.all([promise1, promise2]);

            expect(result1).toBe(true);
            expect(result2).toBe(true);
            expect(mockFetch).toHaveBeenCalledTimes(1); // Only one actual request
        }, 15000);
    });

    describe('makeAuthenticatedRequest', () => {
        it('should make request with credentials included', async () => {
            const mockResponse = { ok: true, status: 200 };
            mockFetch.mockResolvedValue(mockResponse);

            const result = await secureTokenManager.makeAuthenticatedRequest('/api/test');

            expect(mockFetch).toHaveBeenCalledWith('/api/test', {
                credentials: 'include',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                }),
            });
            expect(result).toBe(mockResponse);
        });

        it('should handle 401 errors by attempting refresh', async () => {
            const mockUnauthorizedResponse = { ok: false, status: 401 };
            const mockSuccessResponse = { ok: true, status: 200 };

            mockFetch
                .mockResolvedValueOnce(mockUnauthorizedResponse)
                .mockResolvedValueOnce(mockSuccessResponse);

            // Mock successful refresh
            vi.mocked(safeAsync).mockResolvedValue({ success: true, data: true });

            const result = await secureTokenManager.makeAuthenticatedRequest('/api/test');

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(result).toBe(mockSuccessResponse);
        });

        it('should redirect on refresh failure', async () => {
            const mockUnauthorizedResponse = { ok: false, status: 401 };
            mockFetch.mockResolvedValue(mockUnauthorizedResponse);

            vi.mocked(safeAsync).mockResolvedValue({
                success: false,
                error: {
                    message: 'Refresh failed',
                    errorId: 'test-error-id',
                    statusCode: 500,
                    code: 'TEST_ERROR',
                    domain: ErrorDomain.COMPONENT,
                    severity: ErrorSeverity.MEDIUM,
                    timestamp: new Date(),
                    retryable: false,
                    recoverable: false,
                    metadata: {},
                    logError: vi.fn(),
                    toJSON: vi.fn(),
                    withContext: vi.fn(),
                    withCause: vi.fn(),
                } as any,
            });

            await expect(secureTokenManager.makeAuthenticatedRequest('/api/test')).rejects.toThrow('Authentication failed');

            expect(mockLocation.href).toBe('/auth/login');
        });
    });

    describe('utility methods', () => {
        it('should return time until expiry', async () => {
            const metadata = { expiresAt: Date.now() + 3600000 };
            vi.mocked(tokenStorage.getItem).mockResolvedValue(JSON.stringify(metadata));

            const result = await secureTokenManager.getTimeUntilExpiry();

            expect(result).toBeGreaterThan(3500); // Approximately 1 hour in seconds
        });

        it('should check if token needs refresh soon', async () => {
            const metadata = { expiresAt: Date.now() + 200000 }; // Less than 5 minutes
            vi.mocked(tokenStorage.getItem).mockResolvedValue(JSON.stringify(metadata));

            const result = await secureTokenManager.needsRefreshSoon();

            expect(result).toBe(true);
        });
    });

    describe('cleanup', () => {
        it('should clear timeouts and reset state', () => {
            // Set up a timeout
            const metadata = { expiresAt: Date.now() + 3600000 };
            secureTokenManager.storeTokenMetadata(metadata);

            secureTokenManager.cleanup();

            // Should not throw any errors
            expect(() => secureTokenManager.cleanup()).not.toThrow();
        });
    });

    describe('error scenarios', () => {
        it('should handle fetch errors during refresh', async () => {
            mockFetch.mockRejectedValue(new Error('Network error'));

            vi.mocked(safeAsync).mockResolvedValue({
                success: false,
                error: {
                    message: 'Network error',
                    errorId: 'test-error-id',
                    statusCode: 500,
                    code: 'TEST_ERROR',
                    domain: ErrorDomain.COMPONENT,
                    severity: ErrorSeverity.MEDIUM,
                    timestamp: new Date(),
                    retryable: false,
                    recoverable: false,
                    metadata: {},
                    logError: vi.fn(),
                    toJSON: vi.fn(),
                    withContext: vi.fn(),
                    withCause: vi.fn(),
                } as any,
            });

            const result = await secureTokenManager.refreshToken();

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                'Token refresh failed',
                {
                    component: 'SecureTokenManager',
                    errorId: 'test-error-id'
                },
                expect.any(Object)
            );
        });

        it('should handle invalid server response during refresh', async () => {
            const mockResponse = {
                ok: true,
                json: vi.fn().mockResolvedValue({}), // Missing expiresAt
            };
            mockFetch.mockResolvedValue(mockResponse);

            vi.mocked(safeAsync).mockResolvedValue({
                success: true,
                data: true,
            });

            const result = await secureTokenManager.refreshToken();

            expect(result).toBe(true);
            // Should still work even without expiresAt in response
        });

        it('should handle storage failures gracefully', async () => {
            vi.mocked(tokenStorage.getItem).mockRejectedValue(new Error('Storage error'));

            const result = await secureTokenManager.getTokenMetadata();

            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalled();
        });
    });
});