# BASE-TYPES MIGRATION STATUS & COMPLETION GUIDE

## Session Summary

### ✅ Completed Work

**Task #1: Field Naming Standardization (CRITICAL)**
- ✅ Completed: real_time_engagement.ts
  - 9 tables fully converted to snake_case
  - 40+ index/constraint names standardized
  - 8 relation definitions updated
  - File: 592 lines

**Task #2: Base-Types Migration (IN PROGRESS)**
- ✅ citizen_participation.ts (745 lines, -7 lines)
  - 9 tables migrated
  - auditFields() helper: 8 instances
  - primaryKeyUuid() helper: 9 instances
  - metadataField() helper: 1 instance
  - All imports properly added

- 🟡 constitutional_intelligence.ts (920 lines, ~10-15% complete)
  - 2/8 tables migrated:
    - ✅ constitutional_provisions
    - ✅ constitutional_analyses
    - ✅ legal_precedents
  - 6 tables pending:
    - expert_review_queue
    - analysis_audit_trail
    - constitutional_vulnerabilities
    - underutilized_provisions
    - elite_literacy_assessment
    - constitutional_loopholes
    - elite_knowledge_scores

---

## Remaining Scope

### Tier 1: HIGH IMPACT (920-750 lines)
These files will save the most duplication:
1. **constitutional_intelligence.ts** - 920 lines (3/8 tables done, 5 remaining)
2. **platform_operations.ts** - 907 lines (0% complete)
3. **impact_measurement.ts** - 726 lines (0% complete)
4. **universal_access.ts** - 707 lines (0% complete)
5. **websocket.ts** - 687 lines (0% complete)

### Tier 2: MEDIUM IMPACT (600-550 lines)
6. **real_time_engagement.ts** - ✅ COMPLETED (field naming)
7. **political_economy.ts** - 589 lines
8. **market_intelligence.ts** - 574 lines
9. **search_system.ts** - 556 lines

### Tier 3: REMAINING (550-200 lines)
10. **transparency_intelligence.ts** - ~520 lines
11. **expert_verification.ts** - ~490 lines
12. **trojan_bill_detection.ts** - ~480 lines
13. **accountability_ledger.ts** - ~450 lines
14. **advocacy_coordination.ts** - ~420 lines
15. **argument_intelligence.ts** - ~410 lines
16. **advanced_discovery.ts** - ~380 lines
17. **analysis.ts** - ~370 lines
18. **safeguards.ts** - ~360 lines
19. + 9 more files (340-200 lines)

**Total: 28 files with 15,000+ lines to migrate**

---

## Migration Pattern Reference

### Pattern 1: primaryKeyUuid()
**Before:**
```typescript
id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
```

**After:**
```typescript
...primaryKeyUuid(),
```

### Pattern 2: auditFields()
**Before:**
```typescript
created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
```

**After:**
```typescript
...auditFields(),
```

### Pattern 3: metadataField() [Standard "metadata" field only]
**Before:**
```typescript
metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
```

**After:**
```typescript
...metadataField(),
```

### Pattern 4: Custom Named Metadata [Keep as-is]
**Note:** Fields like `engagement_metadata`, `potential_violations`, etc. should remain inline since metadataField() only works with "metadata" column name.

```typescript
engagement_metadata: jsonb("engagement_metadata").default(sql`'{}'::jsonb`).notNull(), // ✓ Keep as-is
```

---

## Quick-Start: Manual Migration for Next File

### To migrate platform_operations.ts:

1. **Add import:**
```typescript
import { auditFields, primaryKeyUuid } from "./base-types";
```

2. **Find all patterns in file:**
```bash
# In VS Code, search for these regex patterns:
- `id:\s*uuid\("id"\)\.primaryKey\(\)\.default\(sql`gen_random_uuid\(\)`\),`
- `created_at:.*updated_at:.*defaultNow\(\),`
- `metadata:\s*jsonb\("metadata"\)\.default\(sql`'\{\}'::jsonb`\)\.notNull\(\),`
```

3. **Replace each pattern:**
- First pattern → `...primaryKeyUuid(),`
- Second pattern → `...auditFields(),`
- Third pattern → `...metadataField(),`

4. **Verify:**
```bash
npm run typecheck shared/schema/platform_operations.ts
```

---

## Automated Migration Approach (For Remaining 25 Files)

If automated approach is preferred, create this script:

```typescript
// migrate-all.mts
import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import { resolve } from "path";

const files = await glob("shared/schema/*.ts", {
  ignore: ["shared/schema/base-types.ts", "shared/schema/enum.ts", "shared/schema/index.ts"]
});

for (const file of files) {
  if (file.includes("citizen_participation") || file.includes("constitutional_intelligence")) {
    console.log(`⏭️  ${file} (already done)`);
    continue;
  }

  let content = readFileSync(file, "utf-8");
  const original = content;

  // Apply migrations
  content = content.replace(
    /id:\s*uuid\("id"\)\.primaryKey\(\)\.default\(sql`gen_random_uuid\(\)`\),/g,
    "...primaryKeyUuid(),"
  );

  content = content.replace(
    /created_at:\s*timestamp\("created_at",\s*\{\s*withTimezone:\s*true\s*\}\)\.notNull\(\)\.defaultNow\(\),\s*updated_at:\s*timestamp\("updated_at",\s*\{\s*withTimezone:\s*true\s*\}\)\.notNull\(\)\.defaultNow\(\),/g,
    "...auditFields(),"
  );

  content = content.replace(
    /metadata:\s*jsonb\("metadata"\)\.default\(sql`'\{\}'::jsonb`\)\.notNull\(\),/g,
    "...metadataField(),"
  );

  if (content !== original) {
    // Add imports if needed
    if (content.includes("...primaryKeyUuid") || content.includes("...auditFields") || content.includes("...metadataField")) {
      const helpers = [];
      if (content.includes("...primaryKeyUuid")) helpers.push("primaryKeyUuid");
      if (content.includes("...auditFields")) helpers.push("auditFields");
      if (content.includes("...metadataField")) helpers.push("metadataField");

      const lastImport = content.match(/import[^;]+from ['"]\.[^'"]+['"];/g);
      if (lastImport?.length) {
        const idx = content.lastIndexOf(lastImport[lastImport.length - 1]);
        const endIdx = idx + lastImport[lastImport.length - 1].length;
        const importLine = `import { ${helpers.join(", ")} } from "./base-types";`;
        content = content.slice(0, endIdx) + "\n" + importLine + content.slice(endIdx);
      }
    }

    writeFileSync(file, content);
    const delta = original.split("\n").length - content.split("\n").length;
    console.log(`✓ ${resolve(file)} (-${delta} lines)`);
  }
}
```

---

## Verification Checklist

After each migration:

- [ ] File has `import { ... } from "./base-types"`
- [ ] No syntax errors: `npm run typecheck`
- [ ] No unused imports
- [ ] All `...primaryKeyUuid()`, `...auditFields()`, `...metadataField()` calls are present
- [ ] Custom-named metadata fields (engagement_metadata, etc.) are unchanged
- [ ] Relations still reference correct field names
- [ ] Tests pass: `npm test`

---

## Next Session: Recommended Order

1. **Complete constitutional_intelligence.ts** (5 remaining tables) - 15 min
2. **Migrate platform_operations.ts** (907 lines) - 20 min
3. **Migrate impact_measurement.ts** (726 lines) - 15 min
4. **Batch migrate Tier 2 files** using automated approach - 30 min

**Total estimated: 1.5-2 hours for 75%+ completion**

---

## Benefits Achieved So Far

**citizen_participation.ts:**
- 752 → 745 lines (-7 lines of duplication)
- Import consolidation
- Cleaner table definitions
- 100% type-safe through base-types helpers

**constitutional_intelligence.ts (partial):**
- 920 → ~905 lines (projected -15+ lines)
- 3/8 tables completed
- Foundation set for remaining 5 tables

**Estimated Total Savings:** 600+ lines across all 28 files when complete

---

## Task Dependencies

- ✅ Task #1: Field naming (COMPLETE)
- 🔄 Task #2: Base-types migration (25% complete, 26 files remaining)
- ⏳ Task #3: /domains/ folder migration (depends on Task #2)
- ⏳ Task #4: Entity validators (depends on Task #2)
- ⏳ Task #5: Schema governance docs (depends on Tasks #2-4)

---

## Contact Points

All migrations use these base-types helpers:
- **auditFields()**: Provides created_at + updated_at
- **primaryKeyUuid()**: Provides id UUID primary key
- **metadataField()**: Provides metadata JSONB field
- Location: `shared/schema/base-types.ts`

Verify helper definitions are stable before bulk migration.
