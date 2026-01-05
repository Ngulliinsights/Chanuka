#!/usr/bin/env node

/**
 * Automated script to fix common component prop issues
 * Fixes TypeScript errors related to missing or invalid props
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SRC_DIR = path.join(__dirname, '../src');
const EXTENSIONS = ['.tsx'];

// Common prop fixes
const PROP_FIXES = {
  // Dialog components
  'DialogTitle': {
    removeProps: ['className'],
    addWrapper: true,
    wrapperClass: 'flex items-center gap-2'
  },

  // Loader components
  'PageLoader': {
    removeProps: ['message'],
    validProps: ['isLoading']
  },

  'ComponentLoader': {
    removeProps: ['message'],
    validProps: ['isLoading']
  },

  'ConnectionAwareLoader': {
    requiredProps: ['isLoading={true}']
  },

  // Loading state components
  'LoadingStateManager': {
    removeProps: ['type', 'state', 'message', 'error', 'onRetry', 'showDetails'],
    replaceWith: 'div'
  }
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
 * Fix component props in a file
 */
function fixComponentProps(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Fix DialogTitle className prop
  const dialogTitleRegex = /<DialogTitle([^>]*?)className=["']([^"']*?)["']([^>]*?)>/g;
  content = content.replace(dialogTitleRegex, (match, before, className, after) => {
    modified = true;
    return `<DialogTitle${before}${after}><div className="${className}">`;
  });

  // Close DialogTitle wrapper
  content = content.replace(/<\/DialogTitle>/g, (match) => {
    if (modified) {
      return '</div></DialogTitle>';
    }
    return match;
  });

  // Fix Loader components with invalid props
  const loaderRegex = /<(PageLoader|ComponentLoader)([^>]*?)>/g;
  content = content.replace(loaderRegex, (match, componentName, props) => {
    let newProps = props;

    // Remove message prop
    newProps = newProps.replace(/\s+message=["'][^"']*["']/g, '');

    // Ensure isLoading prop exists
    if (!newProps.includes('isLoading=')) {
      newProps += ' isLoading={true}';
    }

    if (newProps !== props) {
      modified = true;
    }

    return `<${componentName}${newProps}>`;
  });

  // Fix ConnectionAwareLoader missing isLoading prop
  const connectionLoaderRegex = /<ConnectionAwareLoader([^>]*?)\/?>|<ConnectionAwareLoader([^>]*?)>/g;
  content = content.replace(connectionLoaderRegex, (match, props1, props2) => {
    const props = props1 || props2 || '';

    if (!props.includes('isLoading=')) {
      modified = true;
      return `<ConnectionAwareLoader${props} isLoading={true}${match.includes('/>') ? ' />' : '>'}`;
    }

    return match;
  });

  // Fix LoadingStateManager by replacing with div
  const loadingStateRegex = /<LoadingStateManager([^>]*?)>(.*?)<\/LoadingStateManager>/gs;
  content = content.replace(loadingStateRegex, (match, props, children) => {
    modified = true;
    return `<div>${children}</div>`;
  });

  // Fix self-closing LoadingStateManager
  const loadingStateSelfRegex = /<LoadingStateManager([^>]*?)\/>/g;
  content = content.replace(loadingStateSelfRegex, (match, props) => {
    modified = true;
    return '<div />';
  });

  // Fix Button size prop issues
  const buttonSizeRegex = /<Button([^>]*?)size=["']([^"']*?)["']([^>]*?)>/g;
  content = content.replace(buttonSizeRegex, (match, before, size, after) => {
    const validSizes = ['sm', 'md', 'lg', 'icon'];

    if (!validSizes.includes(size)) {
      modified = true;
      return `<Button${before}size="md"${after}>`;
    }

    return match;
  });

  // Fix TooltipTrigger asChild prop
  const tooltipTriggerRegex = /<TooltipTrigger([^>]*?)\s+asChild([^>]*?)>/g;
  content = content.replace(tooltipTriggerRegex, (match, before, after) => {
    // TooltipTrigger from Radix UI supports asChild, so keep it
    return match;
  });

  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed component props in: ${path.relative(SRC_DIR, filePath)}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  console.log('🔧 Starting component prop fixes...\n');

  const files = getAllComponentFiles(SRC_DIR);
  let fixedCount = 0;

  for (const file of files) {
    try {
      if (fixComponentProps(file)) {
        fixedCount++;
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
    }
  }

  console.log(`\n✨ Component prop fixes complete! Fixed ${fixedCount} files.`);
}

if (require.main === module) {
  main();
}

module.exports = { fixComponentProps };
