const { execSync } = require('child_process');
const fs = require('fs');

console.log('Running type-check for server module...\n');

try {
  // Run the type check command and capture output
  const output = execSync('npm run type-check:server 2>&1', { 
    cwd: 'C:/Users/Access Granted/Downloads/projects/SimpleTool',
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024 // 50MB buffer
  });

  // Extract all error lines
  const errorLines = output.split('\n').filter(line => line.includes('error TS'));
  
  console.log(`Total error count: ${errorLines.length}\n`);

  // Count error codes
  const errorCodes = {};
  const fileErrors = {};
  
  errorLines.forEach(line => {
    const match = line.match(/([^:]+):(\d+),\d+: error (TS\d{4}):/);
    if (match) {
      const [, file, lineNum, code] = match;
      
      // Count by error code
      errorCodes[code] = (errorCodes[code] || 0) + 1;
      
      // Count by file
      if (!fileErrors[file]) fileErrors[file] = {};
      fileErrors[file][code] = (fileErrors[file][code] || 0) + 1;
    }
  });

  // Sort and display results
  const sortedCodes = Object.entries(errorCodes).sort((a, b) => b[1] - a[1]);
  
  console.log('=== TOP 5 ERROR CODES ===\n');
  sortedCodes.slice(0, 5).forEach(([code, count], idx) => {
    console.log(`${idx + 1}. ${code}: ${count} errors`);
  });

  console.log('\n=== ALL ERROR CODES (Top 15) ===\n');
  sortedCodes.slice(0, 15).forEach(([code, count]) => {
    console.log(`${code}: ${count}`);
  });

  console.log('\n=== TOP FILES BY ERROR COUNT (Top 10) ===\n');
  const fileCounts = Object.entries(fileErrors)
    .map(([file, codes]) => ({
      file,
      total: Object.values(codes).reduce((a, b) => a + b, 0),
      codes
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  fileCounts.forEach(({ file, total, codes }) => {
    console.log(`${file}: ${total} errors`);
    Object.entries(codes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([code, count]) => {
        console.log(`  - ${code}: ${count}`);
      });
  });

} catch (error) {
  console.error('Error running type-check:', error.message);
  process.exit(1);
}
