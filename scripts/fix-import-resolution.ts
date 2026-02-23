#!/usr/bin/env ts-node
/**
 * Import Resolution Fix Script
 * 
 * This script systematically fixes import resolution errors across the codebase.
 * It handles:
 * 1. Path alias corrections
 * 2. Relative path fixes
 * 3. Cross-boundary import violations
 * 4. Missing module creation
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface ImportFix {
  file: string;
  line: number;
  oldImport: string;
  newImport: string;
  reason: string;
}

const fixes: ImportFix[] = [];

// Define import mapping rules
const importMappings: Record<string, string> = {
  // Config imports
  '../core/api/config': '@client/infrastructure/api/config',
  '../lib/config/navigation': './navigation',
  '../../core/api/config': '@client/infrastructure/api/config',
  
  // Navigation imports
  '../core/navigation/context': '@client/infrastructure/navigation/context',
  '../core/navigation/types': '@client/infrastructure/navigation/types',
  '../../core/navigation/context': '@client/infrastructure/navigation/context',
  '../../core/navigation/types': '@client/infrastructure/navigation/types',
  
  // Type imports - fix cross-boundary violations
  '@/types/domains/arguments': '@shared/types/domains/arguments',
  '@/server/features/argument-intelligence': '@shared/types/domains/arguments',
  
  // Utility imports
  '@client/lib/utils/password-validation': '@client/lib/utils/input-validation',
  '../features/analytics/hooks/use-render-tracker': '@client/features/analytics/hooks/use-render-tracker',
  '@client/lib/hooks/use-websocket': '@client/infrastructure/websocket/manager',
  '@client/config/gestures': '@client/lib/config/gestures',
  '@client/data/mock/loaders': '@client/lib/data/mock/loaders',
  '@client/utils/security': '@client/lib/utils/security',
  '@client/services/privacyAnalyticsService': '@client/lib/services/privacyAnalyticsService',
  '@client/services/notification-service': '@client/lib/services/notification-service',
  '@client/config': '@client/lib/config',
  '@client/hooks': '@client/lib/hooks',
  '../utils/logger': '@client/lib/utils/logger',
  '../../../utils/i18n': '@client/lib/utils/i18n',
  './lib/infrastructure/monitoring/cross-system-error-analytics': '@client/lib/infrastructure/monitoring/cross-system-error-analytics',
  './lib/infrastructure/monitoring/error-aggregation-service': '@client/lib/infrastructure/monitoring/error-aggregation-service',
  './lib/infrastructure/monitoring/unified-error-monitoring-interface': '@client/lib/infrastructure/monitoring/unified-error-monitoring-interface',
  '@client/config/navigation': '@client/lib/config/navigation',
  '@client/shared/design-system': '@client/lib/design-system',
  './use-safe-query': '@client/lib/hooks/use-safe-query',
};

// Files that need special handling
const specialCases: Record<string, (content: string) => string> = {
  'client/src/lib/contexts/NavigationContext.tsx': (content) => {
    // This file should just re-export from core
    return `/**
 * Navigation Context - Compatibility Layer
 * Re-exports from core navigation system
 */

export { createNavigationProvider, useNavigation } from '@client/infrastructure/navigation/context';
export type { NavigationContextValue } from '@client/infrastructure/navigation/types';
`;
  },
};

async function findFilesWithImportErrors(): Promise<string[]> {
  const patterns = [
    'client/src/**/*.ts',
    'client/src/**/*.tsx',
  ];
  
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { ignore: ['**/node_modules/**', '**/dist/**'] });
    files.push(...matches);
  }
  
  return files;
}

function fixImportsInFile(filePath: string): number {
  let content = fs.readFileSync(filePath, 'utf-8');
  let fixCount = 0;
  
  // Check for special case handling
  if (specialCases[filePath]) {
    const newContent = specialCases[filePath](content);
    if (newContent !== content) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
      console.log(`✓ Applied special case fix to ${filePath}`);
      return 1;
    }
  }
  
  // Apply import mappings
  for (const [oldImport, newImport] of Object.entries(importMappings)) {
    const patterns = [
      `from '${oldImport}'`,
      `from "${oldImport}"`,
      `import('${oldImport}')`,
      `import("${oldImport}")`,
    ];
    
    for (const pattern of patterns) {
      if (content.includes(pattern)) {
        const newPattern = pattern.replace(oldImport, newImport);
        content = content.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
        fixCount++;
        
        fixes.push({
          file: filePath,
          line: 0, // We'd need to parse to get exact line
          oldImport,
          newImport,
          reason: 'Path alias correction',
        });
      }
    }
  }
  
  if (fixCount > 0) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ Fixed ${fixCount} imports in ${filePath}`);
  }
  
  return fixCount;
}

async function createMissingModules() {
  const modulesToCreate = [
    {
      path: 'client/src/lib/hooks/use-safe-query.ts',
      content: `/**
 * Safe Query Hook
 * Wrapper around React Query with error handling
 */

import { useQuery, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { logger } from '@client/lib/utils/logger';

export function useSafeQuery<TData = unknown, TError = Error>(
  options: UseQueryOptions<TData, TError>
): UseQueryResult<TData, TError> {
  return useQuery({
    ...options,
    onError: (error) => {
      logger.error('Query error', { error, queryKey: options.queryKey });
      options.onError?.(error);
    },
  });
}
`,
    },
  ];
  
  for (const module of modulesToCreate) {
    const fullPath = path.join(process.cwd(), module.path);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(fullPath, module.content, 'utf-8');
      console.log(`✓ Created missing module: ${module.path}`);
    }
  }
}

async function main() {
  console.log('🔧 Starting import resolution fixes...\n');
  
  // Step 1: Create missing modules
  console.log('📦 Creating missing modules...');
  await createMissingModules();
  console.log('');
  
  // Step 2: Fix imports in existing files
  console.log('🔍 Finding files with import errors...');
  const files = await findFilesWithImportErrors();
  console.log(`Found ${files.length} files to check\n`);
  
  console.log('🔨 Fixing imports...');
  let totalFixes = 0;
  for (const file of files) {
    const fixCount = fixImportsInFile(file);
    totalFixes += fixCount;
  }
  
  console.log(`\n✅ Fixed ${totalFixes} imports across ${fixes.length} files`);
  
  // Step 3: Generate report
  if (fixes.length > 0) {
    const report = fixes.map(fix => 
      `${fix.file}:\n  ${fix.oldImport} → ${fix.newImport}\n  Reason: ${fix.reason}`
    ).join('\n\n');
    
    fs.writeFileSync('IMPORT_FIX_REPORT.md', `# Import Resolution Fix Report\n\n${report}`, 'utf-8');
    console.log('\n📄 Detailed report saved to IMPORT_FIX_REPORT.md');
  }
}

main().catch(console.error);
