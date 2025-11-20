#!/usr/bin/env node

/**
 * Migration Helper Script
 * Assists with updating components from Zustand to Redux patterns
 */

const fs = require('fs');
const path = require('path');

const ZUSTAND_TO_REDUX_PATTERNS = [
  // Discussion store patterns
  {
    from: /import\s*{\s*useDiscussionStore[^}]*}\s*from\s*['"][^'"]*discussionSlice['"];?/g,
    to: `import { useAppSelector, useAppDispatch } from '@client/store/hooks';
import { 
  selectDiscussionState, 
  selectThread, 
  selectComment, 
  selectThreadComments,
  loadDiscussionData,
  addCommentAsync,
  voteCommentAsync,
  reportCommentAsync,
  setLoading,
  setError
} from '../store/slices/discussionSlice';`
  },
  
  // User dashboard store patterns
  {
    from: /import\s*{\s*useUserDashboardStore[^}]*}\s*from\s*['"][^'"]*userDashboardSlice['"];?/g,
    to: `import { useAppSelector, useAppDispatch } from '@client/store/hooks';
import { 
  selectUserDashboardState,
  selectDashboardData,
  selectFilteredEngagementHistory,
  selectEngagementStats,
  setDashboardData,
  trackBill,
  untrackBill,
  updateBillNotifications,
  dismissRecommendation,
  acceptRecommendation,
  refreshRecommendations,
  requestDataExport,
  updatePreferences,
  updatePrivacyControls
} from '../store/slices/userDashboardSlice';`
  },

  // Store usage patterns
  {
    from: /const\s*{\s*([^}]+)\s*}\s*=\s*useDiscussionStore\(\);?/g,
    to: (match, p1) => {
      const dispatch = 'const dispatch = useAppDispatch();';
      const selector = 'const discussionState = useAppSelector(selectDiscussionState);';
      const destructure = `const { ${p1} } = discussionState;`;
      return `${dispatch}\n  ${selector}\n  ${destructure}`;
    }
  },

  {
    from: /const\s*{\s*([^}]+)\s*}\s*=\s*useUserDashboardStore\(\);?/g,
    to: (match, p1) => {
      const dispatch = 'const dispatch = useAppDispatch();';
      const selector = 'const dashboardState = useAppSelector(selectUserDashboardState);';
      const destructure = `const { ${p1} } = dashboardState;`;
      return `${dispatch}\n  ${selector}\n  ${destructure}`;
    }
  },

  // Direct store access patterns
  {
    from: /useDiscussionStore\.getState\(\)\.(\w+)\(/g,
    to: 'dispatch($1('
  },

  {
    from: /useUserDashboardStore\.getState\(\)\.(\w+)\(/g,
    to: 'dispatch($1('
  }
];

function updateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    ZUSTAND_TO_REDUX_PATTERNS.forEach(pattern => {
      if (pattern.from.test(content)) {
        content = content.replace(pattern.from, pattern.to);
        modified = true;
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function findFilesToUpdate(dir, extensions = ['.ts', '.tsx']) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

function main() {
  console.log('🔄 Starting Zustand to Redux migration helper...\n');
  
  const srcDir = path.join(__dirname, 'src');
  const filesToCheck = findFilesToUpdate(srcDir);
  
  let updatedCount = 0;
  
  filesToCheck.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // Check if file contains Zustand patterns
    if (content.includes('useDiscussionStore') || content.includes('useUserDashboardStore')) {
      if (updateFile(file)) {
        updatedCount++;
      }
    }
  });
  
  console.log(`\n📊 Migration Summary:`);
  console.log(`   Files checked: ${filesToCheck.length}`);
  console.log(`   Files updated: ${updatedCount}`);
  
  if (updatedCount > 0) {
    console.log(`\n⚠️  Manual review needed:`);
    console.log(`   - Check async action dispatches (add 'await' where needed)`);
    console.log(`   - Verify selector usage matches component needs`);
    console.log(`   - Update any remaining .getState() calls`);
    console.log(`   - Test component functionality`);
  }
  
  console.log(`\n✨ Migration helper completed!`);
}

if (require.main === module) {
  main();
}

module.exports = { updateFile, findFilesToUpdate, ZUSTAND_TO_REDUX_PATTERNS };