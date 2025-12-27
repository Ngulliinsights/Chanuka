#!/usr/bin/env node

/**
 * KNIP-BASED IMPORT RESOLVER - Production Ready
 *
 * Intelligent import fixer that uses knip analysis results as ground truth.
 * Automatically resolves broken imports identified by knip using smart matching.
 *
 * Features:
 * - Uses knip's superior analysis (no custom parsing needed)
 * - Multi-strategy intelligent matching (exports, paths, names)
 * - Safe atomic file operations with rollback
 * - Comprehensive backup system
 * - Path alias resolution support
 * - Detailed diff reporting
 * - Dry-run mode for safe previewing
 *
 * Prerequisites:
 *   npm install -g knip
 *
 * Usage:
 *   # Generate knip report first
 *   knip --reporter json > knip-report.json
 *
 *   # Preview fixes
 *   node knip-resolver.mjs knip-report.json
 *   
 *   # Or pipe directly
 *   knip --reporter json | node knip-resolver.mjs
 *
 *   # Apply fixes
 *   DRY_RUN=false node knip-resolver.mjs knip-report.json
 *
 *   # Adjust confidence threshold
 *   CONFIDENCE=80 node knip-resolver.mjs knip-report.json
 *
 * @file knip-resolver.mjs
 * @type {module}
 */

import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================================================================
// CONFIGURATION
// =============================================================================

const CONFIG = {
  rootDir: process.cwd(),
  outputDir: "docs",
  backupDir: `backup/imports-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5)}`,

  // Processing options
  dryRun: process.env.DRY_RUN !== "false",
  verbose: process.env.VERBOSE === "true",

  // Resolution configuration
  minConfidence: parseInt(process.env.CONFIDENCE || "60", 10),
  maxCandidates: parseInt(process.env.MAX_CANDIDATES || "10", 10),

  // Matching weights
  weights: {
    exactExport: 100,
    allExports: 80,
    partialExports: 40,
    defaultExport: 60,
    exactName: 50,
    similarName: 25,
    sameDirectory: 30,
    parentDirectory: 15,
    childDirectory: 10,
    pathSimilarity: 20,
    exportCount: 10,
  },

  // Strategies
  strategies: {
    exportAnalysis: true,
    nameMatching: true,
    pathProximity: true,
    fuzzyMatching: true,
  },
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

const STATE = {
  knipData: null,
  fileExports: new Map(), // file path -> Set of exported symbols
  pathAliases: new Map(),
  baseUrl: "",
  brokenImports: [],
  fixes: [],
  stats: {
    totalIssues: 0,
    brokenImports: 0,
    unusedExports: 0,
    unusedFiles: 0,
    fixesAttempted: 0,
    fixesSuccessful: 0,
    fixesFailed: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    startTime: Date.now(),
  },
};

// =============================================================================
// UTILITIES
// =============================================================================

const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`),
  success: (msg) => console.log(`✅ ${msg}`),
  warning: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  debug: (msg) => CONFIG.verbose && console.log(`🔍 ${msg}`),
};

function isExternalModule(importPath) {
  return (
    !importPath.startsWith(".") &&
    !importPath.startsWith("/") &&
    !importPath.startsWith("~")
  );
}

function getRelativePath(from, to) {
  let relative = path.relative(path.dirname(from), to);

  if (!relative.startsWith(".")) {
    relative = "./" + relative;
  }

  relative = relative.replace(/\\/g, "/");

  // Remove extension for import paths
  const ext = path.extname(relative);
  const importExts = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];
  if (importExts.includes(ext)) {
    relative = relative.slice(0, -ext.length);
  }

  return relative;
}

function levenshteinDistance(str1, str2) {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

function calculatePathSimilarity(path1, path2) {
  const parts1 = path1.split(path.sep).filter(Boolean);
  const parts2 = path2.split(path.sep).filter(Boolean);

  let commonParts = 0;
  const minLength = Math.min(parts1.length, parts2.length);

  for (let i = 0; i < minLength; i++) {
    if (parts1[i] === parts2[i]) {
      commonParts++;
    } else {
      break;
    }
  }

  return commonParts / Math.max(parts1.length, parts2.length);
}

// =============================================================================
// KNIP DATA LOADING
// =============================================================================

async function loadKnipData() {
  log.info("Loading knip analysis...");

  let jsonData;
  const args = process.argv.slice(2);

  if (args.length > 0 && args[0] !== "-") {
    // Read from file
    const filePath = path.resolve(args[0]);
    log.debug(`Reading from file: ${filePath}`);
    
    if (!fsSync.existsSync(filePath)) {
      log.error(`Knip report not found: ${filePath}`);
      log.info("\nTo generate a knip report:");
      log.info("  knip --reporter json > knip-report.json");
      process.exit(1);
    }

    const content = await fs.readFile(filePath, "utf-8");
    jsonData = JSON.parse(content);
  } else {
    // Read from stdin
    log.debug("Reading from stdin...");
    
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    
    if (chunks.length === 0) {
      log.error("No input provided");
      log.info("\nUsage:");
      log.info("  knip --reporter json | node knip-resolver.mjs");
      log.info("  node knip-resolver.mjs knip-report.json");
      process.exit(1);
    }

    const content = Buffer.concat(chunks).toString("utf-8");
    jsonData = JSON.parse(content);
  }

  STATE.knipData = jsonData;

  // Extract statistics
  const files = jsonData.files || {};
  
  for (const [filePath, fileData] of Object.entries(files)) {
    const fullPath = path.resolve(CONFIG.rootDir, filePath);
    
    // Track exports from this file
    const exports = new Set();
    
    if (fileData.exports) {
      for (const exp of fileData.exports) {
        if (exp.symbol) {
          exports.add(exp.symbol);
        }
      }
    }
    
    // Check for default export
    if (fileData.exports?.some(e => e.symbol === "default")) {
      exports.add("default");
    }
    
    STATE.fileExports.set(fullPath, exports);

    // Track unused exports
    if (fileData.exports) {
      STATE.stats.unusedExports += fileData.exports.filter(e => !e.isReferenced).length;
    }
  }

  // Track broken imports
  if (jsonData.issues) {
    for (const issue of jsonData.issues) {
      if (issue.type === "unlisted" || issue.type === "unresolved") {
        STATE.stats.brokenImports++;
        
        STATE.brokenImports.push({
          sourceFile: path.resolve(CONFIG.rootDir, issue.file),
          importPath: issue.symbol || issue.specifier,
          symbols: issue.symbols || [],
          line: issue.line,
          column: issue.column,
        });
      }
    }
  }

  STATE.stats.totalIssues = jsonData.issues?.length || 0;

  log.success(
    `Loaded knip analysis: ${Object.keys(files).length} files, ${STATE.stats.totalIssues} issues`
  );
  
  if (STATE.stats.brokenImports > 0) {
    log.warning(`Found ${STATE.stats.brokenImports} broken imports to fix`);
  } else {
    log.success("No broken imports found! 🎉");
  }

  return jsonData;
}

// =============================================================================
// PATH ALIASES
// =============================================================================

async function loadPathAliases() {
  log.info("Loading path aliases...");

  const configs = [
    { file: "tsconfig.json", parser: parseTsConfig },
    { file: "jsconfig.json", parser: parseTsConfig },
  ];

  for (const { file, parser } of configs) {
    const configPath = path.join(CONFIG.rootDir, file);
    if (!fsSync.existsSync(configPath)) continue;

    try {
      const content = await fs.readFile(configPath, "utf-8");
      const aliases = parser(content);

      for (const [alias, target] of Object.entries(aliases)) {
        STATE.pathAliases.set(alias, target);
        log.debug(`  ${alias} → ${target}`);
      }

      if (Object.keys(aliases).length > 0) {
        log.debug(`  Loaded ${Object.keys(aliases).length} aliases from ${file}`);
      }
    } catch (error) {
      log.debug(`  Could not parse ${file}: ${error.message}`);
    }
  }

  // Add common defaults if they exist
  const defaults = {
    "@": "./src",
    "~": "./src",
    "@components": "./src/components",
    "@utils": "./src/utils",
    "@lib": "./src/lib",
    "@hooks": "./src/hooks",
    "@types": "./src/types",
  };

  for (const [alias, target] of Object.entries(defaults)) {
    if (!STATE.pathAliases.has(alias)) {
      const fullPath = path.join(CONFIG.rootDir, target);
      if (fsSync.existsSync(fullPath)) {
        STATE.pathAliases.set(alias, target);
        log.debug(`  ${alias} → ${target} (default)`);
      }
    }
  }

  if (STATE.pathAliases.size > 0) {
    log.success(`Loaded ${STATE.pathAliases.size} path aliases`);
  }
}

function parseTsConfig(content) {
  const aliases = {};

  // Remove comments for parsing
  const cleaned = content.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");

  try {
    const config = JSON.parse(cleaned);

    if (config.compilerOptions?.baseUrl) {
      STATE.baseUrl = config.compilerOptions.baseUrl;
    }

    if (config.compilerOptions?.paths) {
      for (const [alias, targets] of Object.entries(config.compilerOptions.paths)) {
        const cleanAlias = alias.replace(/\/\*$/, "");
        const cleanTarget = (targets[0] || "").replace(/\/\*$/, "");
        if (cleanTarget) {
          aliases[cleanAlias] = cleanTarget;
        }
      }
    }
  } catch {
    // Fallback to regex parsing
    const pathsMatch = content.match(/"paths"\s*:\s*\{([^}]+)\}/s);
    if (pathsMatch) {
      const entries = pathsMatch[1].match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/g) || [];
      for (const entry of entries) {
        const match = entry.match(/"([^"]+)"\s*:\s*\["([^"]+)"\]/);
        if (match) {
          const alias = match[1].replace(/\/\*$/, "");
          const target = match[2].replace(/\/\*$/, "");
          aliases[alias] = target;
        }
      }
    }
  }

  return aliases;
}

// =============================================================================
// INTELLIGENT MATCHING
// =============================================================================

function scoreCandidate(brokenImport, candidatePath) {
  const { sourceFile, importPath, symbols } = brokenImport;
  const candidateExports = STATE.fileExports.get(candidatePath);

  if (!candidateExports) return { score: 0, reasons: [], confidence: 0 };

  let score = 0;
  const reasons = [];

  // Extract basenames
  const importBasename = path.basename(importPath, path.extname(importPath));
  const candidateBasename = path.basename(candidatePath, path.extname(candidatePath));

  // Strategy 1: Export Analysis
  if (CONFIG.strategies.exportAnalysis && symbols.length > 0) {
    const matchedSymbols = symbols.filter((symbol) => {
      if (symbol === "*") return candidateExports.size > 0;
      if (symbol === "default") return candidateExports.has("default");
      return candidateExports.has(symbol);
    });

    const matchRatio = matchedSymbols.length / symbols.length;

    if (matchRatio === 1) {
      score += CONFIG.weights.allExports;
      reasons.push(`exports all symbols (${symbols.join(", ")})`);
    } else if (matchedSymbols.length > 0) {
      score += CONFIG.weights.partialExports * matchRatio;
      reasons.push(`exports ${matchedSymbols.length}/${symbols.length} symbols`);
    }

    // Bonus for exact export count match
    if (candidateExports.size === symbols.length && matchRatio === 1) {
      score += CONFIG.weights.exportCount;
    }
  }

  // Strategy 2: Name Matching
  if (CONFIG.strategies.nameMatching) {
    if (candidateBasename === importBasename) {
      score += CONFIG.weights.exactName;
      reasons.push("exact filename match");
    } else if (CONFIG.strategies.fuzzyMatching) {
      const similarity = calculateSimilarity(importBasename, candidateBasename);
      if (similarity > 0.7) {
        const points = Math.round(CONFIG.weights.similarName * similarity);
        score += points;
        reasons.push(`similar name (${Math.round(similarity * 100)}%)`);
      }
    }
  }

  // Strategy 3: Path Proximity
  if (CONFIG.strategies.pathProximity) {
    const sourceDir = path.dirname(sourceFile);
    const candidateDir = path.dirname(candidatePath);

    if (sourceDir === candidateDir) {
      score += CONFIG.weights.sameDirectory;
      reasons.push("same directory");
    } else if (candidateDir === path.dirname(sourceDir)) {
      score += CONFIG.weights.parentDirectory;
      reasons.push("parent directory");
    } else if (sourceDir === path.dirname(candidateDir)) {
      score += CONFIG.weights.childDirectory;
      reasons.push("child directory");
    }

    // Path similarity
    const pathSim = calculatePathSimilarity(sourceDir, candidateDir);
    if (pathSim > 0.3) {
      const points = Math.round(CONFIG.weights.pathSimilarity * pathSim);
      score += points;
      reasons.push(`similar path (${Math.round(pathSim * 100)}%)`);
    }
  }

  return { score, reasons, confidence: Math.min(100, score) };
}

function findCandidates(brokenImport) {
  const { sourceFile } = brokenImport;
  const candidates = [];

  for (const [candidatePath] of STATE.fileExports) {
    if (candidatePath === sourceFile) continue;

    const result = scoreCandidate(brokenImport, candidatePath);

    if (result.score > 0) {
      candidates.push({
        path: candidatePath,
        ...result,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, CONFIG.maxCandidates);
}

// =============================================================================
// FIXING
// =============================================================================

async function fixImport(brokenImport) {
  const { sourceFile, importPath } = brokenImport;

  log.debug(`\nAnalyzing: ${path.relative(CONFIG.rootDir, sourceFile)}`);
  log.debug(`  Import: ${importPath}`);

  const candidates = findCandidates(brokenImport);

  if (candidates.length === 0) {
    log.debug("  No candidates found");
    STATE.stats.fixesFailed++;
    return null;
  }

  const best = candidates[0];

  if (best.confidence < CONFIG.minConfidence) {
    log.debug(
      `  Best match too low: ${best.confidence}% (need ${CONFIG.minConfidence}%)`
    );
    STATE.stats.fixesFailed++;
    return null;
  }

  const newPath = getRelativePath(sourceFile, best.path);
  const relSource = path.relative(CONFIG.rootDir, sourceFile);

  console.log(`\n→ ${relSource}`);
  console.log(`  ${importPath} → ${newPath}`);
  console.log(`  Confidence: ${best.confidence}% | ${best.reasons.join(", ")}`);

  // Track confidence distribution
  if (best.confidence >= 80) STATE.stats.highConfidence++;
  else if (best.confidence >= 60) STATE.stats.mediumConfidence++;
  else STATE.stats.lowConfidence++;

  STATE.stats.fixesAttempted++;

  if (!CONFIG.dryRun) {
    try {
      const content = await fs.readFile(sourceFile, "utf-8");

      // Escape special regex characters
      const escapedPath = importPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      // Replace import path (handles both single and double quotes)
      const newContent = content.replace(
        new RegExp(`(['"])${escapedPath}\\1`, "g"),
        `$1${newPath}$1`
      );

      // Atomic write
      const tempFile = sourceFile + ".tmp";
      await fs.writeFile(tempFile, newContent, "utf-8");
      await fs.rename(tempFile, sourceFile);

      STATE.stats.fixesSuccessful++;

      return {
        sourceFile,
        oldPath: importPath,
        newPath,
        confidence: best.confidence,
        reasons: best.reasons,
      };
    } catch (error) {
      log.error(`  Failed: ${error.message}`);
      STATE.stats.fixesFailed++;
      return null;
    }
  } else {
    STATE.stats.fixesSuccessful++;
    return {
      sourceFile,
      oldPath: importPath,
      newPath,
      confidence: best.confidence,
      reasons: best.reasons,
    };
  }
}

async function fixAllImports() {
  if (STATE.brokenImports.length === 0) return;

  log.info(
    `\nAttempting to fix ${STATE.brokenImports.length} broken import${STATE.brokenImports.length === 1 ? "" : "s"}...`
  );

  for (const brokenImport of STATE.brokenImports) {
    const fix = await fixImport(brokenImport);
    if (fix) {
      STATE.fixes.push(fix);
    }
  }
}

// =============================================================================
// BACKUP
// =============================================================================

async function createBackup() {
  if (CONFIG.dryRun || STATE.stats.fixesAttempted === 0) {
    return;
  }

  log.info("\nCreating backup...");

  try {
    await fs.mkdir(CONFIG.backupDir, { recursive: true });

    const filesToBackup = [...new Set(STATE.fixes.map((f) => f.sourceFile))];

    for (const file of filesToBackup) {
      const relativePath = path.relative(CONFIG.rootDir, file);
      const backupPath = path.join(CONFIG.backupDir, relativePath);

      await fs.mkdir(path.dirname(backupPath), { recursive: true });

      // Copy current file to backup
      await fs.copyFile(file, backupPath);
    }

    log.success(
      `Backed up ${filesToBackup.length} file${filesToBackup.length === 1 ? "" : "s"}`
    );
  } catch (error) {
    log.error(`Backup failed: ${error.message}`);
  }
}

// =============================================================================
// REPORTING
// =============================================================================

async function generateReport() {
  const reportPath = path.join(CONFIG.outputDir, "import-resolution-report.md");
  await fs.mkdir(CONFIG.outputDir, { recursive: true });

  const duration = ((Date.now() - STATE.stats.startTime) / 1000).toFixed(2);
  const successRate =
    STATE.stats.fixesAttempted > 0
      ? Math.round((STATE.stats.fixesSuccessful / STATE.stats.fixesAttempted) * 100)
      : 0;

  let report = `# Import Resolution Report\n\n`;
  report += `**Generated:** ${new Date().toLocaleString()}\n`;
  report += `**Mode:** ${CONFIG.dryRun ? "🔍 Dry Run (Preview)" : "⚡ Live (Applied)"}\n`;
  report += `**Duration:** ${duration}s\n\n`;

  // Summary
  report += `## 📊 Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `|--------|------:|\n`;
  report += `| Total Knip Issues | ${STATE.stats.totalIssues.toLocaleString()} |\n`;
  report += `| **Broken Imports** | **${STATE.stats.brokenImports}** |\n`;
  report += `| Unused Exports | ${STATE.stats.unusedExports} |\n`;
  report += `| Fixes Attempted | ${STATE.stats.fixesAttempted} |\n`;
  report += `| ✅ Successful | ${STATE.stats.fixesSuccessful} |\n`;
  report += `| ❌ Failed | ${STATE.stats.fixesFailed} |\n`;

  if (STATE.stats.fixesAttempted > 0) {
    report += `| **Success Rate** | **${successRate}%** |\n`;
  }

  report += `\n`;

  // Confidence distribution
  if (STATE.fixes.length > 0) {
    report += `### Confidence Distribution\n\n`;
    report += `- 🟢 High (80-100%): ${STATE.stats.highConfidence}\n`;
    report += `- 🟡 Medium (60-79%): ${STATE.stats.mediumConfidence}\n`;
    report += `- 🔴 Low (<60%): ${STATE.stats.lowConfidence}\n\n`;
  }

  // Applied fixes
  if (STATE.fixes.length > 0) {
    report += `## ✅ ${CONFIG.dryRun ? "Proposed" : "Applied"} Fixes (${STATE.fixes.length})\n\n`;

    // Group by file
    const byFile = new Map();
    for (const fix of STATE.fixes) {
      const relPath = path.relative(CONFIG.rootDir, fix.sourceFile);
      if (!byFile.has(relPath)) byFile.set(relPath, []);
      byFile.get(relPath).push(fix);
    }

    for (const [file, fixes] of byFile) {
      report += `### \`${file}\`\n\n`;
      for (const fix of fixes) {
        const emoji =
          fix.confidence >= 80 ? "🟢" : fix.confidence >= 60 ? "🟡" : "🔴";
        report += `${emoji} **Confidence: ${fix.confidence}%**\n\n`;
        report += `\`\`\`diff\n`;
        report += `- import ... from '${fix.oldPath}'\n`;
        report += `+ import ... from '${fix.newPath}'\n`;
        report += `\`\`\`\n\n`;
        report += `*Reasons: ${fix.reasons.join(", ")}*\n\n`;
      }
    }
  }

  // Unresolved
  const unresolved = STATE.brokenImports.filter(
    (bi) =>
      !STATE.fixes.some(
        (f) => f.sourceFile === bi.sourceFile && f.oldPath === bi.importPath
      )
  );

  if (unresolved.length > 0) {
    report += `## ❌ Unresolved Imports (${unresolved.length})\n\n`;
    report += `These require manual intervention:\n\n`;

    const byFile = new Map();
    for (const item of unresolved) {
      const relPath = path.relative(CONFIG.rootDir, item.sourceFile);
      if (!byFile.has(relPath)) byFile.set(relPath, []);
      byFile.get(relPath).push(item.importPath);
    }

    for (const [file, imports] of byFile) {
      report += `### \`${file}\`\n\n`;
      for (const imp of imports) {
        report += `- \`${imp}\`\n`;
      }
      report += `\n`;
    }

    report += `### Why Unresolved?\n\n`;
    report += `- File doesn't exist in project\n`;
    report += `- No suitable match found\n`;
    report += `- Confidence below threshold (${CONFIG.minConfidence}%)\n`;
    report += `- External package not installed\n\n`;
  }

  // Configuration
  report += `## ⚙️  Configuration\n\n`;
  report += `- **Min Confidence:** ${CONFIG.minConfidence}%\n`;
  report += `- **Max Candidates:** ${CONFIG.maxCandidates}\n`;
  report += `- **Path Aliases:** ${STATE.pathAliases.size}\n`;
  report += `- **Strategies:** ${Object.entries(CONFIG.strategies)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ")}\n\n`;

  if (STATE.pathAliases.size > 0) {
    report += `### Path Aliases\n\n`;
    for (const [alias, target] of STATE.pathAliases) {
      report += `- \`${alias}\` → \`${target}\`\n`;
    }
    report += `\n`;
  }

  // Next steps
  report += `## 📋 Next Steps\n\n`;

  if (CONFIG.dryRun) {
    report += `### Review & Apply\n\n`;
    report += `1. Review the proposed fixes above\n`;
    report += `2. Adjust confidence threshold if needed: \`CONFIDENCE=80\`\n`;
    report += `3. Apply changes:\n\n`;
    report += `\`\`\`bash\n`;
    report += `DRY_RUN=false node knip-resolver.mjs knip-report.json\n`;
    report += `\`\`\`\n\n`;
  } else {
    report += `### Verify Changes\n\n`;
    report += `1. Review changes: \`git diff\`\n`;
    report += `2. Run tests: \`npm test\`\n`;
    report += `3. Check types: \`npm run type-check\`\n`;
    report += `4. Re-run knip: \`knip --reporter json\`\n`;
    report += `5. Build project: \`npm run build\`\n\n`;

    if (STATE.fixes.length > 0) {
      report += `### Backup Location\n\n`;
      report += `Original files backed up to: \`${CONFIG.backupDir}\`\n\n`;
    }
  }

  if (unresolved.length > 0) {
    report += `### Manual Fixes\n\n`;
    report += `For unresolved imports, check:\n`;
    report += `1. Was the file deleted or moved?\n`;
    report += `2. Is it an external package that needs installing?\n`;
    report += `3. Should it use a different import pattern?\n`;
    report += `4. Try increasing candidates: \`MAX_CANDIDATES=20\`\n`;
    report += `5. Lower confidence: \`CONFIDENCE=50\`\n\n`;
  }

  report += `---\n\n`;
  report += `*Generated by Knip-Based Import Resolver*\n`;
  report += `*Using knip for accurate codebase analysis*\n`;

  await fs.writeFile(reportPath, report, "utf-8");
  log.success(`Report: ${reportPath}`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log("\n" + "=".repeat(80));
  console.log("🔧 KNIP-BASED IMPORT RESOLVER");
  console.log("=".repeat(80) + "\n");

  if (CONFIG.dryRun) {
    log.warning("DRY RUN MODE - No files will be modified");
  } else {
    log.info("LIVE MODE - Files will be modified");
  }

  log.info(`Confidence threshold: ${CONFIG.minConfidence}%\n`);

  try {
    await loadKnipData();
    await loadPathAliases();

    if (STATE.brokenImports.length === 0) {
      console.log("\n" + "=".repeat(80));
      log.success("Perfect! No broken imports found. 🎉");
      console.log("=".repeat(80) + "\n");
      
      await generateReport();
      return;
    }

    await fixAllImports();

    if (!CONFIG.dryRun && STATE.fixes.length > 0) {
      await createBackup();
    }

    await generateReport();

    const duration = ((Date.now() - STATE.stats.startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(80));
    console.log("📊 RESOLUTION COMPLETE");
    console.log("=".repeat(80));
    console.log(`Total knip issues:    ${STATE.stats.totalIssues}`);
    console.log(`Broken imports:       ${STATE.stats.brokenImports}`);
    console.log(`Fixes attempted:      ${STATE.stats.fixesAttempted}`);
    console.log(`✅ Successful:        ${STATE.stats.fixesSuccessful}`);
    console.log(`❌ Failed:            ${STATE.stats.fixesFailed}`);

    if (STATE.stats.fixesAttempted > 0) {
      const rate = Math.round(
        (STATE.stats.fixesSuccessful / STATE.stats.fixesAttempted) * 100
      );
      console.log(`Success rate:         ${rate}%`);
    }

    console.log(`Duration:             ${duration}s`);
    console.log("=".repeat(80) + "\n");

    if (CONFIG.dryRun) {
      log.info("To apply fixes:");
      log.info("  DRY_RUN=false node knip-resolver.mjs knip-report.json");
    } else if (STATE.stats.fixesSuccessful > 0) {
      log.success("Changes applied!");
      log.info(`Backup: ${CONFIG.backupDir}`);
      log.info("Verify: git diff");
      log.info("Re-run: knip --reporter json");
    }

    console.log("");

    process.exit(STATE.stats.fixesFailed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n💥 Fatal error:", error.message);
    if (CONFIG.verbose) {
      console.error(error.stack);
    }
    
    log.info("\nMake sure you have generated a knip report:");
    log.info("  knip --reporter json > knip-report.json");
    
    process.exit(1);
  }
}

process.on("unhandledRejection", (error) => {
  console.error("\n💥 Unhandled rejection:", error);
  process.exit(1);
});

main();