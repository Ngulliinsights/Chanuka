# Domain-Specific Type Migration Plan

## 🎯 Strategic Mapping

### ✅ Created Type Directories:
1. **`server/features/analysis/types/`** - Legal analysis, constitutional analysis
2. **`server/features/users/types/`** - Expert verification, user management  
3. **`server/features/sponsors/types/`** - Stakeholder management
4. **Enhanced `shared/core/src/types/auth.types.ts`** - OAuth, social profiles

### 📋 Import Updates Needed:

#### Legal Analysis Types:
- `server/features/analytics/legal-analysis.ts` → `server/features/analysis/types`

#### Expert/Verification Types:
- `server/features/users/domain/ExpertVerificationService.ts` → `server/features/users/types`
- `server/features/users/infrastructure/user-storage.d.ts` → Update auth imports

#### Auth Types:
- `server/features/users/infrastructure/user-storage.d.ts` → `@shared/core/src/types/auth.types`
- `server/types/api.ts` and server/types/common.ts → Update common type imports

#### Configuration Updates:
- Remove `@shared/types` from vitest.config.ts
- Remove `@shared/types` from all script configurations
- Update TypeScript path mappings

### 🚫 Types NOT to Migrate:
- **Bill Analysis Types** - Already well-established in multiple locations
- **Common Types** - Available in shared/core/src/types
- **Error Types** - Using specialized error classes

## 📊 Impact Analysis:

### Low Risk Migrations:
- Legal analysis types (single usage)
- OAuth/social types (merge into existing)

### Medium Risk Migrations:  
- Expert types (multiple usages, but contained)
- Stakeholder types (limited usage)

### High Risk (Skip):
- Bill analysis types (extensively used, established patterns)

## 🔄 Migration Order:
1. ✅ Update legal analysis imports
2. ✅ Update expert/verification imports
3. ✅ Update auth-related imports
4. ✅ Update configuration files
5. ✅ Verify no broken imports
6. ✅ Delete shared/types directory

## ✅ Migration Status: COMPLETED

The domain-specific type migration has been successfully completed. All types have been moved to their respective feature directories, and the `@shared/types` directory has been removed. Configuration files have been updated to remove references to `@shared/types`.