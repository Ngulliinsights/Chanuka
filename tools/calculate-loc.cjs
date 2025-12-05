#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

/**
 * Lines of Code Analysis Script for Orphaned Files
 * 
 * This script serves as the first step in evaluating orphaned files by measuring
 * their size in lines of code. File size is a useful proxy for complexity and
 * investment - larger files typically represent more developer effort and may
 * contain more valuable logic worth preserving.
 * 
 * The script reads the list of orphaned files, counts lines in each file,
 * and identifies the top 20 largest files for deeper analysis. This focuses
 * our attention on the files that are most substantial and potentially most
 * important to evaluate for reintegration into the codebase.
 */

// Configuration for customizing the analysis behavior
const CONFIG = {
  topFilesCount: 20,
  encoding: 'utf8',
  // Extensions we know contain code worth analyzing
  codeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.vue', '.css', '.scss', '.html'],
  // Patterns for lines we should exclude from meaningful LOC counts
  excludePatterns: {
    emptyLines: /^\s*$/,
    singleLineComments: /^\s*\/\//,
    blockCommentStart: /^\s*\/\*/,
    blockCommentEnd: /\*\/\s*$/
  }
};

/**
 * Loads the orphan report which contains the list of all orphaned files
 * discovered in the previous dependency analysis step. This report is our
 * starting point for understanding which files aren't being used.
 */
function loadOrphanReport() {
  const root = process.cwd();
  const reportPath = path.join(root, 'tools', 'orphan-report.json');

  if (!fs.existsSync(reportPath)) {
    console.error('Error: orphan-report.json not found in tools/ directory');
    console.error('Please run the dependency analysis script first to generate this file.');
    process.exit(1);
  }

  try {
    const report = JSON.parse(fs.readFileSync(reportPath, CONFIG.encoding));
    
    if (!report.files || !Array.isArray(report.files)) {
      throw new Error('Invalid report structure: expected { files: [...] }');
    }
    
    return report;
  } catch (error) {
    console.error(`Failed to parse orphan-report.json: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Counts the total number of lines in a file. While this is a simple metric,
 * it's important to count actual lines rather than just splitting on newlines
 * because different operating systems use different line endings, and files
 * may or may not have a trailing newline.
 */
function countTotalLines(content) {
  // Handle edge case of empty files
  if (!content || content.length === 0) {
    return 0;
  }

  // Split on any newline character (handles \n, \r\n, and \r)
  const lines = content.split(/\r\n|\r|\n/);
  
  // The last element after split might be an empty string if the file
  // ends with a newline, which is common in well-formatted code
  return lines.length;
}

/**
 * Counts lines of code while excluding empty lines and comments. This gives
 * us a more accurate picture of the actual code content rather than just
 * file size. A file with 500 lines might only have 200 lines of actual code
 * if it's heavily commented or has lots of whitespace.
 * 
 * This function tracks whether we're inside a block comment to correctly
 * handle multi-line comment sections, which is important for accurate counting.
 */
function countEffectiveLines(content) {
  if (!content || content.length === 0) {
    return 0;
  }

  const lines = content.split(/\r\n|\r|\n/);
  let effectiveLineCount = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if we're entering or exiting a block comment
    if (trimmed.includes('/*')) {
      inBlockComment = true;
    }
    
    // Skip lines that are inside block comments
    if (inBlockComment) {
      if (trimmed.includes('*/')) {
        inBlockComment = false;
      }
      continue;
    }

    // Skip empty lines and single-line comments
    if (CONFIG.excludePatterns.emptyLines.test(trimmed) || 
        CONFIG.excludePatterns.singleLineComments.test(trimmed)) {
      continue;
    }

    // This line contains actual code, so count it
    effectiveLineCount++;
  }

  return effectiveLineCount;
}

/**
 * Analyzes a single file to gather all LOC-related metrics. We collect both
 * total lines and effective lines because they tell different stories. Total
 * lines indicate overall file size and complexity, while effective lines show
 * the actual amount of code logic present.
 */
function analyzeFile(filePath, rootDir) {
  const fullPath = path.join(rootDir, filePath);
  
  const analysis = {
    file: filePath,
    totalLines: 0,
    effectiveLines: 0,
    fileSize: 0,
    exists: fs.existsSync(fullPath),
    analyzed: false
  };

  if (!analysis.exists) {
    return analysis;
  }

  try {
    const stats = fs.statSync(fullPath);
    analysis.fileSize = stats.size;

    // Only analyze text files, skip binary files
    const ext = path.extname(filePath).toLowerCase();
    if (!CONFIG.codeExtensions.includes(ext)) {
      return analysis;
    }

    const content = fs.readFileSync(fullPath, CONFIG.encoding);
    analysis.totalLines = countTotalLines(content);
    analysis.effectiveLines = countEffectiveLines(content);
    analysis.analyzed = true;

    // Calculate the ratio of effective to total lines, which indicates
    // how dense the code is versus comments and whitespace
    if (analysis.totalLines > 0) {
      analysis.codeRatio = (analysis.effectiveLines / analysis.totalLines * 100).toFixed(1);
    }

  } catch (error) {
    console.error(`  Error analyzing ${filePath}: ${error.message}`);
    analysis.error = error.message;
  }

  return analysis;
}

/**
 * Formats file sizes in human-readable units rather than raw bytes.
 * This makes the output much easier to understand at a glance. Seeing
 * "45.2 KB" is more meaningful than seeing "46285 bytes".
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const units = ['Bytes', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Generates summary statistics about the analysis results. These statistics
 * help you quickly understand patterns in the orphaned files. For instance,
 * if most orphans are small files, that suggests different issues than if
 * most are large, complex files.
 */
function generateSummary(analyses) {
  const validAnalyses = analyses.filter(a => a.analyzed);
  
  const summary = {
    totalFilesProcessed: analyses.length,
    filesAnalyzed: validAnalyses.length,
    filesNotFound: analyses.filter(a => !a.exists).length,
    filesSkipped: analyses.filter(a => a.exists && !a.analyzed).length,
    totalLines: validAnalyses.reduce((sum, a) => sum + a.totalLines, 0),
    totalEffectiveLines: validAnalyses.reduce((sum, a) => sum + a.effectiveLines, 0),
    totalSize: validAnalyses.reduce((sum, a) => sum + a.fileSize, 0),
    averageLines: 0,
    averageEffectiveLines: 0,
    medianLines: 0
  };

  if (validAnalyses.length > 0) {
    summary.averageLines = Math.round(summary.totalLines / validAnalyses.length);
    summary.averageEffectiveLines = Math.round(summary.totalEffectiveLines / validAnalyses.length);
    
    // Calculate median for a better sense of typical file size
    const sortedLines = validAnalyses.map(a => a.totalLines).sort((a, b) => a - b);
    const midIndex = Math.floor(sortedLines.length / 2);
    summary.medianLines = sortedLines.length % 2 === 0
      ? Math.round((sortedLines[midIndex - 1] + sortedLines[midIndex]) / 2)
      : sortedLines[midIndex];
  }

  return summary;
}

/**
 * Main execution function that orchestrates the entire LOC analysis process.
 * This function coordinates loading the orphan list, analyzing each file,
 * identifying the top files by size, and saving the results.
 */
function main() {
  console.log('Starting Lines of Code analysis for orphaned files...\n');

  const root = process.cwd();
  const report = loadOrphanReport();
  const orphans = report.files;

  console.log(`Found ${orphans.length} orphaned files to analyze\n`);

  const analyses = [];
  let processedCount = 0;

  // Analyze each orphaned file to gather LOC metrics
  for (const file of orphans) {
    processedCount++;
    
    // Show progress for long-running analyses
    if (processedCount % 10 === 0 || processedCount === orphans.length) {
      process.stdout.write(`\rProcessing: ${processedCount}/${orphans.length} files`);
    }

    const analysis = analyzeFile(file, root);
    analyses.push(analysis);
  }

  console.log('\n'); // New line after progress indicator

  // Generate summary statistics before filtering for top files
  const summary = generateSummary(analyses);

  // Sort by total lines descending to find the largest files
  // We use total lines rather than effective lines because file size
  // (including comments and whitespace) is still a useful complexity metric
  const sortedBySize = analyses
    .filter(a => a.analyzed)
    .sort((a, b) => b.totalLines - a.totalLines);

  // Extract the top N largest files for focused analysis
  const topFiles = sortedBySize.slice(0, CONFIG.topFilesCount);

  // Display results in a clear, readable format
  console.log(`=== TOP ${CONFIG.topFilesCount} ORPHANED FILES BY LINES OF CODE ===\n`);
  
  topFiles.forEach((item, index) => {
    const rank = `${index + 1}.`.padEnd(4);
    const lines = `${item.totalLines} lines`.padEnd(12);
    const effectiveLines = `(${item.effectiveLines} effective)`.padEnd(20);
    const size = formatFileSize(item.fileSize).padEnd(10);
    const ratio = `[${item.codeRatio}% code]`.padEnd(15);
    
    console.log(`${rank}${lines}${effectiveLines}${size}${ratio}${item.file}`);
  });

  // Display summary statistics to provide context
  console.log('\n=== ANALYSIS SUMMARY ===');
  console.log(`Total files processed: ${summary.totalFilesProcessed}`);
  console.log(`Files successfully analyzed: ${summary.filesAnalyzed}`);
  console.log(`Files not found: ${summary.filesNotFound}`);
  console.log(`Files skipped (non-code): ${summary.filesSkipped}`);
  console.log(`\nTotal lines across all files: ${summary.totalLines.toLocaleString()}`);
  console.log(`Total effective lines: ${summary.totalEffectiveLines.toLocaleString()}`);
  console.log(`Total file size: ${formatFileSize(summary.totalSize)}`);
  console.log(`\nAverage lines per file: ${summary.averageLines}`);
  console.log(`Average effective lines per file: ${summary.averageEffectiveLines}`);
  console.log(`Median lines per file: ${summary.medianLines}`);

  // Save results to file for use by the metadata collection script
  const outputPath = path.join(root, 'tools', 'top-orphans-loc.json');
  const output = {..
    analyzedAt: new Date().toISOString(),
    summary,
    top20: topFiles.map(f => ({
      file: f.file,
      loc: f.totalLines,
      effectiveLoc: f.effectiveLines,
      fileSize: f.fileSize,
      codeRatio: f.codeRatio
    }))
  };

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`\nDetailed results saved to: ${outputPath}`);
  console.log('Ready for metadata collection script.');
}

main();