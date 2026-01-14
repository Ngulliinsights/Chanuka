# Import Migration Guide

**Status:** Active Migration  
**Deadline:** Remove `server/services/` directory completely in v2.0

---

## Service Import Updates

### API Cost Monitoring

**Before (Deprecated):**
```typescript
import { APICostMonitoringService } from '@/server/services/api-cost-monitoring';
```

**After (Current):**
```typescript
import { APICostMonitoringService, apiCostMonitoringService } from '@/server/features/monitoring/application/api-cost-monitoring.service';
```

---

### Coverage Analyzer

**Before (Deprecated):**
```typescript
import { CoverageAnalyzer } from '@/server/services/coverage-analyzer';
```

**After (Current):**
```typescript
import { CoverageAnalyzer } from '@/server/features/analysis/application/coverage-analyzer.service';
```

---

### External API Error Handler

**Before (Deprecated):**
```typescript
import { ExternalAPIErrorHandler } from '@/server/services/external-api-error-handler';
```

**After (Current):**
```typescript
import { ExternalAPIErrorHandler } from '@/server/infrastructure/external-api/error-handler';
```

---

### Managed Government Data Integration

**Before (Deprecated):**
```typescript
import { ManagedGovernmentDataIntegrationService } from '@/server/services/managed-government-data-integration';
```

**After (Current):**
```typescript
import { ManagedGovernmentDataIntegrationService } from '@/server/features/government-data/application/managed-integration.service';
```

---

### Argument Intelligence (Already Migrated)

**Before (Legacy - from services):**
```typescript
import { ArgumentExtractionService } from '@/server/services/argument-extraction.service';
```

**After (Current - feature-based):**
```typescript
import { ArgumentIntelligenceService, argumentIntelligenceService } from '@/server/features/argument-intelligence/application/argument-intelligence-service';
```

---

### Constitutional Analysis (Already Migrated)

**Before (Legacy - from services):**
```typescript
import { ConstitutionalAnalysisService } from '@/server/services/constitutional-analysis.service';
```

**After (Current - feature-based):**
```typescript
import { ConstitutionalAnalysisService } from '@/server/features/constitutional-analysis/application/constitutional-analysis-service-complete';
```

---

## Client Hook Updates

### Argument Intelligence Integration with Community

**New hooks now available in community feature:**
```typescript
import { 
  useArgumentsForBill,
  useArgumentClusters,
  useLegislativeBrief
} from '@/features/community';
```

**Usage Example:**
```typescript
// In a bill details component
const { data: arguments } = useArgumentsForBill(billId);
const { data: clusters } = useArgumentClusters(billId);
const { data: brief } = useLegislativeBrief(billId);

return (
  <div>
    <LegislativeBriefDisplay brief={brief} />
    <ArgumentClustersDisplay clusters={clusters} />
    <ArgumentsList arguments={arguments} />
  </div>
);
```

---

## Finding Deprecated Imports

### Grep Command
```bash
grep -r "from.*server/services" server/ client/ --include="*.ts" --include="*.tsx"
```

### Files to Check
```bash
# Find all files importing from services directory
grep -r "server/services" . --include="*.ts" --include="*.tsx" | grep -v node_modules
```

---

## Phase-Out Timeline

- **Phase 1 (NOW):** New services created in feature locations
- **Phase 2 (Week 1):** All imports updated in codebase
- **Phase 3 (Week 2):** `server/services/` directory deleted
- **Phase 4 (Release v2.0):** Old import paths no longer supported

---

## Compatibility Shims

If gradual migration is needed, create compatibility shims in `server/services/deprecated/`:

```typescript
// server/services/deprecated/api-cost-monitoring.ts
export { 
  APICostMonitoringService, 
  apiCostMonitoringService 
} from '@/server/features/monitoring/application/api-cost-monitoring.service';
```

Then import from deprecated:
```typescript
import { apiCostMonitoringService } from '@/server/services/deprecated/api-cost-monitoring';
```

---

## Verification

After updating imports, run:
```bash
# Check for remaining deprecated imports
grep -r "server/services" . --include="*.ts" --include="*.tsx" | grep -v deprecated | grep -v node_modules

# Run linter
npm run lint

# Run type check
npm run type-check

# Run tests
npm test
```
