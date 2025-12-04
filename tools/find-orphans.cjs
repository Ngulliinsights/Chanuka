#!/usr/bin/env node
/*
  tools/find-orphans.cjs
  Heuristic import-graph to find files with zero inbound imports (client/src).
  - Resolves relative imports and tsconfig `paths` mapped to local files.
  - Excludes test files, type defs, and typical demo/script folders (configurable).

  Run: node tools/find-orphans.cjs
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const clientDir = path.join(root, 'client');
const srcDir = path.join(clientDir, 'src');

function readJSONSafe(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return null; }
}

// Load client tsconfig paths if present
const tsconfigPath = path.join(clientDir, 'tsconfig.json');
let pathMappings = {};
let baseUrl = null;
if (fs.existsSync(tsconfigPath)) {
  const cfg = readJSONSafe(tsconfigPath);
  if (cfg && cfg.compilerOptions) {
    baseUrl = cfg.compilerOptions.baseUrl || null;
    pathMappings = cfg.compilerOptions.paths || {};
  }
}

function resolveAlias(spec) {
  // spec like '@client/foo' -> map to client/src/foo or similar
  for (const [alias, targets] of Object.entries(pathMappings)) {
    // alias may contain a wildcard '*'
    if (alias.endsWith('/*')) {
      const prefix = alias.slice(0, -2);
      if (spec === prefix || spec.startsWith(prefix + '/')) {
        const rest = spec === prefix ? '' : spec.slice(prefix.length + 1);
        // take first target
        const t = targets[0]; // e.g. './*' or '../shared/*'
        if (t.endsWith('/*')) {
          const tprefix = t.slice(0, -2);
          const candidate = path.resolve(clientDir, baseUrl || 'src', tprefix, rest);
          return [candidate];
        } else {
          const candidate = path.resolve(clientDir, baseUrl || 'src', t, rest);
          return [candidate];
        }
      }
    } else {
      if (spec === alias) {
        const t = targets[0];
        const candidate = path.resolve(clientDir, baseUrl || 'src', t);
        return [candidate];
      }
    }
  }
  return [];
}

function walk(dir, cb) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, cb);
    else cb(full);
  }
}

// Gather source files
const exts = ['.ts', '.tsx', '.js', '.jsx'];
const files = [];
if (!fs.existsSync(srcDir)) {
  console.error('client/src not found — aborting');
  process.exit(1);
}
walk(srcDir, (f) => {
  if (!exts.includes(path.extname(f))) return;
  if (f.endsWith('.d.ts')) return;
  if (f.includes(`${path.sep}__tests__${path.sep}`)) return;
  if (/\.test\.(ts|tsx|js|jsx)$/.test(f)) return;
  files.push(path.resolve(f));
});

// Build map
const inbound = new Map(files.map(f => [f, 0]));

// regex for imports/exports/require/dynamic import
const importRegex = /(import\s+[^'";]+?from\s+['"]([^'"]+)['"])|(import\(['"]([^'"]+)['"]\))|(require\(['"]([^'"]+)['"]\))|(export\s+\*\s+from\s+['"]([^'"]+)['"])/g;

function resolveSpecifier(spec, file) {
  // handle relative
  const results = [];
  if (!spec) return results;
  if (spec.startsWith('.') || spec.startsWith('/')) {
    const base = path.resolve(path.dirname(file), spec);
    const candidates = [];
    for (const e of exts) candidates.push(base + e);
    for (const e of exts) candidates.push(path.join(base, 'index' + e));
    for (const c of candidates) if (fs.existsSync(c)) results.push(c);
    return results;
  }
  // handle path aliases
  const aliasResolved = resolveAlias(spec);
  for (const a of aliasResolved) {
    const candidates = [];
    // if a is a file or directory
    for (const e of exts) candidates.push(a + e);
    for (const e of exts) candidates.push(path.join(a, 'index' + e));
    for (const c of candidates) if (fs.existsSync(c)) results.push(c);
  }
  return results;
}

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = importRegex.exec(content)) !== null) {
    const spec = m[2] || m[4] || m[6] || m[7];
    if (!spec) continue;
    const resolved = resolveSpecifier(spec, file);
    for (const r of resolved) {
      if (inbound.has(r)) inbound.set(r, inbound.get(r) + 1);
    }
  }
}

// Consider entrypoints as implicitly used
const entryCandidates = [
  path.resolve(srcDir, 'main.tsx'),
  path.resolve(srcDir, 'index.ts'),
  path.resolve(srcDir, 'index.tsx'),
  path.resolve(srcDir, 'App.tsx')
];
for (const e of entryCandidates) if (inbound.has(e)) inbound.set(e, inbound.get(e) + 1);

// Produce orphans (inbound === 0)
const orphans = [];
for (const [f, count] of inbound.entries()) {
  if (count === 0) {
    const rel = path.relative(root, f);
    if (rel.includes('styles') || rel.includes('tokens') || rel.includes('types') || rel.includes('types' + path.sep)) {
      continue;
    }
    orphans.push(rel);
  }
}

console.log('Found', orphans.length, 'orphan candidates (zero inbound imports)');
if (orphans.length > 0) {
  console.log('\n--- Orphan files ---');
  orphans.sort().forEach(f => console.log(f));
}

// Write results to file for later inspection
const outDir = path.join(root, 'tools');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'orphan-report.json');
fs.writeFileSync(out, JSON.stringify({ found: orphans.length, files: orphans }, null, 2));
console.log('\nReport written to', out);
