/**
 * ESM Loader for Path Aliases
 * 
 * This loader resolves @server/* and @shared/* path aliases for Node.js ESM modules
 */

import { readFileSync } from 'fs';
import { resolve as resolvePath, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manually define path mappings to avoid JSON parsing issues
const baseUrl = __dirname;
const pathMap = {
  '@server': baseUrl,
  '@shared': resolvePath(baseUrl, '../shared')
};

export async function resolve(specifier, context, nextResolve) {
  // Check if specifier matches any of our path aliases
  for (const [alias, targetPath] of Object.entries(pathMap)) {
    if (specifier === alias || specifier.startsWith(alias + '/')) {
      const remainder = specifier.slice(alias.length);
      const resolvedPath = targetPath + remainder;
      
      // Try with .ts extension first, then .js
      const extensions = ['.ts', '.js', '.mjs', '/index.ts', '/index.js'];
      
      for (const ext of extensions) {
        try {
          const testPath = resolvedPath + ext;
          const url = pathToFileURL(testPath).href;
          return nextResolve(url, context);
        } catch (e) {
          // Try next extension
        }
      }
      
      // If no extension worked, try the path as-is
      try {
        const url = pathToFileURL(resolvedPath).href;
        return nextResolve(url, context);
      } catch (e) {
        // Fall through to default resolution
      }
    }
  }

  // Default resolution
  return nextResolve(specifier, context);
}
