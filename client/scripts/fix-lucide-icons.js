#!/usr/bin/env node

/**
 * Automated script to fix missing Lucide React icons
 * Fixes TypeScript errors: TS2305, TS2614 for lucide-react imports
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.ts', '.tsx'];

// Common icon replacements for missing icons
const ICON_REPLACEMENTS = {
  'Info': 'AlertCircle',
  'Globe': 'Search',
  'Scale': 'Shield',
  'HelpCircle': 'AlertCircle',
  'TrendingDown': 'ArrowDown',
  'DollarSign': 'Hash',
  'Smartphone': 'Phone',
  'Filter': 'Search',
  'TestTube': 'Beaker',
  'Save': 'Check',
  'Database': 'Server',
  'Trash': 'Trash2',
  'Image': 'FileImage',
  'PanelLeft': 'Sidebar',
  'Building': 'Home',
  'Circle': 'CircleDot',
  'BookOpen': 'Book',
  'Target': 'Crosshair',
  'MessageSquare': 'MessageCircle',
  'ChevronDown': 'ChevronDown',
  'ChevronUp': 'ChevronUp',
  'ChevronLeft': 'ChevronLeft',
  'ChevronRight': 'ChevronRight',
  'ArrowLeft': 'ArrowLeft',
  'ArrowRight': 'ArrowRight',
  'MapPin': 'Map',
  'Vote': 'ThumbsUp',
  'GitBranch': 'GitBranch',
  'Layers': 'Stack',
  'Cpu': 'Zap',
  'Tag': 'Hash',
  'Layout': 'Grid',
  'Columns': 'Columns',
  'RotateCcw': 'RotateCcw',
  'Palette': 'Paintbrush',
  'Minimize2': 'Minimize',
  'Download': 'Download',
  'Mail': 'Mail',
  'Check': 'Check',
};

// Icons to remove (commonly unused)
const ICONS_TO_REMOVE = [
  'Eye',
  'EyeOff',
  'Bell',
  'Clock',
  'Palette',
  'BookOpen',
];

/**
 * Get all TypeScript files recursively
 */
function getAllTsFiles(dir) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && EXTENSIONS.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

/**
 * Fix Lucide React icon imports in a file
 */
function fixLucideIcons(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Find all lucide-react import statements
  const lucideImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]lucide-react['"];?/g;

  content = content.replace(lucideImportRegex, (match, imports) => {
    const importList = imports.split(',').map(imp => imp.trim());
    const fixedImports = [];
    let hasChanges = false;

    for (const imp of importList) {
      const iconName = imp.trim();

      // Skip if it's already a valid icon or if it's used in the file
      if (ICONS_TO_REMOVE.includes(iconName)) {
        // Check if the icon is actually used in the file
        const isUsed = content.split(match)[1].includes(`<${iconName}`) ||
                       content.split(match)[1].includes(`${iconName}.`);

        if (!isUsed) {
          hasChanges = true;
          continue; // Remove unused icon
        }
      }

      // Replace with alternative icon if available
      if (ICON_REPLACEMENTS[iconName]) {
        fixedImports.push(ICON_REPLACEMENTS[iconName]);
        hasChanges = true;

        // Update usage in the file content
        const iconUsageRegex = new RegExp(`<${iconName}([^>]*)>`, 'g');
        content = content.replace(iconUsageRegex, `<${ICON_REPLACEMENTS[iconName]}$1>`);

        const iconRefRegex = new RegExp(`\\b${iconName}\\b`, 'g');
        content = content.replace(iconRefRegex, ICON_REPLACEMENTS[iconName]);
      } else {
        fixedImports.push(iconName);
      }
    }

    if (hasChanges) {
      modified = true;
      if (fixedImports.length === 0) {
        return ''; // Remove entire import if no icons left
      }
      return match.replace(imports, fixedImports.join(', '));
    }

    return match;
  });

  // Remove empty lucide-react import lines
  content = content.replace(/import\s*{\s*}\s*from\s*['"]lucide-react['"];?\n?/g, '');

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed Lucide icons in: ${path.relative(SRC_DIR, filePath)}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting Lucide React icon fixes...\n');

  const files = getAllTsFiles(SRC_DIR);
  let fixedCount = 0;

  for (const file of files) {
    try {
      if (fixLucideIcons(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✨ Lucide icon fixes complete! Fixed ${fixedCount} files.`);
  console.log('\n📝 Note: Some icons were replaced with alternatives.');
  console.log('   Review the changes and update icon usage as needed.');
}

if (require.main === module) {
  main();
}

module.exports = { fixLucideIcons, ICON_REPLACEMENTS };
