# Security Implementation Guidelines

## When to Use Comprehensive vs Foundational Security

### Comprehensive Security (`client/src/security/`)
Use comprehensive security when:
- Building production applications with high security requirements
- Need advanced threat detection and monitoring
- Require detailed logging and reporting
- Working with user-generated content
- Handling sensitive data or financial transactions
- Need compliance with security standards (OWASP, etc.)

### Foundational Security (`client/src/core/security/`)
Use foundational security when:
- Building lightweight applications or prototypes
- Need minimal dependencies and fast startup
- Working in resource-constrained environments
- Implementing basic security measures
- Building internal tools with lower risk profiles
- Need maximum compatibility across environments

### Unified Security (`client/src/security/unified/`)
Use unified security when:
- Migrating from dual implementations
- Need consistent API across different security levels
- Want to standardize security practices
- Building new applications with future scalability in mind
- Need to maintain backward compatibility during transitions

## Security Configuration Guidelines

### Development Environment
```typescript
const devConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: true, // Don't block in development
    directives: STANDARD_CSP_CONFIG.development,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive', // Always use comprehensive in development
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'script'], // Allow script for HMR
  },
  rateLimiting: {
    enabled: false, // Disable in development for easier testing
    windowMs: 60000,
    maxRequests: 1000, // High limits for development
  },
  errorHandling: {
    mode: 'permissive', // Don't break development flow
    logLevel: 'debug', // Maximum logging for debugging
    reportToBackend: false, // Don't spam backend in development
  },
};
```

### Production Environment
```typescript
const prodConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false, // Enforce CSP in production
    directives: STANDARD_CSP_CONFIG.production,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive', // Always use comprehensive in production
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'], // Strict tag filtering
  },
  rateLimiting: {
    enabled: true,
    windowMs: 900000, // 15 minutes
    maxRequests: 100, // Reasonable limits
  },
  errorHandling: {
    mode: 'strict', // Fail fast on security issues
    logLevel: 'warn', // Don't log too much in production
    reportToBackend: true, // Report security events
  },
};
```

### Staging Environment
```typescript
const stagingConfig: UnifiedSecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: STANDARD_CSP_CONFIG.staging,
  },
  inputSanitization: {
    enabled: true,
    mode: 'comprehensive',
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
    allowedAttributes: { a: ['href', 'target'] },
  },
  rateLimiting: {
    enabled: true,
    windowMs: 600000, // 10 minutes
    maxRequests: 200, // Higher limits than production
  },
  errorHandling: {
    mode: 'strict',
    logLevel: 'info',
    reportToBackend: true,
  },
};
```

## Best Practices

### 1. Input Validation
- Always validate input on both client and server
- Use whitelist approach for allowed content
- Never trust user input
- Log suspicious input for analysis
- Use comprehensive sanitization for user-generated content
- Use basic sanitization for system-generated content

### 2. CSP Implementation
- Start with report-only mode
- Gradually tighten directives
- Monitor CSP violation reports
- Use nonces for inline scripts
- Avoid unsafe-inline and unsafe-eval in production
- Use environment-specific directives
- Regularly review and update CSP policies

### 3. Rate Limiting
- Implement multiple layers (IP, user, endpoint)
- Use adaptive rate limiting based on behavior
- Monitor for abuse patterns
- Provide clear error messages
- Use different limits for different endpoints
- Implement circuit breakers for failing services

### 4. Error Handling
- Never expose sensitive information in errors
- Use consistent error formats
- Log security events for analysis
- Implement circuit breakers for failing services
- Use appropriate error handling modes
- Report critical errors to monitoring systems

### 5. Testing
- Test with malicious input
- Verify CSP effectiveness
- Test rate limiting under load
- Include security tests in CI/CD
- Perform regular security audits
- Test error handling scenarios

### 6. Monitoring and Alerting
- Monitor CSP violation rates
- Track input sanitization threat detection
- Monitor rate limiting effectiveness
- Set up alerts for security events
- Regular security reviews
- Performance impact monitoring

## Security Patterns

### Secure Input Handling
```typescript
// ✅ Good: Comprehensive sanitization
const userInput = await sanitizer.sanitizeHTML(userInput, {
  mode: 'comprehensive',
  allowedTags: ['p', 'b', 'i', 'em', 'strong'],
  allowedAttributes: { a: ['href'] },
});

// ❌ Bad: No sanitization
const unsafeInput = userInput;

// ✅ Good: Validation with schema
const result = await sanitizer.validateAndSanitize(schema, userInput);
if (!result.success) {
  throw new ValidationError(result.errors);
}
```

### Secure CSP Implementation
```typescript
// ✅ Good: Environment-aware CSP
const cspManager = new UnifiedCSPManager({
  enabled: true,
  reportOnly: process.env.NODE_ENV === 'development',
  directives: STANDARD_CSP_CONFIG[process.env.NODE_ENV || 'development'],
  reportUri: '/api/security/csp-violations',
});

// ❌ Bad: Hardcoded CSP
const badCSP = "default-src 'self'; script-src 'self'";

// ✅ Good: Dynamic directive updates
cspManager.updateDirectives({
  'script-src': ["'self'", "'strict-dynamic'"],
});
```

### Secure Error Handling
```typescript
// ✅ Good: Structured error handling
try {
  await securityOperation();
} catch (error) {
  const securityError = SecurityErrorFactory.createError(
    SecurityErrorType.INPUT_VALIDATION_FAILED,
    'Input validation failed',
    'UserService',
    { inputLength: userInput.length }
  );
  
  const result = errorHandler.handleSecurityError(securityError);
  if (result.error.severity === 'critical') {
    throw new SecurityOperationError(securityError, result);
  }
}

// ❌ Bad: Generic error handling
try {
  await securityOperation();
} catch (error) {
  console.error(error); // Exposes sensitive information
}
```

## Migration Checklist

### Before Migration
- [ ] Audit current security implementation
- [ ] Identify all security dependencies
- [ ] Create backup of current configuration
- [ ] Plan migration timeline
- [ ] Set up monitoring for migration

### During Migration
- [ ] Enable compatibility layer
- [ ] Migrate configuration gradually
- [ ] Test each component individually
- [ ] Monitor for security issues
- [ ] Update documentation

### After Migration
- [ ] Remove compatibility layer
- [ ] Clean up legacy code
- [ ] Update tests
- [ ] Train team on new system
- [ ] Review security posture

## Security Monitoring

### Key Metrics to Monitor
- CSP violation rates
- Input sanitization threat detection
- Rate limiting effectiveness
- Security error rates
- Performance impact of security measures

### Alerting Thresholds
- CSP violations > 100/hour
- High-severity threats > 10/hour
- Rate limiting blocking > 50% of requests
- Security errors > 5% of operations

### Regular Security Reviews
- Monthly CSP directive review
- Quarterly threat pattern updates
- Bi-annual security configuration audit
- Annual penetration testing

## Performance Considerations

### Optimization Strategies
- Use basic sanitization for trusted content
- Cache CSP headers when possible
- Implement lazy loading for security components
- Use efficient regex patterns
- Monitor memory usage of security components

### Performance Monitoring
- Track sanitization response times
- Monitor CSP header generation time
- Measure error handling overhead
- Benchmark security operations
- Set performance budgets for security features

## Troubleshooting

### Common Issues

#### CSP Violations
- Check if directives are too restrictive
- Verify nonce generation and usage
- Review inline script and style usage
- Use report-only mode for debugging

#### Input Sanitization Failures
- Check allowed tags and attributes
- Verify input length limits
- Review threat detection patterns
- Test with various input types

#### Rate Limiting Issues
- Verify rate limit configuration
- Check for IP spoofing
- Monitor legitimate traffic patterns
- Adjust limits based on usage

#### Error Handling Problems
- Check error handling mode
- Verify logging configuration
- Review error reporting endpoints
- Test error callback functions

### Debug Mode
```typescript
// Enable debug mode for troubleshooting
const debugConfig: UnifiedSecurityConfig = {
  errorHandling: {
    mode: 'permissive',
    logLevel: 'debug',
    reportToBackend: false,
  },
  // ... other config
};
```

## Security Standards Compliance

### OWASP Top 10
- A01:2021 – Broken Access Control
- A02:2021 – Cryptographic Failures
- A03:2021 – Injection
- A04:2021 – Insecure Design
- A05:2021 – Security Misconfiguration
- A06:2021 – Vulnerable and Outdated Components
- A07:2021 – Identification and Authentication Failures
- A08:2021 – Software and Data Integrity Failures
- A09:2021 – Security Logging and Monitoring Failures
- A10:2021 – Server-Side Request Forgery (SSRF)

### Compliance Requirements
- GDPR data protection
- PCI DSS for payment processing
- HIPAA for healthcare data
- SOX for financial reporting
- ISO 27001 security management

## Team Training

### Security Awareness
- Regular security training sessions
- Threat landscape updates
- Security best practices workshops
- Incident response procedures
- Security tool usage training

### Code Review Guidelines
- Security-focused code reviews
- Threat modeling for new features
- Security testing requirements
- Documentation standards
- Performance impact assessment

This comprehensive guide ensures consistent and secure implementation of the unified security system across all environments and use cases.
