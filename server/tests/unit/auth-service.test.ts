import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthService, registerSchema, loginSchema } from '../../core/auth/auth-service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { logger  } from '../../../shared/core/src/index.js';

// Mock dependencies with proper typing
vi.mock('bcryptjs');
vi.mock('jsonwebtoken');
vi.mock('crypto');

// Create properly typed mocks using vi.MockedFunction
const mockBcryptCompare = vi.fn() as vi.MockedFunction<(password: string, hash: string) => Promise<boolean>>;
const mockBcryptHash = vi.fn() as vi.MockedFunction<(password: string, salt: string | number) => Promise<string>>;
const mockJwtSign = vi.fn() as vi.MockedFunction<(payload: string | object | Buffer, secretOrPrivateKey: string | Buffer | object, options?: any) => string>;
const mockJwtVerify = vi.fn() as vi.MockedFunction<(token: string, secretOrPublicKey: string | Buffer, options?: any) => string | object>;
const mockCryptoRandomBytes = vi.fn() as vi.MockedFunction<(size: number) => Buffer>;
const mockCryptoCreateHash = vi.fn() as vi.MockedFunction<(algorithm: string) => any>;
const mockCryptoRandomUUID = vi.fn() as vi.MockedFunction<() => string>;

// Apply mocks
(bcrypt.compare as vi.MockedFunction<any>) = mockBcryptCompare;
(bcrypt.hash as vi.MockedFunction<any>) = mockBcryptHash;
(jwt.sign as vi.MockedFunction<any>) = mockJwtSign;
(jwt.verify as vi.MockedFunction<any>) = mockJwtVerify;
(crypto.randomBytes as vi.MockedFunction<any>) = mockCryptoRandomBytes;
(crypto.createHash as vi.MockedFunction<any>) = mockCryptoCreateHash;
(crypto.randomUUID as vi.MockedFunction<any>) = mockCryptoRandomUUID;

// Mock database with proper typing
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  query: vi.fn(),
  transaction: vi.fn()
} as any;

vi.mock('../shared/database/connection', () => ({
  database: mockDb
}));

// Mock services
vi.mock('../../infrastructure/notifications/email-service.js', () => ({
  emailService: {
    sendVerificationEmail: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    sendPasswordChangeNotification: vi.fn()
  }
}));

vi.mock('../../features/security/encryption-service.js', () => ({
  encryptionService: {
    hashPassword: vi.fn()
  }
}));

vi.mock('../validation/input-validation-service.js', () => ({
  inputValidationService: {
    validateRequest: vi.fn(),
    validateEmail: vi.fn()
  }
}));

vi.mock('../../features/security/security-audit-service.js', () => ({
  securityAuditService: {
    logAuthEvent: vi.fn()
  }
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockRequest: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
    
    mockRequest = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' }
    };

    // Setup default mocks
    mockCryptoRandomBytes.mockReturnValue(Buffer.from('mock-token'));
    mockCryptoCreateHash.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('mock-hash')
    });
    mockCryptoRandomUUID.mockReturnValue('mock-uuid');
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      first_name: 'John',
      last_name: 'Doe',
      role: 'citizen' as const
    };

    beforeEach(() => {
      // Mock input validation service
      const { inputValidationService } = require('../../core/validation/input-validation-service.js');
      inputValidationService.validateRequest.mockReturnValue({
        success: true,
        data: validRegistrationData
      });
      inputValidationService.validateEmail.mockReturnValue({
        isValid: true,
        sanitized: validRegistrationData.email
      });

      // Mock encryption service
      const { encryptionService } = require('../../features/security/encryption-service.js');
      encryptionService.hashPassword.mockResolvedValue('hashed-password');

      // Mock email service
      const { emailService } = require('../../infrastructure/notifications/email-service.js');
      emailService.sendVerificationEmail.mockResolvedValue(true);
    });

    it('should register a new user successfully', async () => {
      // Mock database responses
      mockDb.limit.mockResolvedValueOnce([]); // No existing user
      mockDb.returning.mockResolvedValueOnce([{
        id: 'user-id',
        email: validRegistrationData.email,
        first_name: validRegistrationData.first_name,
        last_name: validRegistrationData.last_name,
        name: 'John Doe',
        role: validRegistrationData.role,
        verification_status: 'pending',
        is_active: true
      }]);

      // Mock JWT generation
      mockJwtSign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await authService.register(validRegistrationData, mockRequest);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
      expect(result.requiresVerification).toBe(true);
    });

    it('should fail registration for existing user', async () => {
      // Mock existing user
      mockDb.limit.mockResolvedValueOnce([{ id: 'existing-user' }]);

      const result = await authService.register(validRegistrationData, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should fail registration for invalid input', async () => {
      const { inputValidationService } = require('../../core/validation/input-validation-service.js');
      inputValidationService.validateRequest.mockReturnValue({
        success: false,
        errors: ['Invalid email format']
      });

      const result = await authService.register(validRegistrationData, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should fail registration for invalid email', async () => {
      const { inputValidationService } = require('../../core/validation/input-validation-service.js');
      inputValidationService.validateEmail.mockReturnValue({
        isValid: false,
        error: 'Invalid email format'
      });

      const result = await authService.register(validRegistrationData, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid email format');
    });

    it('should handle database errors gracefully', async () => {
      mockDb.limit.mockRejectedValueOnce(new Error('Database error'));

      const result = await authService.register(validRegistrationData, mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Registration failed');
    });
  });

  describe('login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'SecurePass123!'
    };

    const mockUser = {
      id: 'user-id',
      email: validLoginData.email,
      password_hash: 'hashed-password',
      first_name: 'John',
      last_name: 'Doe',
      name: 'John Doe',
      role: 'citizen',
      verification_status: 'verified',
      is_active: true
    };

    it('should login user successfully', async () => {
      // Mock database response
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Mock password verification
      mockBcryptCompare.mockResolvedValue(true);

      // Mock JWT generation
      mockJwtSign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('access-token');
      expect(result.refresh_token).toBe('refresh-token');
    });

    it('should fail login for non-existent user', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should fail login for inactive user', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockUser, is_active: false }]);

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
    });

    it('should fail login for invalid password', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      mockBcryptCompare.mockResolvedValue(false);

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should update last login timestamp', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      mockBcryptCompare.mockResolvedValue(true);
      mockJwtSign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await authService.login(validLoginData);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        last_login_at: expect.any(Date)
      }));
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        name: 'John Doe',
        role: 'citizen',
        verification_status: 'pending',
        is_active: true,
        preferences: {
          emailVerificationToken: 'valid-token',
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

      mockDb.limit.mockResolvedValueOnce([mockUser]);

      const result = await authService.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.user?.verification_status).toBe('verified');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail verification for invalid token', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await authService.verifyEmail('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid verification token');
    });

    it('should fail verification for expired token', async () => {
      const mockUser = {
        id: 'user-id',
        preferences: {
          emailVerificationToken: 'expired-token',
          emailVerificationExpires: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
        }
      };

      mockDb.limit.mockResolvedValueOnce([mockUser]);

      const result = await authService.verifyEmail('expired-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Verification token has expired');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      const result = await authService.logout('valid-token');

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith({ is_active: false });
    });

    it('should handle logout errors gracefully', async () => {
      mockDb.update.mockRejectedValueOnce(new Error('Database error'));

      const result = await authService.logout('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logout failed');
    });
  });

  describe('refresh_token', () => { const mockSession = {
      id: 'session-id',
      user_id: 'user-id',
      refresh_token_hash: 'mock-hash',
      is_active: true,
      refresh_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
     };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      name: 'John Doe',
      role: 'citizen',
      verification_status: 'verified',
      is_active: true
    };

    it('should refresh token successfully', async () => { // Mock JWT verification
      mockJwtVerify.mockReturnValue({ user_id: 'user-id'  });

      // Mock database responses
      mockDb.limit
        .mockResolvedValueOnce([mockSession]) // Session lookup
        .mockResolvedValueOnce([mockUser]); // User lookup

      // Mock new token generation
      mockJwtSign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refresh_token('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-access-token');
      expect(result.refresh_token).toBe('new-refresh-token');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail refresh for invalid token', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.refresh_token('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token refresh failed');
    });

    it('should fail refresh for non-existent session', async () => { mockJwtVerify.mockReturnValue({ user_id: 'user-id'  });
      mockDb.limit.mockResolvedValueOnce([]); // No session found

      const result = await authService.refresh_token('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });

    it('should fail refresh for expired token', async () => { (jwt.verify as vi.Mock).mockReturnValue({ user_id: 'user-id'  });
      
      const expiredSession = {
        ...mockSession,
        refresh_token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
      };
      
      mockDb.limit.mockResolvedValueOnce([expiredSession]);

      const result = await authService.refresh_token('expired-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh token expired');
      expect(mockDb.update).toHaveBeenCalled(); // Should invalidate session
    });
  });

  describe('verifyToken', () => { const mockSession = {
      id: 'session-id',
      user_id: 'user-id',
      token: 'valid-token',
      is_active: true,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
     };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      name: 'John Doe',
      role: 'citizen',
      verification_status: 'verified',
      is_active: true
    };

    it('should verify token successfully', async () => { mockJwtVerify.mockReturnValue({ user_id: 'user-id'  });
      mockDb.limit
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([mockUser]);

      const result = await authService.verifyToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should fail verification for invalid JWT', async () => {
      mockJwtVerify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should fail verification for inactive session', async () => { mockJwtVerify.mockReturnValue({ user_id: 'user-id'  });
      mockDb.limit.mockResolvedValueOnce([]); // No active session

      const result = await authService.verifyToken('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session');
    });

    it('should fail verification for expired session', async () => { mockJwtVerify.mockReturnValue({ user_id: 'user-id'  });

      const expiredSession = {
        ...mockSession,
        expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
      };

      mockDb.limit.mockResolvedValueOnce([expiredSession]);

      const result = await authService.verifyToken('expired-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(mockDb.update).toHaveBeenCalled(); // Should invalidate session
    });

    it('should fail verification for inactive user', async () => { mockJwtVerify.mockReturnValue({ user_id: 'user-id'  });
      mockDb.limit
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([{ ...mockUser, is_active: false }]);

      const result = await authService.verifyToken('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found or inactive');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        first_name: 'John'
      };

      mockDb.limit.mockResolvedValueOnce([mockUser]);

      const { emailService } = require('../../infrastructure/notifications/email-service.js');
      emailService.sendPasswordResetEmail.mockResolvedValue(true);

      const result = await authService.requestPasswordReset({ email: 'test@example.com' });

      expect(result.success).toBe(true);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not reveal if email does not exist', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // No user found

      const result = await authService.requestPasswordReset({ email: 'nonexistent@example.com' });

      expect(result.success).toBe(true); // Still returns success
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => { const mockResetRecord = {
      id: 'reset-id',
      user_id: 'user-id',
      tokenHash: 'mock-hash',
      expires_at: new Date(Date.now() + 60 * 60 * 1000)
     };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      first_name: 'John'
    };

    it('should reset password successfully', async () => {
      mockDb.limit
        .mockResolvedValueOnce([mockResetRecord])
        .mockResolvedValueOnce([mockUser]);

      mockBcryptHash.mockResolvedValue('new-hashed-password');

      const { emailService } = require('../../infrastructure/notifications/email-service.js');
      emailService.sendPasswordChangeNotification.mockResolvedValue(true);

      const result = await authService.resetPassword({
        token: 'valid-token',
        password: 'NewSecurePass123!'
      });

      expect(result.success).toBe(true);
      expect(mockDb.update).toHaveBeenCalled(); // Update password
      expect(mockDb.delete).toHaveBeenCalled(); // Delete reset token
      expect(emailService.sendPasswordChangeNotification).toHaveBeenCalled();
    });

    it('should fail reset for invalid token', async () => {
      mockDb.limit.mockResolvedValueOnce([]); // No reset record found

      const result = await authService.resetPassword({
        token: 'invalid-token',
        password: 'NewSecurePass123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid or expired reset token');
    });

    it('should fail reset for expired token', async () => {
      const expiredResetRecord = {
        ...mockResetRecord,
        expires_at: new Date(Date.now() - 60 * 60 * 1000) // Expired
      };

      mockDb.limit.mockResolvedValueOnce([expiredResetRecord]);

      const result = await authService.resetPassword({
        token: 'expired-token',
        password: 'NewSecurePass123!'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Reset token has expired');
      expect(mockDb.delete).toHaveBeenCalled(); // Should clean up expired token
    });

    it('should invalidate all user sessions after password reset', async () => {
      mockDb.limit
        .mockResolvedValueOnce([mockResetRecord])
        .mockResolvedValueOnce([mockUser]);

      mockBcryptHash.mockResolvedValue('new-hashed-password');

      await authService.resetPassword({
        token: 'valid-token',
        password: 'NewSecurePass123!'
      });

      // Should invalidate all sessions for security
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      );
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should clean up expired tokens', async () => {
      await authService.cleanupExpiredTokens();

      expect(mockDb.update).toHaveBeenCalled(); // Clean up expired sessions
      expect(mockDb.delete).toHaveBeenCalled(); // Clean up expired reset tokens
    });

    it('should handle cleanup errors gracefully', async () => {
      mockDb.update.mockRejectedValueOnce(new Error('Cleanup error'));

      // Should not throw error
      await expect(authService.cleanupExpiredTokens()).resolves.toBeUndefined();
    });
  });
});












































