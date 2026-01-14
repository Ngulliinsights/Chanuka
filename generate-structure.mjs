#!/usr/bin/env node
/**
 * PROJECT STRUCTURE GENERATOR
 *
 * Generates a clean markdown file showing project structure
 * with proper tree formatting and configurable depth.
 */

import fs from 'fs/promises';
import path from 'path';

const CONFIG = {
  rootDir: process.cwd(),
  outputFile: 'docs/project-structure.md',
  maxDepth: 7,
  exclude: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    '.next',
    'out',
    '__tests__',
    'vendor',
    'backup',
    '__pycache__',
    'target',
    '.venv',
    'venv',
    'tmp',
    'temp',
    '.cache'
  ]
};

/**
 * Checks if a path should be excluded
 */
function shouldExclude(itemName, relativePath) {
  return (
    itemName.startsWith('.') ||
    CONFIG.exclude.some(pattern => {
      const segments = relativePath.split(path.sep);
      return segments.includes(pattern);
    })
  );
}

/**
 * Builds the directory tree recursively
 */
async function buildTree(dir, depth = 0, prefix = '') {
  if (depth > CONFIG.maxDepth) return [];

  const entries = [];

  try {
    const items = await fs.readdir(dir, { withFileTypes: true });

    // Sort: directories first, then alphabetically
    items.sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) {
        return a.isDirectory() ? -1 : 1;
      }
      return a.name.localeCompare(b.name, undefined, { numeric: true });
    });

    // Filter excluded items
    const filtered = items.filter(item => {
      const itemPath = path.join(dir, item.name);
      const relativePath = path.relative(CONFIG.rootDir, itemPath);
      return !shouldExclude(item.name, relativePath);
    });

    for (let i = 0; i < filtered.length; i++) {
      const item = filtered[i];
      const itemPath = path.join(dir, item.name);
      const isLast = i === filtered.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = prefix + (isLast ? '    ' : '│   ');

      if (item.isDirectory()) {
        entries.push(`${prefix}${connector}${item.name}/`);
        const subEntries = await buildTree(itemPath, depth + 1, childPrefix);
        entries.push(...subEntries);
      } else {
        entries.push(`${prefix}${connector}${item.name}`);
      }
    }
  } catch (err) {
    // Silently skip directories we can't read
  }

  return entries;
}

/**
 * Generates the markdown structure file
 */
async function generateStructure() {
  console.log('📁 Generating project structure...');

  const outputDir = path.dirname(CONFIG.outputFile);
  await fs.mkdir(outputDir, { recursive: true });

  const tree = await buildTree(CONFIG.rootDir);
  const timestamp = new Date().toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const report = [
    '# Project Structure',
    '',
    `**Generated:** ${timestamp}`,
    `**Max Depth:** ${CONFIG.maxDepth} levels`,
    `**Total Items:** ${tree.length.toLocaleString()}`,
    '',
    '```',
    '.',
    ...tree,
    '```',
    '',
    '## Configuration',
    '',
    '### Excluded Patterns',
    '',
    'The following are automatically excluded:',
    '',
    ...CONFIG.exclude.map(ex => `- \`${ex}\``),
    '- Hidden files and directories (starting with \`.`)',
    '',
    '### Settings',
    '',
    `- **Root Directory:** \`${path.basename(CONFIG.rootDir)}/\``,
    `- **Maximum Depth:** ${CONFIG.maxDepth} levels`,
    `- **Output File:** \`${CONFIG.outputFile}\``,
    '',
    '---',
    '',
    '*Generated automatically by Project Structure Generator*'
  ].join('\n');

  await fs.writeFile(CONFIG.outputFile, report, 'utf-8');

  console.log(`✅ Structure saved to: ${CONFIG.outputFile}`);
  console.log(`📊 Items catalogued: ${tree.length.toLocaleString()}`);
  console.log(`🔍 Max depth: ${CONFIG.maxDepth} levels`);
}

// Execute
generateStructure().catch(err => {
  console.error('❌ Error generating structure:', err.message);
  process.exit(1);
});
