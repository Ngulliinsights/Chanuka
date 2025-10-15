import { encryptionService } from './services/encryption-service.js';
import { inputValidationService } from './services/input-validation-service.js';
import { securityAuditService } from './services/security-audit-service.js';
import { tlsConfigService } from './services/tls-config-service.js';
import { logger } from '../utils/logger';

/**
 * Test script to verify security implementation
 */
async function testSecurityImplementation() {
  logger.info('🔒 Testing Security Implementation...\n', { component: 'Chanuka' });

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Encryption Service
  logger.info('1. Testing Encryption Service...', { component: 'Chanuka' });
  totalTests++;
  try {
    const testData = 'sensitive_user_data_12345';
    const encrypted = await encryptionService.encryptData(testData, 'test');
    const decrypted = await encryptionService.decryptData(encrypted);
    
    if (decrypted === testData && encrypted !== testData) {
      logger.info('   ✅ Encryption/Decryption: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ Encryption/Decryption: FAILED', { component: 'Chanuka' });
    }
  } catch (error) {
    logger.info('   ❌ Encryption/Decryption: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 2: Password Hashing
  logger.info('2. Testing Password Hashing...', { component: 'Chanuka' });
  totalTests++;
  try {
    const password = 'TestPassword123!';
    const hash = await encryptionService.hashPassword(password);
    const isValid = await encryptionService.verifyPassword(password, hash);
    const isInvalid = await encryptionService.verifyPassword('WrongPassword', hash);
    
    if (isValid && !isInvalid && hash !== password) {
      logger.info('   ✅ Password Hashing: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ Password Hashing: FAILED', { component: 'Chanuka' });
    }
  } catch (error) {
    logger.info('   ❌ Password Hashing: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 3: Input Validation
  logger.info('3. Testing Input Validation...', { component: 'Chanuka' });
  totalTests++;
  try {
    // Test email validation
    const validEmail = inputValidationService.validateEmail('test@example.com');
    const invalidEmail = inputValidationService.validateEmail('invalid-email');
    
    // Test SQL injection detection
    let sqlInjectionDetected = false;
    try {
      inputValidationService.sanitizeString("'; DROP TABLE users; --");
    } catch (error) {
      if (error.message.includes('SQL injection')) {
        sqlInjectionDetected = true;
      }
    }

    // Test XSS detection
    let xssDetected = false;
    try {
      inputValidationService.sanitizeString('<script>alert("xss")</script>');
    } catch (error) {
      if (error.message.includes('XSS')) {
        xssDetected = true;
      }
    }

    if (validEmail.isValid && !invalidEmail.isValid && sqlInjectionDetected && xssDetected) {
      logger.info('   ✅ Input Validation: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ Input Validation: FAILED', { component: 'Chanuka' });
      logger.info('     - Valid email:', { component: 'Chanuka' }, validEmail.isValid);
      logger.info('     - Invalid email rejected:', { component: 'Chanuka' }, !invalidEmail.isValid);
      logger.info('     - SQL injection detected:', { component: 'Chanuka' }, sqlInjectionDetected);
      logger.info('     - XSS detected:', { component: 'Chanuka' }, xssDetected);
    }
  } catch (error) {
    logger.info('   ❌ Input Validation: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 4: Token Generation
  logger.info('4. Testing Token Generation...', { component: 'Chanuka' });
  totalTests++;
  try {
    const token = encryptionService.generateSecureToken(32);
    const csrfToken = encryptionService.generateCSRFToken();
    const apiKey = encryptionService.generateAPIKey('test');
    
    if (token.length === 64 && csrfToken.length > 0 && apiKey.startsWith('test_')) {
      logger.info('   ✅ Token Generation: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ Token Generation: FAILED', { component: 'Chanuka' });
    }
  } catch (error) {
    logger.info('   ❌ Token Generation: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 5: Security Audit Logging
  logger.info('5. Testing Security Audit Logging...', { component: 'Chanuka' });
  totalTests++;
  try {
    await securityAuditService.logSecurityEvent({
      eventType: 'test_event',
      severity: 'low',
      success: true,
      details: { test: true }
    });
    
    logger.info('   ✅ Security Audit Logging: PASSED', { component: 'Chanuka' });
    passedTests++;
  } catch (error) {
    logger.info('   ❌ Security Audit Logging: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 6: TLS Configuration
  logger.info('6. Testing TLS Configuration...', { component: 'Chanuka' });
  totalTests++;
  try {
    const tlsOptions = tlsConfigService.getDevelopmentTLSConfig();
    const cipherSuites = tlsConfigService.getCipherSuites('high');
    
    if (tlsOptions.key && tlsOptions.cert && cipherSuites.includes('TLS_AES_256_GCM_SHA384')) {
      logger.info('   ✅ TLS Configuration: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ TLS Configuration: FAILED', { component: 'Chanuka' });
    }
  } catch (error) {
    logger.info('   ❌ TLS Configuration: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 7: PII Encryption
  logger.info('7. Testing PII Encryption...', { component: 'Chanuka' });
  totalTests++;
  try {
    const piiData = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      address: '123 Main St',
      publicInfo: 'This is public'
    };

    const encrypted = await encryptionService.encryptPII(piiData);
    const decrypted = await encryptionService.decryptPII(encrypted);

    if (
      encrypted.email !== piiData.email && // Email should be encrypted
      encrypted.publicInfo === piiData.publicInfo && // Public info should not be encrypted
      decrypted.email === piiData.email && // Decrypted email should match original
      decrypted.publicInfo === piiData.publicInfo
    ) {
      logger.info('   ✅ PII Encryption: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ PII Encryption: FAILED', { component: 'Chanuka' });
    }
  } catch (error) {
    logger.info('   ❌ PII Encryption: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Test 8: Secure Schema Validation
  logger.info('8. Testing Secure Schema Validation...', { component: 'Chanuka' });
  totalTests++;
  try {
    const schema = inputValidationService.createSecureSchema();
    
    // Test valid data
    const validData = {
      email: 'test@example.com',
      password: 'SecurePassword123!',
      name: 'John Doe'
    };

    const validResult = inputValidationService.validateRequest(validData, schema.email.and(schema.password).and(schema.name));
    
    // Test invalid data
    const invalidData = {
      email: 'invalid-email',
      password: '123', // Too short
      name: '<script>alert("xss")</script>' // XSS attempt
    };

    let invalidResult;
    try {
      invalidResult = inputValidationService.validateRequest(invalidData, schema.email.and(schema.password).and(schema.name));
    } catch (error) {
      invalidResult = { success: false };
    }

    if (validResult.success && !invalidResult.success) {
      logger.info('   ✅ Secure Schema Validation: PASSED', { component: 'Chanuka' });
      passedTests++;
    } else {
      logger.info('   ❌ Secure Schema Validation: FAILED', { component: 'Chanuka' });
    }
  } catch (error) {
    logger.info('   ❌ Secure Schema Validation: ERROR -', { component: 'Chanuka' }, error.message);
  }

  // Summary
  logger.info('\n', { component: 'Chanuka' }, + '='.repeat(50));
  console.log(`Security Implementation Test Results:`);
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    logger.info('🎉 All security tests PASSED!', { component: 'Chanuka' });
    logger.info('✅ Security implementation is working correctly.', { component: 'Chanuka' });
  } else {
    logger.info('⚠️  Some security tests FAILED!', { component: 'Chanuka' });
    logger.info('🔧 Please review the failed tests and fix any issues.', { component: 'Chanuka' });
  }

  // Security recommendations
  logger.info('\n📋 Security Recommendations:', { component: 'Chanuka' });
  logger.info('1. Set strong ENCRYPTION_KEY and KEY_DERIVATION_SALT in production', { component: 'Chanuka' });
  logger.info('2. Use proper TLS certificates in production', { component: 'Chanuka' });
  logger.info('3. Configure CORS origins for your domain', { component: 'Chanuka' });
  logger.info('4. Set up proper database connection encryption', { component: 'Chanuka' });
  logger.info('5. Enable security monitoring and alerting', { component: 'Chanuka' });
  logger.info('6. Regularly update dependencies for security patches', { component: 'Chanuka' });
  logger.info('7. Implement proper backup and recovery procedures', { component: 'Chanuka' });
  logger.info('8. Set up intrusion detection and prevention systems', { component: 'Chanuka' });

  return passedTests === totalTests;
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecurityImplementation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      logger.error('Test execution failed:', { component: 'Chanuka' }, error);
      process.exit(1);
    });
}

export { testSecurityImplementation };






