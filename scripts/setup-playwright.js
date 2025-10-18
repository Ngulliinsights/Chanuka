#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎭 Setting up Playwright...\n');

try {
  // Install Playwright browsers
  console.log('📦 Installing Playwright browsers...');
  execSync('npx playwright install --with-deps', { stdio: 'inherit' });
  
  // Create test-results directory
  const testResultsDir = path.join(process.cwd(), 'test-results');
  if (!fs.existsSync(testResultsDir)) {
    fs.mkdirSync(testResultsDir, { recursive: true });
    console.log('📁 Created test-results directory');
  }
  
  // Create screenshots directory
  const screenshotsDir = path.join(testResultsDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
    console.log('📁 Created screenshots directory');
  }
  
  // Add to .gitignore if not already there
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const entriesToAdd = [
      'test-results/',
      'playwright-report/',
      'playwright/.cache/'
    ];
    
    let updated = false;
    let newContent = gitignoreContent;
    
    entriesToAdd.forEach(entry => {
      if (!gitignoreContent.includes(entry)) {
        newContent += `\n${entry}`;
        updated = true;
      }
    });
    
    if (updated) {
      fs.writeFileSync(gitignorePath, newContent);
      console.log('📝 Updated .gitignore with Playwright entries');
    }
  }
  
  console.log('\n✅ Playwright setup complete!');
  console.log('\n🚀 Next steps:');
  console.log('1. Run example tests: npm run test:e2e');
  console.log('2. Open test UI: npm run test:e2e:ui');
  console.log('3. Debug tests: npm run test:e2e:debug');
  console.log('4. Check the migration guide: PLAYWRIGHT_MIGRATION_GUIDE.md');
  
} catch (error) {
  console.error('❌ Setup failed:', error.message);
  process.exit(1);
}