import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthService, registerSchema, loginSchema } from '../../core/auth/auth-service.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Mock dependencies
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');

// Mock database
const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis()
};

jest.mock('../../../shared/database/connection.js', () => ({
  database: mockDb
}));

// Mock services
jest.mock('../../infrastructure/notifications/email-service.js', () => ({
  emailService: {
    sendVerificationEmail: jest.fn(),
    sendPasswordResetEmail: jest.fn(),
    sendPasswordChangeNotification: jest.fn()
  }
}));

jest.mock('../../features/security/encryption-service.js', () => ({
  encryptionService: {
    hashPassword: jest.fn()
  }
}));

jest.mock('../validation/input-validation-service.js', () => ({
  inputValidationService: {
    validateRequest: jest.fn(),
    validateEmail: jest.fn()
  }
}));

jest.mock('../../features/security/security-audit-service.js', () => ({
  securityAuditService: {
    logAuthEvent: jest.fn()
  }
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockRequest: any;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    
    mockRequest = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' }
    };

    // Setup default mocks
    (crypto.randomBytes as jest.Mock).mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-token')
    });
    
    (crypto.createHash as jest.Mock).mockReturnValue({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValue('mock-hash')
    });

    (crypto.randomUUID as jest.Mock).mockReturnValue('mock-uuid');
  });

  describe('register', () => {
    const validRegistrationData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
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
        firstName: validRegistrationData.firstName,
        lastName: validRegistrationData.lastName,
        name: 'John Doe',
        role: validRegistrationData.role,
        verificationStatus: 'pending',
        isActive: true
      }]);

      // Mock JWT generation
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await authService.register(validRegistrationData, mockRequest);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
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
      passwordHash: 'hashed-password',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      role: 'citizen',
      verificationStatus: 'verified',
      isActive: true
    };

    it('should login user successfully', async () => {
      // Mock database response
      mockDb.limit.mockResolvedValueOnce([mockUser]);

      // Mock password verification
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock JWT generation
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should fail login for non-existent user', async () => {
      mockDb.limit.mockResolvedValueOnce([]);

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should fail login for inactive user', async () => {
      mockDb.limit.mockResolvedValueOnce([{ ...mockUser, isActive: false }]);

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Account is deactivated');
    });

    it('should fail login for invalid password', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await authService.login(validLoginData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should update last login timestamp', async () => {
      mockDb.limit.mockResolvedValueOnce([mockUser]);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      await authService.login(validLoginData);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalledWith(expect.objectContaining({
        lastLoginAt: expect.any(Date)
      }));
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        name: 'John Doe',
        role: 'citizen',
        verificationStatus: 'pending',
        isActive: true,
        preferences: {
          emailVerificationToken: 'valid-token',
          emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      };

      mockDb.limit.mockResolvedValueOnce([mockUser]);

      const result = await authService.verifyEmail('valid-token');

      expect(result.success).toBe(true);
      expect(result.user?.verificationStatus).toBe('verified');
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
      expect(mockDb.set).toHaveBeenCalledWith({ isActive: false });
    });

    it('should handle logout errors gracefully', async () => {
      mockDb.update.mockRejectedValueOnce(new Error('Database error'));

      const result = await authService.logout('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Logout failed');
    });
  });

  describe('refreshToken', () => {
    const mockSession = {
      id: 'session-id',
      userId: 'user-id',
      refreshTokenHash: 'mock-hash',
      isActive: true,
      refreshTokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      role: 'citizen',
      verificationStatus: 'verified',
      isActive: true
    };

    it('should refresh token successfully', async () => {
      // Mock JWT verification
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });

      // Mock database responses
      mockDb.limit
        .mockResolvedValueOnce([mockSession]) // Session lookup
        .mockResolvedValueOnce([mockUser]); // User lookup

      // Mock new token generation
      (jwt.sign as jest.Mock)
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.token).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should fail refresh for invalid token', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token refresh failed');
    });

    it('should fail refresh for non-existent session', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });
      mockDb.limit.mockResolvedValueOnce([]); // No session found

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });

    it('should fail refresh for expired token', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });
      
      const expiredSession = {
        ...mockSession,
        refreshTokenExpiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
      };
      
      mockDb.limit.mockResolvedValueOnce([expiredSession]);

      const result = await authService.refreshToken('expired-refresh-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Refresh token expired');
      expect(mockDb.update).toHaveBeenCalled(); // Should invalidate session
    });
  });

  describe('verifyToken', () => {
    const mockSession = {
      id: 'session-id',
      userId: 'user-id',
      token: 'valid-token',
      isActive: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
      role: 'citizen',
      verificationStatus: 'verified',
      isActive: true
    };

    it('should verify token successfully', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });
      mockDb.limit
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([mockUser]);

      const result = await authService.verifyToken('valid-token');

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });

    it('should fail verification for invalid JWT', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await authService.verifyToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });

    it('should fail verification for inactive session', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });
      mockDb.limit.mockResolvedValueOnce([]); // No active session

      const result = await authService.verifyToken('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid session');
    });

    it('should fail verification for expired session', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });
      
      const expiredSession = {
        ...mockSession,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired
      };
      
      mockDb.limit.mockResolvedValueOnce([expiredSession]);

      const result = await authService.verifyToken('expired-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Session expired');
      expect(mockDb.update).toHaveBeenCalled(); // Should invalidate session
    });

    it('should fail verification for inactive user', async () => {
      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user-id' });
      mockDb.limit
        .mockResolvedValueOnce([mockSession])
        .mockResolvedValueOnce([{ ...mockUser, isActive: false }]);

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
        firstName: 'John'
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

  describe('resetPassword', () => {
    const mockResetRecord = {
      id: 'reset-id',
      userId: 'user-id',
      tokenHash: 'mock-hash',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000)
    };

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      firstName: 'John'
    };

    it('should reset password successfully', async () => {
      mockDb.limit
        .mockResolvedValueOnce([mockResetRecord])
        .mockResolvedValueOnce([mockUser]);

      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

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
        expiresAt: new Date(Date.now() - 60 * 60 * 1000) // Expired
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

      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await authService.resetPassword({
        token: 'valid-token',
        password: 'NewSecurePass123!'
      });

      // Should invalidate all sessions for security
      expect(mockDb.update).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false })
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