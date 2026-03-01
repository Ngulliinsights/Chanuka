# ADR-016: Naming Convention Standardization

**Status:** Accepted  
**Date:** 2026-03-01  
**Context:** Infrastructure Integration & Modernization

---

## Context

During infrastructure integration, inconsistent naming patterns were discovered across the codebase:
- "Enhanced" prefixes on service classes (e.g., `EnhancedNotificationsService`)
- Mixed file naming: hyphenated (`enhanced-notifications-service.ts`) vs PascalCase
- Inconsistent class and export naming
- Route paths using various conventions

This inconsistency makes code harder to navigate, understand, and maintain.

## Decision

Adopt standardized naming conventions across all features:

### File Names
- **Services/Classes:** PascalCase without hyphens
  - ✅ `NotificationsService.ts`
  - ❌ `enhanced-notifications-service.ts`
  
### Class Names
- **No "Enhanced" prefixes** - all services are enhanced by default
  - ✅ `NotificationsService`
  - ❌ `EnhancedNotificationsService`
  
- **PascalCase for all classes**
  - ✅ `BillAssessmentService`
  - ❌ `bill_assessment_service`

### Exported Instances
- **camelCase for service instances**
  ```typescript
  export const notificationsService = new NotificationsService();
  ```

### Route Paths
- **kebab-case only**
  - ✅ `/api/bill-assessment`
  - ❌ `/api/billAssessment`

### Validation Schemas
- **PascalCase with Schema suffix**
  - ✅ `CreateBillSchema`
  - ❌ `create_bill_schema`

## Consequences

### Positive
- Predictable file and class naming
- Easier code navigation
- Consistent with TypeScript/JavaScript conventions
- Reduced cognitive load for developers
- Better IDE autocomplete support

### Negative
- Requires renaming many existing files
- May break some imports temporarily
- Need to update documentation

### Neutral
- Enforced through ESLint rules
- Automated migration possible with tooling

## Implementation

1. Remove all "Enhanced" prefixes from class names
2. Rename hyphenated files to PascalCase
3. Update all imports
4. Add ESLint rules to prevent regression
5. Update documentation

## Related

- ADR-004: Feature Structure Convention
- ADR-012: Infrastructure Security Pattern
- Infrastructure Integration Design Decisions
