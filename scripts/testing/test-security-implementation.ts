import { encryptionService } from './services/encryption-service.js';
import { inputValidationService } from './services/input-validation-service.js';
import { securityAuditService } from './services/security-audit-service.js';
import { tlsConfigService } from './services/tls-config-service.js';

/**
 * Test script to verify security implementation
 */
async function testSecurityImplementation() {
  console.log('🔒 Testing Security Implementation...\n');

  let passedTests = 0;
  let totalTests = 0;

  // Test 1: Encryption Service
  console.log('1. Testing Encryption Service...');
  totalTests++;
  try {
    const testData = 'sensitive_user_data_12345';
    const encrypted = await encryptionService.encryptData(testData, 'test');
    const decrypted = await encryptionService.decryptData(encrypted);
    
    if (decrypted === testData && encrypted !== testData) {
      console.log('   ✅ Encryption/Decryption: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ Encryption/Decryption: FAILED');
    }
  } catch (error) {
    console.log('   ❌ Encryption/Decryption: ERROR -', error.message);
  }

  // Test 2: Password Hashing
  console.log('2. Testing Password Hashing...');
  totalTests++;
  try {
    const password = 'TestPassword123!';
    const hash = await encryptionService.hashPassword(password);
    const isValid = await encryptionService.verifyPassword(password, hash);
    const isInvalid = await encryptionService.verifyPassword('WrongPassword', hash);
    
    if (isValid && !isInvalid && hash !== password) {
      console.log('   ✅ Password Hashing: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ Password Hashing: FAILED');
    }
  } catch (error) {
    console.log('   ❌ Password Hashing: ERROR -', error.message);
  }

  // Test 3: Input Validation
  console.log('3. Testing Input Validation...');
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
      console.log('   ✅ Input Validation: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ Input Validation: FAILED');
      console.log('     - Valid email:', validEmail.isValid);
      console.log('     - Invalid email rejected:', !invalidEmail.isValid);
      console.log('     - SQL injection detected:', sqlInjectionDetected);
      console.log('     - XSS detected:', xssDetected);
    }
  } catch (error) {
    console.log('   ❌ Input Validation: ERROR -', error.message);
  }

  // Test 4: Token Generation
  console.log('4. Testing Token Generation...');
  totalTests++;
  try {
    const token = encryptionService.generateSecureToken(32);
    const csrfToken = encryptionService.generateCSRFToken();
    const apiKey = encryptionService.generateAPIKey('test');
    
    if (token.length === 64 && csrfToken.length > 0 && apiKey.startsWith('test_')) {
      console.log('   ✅ Token Generation: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ Token Generation: FAILED');
    }
  } catch (error) {
    console.log('   ❌ Token Generation: ERROR -', error.message);
  }

  // Test 5: Security Audit Logging
  console.log('5. Testing Security Audit Logging...');
  totalTests++;
  try {
    await securityAuditService.logSecurityEvent({
      eventType: 'test_event',
      severity: 'low',
      success: true,
      details: { test: true }
    });
    
    console.log('   ✅ Security Audit Logging: PASSED');
    passedTests++;
  } catch (error) {
    console.log('   ❌ Security Audit Logging: ERROR -', error.message);
  }

  // Test 6: TLS Configuration
  console.log('6. Testing TLS Configuration...');
  totalTests++;
  try {
    const tlsOptions = tlsConfigService.getDevelopmentTLSConfig();
    const cipherSuites = tlsConfigService.getCipherSuites('high');
    
    if (tlsOptions.key && tlsOptions.cert && cipherSuites.includes('TLS_AES_256_GCM_SHA384')) {
      console.log('   ✅ TLS Configuration: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ TLS Configuration: FAILED');
    }
  } catch (error) {
    console.log('   ❌ TLS Configuration: ERROR -', error.message);
  }

  // Test 7: PII Encryption
  console.log('7. Testing PII Encryption...');
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
      console.log('   ✅ PII Encryption: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ PII Encryption: FAILED');
    }
  } catch (error) {
    console.log('   ❌ PII Encryption: ERROR -', error.message);
  }

  // Test 8: Secure Schema Validation
  console.log('8. Testing Secure Schema Validation...');
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
      console.log('   ✅ Secure Schema Validation: PASSED');
      passedTests++;
    } else {
      console.log('   ❌ Secure Schema Validation: FAILED');
    }
  } catch (error) {
    console.log('   ❌ Secure Schema Validation: ERROR -', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`Security Implementation Test Results:`);
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All security tests PASSED!');
    console.log('✅ Security implementation is working correctly.');
  } else {
    console.log('⚠️  Some security tests FAILED!');
    console.log('🔧 Please review the failed tests and fix any issues.');
  }

  // Security recommendations
  console.log('\n📋 Security Recommendations:');
  console.log('1. Set strong ENCRYPTION_KEY and KEY_DERIVATION_SALT in production');
  console.log('2. Use proper TLS certificates in production');
  console.log('3. Configure CORS origins for your domain');
  console.log('4. Set up proper database connection encryption');
  console.log('5. Enable security monitoring and alerting');
  console.log('6. Regularly update dependencies for security patches');
  console.log('7. Implement proper backup and recovery procedures');
  console.log('8. Set up intrusion detection and prevention systems');

  return passedTests === totalTests;
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSecurityImplementation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testSecurityImplementation };