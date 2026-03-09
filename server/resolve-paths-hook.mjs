/**
 * Custom ESM resolve hook that handles @server/* and @shared/* path aliases.
 * This runs in the loader worker thread and intercepts module resolution
 * before Node's default resolver sees the bare specifiers.
 */
import { resolve as pathResolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { existsSync, statSync } from 'node:fs';

const thisDir = pathResolve(fileURLToPath(import.meta.url), '..');
const projectRoot = pathResolve(thisDir, '..');

const aliases = {
  '@server': thisDir,
  '@shared': pathResolve(projectRoot, 'shared'),
};

function tryResolveFile(basePath) {
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'];
  for (const ext of extensions) {
    const p = basePath + ext;
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  const indexExts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts'];
  for (const ext of indexExts) {
    const p = pathResolve(basePath, 'index' + ext);
    if (existsSync(p) && statSync(p).isFile()) return p;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  // First, handle bare specifiers (@server/..., @shared/...)
  for (const [alias, target] of Object.entries(aliases)) {
    if (specifier === alias || specifier.startsWith(alias + '/')) {
      const rest = specifier === alias ? '' : specifier.slice(alias.length + 1);
      const absolutePath = rest ? pathResolve(target, rest) : target;
      const resolved = tryResolveFile(absolutePath);
      if (resolved) {
        return nextResolve(pathToFileURL(resolved).href, context);
      }
    }
  }

  // Second, handle the case where tsx already resolved the path prefix but 
  // failed to handle directory imports, passing us a file:// URL that is a directory
  if (specifier.startsWith('file://')) {
    try {
      const filePath = fileURLToPath(specifier);
      if (existsSync(filePath) && !statSync(filePath).isFile()) {
        const resolved = tryResolveFile(filePath);
        if (resolved) {
          return nextResolve(pathToFileURL(resolved).href, context);
        }
      } else if (!existsSync(filePath)) {
         // Maybe missing .ts extension
         const resolved = tryResolveFile(filePath);
         if (resolved) {
           return nextResolve(pathToFileURL(resolved).href, context);
         }
      }
    } catch(e) {}
  }

  return nextResolve(specifier, context);
}
