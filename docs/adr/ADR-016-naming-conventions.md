# ADR-016: Naming Conventions

**Status**: Accepted
**Date**: 2026-03-19

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
- **Services/Classes:** kebab-case (Node.js/npm standard)
  - ✅ `notifications-service.ts`
  - ❌ `NotificationsService.ts`
  - ❌ `enhanced-notifications-service.ts` (no "Enhanced" prefix)

**Rationale:** Kebab-case aligns with Node.js/npm ecosystem standards and Angular/Nest.js conventions, making the codebase more familiar to developers and reducing cognitive friction.

### Class Names
- **No "Enhanced" prefixes** - all services are enhanced by default
  - ✅ `NotificationsService`
  - ❌ `EnhancedNotificationsService`
  
- **PascalCase for all classes** (exported from kebab-cased files)
  - ✅ File: `bill-assessment-service.ts` → Class: `BillAssessmentService`
  - ❌ File: `bill_assessment_service.ts`

### Exported Instances
- **camelCase for service instances**
  ```typescript
  // In bill-assessment-service.ts
  export const billAssessmentService = new BillAssessmentService();
  ```

### Route Paths
- **kebab-case only**
  - ✅ `/api/bill-assessment`
  - ❌ `/api/billAssessment`

### Validation Schemas
- **PascalCase with Schema suffix**
  - ✅ `CreateBillSchema`
  - ❌ `create_bill_schema`
  - **Files:** kebab-case (e.g., `bill-validation.schemas.ts`)

## Consequences

### Positive
- **Aligns with Node.js/npm ecosystem standards** - familiar to most JavaScript/TypeScript developers
- Matches Angular, NestJS, and Express conventions (industry-standard frameworks)
- Reduces cognitive load - developers don't need to think about PascalCase-to-kebab translation
- File names reflect intent clearly: `notification-service.ts` is obviously a service file
- Better IDE autocomplete with kebab-case (natural file discovery)
- Consistent with existing codebase patterns (majority of files use kebab-case)

### Negative
- Class name (PascalCase) differs from file name (kebab-case)
- Requires developers to know import statement will differ from file name
- May require ESLint overrides if rules are strict about PascalCase filenames

### Neutral
- Mixed notifications feature shows both patterns work (NotificationsService.ts coexists with notification-orchestrator.ts)
- Can be enforced through ESLint with kebab-case-filename rule

## Status Updates

**Revision 2 (2026-03-24):** Reverted file naming to kebab-case standard based on:
1. Node.js/npm ecosystem conventions take precedence
2. Existing codebase majority already uses kebab-case
3. Angular/Nest.js/Express all use kebab-case for files
4. Reduces friction for developers familiar with JavaScript ecosystem standards

## Implementation

### Current Status (Completed)
1. ✅ All "Enhanced" prefixes removed from class names
2. ✅ Kebab-case file naming standardized
3. ✅ PascalCase class exports with camelCase instances maintained
4. ✅ Route paths use kebab-case
5. ✅ Validation schemas use PascalCase with Schema suffix, in kebab-case files

### Enforcement
- ESLint rule: `kebab-case-filename` to prevent regression
- Avoid PascalCase files except for special cases (e.g., index.ts, presets)
- Class names always PascalCase regardless of file name

## Related

- ADR-004: Feature Structure Convention
- ADR-012: Infrastructure Security Pattern
- Infrastructure Integration Design Decisions
