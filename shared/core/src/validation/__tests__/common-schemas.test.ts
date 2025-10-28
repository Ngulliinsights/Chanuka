/**
 * Common Schemas Tests
 * 
 * Tests for common validation schemas and patterns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
  trace: vi.fn(),
};

vi.mock('@shared/core/src/observability/logging', () => ({
  logger: mockLogger,
  createLogger: vi.fn(() => mockLogger),
}));

import { z } from 'zod';
import {
import { logger } from '@shared/core/src/observability/logging';
  emailSchema,
  passwordSchema,
  strongPasswordSchema,
  phoneSchema,
  uuidSchema,
  urlSchema,
  secureUrlSchema,
  dateRangeSchema,
  paginationSchema,
  fileUploadSchema,
  secureFileUploadSchema,
  searchQuerySchema,
  secureSearchQuerySchema,
  coordinateSchema,
  addressSchema,
  moneySchema,
  nameSchema,
  usernameSchema,
  slugSchema,
  colorSchema,
  ipAddressSchema,
  ssnSchema,
  creditCardSchema,
  jwtTokenSchema,
  apiKeySchema,
  hashSchema,
  base64Schema,
  mimeTypeSchema,
  semverSchema,
  timezoneSchema,
  languageCodeSchema,
  countryCodeSchema,
  currencyCodeSchema,
  macAddressSchema,
  portSchema,
  hostnameSchema,
  domainSchema,
  geoBoundsSchema,
  timeRangeSchema,
  businessHoursSchema,
  contactInfoSchema,
  businessEntitySchemas,
  commonSchemas,
  createOptionalSchema,
  createArraySchema,
  createDeepPartialSchema,
  createConditionalSchema,
  createDependentSchema,
  createCrossFieldValidationSchema,
  createPaginatedSchema,
  createApiResponseSchema,
  SchemaVersionManager,
  createVersionedSchema,
  userSchemaVersioned,
  productSchemaVersioned,
} from '../schemas/common';

describe('Common Validation Schemas', () => {
  describe('Email Schema', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'Test@Example.COM', // Should be converted to lowercase
      ];

      validEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(email.toLowerCase());
        }
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        '',
        'invalid',
        '@example.com',
        'test@',
        'test..test@example.com',
        '.test@example.com',
        'test.@example.com',
        'test@example..com',
      ];

      invalidEmails.forEach(email => {
        const result = emailSchema.safeParse(email);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Password Schema', () => {
    it('should validate strong passwords', () => {
      const validPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'C0mplex#P4ssw0rd',
      ];

      validPasswords.forEach(password => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
      });
    });

    it('should reject weak passwords', () => {
      const invalidPasswords = [
        'short',
        'nouppercase123!',
        'NOLOWERCASE123!',
        'NoNumbers!',
        'NoSpecialChars123',
        'Aaaaaa123!', // Too many consecutive characters
      ];

      invalidPasswords.forEach(password => {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Strong Password Schema', () => {
    it('should require longer passwords', () => {
      const result = strongPasswordSchema.safeParse('Short1!');
      expect(result.success).toBe(false);
    });

    it('should reject common patterns', () => {
      const commonPasswords = [
        'Password123456!',
        'AdminPassword1!',
        'Qwerty123456!',
      ];

      commonPasswords.forEach(password => {
        const result = strongPasswordSchema.safeParse(password);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Phone Schema', () => {
    it('should validate international phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '1234567890',
        '+44123456789',
      ];

      validPhones.forEach(phone => {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatch(/^\+/);
        }
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = [
        '',
        '123',
        'abc123456789',
      ];

      invalidPhones.forEach(phone => {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('UUID Schema', () => {
    it('should validate UUIDs', () => {
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      ];

      validUUIDs.forEach(uuid => {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(uuid.toLowerCase());
        }
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        '',
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // Too short
      ];

      invalidUUIDs.forEach(uuid => {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('URL Schema', () => {
    it('should validate secure URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com/path',
        'https://subdomain.example.com:8080/path?query=value',
      ];

      validUrls.forEach(url => {
        const result = urlSchema.safeParse(url);
        expect(result.success).toBe(true);
      });
    });

    it('should reject insecure URLs', () => {
      const invalidUrls = [
        'ftp://example.com',
        'javascript:alert(1)',
        'http://localhost:3000',
        'https://127.0.0.1',
      ];

      invalidUrls.forEach(url => {
        const result = urlSchema.safeParse(url);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Secure URL Schema', () => {
    it('should only accept HTTPS URLs', () => {
      const result1 = secureUrlSchema.safeParse('https://example.com');
      expect(result1.success).toBe(true);

      const result2 = secureUrlSchema.safeParse('http://example.com');
      expect(result2.success).toBe(false);
    });
  });

  describe('Date Range Schema', () => {
    it('should validate correct date ranges', () => {
      const validRange = {
        startDate: '2023-01-01',
        endDate: '2023-12-31',
      };

      const result = dateRangeSchema.safeParse(validRange);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date ranges', () => {
      const invalidRange = {
        startDate: '2023-12-31',
        endDate: '2023-01-01',
      };

      const result = dateRangeSchema.safeParse(invalidRange);
      expect(result.success).toBe(false);
    });
  });

  describe('Pagination Schema', () => {
    it('should provide defaults and calculate offset', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should calculate offset correctly', () => {
      const result = paginationSchema.safeParse({ page: 3, limit: 20 });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(40);
      }
    });

    it('should enforce limits', () => {
      const result = paginationSchema.safeParse({ limit: 200 });
      expect(result.success).toBe(false);
    });
  });

  describe('File Upload Schema', () => {
    it('should validate allowed file types', () => {
      const validFile = {
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
      };

      const result = fileUploadSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should reject disallowed file types', () => {
      const invalidFile = {
        filename: 'script.exe',
        mimetype: 'application/x-executable',
        size: 1024,
      };

      const result = fileUploadSchema.safeParse(invalidFile);
      expect(result.success).toBe(false);
    });

    it('should reject files that are too large', () => {
      const largeFile = {
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        size: 20 * 1024 * 1024, // 20MB
      };

      const result = fileUploadSchema.safeParse(largeFile);
      expect(result.success).toBe(false);
    });
  });

  describe('Coordinate Schema', () => {
    it('should validate correct coordinates', () => {
      const validCoordinates = [
        { latitude: 0, longitude: 0 },
        { latitude: 90, longitude: 180 },
        { latitude: -90, longitude: -180 },
        { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
      ];

      validCoordinates.forEach(coord => {
        const result = coordinateSchema.safeParse(coord);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid coordinates', () => {
      const invalidCoordinates = [
        { latitude: 91, longitude: 0 },
        { latitude: 0, longitude: 181 },
        { latitude: -91, longitude: 0 },
        { latitude: 0, longitude: -181 },
      ];

      invalidCoordinates.forEach(coord => {
        const result = coordinateSchema.safeParse(coord);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Money Schema', () => {
    it('should validate monetary amounts', () => {
      const validAmounts = [
        { amount: 100.50, currency: 'USD' },
        { amount: 0, currency: 'EUR' },
        { amount: 999999.99, currency: 'GBP' },
      ];

      validAmounts.forEach(money => {
        const result = moneySchema.safeParse(money);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.currency).toBe(money.currency.toUpperCase());
        }
      });
    });

    it('should reject invalid monetary amounts', () => {
      const invalidAmounts = [
        { amount: -10, currency: 'USD' },
        { amount: 100.123, currency: 'USD' }, // Too many decimal places
        { amount: 100, currency: 'INVALID' }, // Invalid currency code
      ];

      invalidAmounts.forEach(money => {
        const result = moneySchema.safeParse(money);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Name Schema', () => {
    it('should validate and normalize names', () => {
      const result = nameSchema.safeParse('  John   Doe  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('John Doe');
      }
    });

    it('should reject invalid names', () => {
      const invalidNames = [
        '',
        'John123',
        'John@Doe',
      ];

      invalidNames.forEach(name => {
        const result = nameSchema.safeParse(name);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Username Schema', () => {
    it('should validate and normalize usernames', () => {
      const result = usernameSchema.safeParse('JohnDoe123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('johndoe123');
      }
    });

    it('should reject invalid usernames', () => {
      const invalidUsernames = [
        'ab', // Too short
        '_johndoe', // Starts with underscore
        'johndoe_', // Ends with underscore
        'john@doe', // Invalid character
      ];

      invalidUsernames.forEach(username => {
        const result = usernameSchema.safeParse(username);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('IP Address Schema', () => {
    it('should validate IPv4 addresses', () => {
      const validIPs = [
        '192.168.1.1',
        '10.0.0.1',
        '255.255.255.255',
        '0.0.0.0',
      ];

      validIPs.forEach(ip => {
        const result = ipAddressSchema.safeParse(ip);
        expect(result.success).toBe(true);
      });
    });

    it('should validate IPv6 addresses', () => {
      const validIPs = [
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      ];

      validIPs.forEach(ip => {
        const result = ipAddressSchema.safeParse(ip);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid IP addresses', () => {
      const invalidIPs = [
        '256.1.1.1',
        '192.168.1',
        'not.an.ip.address',
      ];

      invalidIPs.forEach(ip => {
        const result = ipAddressSchema.safeParse(ip);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Schema Composition Utilities', () => {
    it('should create optional schemas', () => {
      const optionalEmail = createOptionalSchema(emailSchema);
      
      const result1 = optionalEmail.safeParse(undefined);
      expect(result1.success).toBe(true);
      
      const result2 = optionalEmail.safeParse('test@example.com');
      expect(result2.success).toBe(true);
    });

    it('should create array schemas', () => {
      const emailArray = createArraySchema(emailSchema, { minItems: 1, maxItems: 3 });
      
      const result1 = emailArray.safeParse(['test@example.com']);
      expect(result1.success).toBe(true);
      
      const result2 = emailArray.safeParse([]); // Below minimum
      expect(result2.success).toBe(false);
      
      const result3 = emailArray.safeParse(['a@b.com', 'c@d.com', 'e@f.com', 'g@h.com']); // Above maximum
      expect(result3.success).toBe(false);
    });
  });

  describe('Schema Version Manager', () => {
    it('should register and retrieve schema versions', () => {
      const manager = new SchemaVersionManager();
      const v1Schema = emailSchema;
      const v2Schema = emailSchema.optional();

      manager.registerVersion('user', {
        version: '1.0.0',
        schema: v1Schema,
      });

      manager.registerVersion('user', {
        version: '2.0.0',
        schema: v2Schema,
      });

      const retrievedV1 = manager.getSchema('user', '1.0.0');
      const retrievedV2 = manager.getSchema('user', '2.0.0');

      expect(retrievedV1).toBe(v1Schema);
      expect(retrievedV2).toBe(v2Schema);
    });

    it('should handle schema migrations', async () => {
      const manager = new SchemaVersionManager();

      manager.registerVersion('user', {
        version: '1.0.0',
        schema: emailSchema,
        migrations: [{
          from: '1.0.0',
          to: '2.0.0',
          migrate: (data) => ({ email: data, isActive: true }),
        }],
      });

      manager.registerVersion('user', {
        version: '2.0.0',
        schema: z.object({
          email: emailSchema,
          isActive: z.boolean(),
        }),
      });

      const migrated = await manager.migrateData('user', '1.0.0', '2.0.0', 'test@example.com');
      expect(migrated).toEqual({ email: 'test@example.com', isActive: true });
    });
  });

  describe('JWT Token Schema', () => {
    it('should validate JWT tokens', () => {
      const validTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      ];

      validTokens.forEach(token => {
        const result = jwtTokenSchema.safeParse(token);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid JWT tokens', () => {
      const invalidTokens = [
        '',
        'invalid.token',
        'header.payload', // Missing signature
        'not-a-jwt-token',
      ];

      invalidTokens.forEach(token => {
        const result = jwtTokenSchema.safeParse(token);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('API Key Schema', () => {
    it('should validate API keys', () => {
      const validKeys = [
        'sk_test_1234567890abcdef1234567890abcdef',
        'pk_live_abcdef1234567890abcdef1234567890',
      ];

      validKeys.forEach(key => {
        const result = apiKeySchema.safeParse(key);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid API keys', () => {
      const invalidKeys = [
        'short',
        'invalid@key',
        'key with spaces',
      ];

      invalidKeys.forEach(key => {
        const result = apiKeySchema.safeParse(key);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Hash Schema', () => {
    it('should validate SHA-256 hashes', () => {
      const validHashes = [
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      ];

      validHashes.forEach(hash => {
        const result = hashSchema.safeParse(hash);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid hashes', () => {
      const invalidHashes = [
        'short',
        'not-hex-characters-zzz',
        'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85', // Too short
      ];

      invalidHashes.forEach(hash => {
        const result = hashSchema.safeParse(hash);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Timezone Schema', () => {
    it('should validate timezones', () => {
      const validTimezones = [
        'America/New_York',
        'Europe/London',
        'Asia/Tokyo',
        'UTC',
      ];

      validTimezones.forEach(tz => {
        const result = timezoneSchema.safeParse(tz);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid timezones', () => {
      const invalidTimezones = [
        'Invalid/Timezone',
        'Not_A_Timezone',
      ];

      invalidTimezones.forEach(tz => {
        const result = timezoneSchema.safeParse(tz);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Language Code Schema', () => {
    it('should validate language codes', () => {
      const validCodes = ['en', 'es', 'fr', 'de', 'ja'];

      validCodes.forEach(code => {
        const result = languageCodeSchema.safeParse(code);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid language codes', () => {
      const invalidCodes = ['EN', 'eng', 'zz', ''];

      invalidCodes.forEach(code => {
        const result = languageCodeSchema.safeParse(code);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Secure File Upload Schema', () => {
    it('should validate secure file uploads', () => {
      const validFile = {
        filename: 'document.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        virus_scan_result: 'clean' as const,
        content_type_verified: true,
      };

      const result = secureFileUploadSchema.safeParse(validFile);
      expect(result.success).toBe(true);
    });

    it('should reject suspicious file types', () => {
      const suspiciousFile = {
        filename: 'malware.exe',
        mimetype: 'application/x-executable',
        size: 1024,
      };

      const result = secureFileUploadSchema.safeParse(suspiciousFile);
      expect(result.success).toBe(false);
    });
  });

  describe('Secure Search Query Schema', () => {
    it('should validate safe search queries', () => {
      const validQuery = {
        q: 'search term',
        filters: { category: 'books' },
        sort: 'relevance',
        order: 'desc' as const,
        page: 1,
        limit: 10,
      };

      const result = secureSearchQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should reject SQL injection attempts', () => {
      const maliciousQueries = [
        { q: "'; DROP TABLE users; --" },
        { q: 'SELECT * FROM users' },
        { q: 'UNION SELECT password FROM users' },
      ];

      maliciousQueries.forEach(query => {
        const result = secureSearchQuerySchema.safeParse(query);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Business Hours Schema', () => {
    it('should validate business hours', () => {
      const validHours = {
        monday: { startTime: '09:00', endTime: '17:00' },
        tuesday: { startTime: '09:00', endTime: '17:00' },
        timezone: 'America/New_York',
        is24Hours: false,
        isClosed: false,
      };

      const result = businessHoursSchema.safeParse(validHours);
      expect(result.success).toBe(true);
    });

    it('should reject invalid time ranges', () => {
      const invalidHours = {
        monday: { startTime: '17:00', endTime: '09:00' }, // End before start
        timezone: 'America/New_York',
      };

      const result = businessHoursSchema.safeParse(invalidHours);
      expect(result.success).toBe(false);
    });
  });

  describe('Advanced Schema Composition', () => {
    it('should create deep partial schemas', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
        settings: z.object({
          theme: z.string(),
          notifications: z.boolean(),
        }),
      });

      const deepPartial = createDeepPartialSchema(nestedSchema);
      
      const result = deepPartial.safeParse({
        user: { name: 'John' }, // Missing email
        // Missing settings entirely
      });
      
      expect(result.success).toBe(true);
    });

    it('should create conditional schemas', () => {
      const baseSchema = z.object({
        type: z.enum(['individual', 'business']),
        name: z.string(),
        taxId: z.string().optional(),
      });

      const conditionalSchema = createConditionalSchema(baseSchema, [{
        when: (data) => data.type === 'business',
        then: z.object({
          type: z.literal('business'),
          name: z.string(),
          taxId: z.string().min(1),
        }),
      }]);

      // Should require taxId for business type
      const businessResult = conditionalSchema.safeParse({
        type: 'business',
        name: 'Acme Corp',
      });
      expect(businessResult.success).toBe(false);

      // Should pass with taxId
      const validBusinessResult = conditionalSchema.safeParse({
        type: 'business',
        name: 'Acme Corp',
        taxId: '123456789',
      });
      expect(validBusinessResult.success).toBe(true);
    });

    it('should create dependent schemas', () => {
      const baseSchema = z.object({
        hasAddress: z.boolean(),
        street: z.string().optional(),
        city: z.string().optional(),
      });

      const dependentSchema = createDependentSchema(baseSchema, [{
        field: 'street',
        dependsOn: ['hasAddress'],
        condition: (deps) => deps[0] === true,
      }]);

      // Should fail if street is provided but hasAddress is false
      const result = dependentSchema.safeParse({
        hasAddress: false,
        street: '123 Main St',
      });
      expect(result.success).toBe(false);
    });

    it('should create paginated response schemas', () => {
      const userSchema = z.object({
        id: z.string(),
        name: z.string(),
      });

      const paginatedUsers = createPaginatedSchema(userSchema);
      
      const validResponse = {
        data: [{ id: '1', name: 'John' }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      const result = paginatedUsers.safeParse(validResponse);
      expect(result.success).toBe(true);
    });
  });

  describe('Business Entity Schemas', () => {
    it('should validate organization schema', () => {
      const validOrg = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Acme Corporation',
        type: 'corporation' as const,
        email: 'contact@acme.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = businessEntitySchemas.organization.safeParse(validOrg);
      expect(result.success).toBe(true);
    });

    it('should validate person schema', () => {
      const validPerson = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = businessEntitySchemas.person.safeParse(validPerson);
      expect(result.success).toBe(true);
    });

    it('should validate document schema', () => {
      const validDoc = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Contract',
        filename: 'contract.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        url: 'https://example.com/contract.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = businessEntitySchemas.document.safeParse(validDoc);
      expect(result.success).toBe(true);
    });
  });

  describe('Schema Versioning System', () => {
    it.skip('should handle versioned schema evolution', async () => {
      // Test user schema migration from v1.0.0 to v1.1.0
      const v1Data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
      };

      // Create a simple test schema with migration
      const testUserSchema = createVersionedSchema('testUser', {
        '1.0.0': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        },
        '1.1.0': {
          schema: z.object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
          }),
          migrations: [{
            from: '1.0.0',
            to: '1.1.0',
            migrate: (data: any) => {
              const nameParts = data.name.split(' ');
              return {
                ...data,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
              };
            },
          }],
        },
      });

      const migratedData = await testUserSchema.migrate('1.0.0', '1.1.0', v1Data);
      
      expect(migratedData).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      });
    });

    it.skip('should handle complex migration paths', async () => {
      // Test multi-step migration
      const v1Data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Jane Smith',
        email: 'jane@example.com',
      };

      // Create a test schema with multi-step migration
      const testComplexSchema = createVersionedSchema('testComplex', {
        '1.0.0': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            email: z.string(),
          }),
        },
        '1.1.0': {
          schema: z.object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
          }),
          migrations: [{
            from: '1.0.0',
            to: '1.1.0',
            migrate: (data: any) => {
              const nameParts = data.name.split(' ');
              return {
                ...data,
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
              };
            },
          }],
        },
        '2.0.0': {
          schema: z.object({
            id: z.string(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.string(),
            profile: z.object({}).optional(),
            preferences: z.object({
              language: z.string(),
              timezone: z.string(),
              notifications: z.boolean(),
            }),
          }),
          migrations: [{
            from: '1.1.0',
            to: '2.0.0',
            migrate: (data: any) => ({
              ...data,
              profile: {},
              preferences: {
                language: 'en',
                timezone: 'UTC',
                notifications: true,
              },
            }),
          }],
        },
      });

      const migratedData = await testComplexSchema.migrate('1.0.0', '2.0.0', v1Data);
      
      expect(migratedData).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Jane Smith',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        profile: {},
        preferences: {
          language: 'en',
          timezone: 'UTC',
          notifications: true,
        },
      });
    });

    it('should validate data against specific schema versions', () => {
      const v1Schema = userSchemaVersioned.getSchema('1.0.0');
      const v2Schema = userSchemaVersioned.getSchema('2.0.0');

      expect(v1Schema).toBeDefined();
      expect(v2Schema).toBeDefined();

      // V1 data should validate against V1 schema but not V2
      const v1Data = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'John Doe',
        email: 'john@example.com',
      };

      const v1Result = v1Schema!.safeParse(v1Data);
      const v2Result = v2Schema!.safeParse(v1Data);

      expect(v1Result.success).toBe(true);
      expect(v2Result.success).toBe(false);
    });

    it.skip('should handle product schema evolution', async () => {
      const v1Product = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Widget',
        price: 29.99,
        description: 'A useful widget',
      };

      // Create a test product schema with migrations
      const testProductSchema = createVersionedSchema('testProduct', {
        '1.0.0': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            price: z.number(),
            description: z.string().optional(),
          }),
        },
        '1.1.0': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            price: z.object({
              amount: z.number(),
              currency: z.string(),
            }),
            description: z.string().optional(),
            category: z.string().nullable().optional(),
          }),
          migrations: [{
            from: '1.0.0',
            to: '1.1.0',
            migrate: (data: any) => ({
              ...data,
              price: {
                amount: data.price,
                currency: 'USD',
              },
              category: null,
            }),
          }],
        },
        '1.2.0': {
          schema: z.object({
            id: z.string(),
            name: z.string(),
            price: z.object({
              amount: z.number(),
              currency: z.string(),
            }),
            description: z.string().optional(),
            category: z.string().nullable().optional(),
            tags: z.array(z.string()),
            isActive: z.boolean(),
          }),
          migrations: [{
            from: '1.1.0',
            to: '1.2.0',
            migrate: (data: any) => ({
              ...data,
              tags: [],
              isActive: true,
            }),
          }],
        },
      });

      const migratedProduct = await testProductSchema.migrate('1.0.0', '1.2.0', v1Product);
      
      expect(migratedProduct).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Widget',
        price: {
          amount: 29.99,
          currency: 'USD',
        },
        description: 'A useful widget',
        category: null,
        tags: [],
        isActive: true,
      });
    });
  });

  describe('Enhanced Schema Version Manager', () => {
    it('should find migration paths', () => {
      const manager = new SchemaVersionManager();
      
      // Register versions with migrations
      manager.registerVersion('test', {
        version: '1.0.0',
        schema: z.object({ a: z.string() }),
        migrations: [{
          from: '1.0.0',
          to: '1.1.0',
          migrate: (data) => ({ ...data, b: 'added' }),
        }],
      });

      manager.registerVersion('test', {
        version: '1.1.0',
        schema: z.object({ a: z.string(), b: z.string() }),
        migrations: [{
          from: '1.1.0',
          to: '2.0.0',
          migrate: (data) => ({ ...data, c: 'new' }),
        }],
      });

      manager.registerVersion('test', {
        version: '2.0.0',
        schema: z.object({ a: z.string(), b: z.string(), c: z.string() }),
      });

      const path = manager.findMigrationPath('test', '1.0.0', '2.0.0');
      
      expect(path).toBeDefined();
      if (path) {
        expect(path.totalSteps).toBe(2);
        expect(path.steps).toHaveLength(2);
      }
    });

    it('should handle deprecated schemas', () => {
      const manager = new SchemaVersionManager();
      
      manager.registerVersion('test', {
        version: '1.0.0',
        schema: z.object({ old: z.string() }),
        deprecated: true,
        deprecationMessage: 'Use version 2.0.0 instead',
        supportedUntil: new Date('2024-12-31'),
      });

      expect(manager.isDeprecated('test', '1.0.0')).toBe(true);
      
      const deprecationInfo = manager.getDeprecationInfo('test', '1.0.0');
      expect(deprecationInfo.deprecated).toBe(true);
      expect(deprecationInfo.message).toBe('Use version 2.0.0 instead');
    });

    it('should export and import registry', () => {
      const manager1 = new SchemaVersionManager();
      const manager2 = new SchemaVersionManager();
      
      manager1.registerVersion('test', {
        version: '1.0.0',
        schema: z.string(),
      });

      const exported = manager1.exportRegistry();
      manager2.importRegistry(exported);

      const schema = manager2.getSchema('test', '1.0.0');
      expect(schema).toBeDefined();
    });
  });

  describe('Common Schemas Collection', () => {
    it('should export all common schemas', () => {
      expect(commonSchemas.email).toBe(emailSchema);
      expect(commonSchemas.password).toBe(passwordSchema);
      expect(commonSchemas.phone).toBe(phoneSchema);
      expect(commonSchemas.uuid).toBe(uuidSchema);
      expect(commonSchemas.jwtToken).toBe(jwtTokenSchema);
      expect(commonSchemas.apiKey).toBe(apiKeySchema);
      expect(commonSchemas.timezone).toBe(timezoneSchema);
      expect(commonSchemas.languageCode).toBe(languageCodeSchema);
      expect(commonSchemas.secureFileUpload).toBe(secureFileUploadSchema);
      expect(commonSchemas.businessHours).toBe(businessHoursSchema);
      
      // Business entity schemas
      expect(commonSchemas.organization).toBe(businessEntitySchemas.organization);
      expect(commonSchemas.person).toBe(businessEntitySchemas.person);
      expect(commonSchemas.document).toBe(businessEntitySchemas.document);
    });

    it('should have all expected schema keys', () => {
      const expectedKeys = [
        'email', 'password', 'strongPassword', 'phone', 'uuid', 'url', 'secureUrl',
        'dateRange', 'timeRange', 'businessHours', 'pagination', 'fileUpload', 
        'secureFileUpload', 'searchQuery', 'secureSearchQuery', 'coordinate', 
        'geoBounds', 'address', 'money', 'name', 'username', 'slug', 'color',
        'ipAddress', 'macAddress', 'hostname', 'domain', 'port', 'jwtToken',
        'apiKey', 'hash', 'base64', 'ssn', 'creditCard', 'mimeType', 'semver',
        'timezone', 'languageCode', 'countryCode', 'currencyCode', 'contactInfo',
        'auditTrail', 'entityMetadata', 'organization', 'person', 'document',
        'notification', 'comment', 'settings', 'activity'
      ];

      expectedKeys.forEach(key => {
        expect(commonSchemas).toHaveProperty(key);
      });
    });
  });
});












































