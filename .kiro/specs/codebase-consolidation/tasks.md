# Tasks: Codebase Consolidation

## Phase 1: Quick Wins (Week 1-2)

### Task 1.1: Dead API Client Removal
_Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

**Objective**: Remove unused API client implementations while preserving monitoring and shared utilities

**Steps**:

- [ ] 1.1.1: Confirm zero usages of dead clients
  ```bash
  grep -r "SafeApiClient" client/src/ --include='*.ts' --include='*.tsx'
  grep -r "AuthenticatedApiClient" client/src/ --include='*.ts' --include='*.tsx'
  grep -r "CircuitBreakerClient" client/src/ --include='*.ts' --include='*.tsx'
  grep -r "BaseApiClient" client/src/ --include='*.ts' --include='*.tsx'
  ```
  Expected: 0 results for each

- [ ] 1.1.2: Investigate shared type usage
  ```bash
  # Check if these types are used by globalApiClient or other code
  grep -r "RequestInterceptor" client/src/ --include='*.ts' --include='*.tsx' | grep -v "base-client.ts" | grep -v "index.ts"
  grep -r "ResponseInterceptor" client/src/ --include='*.ts' --include='*.tsx' | grep -v "base-client.ts" | grep -v "index.ts"
  grep -r "ErrorInterceptor" client/src/ --include='*.ts' --include='*.tsx' | grep -v "base-client.ts" | grep -v "index.ts"
  grep -r "BaseClientRequest" client/src/ --include='*.ts' --include='*.tsx' | grep -v "base-client.ts" | grep -v "index.ts"
  grep -r "BaseClientResponse" client/src/ --include='*.ts' --include='*.tsx' | grep -v "base-client.ts" | grep -v "index.ts"
  ```
  Document findings: If types are used elsewhere, they need extraction

- [ ] 1.1.3: Investigate authentication.ts dependencies
  ```bash
  # Check if authentication.ts is used by globalApiClient or other code
  grep -r "AuthenticationInterceptor\|TokenRefreshInterceptor\|createAuthInterceptors" client/src/ --include='*.ts' --include='*.tsx' | grep -v "authenticated-client.ts" | grep -v "authentication.ts" | grep -v "index.ts"
  ```
  Decision:
  - If used by globalApiClient or other code: KEEP authentication.ts
  - If only used by AuthenticatedApiClient: DELETE authentication.ts

- [ ] 1.1.4: Investigate retry-handler.ts (legacy)
  ```bash
  # Check if LegacyRetryHandler is used anywhere
  grep -r "LegacyRetryHandler\|createRetryHandler\|retryHandlers" client/src/ --include='*.ts' --include='*.tsx' | grep -v "retry-handler.ts" | grep -v "index.ts"
  ```
  Decision:
  - If 0 usages: ADD retry-handler.ts to deletion list
  - If used: KEEP retry-handler.ts and document why

- [ ] 1.1.5: Extract shared types if needed (based on 1.1.2 findings)
  - If types are used by globalApiClient or other code:
    - Create `client/src/core/api/types/interceptors.ts`
    - Move `RequestInterceptor`, `ResponseInterceptor`, `ErrorInterceptor` types
    - Update `client/src/core/api/types/index.ts` to export these types
    - Update imports in files that use these types
  - If types are only used by deleted clients: Skip extraction

- [ ] 1.1.6: Delete unused client files
  ```bash
  # Core deletions (confirmed dead)
  rm client/src/core/api/base-client.ts
  rm client/src/core/api/authenticated-client.ts
  rm client/src/core/api/safe-client.ts
  rm client/src/core/api/circuit-breaker-client.ts
  rm -r client/src/core/api/examples/
  
  # Conditional deletions (based on investigation)
  # If authentication.ts is only used by deleted clients:
  # rm client/src/core/api/authentication.ts
  
  # If retry-handler.ts has 0 usages:
  # rm client/src/core/api/retry-handler.ts
  ```

- [ ] 1.1.7: Update barrel exports in index.ts
  - Edit `client/src/core/api/index.ts`
  - Remove these exports:
    ```typescript
    // DELETE - Dead clients
    export { BaseApiClient, DEFAULT_API_CONFIG, type BaseClientRequest, 
             type BaseClientResponse, type ApiClientConfig, type RequestInterceptor,
             type ResponseInterceptor, type ErrorInterceptor, type ApiError,
             type RequestBody } from './base-client';
    
    export { AuthenticatedApiClient, type AuthenticatedApiClientConfig } 
      from './authenticated-client';
    
    export { SafeApiClient, type SafeApiResult } from './safe-client';
    
    export { CircuitBreakerClient, createCircuitBreakerClient, apiClients,
             type CircuitBreakerClientConfig, type RequestConfig } 
      from './circuit-breaker-client';
    
    // DELETE if authentication.ts was removed:
    // export { AuthenticationInterceptor, TokenRefreshInterceptor, ... } 
    //   from './authentication';
    
    // DELETE if retry-handler.ts was removed:
    // export { RetryHandler as LegacyRetryHandler, createRetryHandler, 
    //          retryHandlers } from './retry-handler';
    ```
  
  - Verify these exports are KEPT:
    ```typescript
    // KEEP - Monitoring (separate from dead client)
    export { CircuitBreakerMonitor, circuitBreakerMonitor, 
             recordCircuitBreakerEvent, recordError, getServiceHealth,
             getErrorCorrelations, getMonitoringStatus,
             type CircuitBreakerEvent, type ServiceHealthStatus,
             type ErrorCorrelation } from './circuit-breaker-monitor';
    
    // KEEP - Canonical clients
    export { globalApiClient } from './client';
    export { contractApiClient } from './contract-client';
    
    // KEEP - Current retry implementation
    export { RetryHandler, retryOperation, safeRetryOperation,
             createHttpRetryHandler, createServiceRetryHandler,
             DEFAULT_RETRY_CONFIG, SERVICE_RETRY_CONFIGS,
             type RetryConfig, type RetryContext, type RetryResult } 
      from './retry';
    
    // KEEP - All other utilities (cache, analytics, etc.)
    ```

- [ ] 1.1.8: Create API client usage documentation
  - Create `docs/api-client-guide.md` with:
    - `globalApiClient` as the standard for all API calls
    - `contractApiClient` for type-safe contract-based calls
    - Examples of common usage patterns
    - Note that CircuitBreakerMonitor is kept for monitoring
    - Migration guide for any code using deleted clients (if any found)

- [ ] 1.1.9: Verify CircuitBreakerMonitor still works
  ```bash
  # Verify monitoring functionality is intact
  npm run test -- circuit-breaker-monitor
  ```

- [ ] 1.1.10: Verify build and tests
  ```bash
  npm run build
  npm run test
  npm run type-check
  ```

- [ ] 1.1.11: Verify no broken imports
  ```bash
  # Should return 0 results for deleted clients
  grep -r "from.*base-client" client/src/ --include='*.ts' --include='*.tsx'
  grep -r "from.*safe-client" client/src/ --include='*.ts' --include='*.tsx'
  grep -r "from.*authenticated-client" client/src/ --include='*.tsx' --include='*.tsx'
  grep -r "from.*circuit-breaker-client" client/src/ --include='*.ts' --include='*.tsx'
  ```

**Acceptance**: 
- Zero broken imports
- All tests pass (including CircuitBreakerMonitor tests)
- Documentation created with clear usage guidelines
- Bundle size reduced by ~5-10%
- CircuitBreakerMonitor functionality preserved
- Shared types extracted if needed
- Decision documented for authentication.ts and retry-handler.ts

**Files Deleted**:
- ✓ `base-client.ts` (confirmed dead)
- ✓ `authenticated-client.ts` (confirmed dead)
- ✓ `safe-client.ts` (confirmed dead)
- ✓ `circuit-breaker-client.ts` (confirmed dead)
- ✓ `examples/` directory (confirmed dead)
- ? `authentication.ts` (conditional - based on investigation)
- ? `retry-handler.ts` (conditional - based on investigation)

**Files Kept**:
- ✓ `circuit-breaker-monitor.ts` (monitoring is separate from client)
- ✓ `client.ts` (canonical globalApiClient)
- ✓ `contract-client.ts` (type-safe wrapper)
- ✓ `retry.ts` (current retry implementation)
- ✓ All other utilities (cache-manager, analytics, etc.)

---

### Task 1.2: Git Hygiene Cleanup
_Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

**Objective**: Remove committed artifacts and prevent future commits

**Steps**:
- [ ] 1.2.1: Remove backup directories
  ```bash
  git rm -r --cached tests/server/error-remediation/tests/reports/backups/
  git commit -m 'chore: remove committed backup directories'
  ```

- [ ] 1.2.2: Remove merge artifacts
  ```bash
  find . -name "*.orig" -o -name "*.rej" | xargs git rm
  git commit -m 'chore: remove merge artifacts'
  ```

- [ ] 1.2.3: Update .gitignore
  ```gitignore
  # Add to .gitignore
  *.orig
  *.rej
  backup-*/
  **/reports/backups/
  SESSION_*.md
  PROGRESS_*.md
  *_COMPLETION_*.md
  tsc-errors.txt
  tsc_output*.txt
  type-check-output.txt
  performance-baselines.json
  ```

- [ ] 1.2.4: Verify no new artifacts
  ```bash
  git status
  # Should show no untracked backup or artifact files
  ```

**Acceptance**:
- All backup directories removed from git
- All merge artifacts removed
- .gitignore prevents future commits
- Git history preserved

---

### Task 1.3: CSP Migration Completion
_Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

**Objective**: Complete transition to UnifiedCSPManager

**Steps**:
- [ ] 1.3.1: Verify production stability
  - Query production logs for CSP violations (last 30 days)
  - Expected: <1% violation rate
  - Document findings

- [ ] 1.3.2: Update compatibility layer
  ```typescript
  // client/src/core/security/migration/compatibility-layer.ts
  // Replace conditional export with direct export
  export { UnifiedCSPManager as CSPManager } from '../unified/csp-manager';
  ```

- [ ] 1.3.3: Remove feature flag checks
  ```bash
  # Find all locations
  grep -r "USE_UNIFIED_SECURITY" client/src/
  
  # Replace with direct UnifiedCSPManager initialization
  ```

- [ ] 1.3.4: Test in dev environment
  ```bash
  npm run dev
  # Verify CSP headers are correct
  # Check browser console for violations
  ```

- [ ] 1.3.5: Delete legacy files
  ```bash
  rm client/src/core/security/csp-manager.ts
  rm -r client/src/core/security/migration/
  ```

- [ ] 1.3.6: Update barrel exports
  ```typescript
  // client/src/core/security/index.ts
  export { UnifiedCSPManager as CSPManager } from './unified/csp-manager';
  export { initializeSecuritySystem } from './unified/system';
  ```

- [ ] 1.3.7: Run full test suite
  ```bash
  npm run test
  npm run test:e2e
  ```

**Acceptance**:
- Dev uses UnifiedCSPManager
- No feature flag checks remain
- Legacy files deleted
- All tests pass

---

### Task 1.4: Repository Root Cleanup
_Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

**Objective**: Clean repository root of session artifacts

**Steps**:
- [ ] 1.4.1: Identify session artifacts
  ```bash
  ls -la | grep -E "SESSION_|PROGRESS_|COMPLETION_|FIXES_APPLIED"
  ls -la | grep -E "tsc.*txt|type-check.*txt"
  ls -la | grep -E "\.ts$" | grep -E "QUICK_START|COMPLETION_STRATEGY"
  ```

- [ ] 1.4.2: Review for design decisions
  - Check each file for intentional design decisions
  - Extract valuable content to `docs/adr/`
  - Document extraction in commit message

- [ ] 1.4.3: Delete session artifacts
  ```bash
  rm SESSION_*.md
  rm PROGRESS_*.md
  rm *_COMPLETION_*.md
  rm FIXES_APPLIED*.md
  rm tsc-errors.txt tsc_output*.txt type-check-output.txt
  rm QUICK_START_FOR_NEXT_SESSION.ts COMPLETION_STRATEGY.ts
  ```

- [ ] 1.4.4: Move design decisions to docs/
  - Create `docs/adr/` if not exists
  - Move extracted content
  - Update references

- [ ] 1.4.5: Verify root is clean
  ```bash
  ls -la
  # Should only show: README, ARCHITECTURE, CONTRIBUTING, CHANGELOG, config files
  ```

**Acceptance**:
- Root contains only intentional files
- Design decisions preserved in docs/
- .gitignore prevents future artifacts

---

## Phase 2: Structural Consolidation (Week 3-4)

### Task 2.1: Scripts Directory Audit
_Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

**Objective**: Classify and clean scripts directory

**Steps**:
- [ ] 2.1.1: Identify referenced scripts
  ```bash
  grep -h 'scripts/' package.json nx.json .github/workflows/*.yml | sort -u > referenced-scripts.txt
  ```

- [ ] 2.1.2: Classify each script
  - Create `scripts/CLASSIFICATION.md`
  - For each script, determine:
    - Permanent Tooling (referenced in package.json/nx.json/CI)
    - Completed Migration (one-time, purpose fulfilled)
    - Emergency Patch (fix-*.ts, emergency-*.ts)

- [ ] 2.1.3: Delete emergency patches
  ```bash
  rm scripts/fix-last-*.ts
  rm scripts/fix-final-*.ts
  rm scripts/emergency-*.ts
  ```

- [ ] 2.1.4: Delete completed migrations
  - Review each migration script
  - Verify migration is complete
  - Delete script (preserved in git history)

- [ ] 2.1.5: Document permanent tooling
  - Add JSDoc comments to each permanent script
  - Document purpose, usage, and when to run
  - Update `scripts/README.md`

- [ ] 2.1.6: Move complex tools to tools/
  ```bash
  # For scripts >500 lines or with dependencies
  mv scripts/complex-tool.ts tools/complex-tool/
  ```

**Acceptance**:
- All scripts classified
- Emergency patches deleted
- Completed migrations deleted
- Permanent tooling documented

---

### Task 2.2: Graph Module Refactor Completion
_Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

**Objective**: Complete transition to structured layout

**Steps**:
- [ ] 2.2.1: Diff flat vs structured files
  ```bash
  diff server/infrastructure/database/graph/neo4j-client.ts \
       server/infrastructure/database/graph/core/neo4j-client.ts
  
  diff server/infrastructure/database/graph/query-builder.ts \
       server/infrastructure/database/graph/utils/query-builder.ts
  
  # Repeat for all duplicate files
  ```

- [ ] 2.2.2: Merge differences if found
  - If structured version missing logic, merge from flat
  - Commit merged changes before deletion

- [ ] 2.2.3: Find all imports to flat files
  ```bash
  grep -r "from.*graph/neo4j-client" server/ > flat-imports.txt
  grep -r "from.*graph/query-builder" server/ >> flat-imports.txt
  grep -r "from.*graph/session-manager" server/ >> flat-imports.txt
  # etc.
  ```

- [ ] 2.2.4: Update imports to structured paths
  ```typescript
  // Before
  import { Neo4jClient } from '@server/infrastructure/database/graph/neo4j-client';
  
  // After
  import { Neo4jClient } from '@server/infrastructure/database/graph/core/neo4j-client';
  ```

- [ ] 2.2.5: Create new subdirectories for remaining files
  ```bash
  mkdir -p server/infrastructure/database/graph/analytics
  mkdir -p server/infrastructure/database/graph/sync
  ```

- [ ] 2.2.6: Move remaining flat files
  ```bash
  mv graph/advanced-analytics.ts graph/analytics/
  mv graph/pattern-discovery.ts graph/analytics/
  mv graph/engagement-networks.ts graph/sync/
  mv graph/network-sync.ts graph/sync/
  mv graph/idempotency-ledger.ts graph/core/
  ```

- [ ] 2.2.7: Delete flat duplicates
  ```bash
  rm graph/neo4j-client.ts
  rm graph/batch-sync-runner.ts
  rm graph/sync-executor.ts
  rm graph/transaction-executor.ts
  rm graph/query-builder.ts
  rm graph/session-manager.ts
  rm graph/engagement-queries.ts
  rm graph/network-queries.ts
  rm graph/advanced-queries.ts
  rm graph/schema.ts
  ```

- [ ] 2.2.8: Update barrel export
  ```typescript
  // graph/index.ts
  export * from './core';
  export * from './query';
  export * from './utils';
  export * from './analytics';
  export * from './sync';
  ```

- [ ] 2.2.9: Run Neo4j integration tests
  ```bash
  npm run test:integration:neo4j
  ```

**Acceptance**:
- No flat duplicates remain
- All imports point to structured paths
- Integration tests pass
- Directory structure is clean

---

### Task 2.3: Government Data Consolidation
_Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

**Objective**: Consolidate to single canonical service

**Steps**:
- [ ] 2.3.1: Audit unique capabilities
  - Compare `infrastructure/external-data/government-data-integration.ts`
  - Compare `features/government-data/services/government-data-integration.service.ts`
  - Document unique features in each

- [ ] 2.3.2: Port unique capabilities to canonical
  - If infrastructure version has unique features:
    - Data quality metrics
    - Multi-source priority handling
    - Rate limiting strategies
  - Port to `features/government-data/services/`

- [ ] 2.3.3: Find all imports
  ```bash
  grep -r "external-data/government-data" server/ > gov-data-imports.txt
  ```

- [ ] 2.3.4: Update imports to canonical service
  ```typescript
  // Before
  import { GovernmentDataService } from '@server/infrastructure/external-data/government-data-service';
  
  // After
  import { GovernmentDataIntegrationService } from '@server/features/government-data/services/government-data-integration.service';
  ```

- [ ] 2.3.5: Delete infrastructure files
  ```bash
  rm server/infrastructure/external-data/government-data-integration.ts
  rm server/infrastructure/external-data/government-data-service.ts
  ```

- [ ] 2.3.6: Remove directory if empty
  ```bash
  # Check if directory is empty
  ls server/infrastructure/external-data/
  
  # If empty, remove
  rmdir server/infrastructure/external-data/
  ```

- [ ] 2.3.7: Run integration tests
  ```bash
  npm run test:integration:government-data
  ```

**Acceptance**:
- Single canonical service
- All unique capabilities preserved
- All imports updated
- Integration tests pass

---

### Task 2.4: Error Remediation Move
_Requirements: (Structural improvement)_

**Objective**: Move error-remediation to tools/

**Steps**:
- [ ] 2.4.1: Move directory
  ```bash
  mv server/error-remediation/ tools/error-remediation/
  ```

- [ ] 2.4.2: Update pnpm-workspace.yaml
  ```yaml
  # If referenced, update path
  packages:
    - 'tools/error-remediation'
  ```

- [ ] 2.4.3: Update CI pipeline references
  - Check `.github/workflows/` for references
  - Update paths if found

- [ ] 2.4.4: Verify build and tests
  ```bash
  cd tools/error-remediation
  npm run build
  npm run test
  ```

**Acceptance**:
- Directory moved successfully
- Workspace configuration updated
- Build and tests pass from new location

---

## Phase 3: Validation Consolidation (Week 5-7)

### Task 3.1: Validation Phase A - Build Foundation
_Requirements: 5.1, 5.2_

**Objective**: Create shared validation primitives

**Steps**:
- [ ] 3.1.1: Create common schemas file
  ```typescript
  // shared/validation/schemas/common.ts
  // See design document for full implementation
  ```

- [ ] 3.1.2: Implement all primitives
  - emailSchema
  - uuidSchema
  - phoneSchema
  - urlSchema
  - userRoleSchema (single source of truth)
  - paginationSchema
  - searchQuerySchema
  - dateRangeSchema
  - ID schemas (billId, userId, commentId)

- [ ] 3.1.3: Export from barrel
  ```typescript
  // shared/validation/index.ts
  export * from './schemas/common';
  ```

- [ ] 3.1.4: Write comprehensive tests
  ```typescript
  // shared/validation/__tests__/common.test.ts
  // Test each schema with valid and invalid inputs
  ```

- [ ] 3.1.5: Run tests
  ```bash
  npm run test -- shared/validation
  ```

**Acceptance**:
- All primitives implemented
- All tests pass
- Exported from barrel
- Documentation added

---

### Task 3.2: Validation Phase B - Server Migration
_Requirements: 5.3, 5.6_

**Objective**: Migrate server to use shared validation

**Steps**:
- [ ] 3.2.1: Update repository validation
  ```typescript
  // server/infrastructure/core/validation/repository-validation.ts
  import { emailSchema, uuidSchema, userRoleSchema } from '@shared/validation';
  // Remove local redefinitions
  ```

- [ ] 3.2.2: Audit server/utils/validation.ts
  - Check for unique logic not in infrastructure
  - Document findings

- [ ] 3.2.3: Merge unique logic to infrastructure
  - Move unique functions to `server/infrastructure/core/validation/`
  - Update imports

- [ ] 3.2.4: Delete server/utils/validation.ts
  ```bash
  rm server/utils/validation.ts
  ```

- [ ] 3.2.5: Find all local email validations
  ```bash
  grep -r "z.string().email" server/ > server-email-validations.txt
  ```

- [ ] 3.2.6: Replace with shared imports
  ```typescript
  // Before
  const emailSchema = z.string().email();
  
  // After
  import { emailSchema } from '@shared/validation';
  ```

- [ ] 3.2.7: Find all local role enums
  ```bash
  grep -rn "enum.*citizen.*admin" server/ > server-role-enums.txt
  ```

- [ ] 3.2.8: Replace with shared userRoleSchema
  ```typescript
  // Before
  const roleSchema = z.enum(['citizen', 'admin', 'expert']);
  
  // After
  import { userRoleSchema } from '@shared/validation';
  ```

- [ ] 3.2.9: Run server tests
  ```bash
  npm run test:server
  npm run type-check
  ```

**Acceptance**:
- Server uses shared primitives
- No local redefinitions
- server/utils/validation.ts deleted
- All tests pass

---

### Task 3.3: Validation Phase C - Client Migration
_Requirements: 5.4, 5.5, 5.7_

**Objective**: Migrate client to use shared validation

**Steps**:
- [ ] 3.3.1: Audit client validation files
  ```bash
  # Find duplicate email validations
  grep -r "z.string().email" client/src/ > client-email-validations.txt
  
  # Find duplicate UUID validations
  grep -r "z.string().uuid" client/src/ > client-uuid-validations.txt
  
  # Find duplicate role enums
  grep -rn "enum.*citizen.*admin" client/src/ > client-role-enums.txt
  ```

- [ ] 3.3.2: Replace email validations
  ```typescript
  // Before (client/src/features/users/validation.ts)
  const emailSchema = z.string().email();
  
  // After
  import { emailSchema } from '@shared/validation';
  ```

- [ ] 3.3.3: Replace UUID validations
  ```typescript
  // Before
  const uuidSchema = z.string().uuid();
  
  // After
  import { uuidSchema } from '@shared/validation';
  ```

- [ ] 3.3.4: Replace role enums
  ```typescript
  // Before
  const roleSchema = z.enum(['citizen', 'admin', 'expert']);
  
  // After
  import { userRoleSchema } from '@shared/validation';
  ```

- [ ] 3.3.5: Verify role enum consistency
  ```bash
  # Should only find shared/validation/schemas/common.ts
  grep -r "enum.*citizen.*admin" --include="*.ts"
  ```

- [ ] 3.3.6: Run client tests
  ```bash
  npm run test:client
  npm run type-check
  ```

**Acceptance**:
- Client uses shared primitives
- No local redefinitions
- Role enum is single source
- All tests pass

---

### Task 3.4: Validation Verification
_Requirements: 5.8_

**Objective**: Verify no circular dependencies

**Steps**:
- [ ] 3.4.1: Add ESLint rule
  ```javascript
  // .eslintrc.js
  {
    rules: {
      'import/no-restricted-paths': ['error', {
        zones: [
          {
            target: './shared',
            from: './server',
            message: 'Shared cannot import from server'
          },
          {
            target: './shared',
            from: './client',
            message: 'Shared cannot import from client'
          }
        ]
      }]
    }
  }
  ```

- [ ] 3.4.2: Run circular dependency check
  ```bash
  npm run check:circular
  ```

- [ ] 3.4.3: Run full test suite
  ```bash
  npm run test
  npm run test:integration
  npm run type-check
  ```

- [ ] 3.4.4: Verify bundle size
  ```bash
  npm run build:analyze
  # Check that shared validation is tree-shaken properly
  ```

**Acceptance**:
- No circular dependencies
- ESLint rule enforced
- All tests pass
- Bundle size acceptable

---

## Phase 4: Documentation & Convention (Week 8)

### Task 4.1: Create ADRs
_Requirements: (Documentation)_

**Objective**: Document architectural decisions

**Steps**:
- [ ] 4.1.1: Create ADR-006: API Client Consolidation
  - Document decision to remove unused clients
  - Explain why globalApiClient was chosen
  - List alternatives considered

- [ ] 4.1.2: Create ADR-007: Validation Single Source
  - Document three-layer validation architecture
  - Explain shared/validation/ as single source
  - Document enforcement strategy

- [ ] 4.1.3: Create ADR-008: Feature Structure Convention
  - Document DDD vs Flat guidelines
  - Provide decision criteria
  - List examples of each pattern

**Acceptance**:
- All ADRs created
- ADRs follow template
- ADRs linked from ARCHITECTURE.md

---

### Task 4.2: Feature Architecture Convention
_Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

**Objective**: Document and enforce feature structure convention

**Steps**:
- [ ] 4.2.1: Create features/README.md
  ```markdown
  # Feature Structure Convention
  
  ## When to Use Full DDD
  - Feature has database entities
  - Domain logic must be protected
  - Multiple use cases
  - More than ~8 files
  
  ## When to Use Flat
  - Thin routing layer
  - Fewer than ~8 files
  - Read-only queries
  ```

- [ ] 4.2.2: Add examples to README
  - Full DDD: users/, bills/, recommendation/
  - Flat: community/, market/, coverage/

- [ ] 4.2.3: Consider ESLint enforcement
  - Research ESLint plugins for directory structure
  - If feasible, add rule to enforce convention

- [ ] 4.2.4: Update ARCHITECTURE.md
  - Link to features/README.md
  - Explain the convention

**Acceptance**:
- Convention documented
- Examples provided
- Linked from ARCHITECTURE.md
- ESLint rule added if feasible

---

### Task 4.3: Constitutional Intelligence Resolution
_Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

**Objective**: Resolve DDD boundary ambiguity

**Steps**:
- [ ] 4.3.1: Decide on approach
  - Option A: Merge into constitutional-analysis/domain/
  - Option B: Clarify and complete DDD split
  - Document decision

- [ ] 4.3.2: If merging (Option A):
  - Move domain entities to constitutional-analysis/domain/
  - Delete constitutional-intelligence/
  - Update imports

- [ ] 4.3.3: If clarifying (Option B):
  - Complete empty service file
  - Document why it's empty if intentional
  - Add README explaining DDD split

- [ ] 4.3.4: Create constitutional/README.md
  - Explain architecture decision
  - Document layer boundaries
  - Provide examples

- [ ] 4.3.5: Update ARCHITECTURE.md
  - Link to constitutional/README.md
  - Explain the pattern

**Acceptance**:
- Boundary is clear
- No ambiguous implementations
- Documentation complete
- Architecture updated

---

### Task 4.4: Final Verification
_Requirements: All_

**Objective**: Verify all migrations complete

**Steps**:
- [ ] 4.4.1: Run full test suite
  ```bash
  npm run test
  npm run test:integration
  npm run test:e2e
  ```

- [ ] 4.4.2: Run type check
  ```bash
  npm run type-check
  ```

- [ ] 4.4.3: Run linter
  ```bash
  npm run lint
  ```

- [ ] 4.4.4: Build all packages
  ```bash
  npm run build
  ```

- [ ] 4.4.5: Verify bundle size
  ```bash
  npm run build:analyze
  # Expect ~5% reduction from dead code removal
  ```

- [ ] 4.4.6: Check for broken imports
  ```bash
  # Should return 0 results
  grep -r "from.*base-client" client/src/
  grep -r "from.*safe-client" client/src/
  grep -r "from.*authenticated-client" client/src/
  ```

- [ ] 4.4.7: Verify migration status
  - CSP Manager: 100% complete
  - Dead API Clients: 100% complete
  - Graph Module: 100% complete
  - Government Data: 100% complete
  - Validation: 100% complete

**Acceptance**:
- All tests pass
- No type errors
- No lint errors
- Build succeeds
- Bundle size reduced
- All migrations 100% complete

---

## Success Criteria Summary

### Quantitative Metrics
- [ ] File count reduced by 50+ files
- [ ] Zero imports of deleted modules
- [ ] Test coverage maintained >80%
- [ ] Bundle size reduced by ~5%
- [ ] Build time no significant increase

### Qualitative Metrics
- [ ] Single API client pattern documented
- [ ] Validation single source established
- [ ] Feature structure convention documented
- [ ] All ADRs created
- [ ] Architecture documentation updated

### Migration Status
- [ ] CSP Manager: 100% complete
- [ ] Dead API Clients: 100% complete
- [ ] Graph Module: 100% complete
- [ ] Government Data: 100% complete
- [ ] Validation: 100% complete

---

## Rollback Procedures

### If Issues Arise

**CSP Migration:**
```bash
git revert <commit-hash>
export USE_UNIFIED_SECURITY=false
npm run dev
```

**API Client Removal:**
```bash
git checkout <commit-before-deletion> -- client/src/core/api/safe-client.ts
git checkout <commit-before-deletion> -- client/src/core/api/index.ts
npm run build
```

**Validation Migration:**
```bash
# Rollback is per-phase
# Phase A: git revert <phase-a-commit>
# Phase B: git revert <phase-b-commit>
# Phase C: git revert <phase-c-commit>
```

---

## Timeline

| Week | Tasks | Deliverables |
|------|-------|--------------|
| 1 | 1.1-1.4 | API clients removed, CSP migrated, repo cleaned |
| 2 | 2.1-2.4 | Scripts audited, graph refactored, gov data consolidated |
| 3 | 3.1 | Shared validation foundation created |
| 4 | 3.2 | Server migrated to shared validation |
| 5 | 3.3-3.4 | Client migrated, validation verified |
| 6 | 4.1-4.4 | ADRs created, conventions documented, final verification |

**Total Duration**: 6 weeks (8 weeks budgeted with buffer)
