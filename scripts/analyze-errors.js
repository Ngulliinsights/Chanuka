const fs = require('fs');
const path = require('path');

// Read the error output file
const content = fs.readFileSync('/tmp/full_errors.txt', 'utf8');

// Extract all error codes
const errorMatches = content.match(/([^:]+):(\d+),(\d+): error TS(\d{4}): (.+)/g) || [];
const errorLines = content.split('\n').filter(line => line.includes('error TS'));

// Parse errors into structured format
const errors = {};
const fileErrors = {};

errorLines.forEach(line => {
  const match = line.match(/([^:]+):(\d+),\d+: error (TS\d{4}):/);
  if (match) {
    const [, file, lineNum, code] = match;
    
    // Count by error code
    if (!errors[code]) {
      errors[code] = 0;
    }
    errors[code]++;
    
    // Count by file
    if (!fileErrors[file]) {
      fileErrors[file] = {};
    }
    if (!fileErrors[file][code]) {
      fileErrors[file][code] = 0;
    }
    fileErrors[file][code]++;
  }
});

// Sort error codes by frequency
const sortedErrors = Object.entries(errors).sort((a, b) => b[1] - a[1]);

console.log('=== TYPESCRIPT ERROR ANALYSIS ===\n');
console.log(`Total Error Count: ${errorLines.length}\n`);

console.log('TOP 5 ERROR CODES:\n');
sortedErrors.slice(0, 5).forEach(([code, count], idx) => {
  console.log(`${idx + 1}. ${code}: ${count} errors`);
});

console.log('\n=== TOP 10 ERROR CODES (All) ===\n');
sortedErrors.slice(0, 10).forEach(([code, count]) => {
  console.log(`${code}: ${count}`);
});

console.log('\n=== TOP FILES BY ERROR COUNT ===\n');
const fileCounts = Object.entries(fileErrors)
  .map(([file, codes]) => ({
    file,
    total: Object.values(codes).reduce((a, b) => a + b, 0),
    codes
  }))
  .sort((a, b) => b.total - a.total)
  .slice(0, 20);

fileCounts.forEach(({ file, total, codes }) => {
  console.log(`${file}: ${total} errors`);
  // Show breakdown by code
  Object.entries(codes)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, count]) => {
      console.log(`  - ${code}: ${count}`);
    });
});
