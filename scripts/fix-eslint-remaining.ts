#!/usr/bin/env tsx
/**
 * Fix Remaining ESLint Suppressions
 * 
 * Targets:
 * 1. Convert require() to import in coverage-routes.ts
 * 2. Fix explicit any in websocket-service.ts
 * 3. Document justified suppressions
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

interface FixResult {
  file: string;
  fixed: number;
  details: string[];
}

const results: FixResult[] = [];

function fixCoverageRoutes(): FixResult {
  const filePath = resolve('server/features/coverage/coverage-routes.ts');
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const newLines: string[] = [];
  let fixed = 0;
  const details: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = i < lines.length - 1 ? lines[i + 1] : '';

    // Skip eslint-disable-next-line for no-var-requires
    if (line.includes('eslint-disable-next-line @typescript-eslint/no-var-requires')) {
      // Check if next line has dynamic import
      if (nextLine.includes('await import(')) {
        // This is already using dynamic import, just remove the suppression
        fixed++;
        details.push(`Removed unnecessary suppression at line ${i + 1}`);
        continue;
      }
    }

    newLines.push(line);
  }

  if (fixed > 0) {
    writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  }

  return {
    file: filePath,
    fixed,
    details,
  };
}

function fixWebSocketService(): FixResult {
  const filePath = resolve('server/infrastructure/websocket/core/websocket-service.ts');
  const content = readFileSync(filePath, 'utf-8');
  let newContent = content;
  let fixed = 0;
  const details: string[] = [];

  // Find the line with eslint-disable-next-line @typescript-eslint/no-explicit-any
  // and the next line with (listener as any)(...args)
  const pattern = /\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\s+\(listener as any\)\(\.\.\.args\);/g;
  
  if (pattern.test(content)) {
    // Replace with proper typing
    newContent = content.replace(
      /\/\/ eslint-disable-next-line @typescript-eslint\/no-explicit-any\s+\(listener as any\)\(\.\.\.args\);/g,
      '(listener as (...args: unknown[]) => void)(...args);'
    );
    fixed = 1;
    details.push('Fixed explicit any in listener call');
  }

  if (fixed > 0) {
    writeFileSync(filePath, newContent, 'utf-8');
  }

  return {
    file: filePath,
    fixed,
    details,
  };
}

function documentJustifiedSuppressions(): FixResult {
  const filePath = resolve('.kiro/specs/comprehensive-bug-fixes/JUSTIFIED_ESLINT_SUPPRESSIONS.md');
  const content = `# Justified ESLint Suppressions

**Date**: 2026-02-17  
**Total Justified**: 10 suppressions

## Summary

These ESLint suppressions are intentional and documented. They should be kept.

## 1. React Hooks Exhaustive Deps (3 suppressions)

### Location
- \`client/src/lib/ui/offline/offline-manager.tsx:479\`
- \`client/src/features/analytics/hooks/useErrorAnalytics.ts:324\`
- \`client/src/core/navigation/hooks/use-navigation-preferences.tsx:105\`

### Justification
Intentionally omitting dependencies to run effect only once on mount. This is a common React pattern for initialization logic that should not re-run.

### Code Pattern
\`\`\`typescript
useEffect(() => {
  // Initialization logic
  // JUSTIFICATION: Intentionally omitting dependencies to run effect only once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Only run once on mount
\`\`\`

## 2. Complexity (2 suppressions)

### Location
- \`server/infrastructure/schema/validate-static.ts:189\`
- \`server/infrastructure/schema/validate-static.ts:253\`

### Justification
Function complexity is inherent to the algorithm and cannot be reduced without sacrificing readability. These are schema scanning functions that need to handle many cases.

### Code Pattern
\`\`\`typescript
// JUSTIFICATION: Function complexity is inherent to the algorithm
// eslint-disable-next-line complexity
function scanSchemaFiles(dir: string): { tables: TableDef[]; enums: EnumDef[] } {
  // Complex but necessary logic
}
\`\`\`

## 3. This Alias (1 suppression)

### Location
- \`client/src/core/security/csrf-protection.ts:261\`

### Justification
this-alias required for closure context preservation in XMLHttpRequest override. This is necessary for maintaining the correct context in the closure.

### Code Pattern
\`\`\`typescript
// JUSTIFICATION: this-alias required for closure context preservation
// eslint-disable-next-line @typescript-eslint/no-this-alias
const self = this;
\`\`\`

## 4. No Unused Vars (1 suppression)

### Location
- \`client/src/core/analytics/comprehensive-tracker.ts:965\`

### Justification
Reserved for future use when batch sending is implemented. The method is part of the public API and will be used in a future feature.

### Code Pattern
\`\`\`typescript
/**
 * @internal Reserved for future use when batch sending is implemented
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
private async _flushAnalyticsData(): Promise<void> {
  // Future implementation
}
\`\`\`

## 5. No Console in Scripts (3 suppressions)

### Location
- \`server/infrastructure/schema/validate-static.ts:15\` (file-level)
- \`server/infrastructure/database/graph/relationships.ts:1\` (file-level)
- \`server/infrastructure/websocket/adapters/native-websocket-adapter.ts:15\` (file-level)

### Justification
These are standalone scripts or adapters that run outside the normal application context and need console output for debugging and validation.

### Code Pattern
\`\`\`typescript
/* eslint-disable no-console */
// This is a standalone script that needs console output
\`\`\`

## 6. React Style Prop Object (1 suppression)

### Location
- \`client/src/lib/design-system/interactive/Sidebar.tsx:144\`

### Justification
The style prop is intentionally using an object for dynamic styling. This is a valid use case.

### Code Pattern
\`\`\`typescript
{/* eslint-disable-next-line react/style-prop-object */}
<Component style={dynamicStyle} />
\`\`\`

## Review Schedule

These suppressions should be reviewed:
- **Quarterly**: Ensure they're still necessary
- **On refactoring**: Consider if the code can be improved
- **On ESLint updates**: Check if new rules make them obsolete

## Removal Criteria

A suppression can be removed if:
1. The underlying code is refactored to not need it
2. ESLint rules are updated to handle the pattern
3. The feature is implemented (for future use cases)
4. The code is no longer needed

---

**Last Updated**: 2026-02-17  
**Next Review**: 2026-05-17 (3 months)
`;

  writeFileSync(filePath, content, 'utf-8');

  return {
    file: filePath,
    fixed: 1,
    details: ['Created documentation for justified suppressions'],
  };
}

async function main() {
  console.log('🔧 Fixing remaining ESLint suppressions...\n');

  // Fix coverage routes
  const coverageResult = fixCoverageRoutes();
  if (coverageResult.fixed > 0) {
    results.push(coverageResult);
  }

  // Fix websocket service
  const websocketResult = fixWebSocketService();
  if (websocketResult.fixed > 0) {
    results.push(websocketResult);
  }

  // Document justified suppressions
  const docResult = documentJustifiedSuppressions();
  results.push(docResult);

  // Print results
  console.log('============================================================');
  console.log('📊 ESLINT SUPPRESSION FIX SUMMARY');
  console.log('============================================================\n');

  let totalFixed = 0;
  for (const result of results) {
    totalFixed += result.fixed;
    const fileName = result.file.split(/[/\\]/).slice(-3).join('/');
    console.log(`📁 ${fileName}`);
    console.log(`   Fixed: ${result.fixed}`);
    for (const detail of result.details) {
      console.log(`   - ${detail}`);
    }
    console.log('');
  }

  console.log(`✅ Total Fixed: ${totalFixed}`);
  console.log(`📁 Files Modified: ${results.length}\n`);

  console.log('============================================================');
  console.log('✅ Fix complete!\n');
  console.log('💡 Next steps:');
  console.log('   1. Run: npm run verify:metrics');
  console.log('   2. Review: .kiro/specs/comprehensive-bug-fixes/JUSTIFIED_ESLINT_SUPPRESSIONS.md');
  console.log('   3. Verify: git diff');
}

main().catch(console.error);
