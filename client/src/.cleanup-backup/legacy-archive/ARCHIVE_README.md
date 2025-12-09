# 📦 Legacy Components Archive

## 🎯 **Purpose**
This directory contains archived legacy components that have been migrated to the new Feature-Sliced Design (FSD) structure. These components are preserved for reference and potential rollback scenarios.

## 📅 **Archive Date**
December 8, 2025

## 🔄 **Migration Status**
All components in this archive have been successfully migrated to the new FSD structure:

### **Migrated Components**
- `components/bill-detail/` → `features/bills/ui/detail/`
- `components/community/` → `features/community/ui/`
- `components/discussion/` → `features/community/ui/discussion/`
- `components/search/` → `features/search/ui/`
- `components/auth/` → `features/users/ui/auth/`
- `components/user/` → `features/users/ui/profile/`
- `components/analytics/` → `features/analytics/ui/`

### **Shared Components (Partially Migrated)**
- `components/mobile/` → `shared/ui/mobile/` (some components)
- `components/error-handling/` → `core/error/components/`
- `components/loading/` → `core/loading/components/`

## ⚠️ **Important Notes**
1. **Do not import from this archive** - use the new FSD structure
2. **Reference only** - these components are for historical reference
3. **Rollback safety** - preserved in case rollback is needed
4. **Delete after validation** - can be removed once migration is fully validated

## 🚀 **New Import Patterns**
```typescript
// ❌ Old (Archived)
import { BillDetail } from '@/components/bill-detail/BillDetail';

// ✅ New (FSD)
import { BillDetail } from '@client/features/bills/ui/detail/BillDetail';
```

## 📋 **Archive Contents**
- Original component implementations
- Legacy import patterns
- Historical component organization
- Pre-FSD architecture examples