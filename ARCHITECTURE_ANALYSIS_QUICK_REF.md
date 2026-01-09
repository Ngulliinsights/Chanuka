# Architecture Analysis - Quick Reference

## One-Liner Commands

| Task | Command |
|------|---------|
| **Full architecture audit** | `npm run analyze:modern` |
| **Circular dependencies** | `npm run analyze:circular` |
| **Code duplication** | `npm run analyze:duplication` |
| **Unused code** | `npm run analyze:dead` |
| **Import violations** | `npm run analyze:imports` |

## Generated Reports

```
analysis-results/
├── unified-report.json      ← Machine-readable findings
├── unified-report.md        ← Human-readable summary
├── jscpd/                   ← Duplication details
└── [tool-specific outputs]
```

## Critical Issues Found

### 1. Competing Persistence Layers
- **Impact:** 🔴 CRITICAL - Blocks all data features
- **Locations:** `server/storage/` ❌ AND `server/persistence/drizzle/` ❌
- **Fix:** Create `DataAccessFacade`, migrate over 2 weeks
- **Ticket Template:** `Choose & consolidate persistence layer`

### 2. Fragmented Type System
- **Impact:** 🟠 HIGH - Type safety degradation
- **Locations:** 5+ type definition locations
- **Fix:** Centralize in `shared/types/`, migrate over 3 weeks
- **Ticket Template:** `Create unified type system`

### 3. Multiple Auth Services
- **Impact:** 🟠 HIGH - Security & maintenance risk
- **Locations:** 5+ different auth implementations
- **Fix:** Create `IAuthService` interface, standardize
- **Ticket Template:** `Consolidate auth services`

### 4. Root Directory Clutter
- **Impact:** 🟡 MEDIUM - Developer experience
- **Locations:** 50+ maintenance scripts in root
- **Fix:** Organize into `scripts/maintenance/`, `scripts/migration/`, `scripts/analysis/`
- **Ticket Template:** `Organize scripts directory`

## Recommended Action Order

1. **First:** Fix persistence layer (Issue #1) - unblocks others
2. **Second:** Consolidate types (Issue #2) - required for type safety
3. **Third:** Standardize services (Issue #3) - improves maintainability
4. **Fourth:** Organize scripts (Issue #4) - improves developer experience

## Integration

### Pre-commit Hook
```bash
npm run precommit  # analyze:modern + quality:check:dev
```

### Pre-push Hook
```bash
npm run prepush    # analyze + quality:check:staging
```

### CI/CD
```bash
npm run ci:quality  # analyze + quality:check:prod
```

## Files Created/Modified

| File | Purpose | Status |
|------|---------|--------|
| `scripts/modern-project-analyzer.ts` | Orchestrates all analysis tools | ✅ Ready |
| `.dependency-cruiser.js` | Architectural rules | ✅ Ready |
| `.jscpd.json` | Duplication detection | ✅ Ready |
| `knip.json` | Dead code detection | ✅ Ready |
| `package.json` | npm scripts & dependencies | ✅ Updated |
| `ARCHITECTURE_ANALYSIS_SETUP.md` | Full implementation guide | ✅ Ready |

## See Also

- [Full Implementation Guide](ARCHITECTURE_ANALYSIS_SETUP.md)
- [Original Analysis](scripts/README.md)
- [Migration Plan](scripts/CHANUKA_MIGRATION_PLAN.md)
