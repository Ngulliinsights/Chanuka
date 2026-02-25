# Security Features

This directory contains all security-related business logic and features for the Chanuka platform.

## Directory Structure

```
server/features/security/
├── services/                          # Security service implementations
│   └── data-privacy-service.ts       # Data privacy and anonymization
├── encryption-service.ts              # Encryption/decryption utilities
├── intrusion-detection-service.ts    # Intrusion detection and prevention
├── privacy-service.ts                 # Privacy controls and compliance
├── security-audit-service.ts          # Security audit logging
├── security-event-logger.ts           # Security event logging (moved from observability)
├── security-initialization-service.ts # Security initialization
├── security-middleware.ts             # Security middleware
├── security-monitoring-service.ts     # Security monitoring
├── security-monitoring.ts             # Security monitoring utilities
├── security-policy.ts                 # Security policies (moved from observability)
├── tls-config-service.ts             # TLS configuration
└── index.ts                           # Public exports
```

## Architecture

### Features vs Infrastructure

**This directory (`features/security`)** contains:
- ✅ Business logic for security features
- ✅ Security audit services
- ✅ Encryption services
- ✅ Intrusion detection
- ✅ Privacy services
- ✅ Security event logging
- ✅ Security policies and classification

**Infrastructure layer (`infrastructure/security`)** contains:
- ✅ Input validation (low-level, reusable)
- ✅ Secure query builder (database security)

This separation follows the principle:
- **Infrastructure** = Reusable, low-level utilities
- **Features** = Business logic and domain-specific functionality

## Recent Consolidation

Previously, security functionality was scattered across three locations:
1. `server/features/security/` - Security features (kept)
2. `server/infrastructure/security/` - Low-level security utilities (kept)
3. `server/infrastructure/observability/security/` - Security event logging (moved here)

**Rationale for consolidation:**
- Security event logging is domain-specific, not core observability
- Security policies are business rules, not infrastructure
- Centralizing security features improves maintainability

## Core Services

### Encryption Service (`encryption-service.ts`)
Handles encryption and decryption of sensitive data.

```typescript
import { encryptionService } from '@server/features/security';

const encrypted = await encryptionService.encrypt(sensitiveData);
const decrypted = await encryptionService.decrypt(encrypted);
```

### Security Audit Service (`security-audit-service.ts`)
Logs security-related events and audits.

```typescript
import { securityAuditService } from '@server/features/security';

await securityAuditService.logSecurityEvent({
  type: 'authentication_failure',
  user_id: userId,
  ip: req.ip,
  description: 'Failed login attempt'
});
```

### Security Event Logger (`security-event-logger.ts`)
Specialized logging for security events.

```typescript
import { emitSecurityEvent } from '@server/infrastructure/observability';

emitSecurityEvent({
  type: 'unauthorized_access',
  severity: 'high',
  user_id: userId,
  ip: req.ip,
  description: 'Attempted access to admin endpoint'
});
```

### Security Policy (`security-policy.ts`)
Security classification and risk assessment.

```typescript
import { isSensitiveEndpoint, classifyRisk } from '@server/infrastructure/observability';

if (isSensitiveEndpoint(req.path, req.method)) {
  // Apply additional security measures
}

const risk = classifyRisk(event);
```

### Data Privacy Service (`services/data-privacy-service.ts`)
Handles data anonymization and privacy controls.

```typescript
import { dataPrivacyService } from '@server/features/security/services/data-privacy-service';

const anonymized = await dataPrivacyService.anonymizeUserData(userData);
```

## Import Guidelines

### DO:
```typescript
// Security features
import { encryptionService, securityAuditService } from '@server/features/security';

// Security event logging (via observability barrel)
import { emitSecurityEvent, isSensitiveEndpoint } from '@server/infrastructure/observability';

// Low-level security utilities
import { inputValidationService } from '@server/infrastructure/security/input-validation-service';
import { secureQueryBuilder } from '@server/infrastructure/security/secure-query-builder';
```

### DON'T:
```typescript
// ❌ Don't import from old observability/security path
import { emitSecurityEvent } from '@server/infrastructure/observability/security/security-event-logger';

// ❌ Don't bypass the observability barrel
import { emitSecurityEvent } from '@server/features/security/security-event-logger';
```

## Security Best Practices

1. **Always validate input** - Use `inputValidationService` for all user input
2. **Use parameterized queries** - Use `secureQueryBuilder` for database queries
3. **Log security events** - Use `emitSecurityEvent` for security-relevant actions
4. **Encrypt sensitive data** - Use `encryptionService` for PII and secrets
5. **Audit sensitive operations** - Use `securityAuditService` for compliance

## Related Documentation

- [Infrastructure Security](../../infrastructure/security/README.md)
- [Observability](../../infrastructure/observability/README.md)
- [Authentication](../../infrastructure/auth/README.md)
