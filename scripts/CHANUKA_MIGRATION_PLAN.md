# Chanuka Project: 10-Week Refactoring Plan

## Overview

This is a **prioritized, pragmatic plan** to resolve the critical architectural issues identified in the Chanuka project. Focus is on **reducing risk** and **unblocking development** rather than perfect architecture.

## Weeks 1-2: Stop the Bleeding (Critical Issues)

### Week 1: Data Layer Crisis Resolution

**Objective**: Establish single source of truth for data access

#### Monday-Tuesday: Audit & Document
```bash
# 1. Document current usage
find server -name "*.ts" -exec grep -l "from.*storage\|from.*persistence" {} \; > data-layer-usage.txt

# 2. Categorize by domain
cat data-layer-usage.txt | xargs grep -h "import.*storage\|import.*persistence" | \
  sed 's/.*from.*\/\([^/]*\)-\(storage\|repository\).*/\1/' | \
  sort | uniq -c | sort -rn
```

**Deliverable**: 
- `MIGRATION_STATUS.md` with current state
- Decision: Which pattern to standardize on (recommend: Drizzle/persistence)

#### Wednesday-Friday: Create Abstraction Layer
```typescript
// server/data-access/index.ts - Temporary facade
export class DataAccessFacade {
  private useLegacy = process.env.USE_LEGACY_STORAGE === 'true';

  async getBill(id: string) {
    if (this.useLegacy) {
      return billStorage.get(id);  // Old
    }
    return billRepository.findById(id);  // New
  }
}

// Usage (no code changes needed elsewhere yet)
const dataAccess = new DataAccessFacade();
const bill = await dataAccess.getBill(id);
```

**Risk Mitigation**: 
- Feature flag for gradual rollout
- Both systems run in parallel
- Easy rollback

### Week 2: Type System Consolidation (Phase 1)

**Objective**: Stop new type fragmentation

#### Monday-Tuesday: Create Canonical Location
```bash
# 1. Create structure
mkdir -p shared/types/{auth,bills,community,users,api,common}

# 2. Move most commonly used types first
mv client/src/types/user.ts shared/types/users/
mv server/types/auth.ts shared/types/auth/

# 3. Create barrel exports
cat > shared/types/index.ts << 'EOF'
export * from './auth';
export * from './users';
export * from './bills';
EOF
```

#### Wednesday-Friday: Path Mapping & Migration Tool
```json
// tsconfig.json - Add path mapping
{
  "compilerOptions": {
    "paths": {
      "@types/*": ["shared/types/*"]
    }
  }
}
```

```typescript
// scripts/migration/migrate-type-imports.ts
import { Project } from 'ts-morph';

const project = new Project({ tsConfigFilePath: 'tsconfig.json' });

// Only migrate the most critical files first
const criticalFiles = [
  'server/features/bills/**/*.ts',
  'client/src/features/bills/**/*.ts'
];

for (const pattern of criticalFiles) {
  for (const sourceFile of project.getSourceFiles(pattern)) {
    sourceFile.getImportDeclarations()
      .filter(imp => imp.getModuleSpecifierValue().includes('/types/'))
      .forEach(imp => {
        const oldPath = imp.getModuleSpecifierValue();
        const newPath = oldPath
          .replace(/^\.\.\/types/, '@types')
          .replace(/^@types\//, '@types/');
        imp.setModuleSpecifier(newPath);
      });
  }
}

await project.save();
```

**Deliverable**:
- `shared/types/` with 20% of types moved
- Path mapping configured
- No breaking changes (old paths still work)

---

## Weeks 3-4: Authentication Consolidation

### Week 3: Auth Service Audit

**Objective**: Document all auth implementations

```bash
# Find all auth services
find . -path "*/node_modules" -prune -o -name "*auth*service*" -type f -print | \
  grep -v node_modules

# Create comparison matrix
cat > auth-services-audit.md << 'EOF'
# Auth Services Audit

## Implementations Found

1. **client/src/core/auth/service.ts**
   - Purpose: Browser-based auth
   - Dependencies: localStorage, fetch
   - Methods: login, logout, refreshToken

2. **server/core/auth/auth-service.ts**
   - Purpose: Server-side auth
   - Dependencies: JWT, bcrypt, database
   - Methods: validateToken, createToken, hashPassword

3. **server/features/users/application/user-application-service.ts**
   - Purpose: User management (overlaps with auth)
   - Dependencies: UserRepository
   - Methods: createUser, updateUser, deleteUser

## Recommendation
- Keep #1 for client
- Merge #2 and #3 into server/domain/auth/
- Extract shared interfaces to shared/domain/auth/
EOF
```

### Week 4: Implement Clean Auth Boundaries

```typescript
// shared/domain/auth/interfaces.ts
export interface IAuthService {
  login(request: LoginRequest): Promise<AuthResponse>;
  logout(sessionId: string): Promise<void>;
  validateToken(token: string): Promise<TokenValidation>;
}

// server/domain/auth/server-auth-service.ts
export class ServerAuthService implements IAuthService {
  constructor(
    private userRepo: IUserRepository,
    private tokenService: ITokenService,
    private passwordService: IPasswordService
  ) {}
  
  async login(request: LoginRequest): Promise<AuthResponse> {
    // Consolidated implementation
  }
}

// client/domain/auth/client-auth-service.ts
export class ClientAuthService implements IAuthService {
  constructor(
    private apiClient: ApiClient,
    private storageService: IStorageService
  ) {}
  
  async login(request: LoginRequest): Promise<AuthResponse> {
    // Client-specific implementation
  }
}
```

**Deliverable**:
- 3 auth services → 2 clear implementations
- Shared interface
- No breaking changes (facade maintained)

---

## Weeks 5-6: Service Layer Standardization

### Week 5: Define Service Patterns

**Objective**: Document and enforce service layer rules

```typescript
// shared/domain/PATTERNS.md

# Service Layer Patterns

## Structure
```
domain/
  {feature}/
    interfaces/     # Interfaces only
    entities/       # Domain models
    services/       # Business logic
    events/         # Domain events
```

## Rules
1. Services in domain/ are pure business logic
2. Services in application/ orchestrate domain services
3. Services in infrastructure/ handle external concerns
4. No circular dependencies between services

## Example
```typescript
// Good ✅
domain/bills/services/bill-calculation-service.ts
application/bills/bill-application-service.ts
infrastructure/bills/bill-email-service.ts

// Bad ❌
services/bill-service.ts (ambiguous layer)
core/bills.ts (mixing concerns)
```
```

### Week 6: Migrate Top 5 Services

Pick the 5 most-used services and migrate them:

```bash
# Find most-imported services
find . -name "*.ts" -type f -exec grep -l "import.*service" {} \; | \
  xargs grep -h "import.*service" | \
  sort | uniq -c | sort -rn | head -5
```

For each service:
1. Create interface in `shared/domain/{feature}/interfaces/`
2. Implement in appropriate layer
3. Add facade for backward compatibility
4. Update imports incrementally
5. Remove facade after full migration

---

## Weeks 7-8: Error Handling & Caching Unification

### Week 7: Error Handling

**Objective**: Single error handling system

```typescript
// shared/errors/base-error.ts
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
    public readonly metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

// shared/errors/domain-errors.ts
export class ValidationError extends BaseError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, metadata);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
  }
}

// Usage
throw new ValidationError('Invalid email', { field: 'email' });
```

**Migration Strategy**:
```bash
# 1. Add new error classes alongside old ones
# 2. Update new code to use new errors
# 3. Add compatibility layer
try {
  // old code
} catch (err) {
  if (err instanceof OldError) {
    throw new ValidationError(err.message);
  }
}
# 4. Gradually convert old error handling
```

### Week 8: Caching Consolidation

**Objective**: Single caching abstraction

```typescript
// shared/infrastructure/cache/cache-interface.ts
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// infrastructure/cache/cache-factory.ts
export class CacheFactory {
  static create(config: CacheConfig): ICache {
    switch (config.adapter) {
      case 'redis':
        return new RedisCache(config);
      case 'memory':
        return new MemoryCache(config);
      default:
        throw new Error(`Unknown cache adapter: ${config.adapter}`);
    }
  }
}
```

---

## Weeks 9-10: Documentation & Cleanup

### Week 9: Architecture Documentation

**Objective**: Document the new structure

```bash
# 1. Create architecture docs
mkdir -p docs/architecture/current

# 2. Document each layer
cat > docs/architecture/current/LAYERS.md << 'EOF'
# Chanuka Architecture Layers

## Overview
```
┌─────────────────────────────────────────┐
│          Presentation Layer             │
│  (React Components, Pages)              │
├─────────────────────────────────────────┤
│          Application Layer              │
│  (Use Cases, Orchestration)             │
├─────────────────────────────────────────┤
│            Domain Layer                 │
│  (Business Logic, Entities)             │
├─────────────────────────────────────────┤
│        Infrastructure Layer             │
│  (Database, APIs, External Services)    │
└─────────────────────────────────────────┘
```

## Rules
- Upper layers can depend on lower layers
- Lower layers CANNOT depend on upper layers
- Domain layer is pure business logic
EOF
```

### Week 10: Root Directory Cleanup

**Objective**: Clean root directory

```bash
# 1. Create organized structure
mkdir -p scripts/{maintenance,migration,analysis,archive}

# 2. Archive old scripts
find . -maxdepth 1 -name "fix-*" -o -name "migrate-*" | \
  xargs -I {} mv {} scripts/archive/

# 3. Update README with new structure
cat > README.md << 'EOF'
# Chanuka Project

## Project Structure
```
chanuka/
├── client/           # Frontend (React)
├── server/           # Backend (Node.js)
├── shared/           # Shared code
├── scripts/          # Utility scripts
│   ├── migration/    # Migration scripts
│   ├── maintenance/  # Maintenance scripts
│   └── analysis/     # Analysis tools
└── docs/             # Documentation
```
EOF
```

---

## Success Metrics

Track progress weekly:

```bash
# Generate weekly report
cat > scripts/analysis/weekly-report.sh << 'EOF'
#!/bin/bash
echo "=== Chanuka Health Report ==="
echo "Date: $(date)"
echo ""
echo "Circular Dependencies:"
madge --circular --json . | jq 'length'
echo ""
echo "Code Duplication:"
jscpd . --format json | jq '.statistics.total.percentage'
echo ""
echo "Type Locations:"
find . -name "types" -type d | wc -l
echo ""
echo "Auth Services:"
find . -name "*auth*service*" | wc -l
EOF

chmod +x scripts/analysis/weekly-report.sh
./scripts/analysis/weekly-report.sh
```

## Risk Management

### High-Risk Activities
1. **Data layer migration** - Test extensively, use feature flags
2. **Auth changes** - Security audit, gradual rollout
3. **Type system changes** - Can break builds

### Mitigation Strategies
1. **Feature flags** for all major changes
2. **Parallel implementations** during migration
3. **Comprehensive testing** before switching
4. **Easy rollback** mechanisms
5. **Communication** with entire team

## Definition of Done

Each week's work is done when:
- ✅ All tests pass
- ✅ No new errors in production
- ✅ Documentation updated
- ✅ Team reviewed and approved
- ✅ Metrics show improvement

## Emergency Rollback Plan

If anything goes wrong:

```bash
# 1. Identify the change
git log --since="1 week ago" --oneline

# 2. Revert if needed
git revert <commit-hash>

# 3. Toggle feature flag
# In environment variables or config:
USE_NEW_AUTH=false
USE_NEW_PERSISTENCE=false

# 4. Deploy rollback
npm run deploy:rollback
```

---

## Final Notes

- **Don't aim for perfection** - aim for improvement
- **Ship incrementally** - merge small PRs daily
- **Communicate constantly** - daily standups on progress
- **Test everything** - especially auth and data access
- **Celebrate wins** - each week's completion is progress

**Remember**: This is a 10-week plan, but it's OK if it takes 12-15 weeks. Quality and stability matter more than speed.
