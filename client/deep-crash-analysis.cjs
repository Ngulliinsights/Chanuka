#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 DEEP CRASH ANALYSIS - Looking for Subtle Issues...\n');

const crashPatterns = [
  {
    name: 'Stack Overflow Patterns',
    patterns: [
      {
        description: 'Recursive useEffect calls',
        regex: /useEffect\([^}]*useEffect/g,
        severity: 'CRITICAL'
      },
      {
        description: 'Self-referencing dependencies',
        regex: /useCallback\([^}]*\[([^}]*)\1/g,
        severity: 'HIGH'
      },
      {
        description: 'Circular state updates',
        regex: /setState[^}]*setState/g,
        severity: 'CRITICAL'
      }
    ]
  },
  {
    name: 'Memory Explosion Patterns',
    patterns: [
      {
        description: 'Unbounded array growth',
        regex: /\[\.\.\.[^}]*\]/g,
        severity: 'HIGH'
      },
      {
        description: 'Missing cleanup in intervals',
        regex: /setInterval[^}]*(?!clearInterval)/g,
        severity: 'HIGH'
      },
      {
        description: 'Event listener leaks',
        regex: /addEventListener[^}]*(?!removeEventListener)/g,
        severity: 'MEDIUM'
      }
    ]
  },
  {
    name: 'Async Race Conditions',
    patterns: [
      {
        description: 'Unguarded async state updates',
        regex: /await[^}]*setState/g,
        severity: 'HIGH'
      },
      {
        description: 'Missing AbortController cleanup',
        regex: /AbortController[^}]*(?!abort)/g,
        severity: 'MEDIUM'
      },
      {
        description: 'Promise.all without error handling',
        regex: /Promise\.all[^}]*(?!catch)/g,
        severity: 'MEDIUM'
      }
    ]
  },
  {
    name: 'Resource Exhaustion',
    patterns: [
      {
        description: 'Infinite retry loops',
        regex: /retry[^}]*retry/g,
        severity: 'CRITICAL'
      },
      {
        description: 'Unbounded setTimeout chains',
        regex: /setTimeout[^}]*setTimeout/g,
        severity: 'HIGH'
      },
      {
        description: 'Missing request cancellation',
        regex: /fetch[^}]*(?!signal)/g,
        severity: 'MEDIUM'
      }
    ]
  },
  {
    name: 'Browser Crash Patterns',
    patterns: [
      {
        description: 'DOM manipulation in tight loops',
        regex: /for[^}]*document\./g,
        severity: 'HIGH'
      },
      {
        description: 'Excessive re-renders',
        regex: /useEffect[^}]*\[\]/g,
        severity: 'MEDIUM'
      },
      {
        description: 'Large object creation in render',
        regex: /return[^}]*\{[^}]{200,}\}/g,
        severity: 'MEDIUM'
      }
    ]
  }
];

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

let totalIssues = 0;
let criticalIssues = 0;
let highIssues = 0;
let suspiciousPatterns = [];

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    console.log(`📁 Analyzing: ${filePath}`);
    
    let fileHasIssues = false;
    
    crashPatterns.forEach(category => {
      category.patterns.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
          fileHasIssues = true;
          totalIssues++;
          
          if (pattern.severity === 'CRITICAL') criticalIssues++;
          else if (pattern.severity === 'HIGH') highIssues++;
          
          const icon = pattern.severity === 'CRITICAL' ? '🚨' : 
                      pattern.severity === 'HIGH' ? '⚠️' : '⚡';
          
          console.log(`  ${icon} ${pattern.severity}: ${pattern.description}`);
          console.log(`     Found ${matches.length} occurrence(s)`);
          
          suspiciousPatterns.push({
            file: filePath,
            pattern: pattern.description,
            severity: pattern.severity,
            count: matches.length,
            matches: matches.slice(0, 3) // Show first 3 matches
          });
        }
      });
    });
    
    if (!fileHasIssues) {
      console.log('  ✅ No crash patterns detected');
    }
    console.log('');
    
  } catch (error) {
    console.log(`  ❌ Could not analyze: ${error.message}\n`);
  }
});

// Deep dependency analysis
console.log('🔬 DEEP DEPENDENCY ANALYSIS');
console.log('='.repeat(50));

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    
    // Extract all useEffect, useCallback, useMemo dependencies
    const effectMatches = content.match(/use(Effect|Callback|Memo)\([^}]*\[([^\]]*)\]/g);
    if (effectMatches) {
      console.log(`📁 ${filePath}:`);
      
      effectMatches.forEach(match => {
        const deps = match.match(/\[([^\]]*)\]/);
        if (deps && deps[1]) {
          const depList = deps[1].split(',').map(d => d.trim()).filter(d => d);
          
          // Check for problematic dependencies
          depList.forEach(dep => {
            if (dep.includes('state') || dep.includes('State')) {
              console.log(`  ⚠️  State dependency: ${dep}`);
            }
            if (dep.includes('.current')) {
              console.log(`  ⚡ Ref dependency: ${dep}`);
            }
            if (dep.includes('()')) {
              console.log(`  🚨 Function call in dependency: ${dep}`);
            }
          });
        }
      });
      console.log('');
    }
  } catch (error) {
    // Skip files that can't be read
  }
});

// Memory leak analysis
console.log('💾 MEMORY LEAK ANALYSIS');
console.log('='.repeat(50));

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    
    // Check for cleanup patterns
    const hasCleanup = content.includes('return () =>') || content.includes('useEffect(() => {');
    const hasTimers = content.includes('setTimeout') || content.includes('setInterval');
    const hasListeners = content.includes('addEventListener');
    const hasAbortController = content.includes('AbortController');
    
    if ((hasTimers || hasListeners || hasAbortController) && !hasCleanup) {
      console.log(`⚠️  ${filePath}: Potential memory leak - resources without cleanup`);
    }
    
    // Check for closure issues
    const closureIssues = content.match(/useCallback[^}]*\[[^\]]*state[^\]]*\]/g);
    if (closureIssues) {
      console.log(`🔄 ${filePath}: Potential stale closure - state in useCallback deps`);
    }
    
  } catch (error) {
    // Skip files that can't be read
  }
});

// Performance bottleneck analysis
console.log('⚡ PERFORMANCE BOTTLENECK ANALYSIS');
console.log('='.repeat(50));

files.forEach(filePath => {
  try {
    const content = fs.readFileSync(path.join(__dirname, filePath), 'utf8');
    
    // Check for expensive operations in render
    const expensiveInRender = [
      { pattern: /new Date\(\)/g, desc: 'Date creation in render' },
      { pattern: /JSON\.parse/g, desc: 'JSON parsing in render' },
      { pattern: /\.map\([^}]*\.map/g, desc: 'Nested array operations' },
      { pattern: /Object\.keys[^}]*Object\.keys/g, desc: 'Nested object operations' }
    ];
    
    expensiveInRender.forEach(({ pattern, desc }) => {
      const matches = content.match(pattern);
      if (matches) {
        console.log(`⚠️  ${filePath}: ${desc} (${matches.length} occurrences)`);
      }
    });
    
  } catch (error) {
    // Skip files that can't be read
  }
});

// Summary
console.log('📊 DEEP ANALYSIS SUMMARY');
console.log('='.repeat(50));
console.log(`Total Issues Found: ${totalIssues}`);
console.log(`Critical Issues: ${criticalIssues}`);
console.log(`High Priority Issues: ${highIssues}`);

if (criticalIssues > 0) {
  console.log('\n🚨 CRITICAL ISSUES FOUND:');
  suspiciousPatterns
    .filter(p => p.severity === 'CRITICAL')
    .forEach(pattern => {
      console.log(`  - ${pattern.file}: ${pattern.pattern}`);
      pattern.matches.forEach(match => {
        console.log(`    "${match.substring(0, 100)}..."`);
      });
    });
}

if (highIssues > 0) {
  console.log('\n⚠️  HIGH PRIORITY ISSUES:');
  suspiciousPatterns
    .filter(p => p.severity === 'HIGH')
    .forEach(pattern => {
      console.log(`  - ${pattern.file}: ${pattern.pattern}`);
    });
}

console.log('\n🎯 CRASH RISK ASSESSMENT:');
if (criticalIssues > 0) {
  console.log('🚨 HIGH CRASH RISK - Critical issues found');
} else if (highIssues > 3) {
  console.log('⚠️  MEDIUM CRASH RISK - Multiple high priority issues');
} else if (totalIssues > 5) {
  console.log('⚡ LOW CRASH RISK - Some issues but manageable');
} else {
  console.log('✅ LOW CRASH RISK - Minimal issues detected');
}

process.exit(criticalIssues > 0 ? 2 : highIssues > 3 ? 1 : 0);