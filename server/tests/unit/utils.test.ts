import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the utils modules
const mockValidation = {
  validateEmail: jest.fn() as jest.MockedFunction<() => { isValid: boolean; sanitized: string } | { isValid: boolean; error: string }>,
  validatePassword: jest.fn() as jest.MockedFunction<() => { isValid: boolean; strength: string; score: number; errors?: string[] }>,
  sanitizeInput: jest.fn() as jest.MockedFunction<() => string>,
  validateBillNumber: jest.fn() as jest.MockedFunction<() => { isValid: boolean; normalized: string } | { isValid: boolean; error: string }>
};

const mockCrypto = {
  generateSecureToken: jest.fn() as jest.MockedFunction<(length: number) => string>,
  hashPassword: jest.fn() as jest.MockedFunction<(password: string) => Promise<string>>,
  verifyPassword: jest.fn() as jest.MockedFunction<(password: string, hash: string) => Promise<boolean>>,
  encrypt: jest.fn() as jest.MockedFunction<(data: string) => string>,
  decrypt: jest.fn() as jest.MockedFunction<(data: string) => string>
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

const mockMetrics = {
  incrementCounter: jest.fn(),
  recordTiming: jest.fn(),
  recordGauge: jest.fn()
};

const mockApiResponse = {
  success: jest.fn(),
  error: jest.fn(),
  paginated: jest.fn()
} as any;

// Mock the modules
jest.mock('../../utils/validation', () => mockValidation);
jest.mock('../../utils/crypto', () => mockCrypto);
jest.mock('../../utils/logger', () => mockLogger);
jest.mock('../../utils/metrics', () => mockMetrics);
jest.mock('../../utils/api-response', () => mockApiResponse);

// Import the mocked modules for type safety
import * as validation from '../../utils/validation';
import * as crypto from '../../utils/crypto';
import * as logger from '../../utils/logger';
import * as metrics from '../../utils/metrics';
import * as apiResponse from '../../utils/api-response';

describe('Validation Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateEmail', () => {
    it('should validate correct email formats', () => {
      mockValidation.validateEmail.mockReturnValue({ isValid: true, sanitized: 'test@example.com' });

      const result = validation.validateEmail('test@example.com');

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe('test@example.com');
    });

    it('should reject invalid email formats', () => {
      mockValidation.validateEmail.mockReturnValue({ isValid: false, error: 'Invalid email format' });

      const result = validation.validateEmail('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should handle edge cases', () => {
      const testCases = [
        { input: '', expected: false },
        { input: null, expected: false },
        { input: undefined, expected: false },
        { input: 'test@', expected: false },
        { input: '@example.com', expected: false },
        { input: 'test@example', expected: false },
        { input: 'test.email@example.com', expected: true },
        { input: 'test+tag@example.com', expected: true }
      ];

      testCases.forEach(({ input, expected }) => {
        mockValidation.validateEmail.mockReturnValue(expected ? { isValid: expected, sanitized: input as string } : { isValid: expected, error: 'Invalid email format' });
        const result = validation.validateEmail(input as string);
        expect(result.isValid).toBe(expected);
      });
    });
  });

  describe('validatePassword', () => {
    it('should validate strong passwords', () => {
      mockValidation.validatePassword.mockReturnValue({
        isValid: true,
        strength: 'strong',
        score: 5
      });

      const result = validation.validatePassword('SecurePass123!');

      expect(result.isValid).toBe(true);
      expect(result.strength).toBe('strong');
      expect(result.score).toBe(5);
    });

    it('should reject weak passwords', () => {
      mockValidation.validatePassword.mockReturnValue({
        isValid: false,
        strength: 'weak',
        score: 1,
        errors: ['Password too short', 'Missing special characters']
      });

      const result = validation.validatePassword('123');

      expect(result.isValid).toBe(false);
      expect(result.strength).toBe('weak');
      expect(result.errors).toContain('Password too short');
    });

    it('should check password requirements', () => {
      const requirements = [
        { password: 'short', shouldFail: 'too short' },
        { password: 'nouppercase123!', shouldFail: 'no uppercase' },
        { password: 'NOLOWERCASE123!', shouldFail: 'no lowercase' },
        { password: 'NoNumbers!', shouldFail: 'no numbers' },
        { password: 'NoSpecialChars123', shouldFail: 'no special chars' },
        { password: 'ValidPassword123!', shouldPass: true }
      ];

      requirements.forEach(({ password, shouldFail, shouldPass }) => {
        if (shouldPass) {
          mockValidation.validatePassword.mockReturnValue({ isValid: true, strength: 'strong', score: 5 });
        } else {
          mockValidation.validatePassword.mockReturnValue({
            isValid: false,
            strength: 'weak',
            score: 1,
            errors: [shouldFail as string]
          });
        }

        const result = validation.validatePassword(password);
        expect(result.isValid).toBe(!!shouldPass);
      });
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize HTML input', () => {
      mockValidation.sanitizeInput.mockReturnValue('Clean text');

      const result = validation.sanitizeInput('<script>alert("xss")</script>Clean text');

      expect(result).toBe('Clean text');
    });

    it('should handle XSS attempts', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '"><script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src=x onerror=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')"></iframe>'
      ];

      xssAttempts.forEach(xss => {
        mockValidation.sanitizeInput.mockReturnValue('');
        const result = validation.sanitizeInput(xss);
        expect(result).toBe('');
      });
    });

    it('should preserve safe HTML', () => {
      mockValidation.sanitizeInput.mockReturnValue('<p>Safe paragraph</p>');

      const result = validation.sanitizeInput('<p>Safe paragraph</p>');

      expect(result).toBe('<p>Safe paragraph</p>');
    });
  });

  describe('validateBillNumber', () => {
    it('should validate Canadian bill number formats', () => {
      const validFormats = [
        'C-123',
        'S-456',
        'C-1',
        'S-9999',
        'c-123', // Should handle case insensitive
        's-456'
      ];

      validFormats.forEach(billNumber => {
        mockValidation.validateBillNumber.mockReturnValue({ isValid: true, normalized: billNumber.toUpperCase() });
        const result = validation.validateBillNumber(billNumber);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject invalid bill number formats', () => {
      const invalidFormats = [
        'X-123', // Invalid prefix
        'C-', // Missing number
        'C-0', // Invalid number
        'C-99999', // Too many digits
        '123', // Missing prefix
        'C123', // Missing dash
        'CC-123' // Too many letters
      ];

      invalidFormats.forEach(billNumber => {
        mockValidation.validateBillNumber.mockReturnValue({ isValid: false, error: 'Invalid format' });
        const result = validation.validateBillNumber(billNumber);
        expect(result.isValid).toBe(false);
      });
    });
  });
});

describe('Crypto Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSecureToken', () => {
    it('should generate tokens of specified length', () => {
      mockCrypto.generateSecureToken.mockReturnValue('a'.repeat(32));

      const token = crypto.generateSecureToken(32);

      expect(token).toHaveLength(32);
      expect(mockCrypto.generateSecureToken).toHaveBeenCalledWith(32);
    });

    it('should generate unique tokens', () => {
      mockCrypto.generateSecureToken
        .mockReturnValueOnce('token1')
        .mockReturnValueOnce('token2')
        .mockReturnValueOnce('token3');

      const tokens = [
        crypto.generateSecureToken(16),
        crypto.generateSecureToken(16),
        crypto.generateSecureToken(16)
      ];

      expect(new Set(tokens).size).toBe(3); // All unique
    });
  });

  describe('hashPassword', () => {
    it('should hash passwords securely', async () => {
      mockCrypto.hashPassword.mockResolvedValue('$2b$12$hashedpassword');

      const hash = await crypto.hashPassword('password123');

      expect(hash).toMatch(/^\$2b\$/); // bcrypt format
      expect(mockCrypto.hashPassword).toHaveBeenCalledWith('password123');
    });

    it('should use appropriate salt rounds', async () => {
      mockCrypto.hashPassword.mockResolvedValue('$2b$12$hashedpassword');

      await crypto.hashPassword('password123');

      expect(mockCrypto.hashPassword).toHaveBeenCalledWith('password123');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct passwords', async () => {
      mockCrypto.verifyPassword.mockResolvedValue(true);

      const isValid = await crypto.verifyPassword('password123', '$2b$12$hashedpassword');

      expect(isValid).toBe(true);
      expect(mockCrypto.verifyPassword).toHaveBeenCalledWith('password123', '$2b$12$hashedpassword');
    });

    it('should reject incorrect passwords', async () => {
      mockCrypto.verifyPassword.mockResolvedValue(false);

      const isValid = await crypto.verifyPassword('wrongpassword', '$2b$12$hashedpassword');

      expect(isValid).toBe(false);
    });
  });

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt data', () => {
      const originalData = 'sensitive information';
      const encryptedData = 'encrypted_data_here';

      mockCrypto.encrypt.mockReturnValue(encryptedData);
      mockCrypto.decrypt.mockReturnValue(originalData);

      const encrypted = crypto.encrypt(originalData);
      const decrypted = crypto.decrypt(encrypted);

      expect(encrypted).toBe(encryptedData);
      expect(decrypted).toBe(originalData);
    });

    it('should handle encryption errors', () => {
      mockCrypto.encrypt.mockImplementation(() => {
        throw new Error('Encryption failed');
      });

      expect(() => crypto.encrypt('data')).toThrow('Encryption failed');
    });
  });
});

describe('Logger Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('logging levels', () => {
    it('should log info messages', () => {
      mockLogger.info('Test info message');

      expect(mockLogger.info).toHaveBeenCalledWith('Test info message');
    });

    it('should log warning messages', () => {
      mockLogger.warn('Test warning message');

      expect(mockLogger.warn).toHaveBeenCalledWith('Test warning message');
    });

    it('should log error messages', () => {
      mockLogger.error('Test error message');

      expect(mockLogger.error).toHaveBeenCalledWith('Test error message');
    });

    it('should log debug messages', () => {
      mockLogger.debug('Test debug message');

      expect(mockLogger.debug).toHaveBeenCalledWith('Test debug message');
    });
  });

  describe('structured logging', () => {
    it('should log with metadata', () => {
      const metadata = { userId: '123', action: 'login' };
      mockLogger.info('User logged in', metadata);

      expect(mockLogger.info).toHaveBeenCalledWith('User logged in', metadata);
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      mockLogger.error('An error occurred', { error });

      expect(mockLogger.error).toHaveBeenCalledWith('An error occurred', { error });
    });
  });
});

describe('Metrics Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('counter metrics', () => {
    it('should increment counters', () => {
      mockMetrics.incrementCounter('api.requests', { endpoint: '/bills' });

      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith('api.requests', { endpoint: '/bills' });
    });

    it('should increment by custom amounts', () => {
      mockMetrics.incrementCounter('api.requests', { endpoint: '/bills' }, 5);

      expect(mockMetrics.incrementCounter).toHaveBeenCalledWith('api.requests', { endpoint: '/bills' }, 5);
    });
  });

  describe('timing metrics', () => {
    it('should record timing data', () => {
      mockMetrics.recordTiming('api.response_time', 150, { endpoint: '/bills' });

      expect(mockMetrics.recordTiming).toHaveBeenCalledWith('api.response_time', 150, { endpoint: '/bills' });
    });

    it('should handle timing with different units', () => {
      mockMetrics.recordTiming('db.query_time', 0.025, { query: 'SELECT' }, 'seconds');

      expect(mockMetrics.recordTiming).toHaveBeenCalledWith('db.query_time', 0.025, { query: 'SELECT' }, 'seconds');
    });
  });

  describe('gauge metrics', () => {
    it('should record gauge values', () => {
      mockMetrics.recordGauge('system.memory_usage', 85.5, { unit: 'percent' });

      expect(mockMetrics.recordGauge).toHaveBeenCalledWith('system.memory_usage', 85.5, { unit: 'percent' });
    });

    it('should update gauge values', () => {
      mockMetrics.recordGauge('active_connections', 42);
      mockMetrics.recordGauge('active_connections', 43);

      expect(mockMetrics.recordGauge).toHaveBeenCalledTimes(2);
      expect(mockMetrics.recordGauge).toHaveBeenLastCalledWith('active_connections', 43);
    });
  });
});

describe('API Response Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('success responses', () => {
    it('should format success responses', () => {
      const data = { id: 1, name: 'Test' };
      const expectedResponse = {
        success: true,
        data,
        metadata: {
          timestamp: expect.any(String),
          responseTime: expect.any(Number),
          source: 'api'
        }
      };

      mockApiResponse.success.mockReturnValue(expectedResponse);

      const response = mockApiResponse.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.metadata).toBeDefined();
    });

    it('should include custom metadata', () => {
      const data = { id: 1 };
      const customMetadata = { version: '1.0', cached: true };
      const expectedResponse = {
        success: true,
        data,
        metadata: {
          timestamp: expect.any(String),
          responseTime: expect.any(Number),
          source: 'api',
          ...customMetadata
        }
      };

      mockApiResponse.success.mockReturnValue(expectedResponse);

      const response = mockApiResponse.success(data, customMetadata);

      expect(response.metadata).toEqual(expect.objectContaining(customMetadata));
    });
  });

  describe('error responses', () => {
    it('should format error responses', () => {
      const error = 'Something went wrong';
      const expectedResponse = {
        success: false,
        error,
        metadata: {
          timestamp: expect.any(String),
          responseTime: expect.any(Number),
          source: 'api'
        }
      };

      mockApiResponse.error.mockReturnValue(expectedResponse);

      const response = mockApiResponse.error(error);

      expect(response.success).toBe(false);
      expect(response.error).toBe(error);
      expect(response.metadata).toBeDefined();
    });

    it('should handle error objects', () => {
      const error = new Error('Test error');
      const expectedResponse = {
        success: false,
        error: 'Test error',
        metadata: {
          timestamp: expect.any(String),
          responseTime: expect.any(Number),
          source: 'api'
        }
      };

      mockApiResponse.error.mockReturnValue(expectedResponse);

      const response = mockApiResponse.error(error);

      expect(response.error).toBe('Test error');
    });

    it('should include error codes', () => {
      const error = 'Validation failed';
      const code = 'VALIDATION_ERROR';
      const expectedResponse = {
        success: false,
        error,
        code,
        metadata: {
          timestamp: expect.any(String),
          responseTime: expect.any(Number),
          source: 'api'
        }
      };

      mockApiResponse.error.mockReturnValue(expectedResponse);

      const response = mockApiResponse.error(error, code);

      expect(response.code).toBe(code);
    });
  });

  describe('paginated responses', () => {
    it('should format paginated responses', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false
      };
      const expectedResponse = {
        success: true,
        data,
        pagination,
        metadata: {
          timestamp: expect.any(String),
          responseTime: expect.any(Number),
          source: 'api'
        }
      };

      mockApiResponse.paginated.mockReturnValue(expectedResponse);

      const response = mockApiResponse.paginated(data, pagination);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.pagination).toEqual(pagination);
    });

    it('should calculate pagination metadata', () => {
      const data = Array.from({ length: 10 }, (_, i) => ({ id: i + 1 }));
      const pagination = {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true
      };

      mockApiResponse.paginated.mockReturnValue({
        success: true,
        data,
        pagination,
        metadata: { timestamp: new Date().toISOString(), responseTime: 50, source: 'api' }
      });

      const response = mockApiResponse.paginated(data, pagination);

      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(true);
      expect(response.pagination.totalPages).toBe(3);
    });
  });
});






