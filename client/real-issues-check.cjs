#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 REAL ISSUES CHECK - Finding Actual Problems...\n');

const files = [
  'src/hooks/useComprehensiveLoading.ts',
  'src/contexts/LoadingContext.tsx',
  'src/hooks/useWebSocket.ts',
  'src/hooks/use-auth.tsx',
  'src/contexts/NavigationContext.tsx',
  'src/App.tsx',
  'src/hooks/use-api-with-fallback.ts',
  'src/hooks/use-bills.tsx',
  'src/hooks/use-safe-query.ts',
  'src/hooks/useApiConnection.ts'
];

const realIssues = [];

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    console.log(`🔍 Analyzing: ${filePath}`);
    
    let hasIssues = false;
    
    // Check for missing AbortController cleanup
    const abortControllerMatches = content.match(/new AbortController\(\)/g);
    const abortSignalMatches = content.match(/signal:\s*controller\.signal/g);
    const abortCleanupMatches = content.match(/controller\.abort\(\)/g);
    
    if (abortControllerMatches && abortControllerMatches.length > 0) {
      if (!abortCleanupMatches || abortCleanupMatches.length < abortControllerMatches.length) {
        console.log('  ⚠️  Missing AbortController cleanup');
        hasIssues = true;
        realIssues.push({
          file: filePath,
          issue: 'Missing AbortController cleanup',
          severity: 'MEDIUM'
        });
      }
    }
    
    // Check for fetch without AbortController
    const fetchMatches = content.match(/fetch\(/g);
    if (fetchMatches && fetchMatches.length > 0) {
      if (!abortSignalMatches || abortSignalMatches.length < fetchMatches.length) {
        console.log('  ⚡ Fetch requests without cancellation');
        hasIssues = true;
        realIssues.push({
          file: filePath,
          issue: 'Fetch requests without cancellation',
          severity: 'MEDIUM'
        });
      }
    }
    
    // Check for Promise.all without error handling
    const promiseAllMatches = content.match(/Promise\.all\(/g);
    if (promiseAllMatches) {
      promiseAllMatches.forEach(match => {
        const index = content.indexOf(match);
        const surrounding = content.substring(index, index + 200);
        if (!surrounding.includes('.catch') && !surrounding.includes('try')) {
          console.log('  ⚡ Promise.all without error handling');
          hasIssues = true;
          realIssues.push({
            file: filePath,
            issue: 'Promise.all without error handling',
            severity: 'MEDIUM'
          });
        }
      });
    }
    
    // Check for event listeners without cleanup
    const addEventListenerMatches = content.match(/addEventListener/g);
    const removeEventListenerMatches = content.match(/removeEventListener/g);
    
    if (addEventListenerMatches && addEventListenerMatches.length > 0) {
      if (!removeEventListenerMatches || removeEventListenerMatches.length < addEventListenerMatches.length) {
        console.log('  ⚡ Event listeners without cleanup');
        hasIssues = true;
        realIssues.push({
          file: filePath,
          issue: 'Event listeners without cleanup',
          severity: 'MEDIUM'
        });
      }
    }
    
    // Check for performance issues - Date creation in render
    const dateCreationMatches = content.match(/new Date\(\)/g);
    if (dateCreationMatches && dateCreationMatches.length > 2) {
      console.log('  ⚡ Multiple Date objects created (performance impact)');
      hasIssues = true;
      realIssues.push({
        file: filePath,
        issue: 'Multiple Date objects created',
        severity: 'LOW'
      });
    }
    
    // Check for JSON.parse in render
    const jsonParseMatches = content.match(/JSON\.parse/g);
    if (jsonParseMatches && jsonParseMatches.length > 1) {
      console.log('  ⚡ Multiple JSON.parse calls (performance impact)');
      hasIssues = true;
      realIssues.push({
        file: filePath,
        issue: 'Multiple JSON.parse calls',
        severity: 'LOW'
      });
    }
    
    if (!hasIssues) {
      console.log('  ✅ No significant issues found');
    }
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ Could not analyze: ${error.message}\n`);
  }
});

console.log('📊 REAL ISSUES SUMMARY');
console.log('='.repeat(50));

const mediumIssues = realIssues.filter(i => i.severity === 'MEDIUM');
const lowIssues = realIssues.filter(i => i.severity === 'LOW');

console.log(`Medium Priority Issues: ${mediumIssues.length}`);
console.log(`Low Priority Issues: ${lowIssues.length}`);

if (mediumIssues.length > 0) {
  console.log('\n⚠️  MEDIUM PRIORITY ISSUES:');
  mediumIssues.forEach(issue => {
    console.log(`  - ${issue.file}: ${issue.issue}`);
  });
}

if (lowIssues.length > 0) {
  console.log('\n⚡ LOW PRIORITY ISSUES:');
  lowIssues.forEach(issue => {
    console.log(`  - ${issue.file}: ${issue.issue}`);
  });
}

console.log('\n🎯 RECOMMENDATION:');
if (mediumIssues.length > 3) {
  console.log('⚠️  Consider fixing medium priority issues for better stability');
} else if (mediumIssues.length > 0) {
  console.log('⚡ Few medium issues found - can be addressed in next iteration');
} else {
  console.log('✅ No significant issues requiring immediate attention');
}

process.exit(mediumIssues.length > 3 ? 1 : 0);