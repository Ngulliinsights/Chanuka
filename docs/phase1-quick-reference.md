# Phase 1 Quick Reference Checklist

## Copy-Paste Implementation Templates

### Template 1: Service Module Index Export

Use this template for all services in `server/features/*/index.ts`:

```typescript
/**
 * <ServiceName> Feature Module
 * Re-exports all public APIs from the feature
 */

// Domain entities and interfaces
export * from './domain';

// Application services
export * from './application';

// Infrastructure implementations
export * from './infrastructure';

// Types (if separate)
export * from './types';
```

---

### Template 2: Infrastructure Module Index Export

Use for `server/infrastructure/<module>/index.ts`:

```typescript
/**
 * <Module> Infrastructure Layer
 * Provides <description> functionality
 */

// Core service export
export { <ServiceClass> } from './<service-file>';
export const <serviceInstance> = <ServiceClass>.getInstance?.() || new <ServiceClass>();

// Additional exports
export * from './types';
export * from './interfaces';
```

---

## Quick Tasks (Copy-Paste Commands)

### 1. Add Core Exports
```bash
# Edit: shared/core/src/index.ts
# Add these lines at the end:

cat >> shared/core/src/index.ts << 'EOF'

// API Utilities
export * from './utils/api-utils';
export { ApiSuccess, ApiError, ApiValidationError, ApiResponseWrapper } from './utils/api-utils';

// Error classes
export * from './errors/base-error';
export { BaseError, ErrorDomain, ErrorSeverity } from './errors/base-error';

// Cache
export { getDefaultCache, createCache } from './caching/cache-manager';
EOF
```

### 2. Fix All Service Exports
```bash
# For each feature directory:
for feature in server/features/*/; do
  if [ -f "$feature/application" ]; then
    if [ ! -f "$feature/index.ts" ]; then
      cat > "$feature/index.ts" << 'EOF'
export * from './domain';
export * from './application';
export * from './infrastructure';
EOF
      echo "Created $feature/index.ts"
    fi
  fi
done
```

### 3. Fix Migration File Imports
```bash
# Remove .js extensions from migration imports
cd server/infrastructure/migration
for file in *.ts; do
  sed -i "s/from '\(.*\)\.js'/from '\1'/g" "$file"
  sed -i 's/from "@\(.*\)\.js"/from "@\1"/g' "$file"
done
echo "✓ Fixed migration imports"
```

### 4. Verify All Exports
```bash
# Check for any remaining broken imports
npm run build 2>&1 | grep -E "TS[0-9]+:|error" | head -20
```

---

## Per-File Checklist

### ✓ shared/core/src/index.ts
- [ ] Re-exports logger
- [ ] Re-exports BaseError and error classes  
- [ ] Re-exports cache utilities
- [ ] Re-exports validation service
- [ ] Re-exports API response utilities
- [ ] Test: `npm run build:shared`

### ✓ server/features/search/index.ts (And similar for all services)
- [ ] Re-exports SearchService
- [ ] Re-exports domain entities
- [ ] Re-exports application logic
- [ ] Test: `npm run build:server`

### ✓ server/infrastructure/logging/index.ts
- [ ] Re-exports logger
- [ ] Re-exports databaseLogger
- [ ] Re-exports logAggregator
- [ ] Test: `npm run build:server`

### ✓ server/infrastructure/notifications/index.ts
- [ ] Re-exports NotificationService
- [ ] Re-exports notification channels
- [ ] Re-exports smart filter
- [ ] Re-exports scheduler service
- [ ] Test: `npm run build:server`

### ✓ server/infrastructure/database/index.ts
- [ ] Re-exports databaseService
- [ ] Re-exports database instance
- [ ] Re-exports pool
- [ ] Test: `npm run build:server`

### ✓ server/infrastructure/migration/*.ts Files
- [ ] Change all `.js` imports to no extension
- [ ] Verify correct path references
- [ ] Test: `npm run build:server`

---

## One-Command Fix (If Confident)

Run this to apply all Phase 1 fixes automatically:

```bash
#!/bin/bash

echo "🔧 Phase 1 Implementation..."

# 1. Consolidate shared/core exports
cat >> shared/core/src/index.ts << 'EOF'

// Additional utilities
export * from './utils/api-utils';
export * from './errors/base-error';
export * from './caching/cache-manager';
EOF

# 2. Fix all migration imports
find server/infrastructure/migration -name "*.ts" -exec sed -i "s/from '\(.*\)\.js'/from '\1'/g" {} \;
find server/infrastructure/migration -name "*.ts" -exec sed -i 's/from "@\(.*\)\.js"/from "@\1"/g' {} \;

# 3. Create missing index files for services
for dir in server/features/*/; do
  if [ -d "$dir/application" ] && [ ! -f "$dir/index.ts" ]; then
    cat > "$dir/index.ts" << 'EOF'
export * from './domain';
export * from './application';
export * from './infrastructure';
EOF
  fi
done

# 4. Verify
npm run build 2>&1 | tail -5

echo "✅ Phase 1 complete! Review build output above."
```

---

## If Build Still Fails

Run this diagnostic:

```bash
# Find remaining missing exports
npm run build 2>&1 | grep "Cannot find name" | head -10

# For each error, find where it should be exported from:
# Example error: "Cannot find name 'logger'"
grep -r "export.*logger" shared/core/src/

# Then add it to the appropriate index.ts
```

---

## Success Criteria

You'll know Phase 1 is complete when:

✅ `npm run build` completes without errors  
✅ No TypeScript "Cannot find name" errors  
✅ All `@shared/core` imports resolve  
✅ All `@server/features/*/` service imports resolve  
✅ Tests pass: `npm run test`  
✅ Lint passes: `npm run lint`

---

## Time Estimate

- **Automated script approach**: 5-10 minutes
- **Manual approach**: 1-2 hours
- **Verification**: 10-15 minutes

**Total: 30 minutes to 2.5 hours depending on approach**

---

## Rollback (If Needed)

If something breaks:

```bash
# Restore from git
git checkout shared/core/src/index.ts
git checkout server/infrastructure/*/index.ts
git checkout server/features/*/index.ts
git checkout server/infrastructure/migration/

# Verify restore
git status
```

---

## Questions?

- **Where do I find X service?** → Check `server/features/` directories
- **What exports does shared/core need?** → See "Template 2" above
- **How do I test changes?** → Run `npm run build` after each section
- **What if I get errors?** → Run the diagnostic command above

