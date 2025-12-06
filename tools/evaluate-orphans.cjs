#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * This script evaluates orphaned files to determine which ones should be
 * integrated back into the codebase, refactored, archived, or deleted.
 * 
 * The scoring system considers multiple factors:
 * - Size (lines of code) indicates complexity and investment
 * - Exports show how reusable the code is
 * - Tests suggest quality and reliability
 * - TODOs indicate incomplete work
 * - Git history reveals if code was intentionally archived
 * - File location hints at importance (core services vs utilities)
 */

// Configuration for easy tuning
const SCORING_WEIGHTS = {
  loc: { high: 5, medium: 3, low: 1, thresholds: { high: 1000, medium: 500 } },
  exports: { high: 5, medium: 3, low: 1, thresholds: { high: 10, medium: 5 } },
  hasTests: 5,
  todoPenalty: -2,
  notArchived: 5,
  fileType: { core: 3, utils: 2, components: 1 }
};

const CATEGORY_THRESHOLDS = {
  integrate: 20,
  refactor: 15,
  keep: 10
};

const MAX_SCORE = 25;

// Helper function to load and validate metadata
function loadMetadata() {
  const root = process.cwd();
  const metaPath = path.join(root, 'tools', 'orphans-metadata.json');

  if (!fs.existsSync(metaPath)) {
    console.error('Error: orphans-metadata.json not found in tools/ directory');
    console.error('Please run the metadata collection script first.');
    process.exit(1);
  }

  try {
    const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    
    if (!data.metadata || !Array.isArray(data.metadata)) {
      throw new Error('Invalid metadata structure: expected { metadata: [...] }');
    }
    
    return data.metadata;
  } catch (error) {
    console.error(`Failed to parse metadata: ${error.message}`);
    process.exit(1);
  }
}

// Score based on lines of code - larger files represent more investment
function scoreLOC(loc) {
  const { high, medium, low, thresholds } = SCORING_WEIGHTS.loc;
  if (loc > thresholds.high) return high;
  if (loc > thresholds.medium) return medium;
  return low;
}

// Score based on exported functions/classes - more exports means more reusable
function scoreExports(exportCount) {
  const { high, medium, low, thresholds } = SCORING_WEIGHTS.exports;
  if (exportCount > thresholds.high) return high;
  if (exportCount > thresholds.medium) return medium;
  return low;
}

// Determine bonus points based on file location in the codebase
function scoreFileType(filePath) {
  const { core, utils, components } = SCORING_WEIGHTS.fileType;
  
  // Core services are most important as they handle business logic
  if (filePath.includes('core/api') || filePath.includes('services')) {
    return core;
  }
  // Utilities are moderately important as they're often shared
  if (filePath.includes('utils')) {
    return utils;
  }
  // Components get a small bonus
  if (filePath.includes('components')) {
    return components;
  }
  return 0;
}

// Main scoring function that combines all factors
function scoreFile(meta) {
  let score = 0;
  const breakdown = {}; // Track how points were awarded for transparency

  // Factor 1: Lines of code
  const locScore = scoreLOC(meta.loc);
  score += locScore;
  breakdown.loc = locScore;

  // Factor 2: Number of exports
  const exportsScore = scoreExports(meta.exports.length);
  score += exportsScore;
  breakdown.exports = exportsScore;

  // Factor 3: Presence of tests (indicates quality)
  if (meta.tests.length > 0) {
    score += SCORING_WEIGHTS.hasTests;
    breakdown.tests = SCORING_WEIGHTS.hasTests;
  }

  // Factor 4: TODOs penalty (suggests incomplete work)
  if (meta.todos.length > 0) {
    score += SCORING_WEIGHTS.todoPenalty;
    breakdown.todos = SCORING_WEIGHTS.todoPenalty;
  }

  // Factor 5: Git history (was this intentionally archived?)
  const wasArchived = meta.gitHistory.some(msg => 
    msg.toLowerCase().includes('archive') && msg.toLowerCase().includes('unused')
  );
  if (!wasArchived) {
    score += SCORING_WEIGHTS.notArchived;
    breakdown.gitHistory = SCORING_WEIGHTS.notArchived;
  }

  // Factor 6: File location importance
  const typeScore = scoreFileType(meta.file);
  score += typeScore;
  breakdown.fileType = typeScore;

  // Cap the score at maximum to keep scale consistent
  const finalScore = Math.min(score, MAX_SCORE);
  
  return { score: finalScore, breakdown };
}

// Determine what action to take based on score
function categorize(score) {
  if (score >= CATEGORY_THRESHOLDS.integrate) return 'Integrate';
  if (score >= CATEGORY_THRESHOLDS.refactor) return 'Refactor & Integrate Later';
  if (score >= CATEGORY_THRESHOLDS.keep) return 'Keep/Archive';
  return 'Delete';
}

// Generate human-readable summary statistics
function generateSummary(evaluations) {
  const categories = evaluations.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + 1;
    return acc;
  }, {});

  return {
    total: evaluations.length,
    categories,
    averageScore: (evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length).toFixed(2)
  };
}

// Main execution
function main() {
  console.log('Starting orphaned files evaluation...\n');
  
  const metadata = loadMetadata();
  console.log(`Loaded ${metadata.length} files for evaluation\n`);

  // Score each file and categorize it
  const evaluations = metadata.map(meta => {
    const { score, breakdown } = scoreFile(meta);
    return {
      ...meta,
      score,
      scoreBreakdown: breakdown,
      category: categorize(score)
    };
  });

  // Sort by score (highest first) to see most valuable files at the top
  evaluations.sort((a, b) => b.score - a.score);

  // Display results
  console.log('=== EVALUATION RESULTS ===\n');
  evaluations.forEach((e, i) => {
    const rank = `${i + 1}.`.padEnd(4);
    const scoreStr = `Score: ${e.score}`.padEnd(12);
    console.log(`${rank} ${scoreStr} [${e.category}] ${e.file}`);
  });

  // Show summary statistics
  const summary = generateSummary(evaluations);
  console.log('\n=== SUMMARY ===');
  console.log(`Total files evaluated: ${summary.total}`);
  console.log(`Average score: ${summary.averageScore}`);
  console.log('\nCategory breakdown:');
  Object.entries(summary.categories).forEach(([category, count]) => {
    const percentage = ((count / summary.total) * 100).toFixed(1);
    console.log(`  ${category}: ${count} files (${percentage}%)`);
  });

  // Save results to file
  const root = process.cwd();
  const outputPath = path.join(root, 'tools', 'orphans-evaluation.json');
  const output = {
    generatedAt: new Date().toISOString(),
    summary,
    evaluations
  };
  
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);
}

main();