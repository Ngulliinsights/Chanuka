#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

// Fix display_name to displayName in all UI component files
async function fixDisplayNames() {
  const files = await glob('client/src/components/ui/*.tsx');
  
  for (const file of files) {
    try {
      let content = readFileSync(file, 'utf8');
      
      // Replace all instances of .display_name with .displayName
      const updated = content.replace(/\.display_name/g, '.displayName');
      
      if (updated !== content) {
        writeFileSync(file, updated);
        console.log(`Fixed display_name in ${file}`);
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
}

fixDisplayNames().catch(console.error);