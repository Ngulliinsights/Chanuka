#!/usr/bin/env node

/**
 * Automated script to fix Button component variant prop issues
 * Fixes TypeScript errors related to invalid button variants
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.tsx'];

// Valid button variants mapping
const VARIANT_MAPPING = {
  'default': 'primary',
  'solid': 'primary',
  'filled': 'primary',
  'contained': 'primary',
};

/**
 * Get all React component files
 */
function getAllComponentFiles(dir) {
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
 * Fix button variant props in a file
 */
function fixButtonVariants(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix variant="default" to variant="primary"
  const variantRegex = /variant=["']default["']/g;
  if (variantRegex.test(content)) {
    content = content.replace(variantRegex, 'variant="primary"');
    modified = true;
  }

  // Fix other invalid variants
  for (const [invalid, valid] of Object.entries(VARIANT_MAPPING)) {
    const regex = new RegExp(`variant=["']${invalid}["']`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, `variant="${valid}"`);
      modified = true;
    }
  }

  // Remove asChild prop from Button components that don't support it
  const asChildRegex = /(<Button[^>]*)\s+asChild(?:\s*=\s*(?:true|{true}))?([^>]*>)/g;
  content = content.replace(asChildRegex, (match, before, after) => {
    // Check if this is a Radix UI component that supports asChild
    if (before.includes('Trigger') || before.includes('Content') ||
        before.includes('Item') || before.includes('Root')) {
      return match; // Keep asChild for Radix components
    }

    modified = true;
    return before + after;
  });

  // Fix missing required props
  const buttonRegex = /<Button([^>]*?)>/g;
  content = content.replace(buttonRegex, (match, props) => {
    let newProps = props;

    // Add default variant if missing
    if (!props.includes('variant=')) {
      newProps += ' variant="primary"';
      modified = true;
    }

    return `<Button${newProps}>`;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed button variants in: ${path.relative(SRC_DIR, filePath)}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting Button variant fixes...\n');

  const files = getAllComponentFiles(SRC_DIR);
  let fixedCount = 0;

  for (const file of files) {
    try {
      if (fixButtonVariants(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✨ Button variant fixes complete! Fixed ${fixedCount} files.`);
}

if (require.main === module) {
  main();
}

module.exports = { fixButtonVariants };
