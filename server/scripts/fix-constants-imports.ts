/**
 * Fix @shared/constants imports - ErrorDomain and ErrorSeverity are now in @shared/core
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let fixCount = 0;

function processFile(filePath: string): boolean {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    let modified = content;
    
    // Replace @shared/constants with @shared/core for ErrorDomain and ErrorSeverity
    modified = modified.replace(
      /import\s*{\s*([^}]*\b(?:ErrorDomain|ErrorSeverity)\b[^}]*)\s*}\s*from\s*['"]@shared\/constants['"]/g,
      (match, imports) => {
        fixCount++;
        return `import { ${imports} } from '@shared/core'`;
      }
    );
    
    if (modified !== content) {
      fs.writeFileSync(filePath, modified, 'utf-8');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
    return false;
  }
}

function findTypeScriptFiles(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      if (!['node_modules', 'dist', '.git', '.nx'].includes(entry.name)) {
        findTypeScriptFiles(fullPath, files);
      }
    } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      if (!/\.(test|spec|d)\.tsx?$/.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  
  return files;
}

function main() {
  const serverDir = path.join(__dirname, '..');
  const files = findTypeScriptFiles(serverDir);
  
  let filesModified = 0;
  for (const file of files) {
    if (processFile(file)) {
      filesModified++;
    }
  }
  
  console.log(`Files modified: ${filesModified}`);
  console.log(`Total fixes applied: ${fixCount}`);
}

main();
