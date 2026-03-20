# Security Infrastructure Module

## Overview

The Security Infrastructure module provides comprehensive security functionality for the Chanuka platform including CSP management, CSRF protection, input sanitization, rate limiting, and vulnerability scanning.

## Purpose and Responsibilities

- **Content Security Policy**: Manage CSP headers and nonce generation
- **CSRF Protection**: Prevent cross-site request forgery attacks
- **Input Sanitization**: Sanitize user input to prevent XSS attacks
- **Rate Limiting**: Protect against brute force and DoS attacks
- **Vulnerability Scanning**: Scan for security vulnerabilities
- **Security Monitoring**: Monitor and alert on security events

## Public Exports

### Classes
- `UnifiedCSPManager` - Content Security Policy management
- `CSRFProtection` - CSRF token management
- `UnifiedInputSanitizer` - Input sanitization
- `UnifiedRateLimiter` - Rate limiting
- `VulnerabilityScanner` - Security vulnerability scanning
- `SecurityMonitor` - Security event monitoring
- `SecurityErrorHandler` - Security error handling
- `SecurityErrorMiddleware` - Security error middleware

### Functions
- `initializeSecurity()` - Initialize security system
- `getSecuritySystem()` - Get security system instance
- `getSecurityStatus()` - Get security status
- `shutdownSecurity()` - Shutdown security system

### Utilities
- `validatePasswordStrength()` - Validate password strength
- `validateCSRFToken()` - Validate CSRF tokens
- `hashData()` - Hash sensitive data
- `generateSecureToken()` - Generate secure tokens
- `isSecureContext()` - Check if context is secure

## Usage Examples

### Initialize Security

```typescript
import { initializeSecurity } from '@/infrastructure/security';

async function setupSecurity() {
  await initializeSecurity({
    enableCSP: true,
    enableCSRF: true,
    enableRateLimit: true,
    enableVulnerabilityScanning: true,
    enableInputSanitization: true,
    scanInterval: 3600000 // 1 hour
  });
}
```

### Input Sanitization

```typescript
import { UnifiedInputSanitizer } from '@/infrastructure/security';

const sanitizer = new UnifiedInputSanitizer({
  enabled: true,
  mode: 'comprehensive',
  allowedTags: ['b', 'i', 'em', 'strong', 'p']
});

const cleanInput = sanitizer.sanitize(userInput);
```

### CSRF Protection

```typescript
import { CSRFProtection } from '@/infrastructure/security';

const csrf = new CSRFProtection({
  enabled: true,
  tokenName: 'csrf-token',
  headerName: 'X-CSRF-Token'
});

// Generate token
const token = csrf.generateToken();

// Validate token
const isValid = csrf.validateToken(token);
```

### Rate Limiting

```typescript
import { UnifiedRateLimiter } from '@/infrastructure/security';

const rateLimiter = new UnifiedRateLimiter({
  enabled: true,
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
});

// Check if request is allowed
const allowed = await rateLimiter.checkLimit(userId);
```

## Best Practices

1. **Always Sanitize Input**: Sanitize all user input before processing
2. **Use HTTPS**: Only use security features over HTTPS
3. **Strong CSP**: Implement strict Content Security Policy
4. **Rate Limiting**: Apply rate limiting to all public endpoints
5. **Regular Scans**: Run vulnerability scans regularly
6. **Monitor Events**: Track and alert on security events

## Requirements Satisfied

- **Requirement 4.3**: Module has README.md
- **Requirement 5.1**: All exports documented
- **Requirement 5.3**: 100% documented exports

## Related Documentation

- [Auth Module](../auth/README.md) - Authentication integration
- [Validation Module](../validation/README.md) - Input validation
- [Observability Module](../observability/README.md) - Security monitoring
