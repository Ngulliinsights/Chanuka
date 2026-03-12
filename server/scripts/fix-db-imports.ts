import fs from 'fs';
import path from 'path';
import { logger } from '@server/infrastructure/observability';

// ── Config ────────────────────────────────────────────────────────────────────

const LOG_FILE = path.resolve(process.cwd(), 'server-fresh-errors.txt');

const IMPORT_MAP: Record<string, { name: string; modulePath: string }> = {
  db:       { name: 'db',            modulePath: '@server/infrastructure/database' },
  bills:    { name: 'bills',         modulePath: '@server/infrastructure/schema'   },
  users:    { name: 'users',         modulePath: '@server/infrastructure/schema'   },
  user:     { name: 'users as user', modulePath: '@server/infrastructure/schema'   },
  sponsors: { name: 'sponsors',      modulePath: '@server/infrastructure/schema'   },
};

// ── Parse errors ──────────────────────────────────────────────────────────────

const logContent = fs.readFileSync(LOG_FILE, 'utf-8');
const errorRegex = /^(.+?)\(\d+,\d+\): error TS2304: Cannot find name '([^']+)'\./gm;

const missingByFile = new Map<string, Set<string>>();

for (const [, filePath, name] of logContent.matchAll(errorRegex)) {
  const key = filePath!.trim();
  if (!missingByFile.has(key)) missingByFile.set(key, new Set());
  if (IMPORT_MAP[name!]) missingByFile.get(key)!.add(name!);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns the full `import { ... } from 'module'` line for a given module, or null. */
function findExistingImport(content: string, modulePath: string): string | null {
  const match = content.match(
    new RegExp(`import\\s+\\{[^}]*\\}\\s+from\\s+['"]${escapeRegex(modulePath)}['"]`)
  );
  return match?.[0] ?? null;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** True if the import specifier already contains the binding (handles aliases). */
function hasBinding(importLine: string, bindingName: string): boolean {
  // Extract the { ... } block and tokenise by comma
  const block = importLine.match(/\{([^}]+)\}/)?.[1] ?? '';
  return block.split(',').some(s => {
    const token = s.trim().replace(/\s+as\s+\S+/, ''); // strip alias
    return token === bindingName.split(' as ')[0]!.trim();
  });
}

/** Inject a new specifier at the start of an existing import's brace block. */
function addSpecifier(importLine: string, specifier: string): string {
  return importLine.replace('{', `{ ${specifier},`);
}

/** Insert a new import statement after the last import line in the file. */
function insertImportStatement(content: string, statement: string): string {
  const lastImportEnd = [...content.matchAll(/^import\s.+$/gm)].at(-1);
  if (!lastImportEnd) return `${statement}\n\n${content}`;

  const insertAt = lastImportEnd.index! + lastImportEnd[0].length;
  return `${content.slice(0, insertAt)}\n${statement}${content.slice(insertAt)}`;
}

// ── Main loop ─────────────────────────────────────────────────────────────────

let filesModified = 0;

for (const [relPath, missingNames] of missingByFile) {
  const absPath = path.resolve(process.cwd(), relPath);

  if (!fs.existsSync(absPath)) {
    logger.warn({ component: 'FixDbImports', filePath: absPath }, 'File not found');
    continue;
  }

  let content = fs.readFileSync(absPath, 'utf-8');
  let changed = false;

  // Group pending specifiers by module so we touch each import line once
  const pendingByModule = new Map<string, string[]>();

  for (const missingName of missingNames) {
    const cfg = IMPORT_MAP[missingName]!;
    if (!pendingByModule.has(cfg.modulePath)) pendingByModule.set(cfg.modulePath, []);
    pendingByModule.get(cfg.modulePath)!.push(cfg.name);
  }

  for (const [modulePath, specifiers] of pendingByModule) {
    const existing = findExistingImport(content, modulePath);

    if (existing) {
      let updated = existing;
      for (const spec of specifiers) {
        const localName = spec.split(' as ')[0]!.trim();
        if (!hasBinding(updated, localName)) {
          updated = addSpecifier(updated, spec);
          changed = true;
        }
      }
      if (updated !== existing) content = content.replace(existing, updated);
    } else {
      const statement = `import { ${specifiers.join(', ')} } from '${modulePath}';`;
      content = insertImportStatement(content, statement);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(absPath, content, 'utf-8');
    filesModified++;
    logger.info({ component: 'FixDbImports', fileRelativePath: relPath }, 'Fixed missing imports');
  }
}

logger.info({ component: 'FixDbImports', filesModified }, 'Finished fixing imports');