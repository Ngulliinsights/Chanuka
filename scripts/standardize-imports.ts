#!/usr/bin/env node

/**
 * Script to standardize import paths across the monorepo
 * Converts relative imports to use consistent alias patterns
 */

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';
import path from 'path';

interface ImportReplacement {
  pattern: RegExp;
  replacement: string;
  description: string;
}

// Define import standardization rules
const clientImportReplacements: ImportReplacement[] = [
  // Fix relative imports to use @client alias
  {
    pattern: /from ['"]\.\.\/\.\.\/App['"]/g,
    replacement: "from '@client/App'",
    description: 'App component imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/types\/([^'"]+)['"]/g,
    replacement: "from '@client/types/$1'",
    description: 'Type imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g,
    replacement: "from '@client/services/$1'",
    description: 'Service imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/components\/([^'"]+)['"]/g,
    replacement: "from '@client/components/$1'",
    description: 'Component imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g,
    replacement: "from '@client/utils/$1'",
    description: 'Utility imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/store\/([^'"]+)['"]/g,
    replacement: "from '@client/store/$1'",
    description: 'Store imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/features\/([^'"]+)['"]/g,
    replacement: "from '@client/features/$1'",
    description: 'Feature imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/core\/([^'"]+)['"]/g,
    replacement: "from '@client/core/$1'",
    description: 'Core imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/data\/([^'"]+)['"]/g,
    replacement: "from '@client/data/$1'",
    description: 'Data imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/config\/([^'"]+)['"]/g,
    replacement: "from '@client/config/$1'",
    description: 'Config imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/test-utils\/([^'"]+)['"]/g,
    replacement: "from '@client/test-utils/$1'",
    description: 'Test utility imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/shared\/([^'"]+)['"]/g,
    replacement: "from '@client/shared/$1'",
    description: 'Client shared imports'
  },
  // Fix three-level relative imports
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/types\/([^'"]+)['"]/g,
    replacement: "from '@client/types/$1'",
    description: 'Deep type imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/services\/([^'"]+)['"]/g,
    replacement: "from '@client/services/$1'",
    description: 'Deep service imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/components\/([^'"]+)['"]/g,
    replacement: "from '@client/components/$1'",
    description: 'Deep component imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/utils\/([^'"]+)['"]/g,
    replacement: "from '@client/utils/$1'",
    description: 'Deep utility imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/\.\.\/store\/([^'"]+)['"]/g,
    replacement: "from '@client/store/$1'",
    description: 'Deep store imports'
  },
  // Fix single-level relative imports within client
  {
    pattern: /from ['"]\.\.\/logger['"]/g,
    replacement: "from '@client/utils/logger'",
    description: 'Logger imports'
  },
  {
    pattern: /from ['"]\.\.\/([^'"\/]+)['"]/g,
    replacement: "from '@client/$1'",
    description: 'Single-level relative imports'
  }
];

const serverImportReplacements: ImportReplacement[] = [
  // Fix relative imports to use @server alias
  {
    pattern: /from ['"]\.\.\/\.\.\/types\/([^'"]+)['"]/g,
    replacement: "from '@server/types/$1'",
    description: 'Type imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/services\/([^'"]+)['"]/g,
    replacement: "from '@server/services/$1'",
    description: 'Service imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g,
    replacement: "from '@server/utils/$1'",
    description: 'Utility imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/core\/([^'"]+)['"]/g,
    replacement: "from '@server/core/$1'",
    description: 'Core imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/features\/([^'"]+)['"]/g,
    replacement: "from '@server/features/$1'",
    description: 'Feature imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/infrastructure\/([^'"]+)['"]/g,
    replacement: "from '@server/infrastructure/$1'",
    description: 'Infrastructure imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g,
    replacement: "from '@server/middleware/$1'",
    description: 'Middleware imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/routes\/([^'"]+)['"]/g,
    replacement: "from '@server/routes/$1'",
    description: 'Route imports'
  }
];

const sharedImportReplacements: ImportReplacement[] = [
  // Fix relative imports within shared module
  {
    pattern: /from ['"]\.\.\/\.\.\/core\/([^'"]+)['"]/g,
    replacement: "from '@shared/core/$1'",
    description: 'Core imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/database\/([^'"]+)['"]/g,
    replacement: "from '@shared/database/$1'",
    description: 'Database imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/schema\/([^'"]+)['"]/g,
    replacement: "from '@shared/schema/$1'",
    description: 'Schema imports'
  },
  {
    pattern: /from ['"]\.\.\/\.\.\/utils\/([^'"]+)['"]/g,
    replacement: "from '@shared/utils/$1'",
    description: 'Utility imports'
  }
];

function standardizeImportsInFile(filePath: string, replacements: ImportReplacement[]): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    let updatedContent = content;
    let hasChanges = false;

    for (const { pattern, replacement, description } of replacements) {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`  Fixing ${description} in ${filePath}`);
        updatedContent = updatedContent.replace(pattern, replacement);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      writeFileSync(filePath, updatedContent, 'utf-8');
      console.log(`✓ Updated ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

async function standardizeImports() {
  console.log('🔧 Standardizing import paths across the monorepo...\n');

  // Process client files
  console.log('📁 Processing client files...');
  const clientFiles = await glob('client/src/**/*.{ts,tsx}', { ignore: ['**/node_modules/**', '**/dist/**'] });
  let clientUpdated = 0;
  
  for (const file of clientFiles) {
    if (standardizeImportsInFile(file, clientImportReplacements)) {
      clientUpdated++;
    }
  }

  // Process server files
  console.log('\n📁 Processing server files...');
  const serverFiles = await glob('server/**/*.{ts,tsx}', { ignore: ['**/node_modules/**', '**/dist/**'] });
  let serverUpdated = 0;
  
  for (const file of serverFiles) {
    if (standardizeImportsInFile(file, serverImportReplacements)) {
      serverUpdated++;
    }
  }

  // Process shared files
  console.log('\n📁 Processing shared files...');
  const sharedFiles = await glob('shared/**/*.{ts,tsx}', { ignore: ['**/node_modules/**', '**/dist/**'] });
  let sharedUpdated = 0;
  
  for (const file of sharedFiles) {
    if (standardizeImportsInFile(file, sharedImportReplacements)) {
      sharedUpdated++;
    }
  }

  console.log('\n✅ Import standardization complete!');
  console.log(`   Client files updated: ${clientUpdated}/${clientFiles.length}`);
  console.log(`   Server files updated: ${serverUpdated}/${serverFiles.length}`);
  console.log(`   Shared files updated: ${sharedUpdated}/${sharedFiles.length}`);
  console.log(`   Total files updated: ${clientUpdated + serverUpdated + sharedUpdated}`);
}

// Run the script
standardizeImports().catch(console.error);