# Placeholder & Template Code Detection Guide

## Overview

This guide focuses on detecting incomplete implementations, placeholder code, and template artifacts that commonly slip into production when building with AI assistance. These issues are particularly important to catch because they represent unfinished work that may appear functional but lacks production readiness.

## Why This Matters

When building with AI:
- AI may generate placeholder implementations
- Template code may not be fully customized
- TODO comments accumulate without tracking
- Mock implementations may not be replaced
- Test data may remain in production code

These issues are operational blindspots that traditional developers catch through experience, but can be systematically detected through automated scanning.

## Detection Categories

### 1. TODO/FIXME Comments

**Risk Level**: Medium to Critical

**What to Look For**:
```typescript
// ❌ CRITICAL
async function processPayment() {
  // TODO: Add error handling
  // FIXME: This doesn't work with international cards
  // HACK: Temporary workaround
  // Coming soon: Retry logic
  // Not implemented yet
}
```

**Why It's Dangerous**:
- Indicates incomplete implementation
- May hide critical missing features
- No tracking or accountability
- Can be forgotten indefinitely

**Automated Detection**:
```bash
npm run audit:codebase:category=incomplete
```

**Manual Check**:
```bash
# Find all TODO comments
grep -r "TODO:" server/ --exclude-dir=node_modules

# Find FIXME comments
grep -r "FIXME:" server/ --exclude-dir=node_modules

# Find placeholder text
grep -r "coming soon\|not implemented\|placeholder" server/ -i
```

### 2. Mock/Stub Implementations

**Risk Level**: CRITICAL

**What to Look For**:
```typescript
// ❌ CRITICAL: Mock in production file
export class PaymentService {
  async processPayment(amount: number) {
    // Mock implementation
    console.log('Processing:', amount);
    return { success: true, id: 'mock-123' };
  }
}

// ❌ CRITICAL: Stub with fake data
async function getRecommendations(userId: string) {
  // Stub until ML model ready
  return [
    { id: 1, title: 'Sample 1' },
    { id: 2, title: 'Sample 2' }
  ];
}
```

**Why It's Dangerous**:
- Appears to work but does nothing
- Can cause data loss or corruption
- Users receive fake/incorrect data
- Business logic not actually executed

**Automated Detection**:
```bash
npm run audit:codebase:category=mock
```

**Manual Check**:
``
`bash
# Find mock implementations
grep -r "mock\|stub\|fake" server/ --include="*.ts" --exclude-dir=node_modules --exclude-dir=__tests__

# Find console.log in production code
grep -r "console\.log" server/ --include="*.ts" --exclude-dir=__tests__

# Find hardcoded test data
grep -r "sample\|test\|dummy\|example" server/ -i --include="*.ts" --exclude-dir=__tests__
```

### 3. Hardcoded Test/Sample Data

**Risk Level**: HIGH

**What to Look For**:
```typescript
// ❌ HIGH: Hardcoded test data
const DEFAULT_USER = {
  email: 'test@example.com',
  name: 'Test User',
  password: 'password123'
};

// ❌ HIGH: Sample data in production
const SAMPLE_BILLS = [
  { id: 'sample-1', title: 'Sample Bill 1' },
  { id: 'sample-2', title: 'Sample Bill 2' }
];

// ❌ HIGH: Example values
const API_KEY = 'your-api-key-here';
const DATABASE_URL = 'postgresql://user:pass@localhost/db';
```

**Why It's Dangerous**:
- Exposes test credentials
- Returns fake data to users
- May bypass security checks
- Indicates incomplete configuration

**Automated Detection**:
```typescript
// In audit-codebase.ts
private checkTestData(file: string, lines: string[]): void {
  const testPatterns = [
    /test@example\.com/i,
    /sample|dummy|example|placeholder/i,
    /password123|admin123/i,
    /your-.*-here/i,
    /localhost:\d+/
  ];

  lines.forEach((line, index) => {
    testPatterns.forEach(pattern => {
      if (pattern.test(line) && !file.includes('test') && !file.includes('spec')) {
        this.addFinding({
          severity: 'high',
          category: 'Incomplete - Test Data',
          title: 'Hardcoded test/sample data',
          description: 'Test or sample data found in production code',
          file,
          line: index + 1,
          code: line.trim(),
          recommendation: 'Replace with proper configuration or remove'
        });
      }
    });
  });
}
```

### 4. Empty/Minimal Implementations

**Risk Level**: MEDIUM to HIGH

**What to Look For**:
```typescript
// ❌ MEDIUM: Empty catch block
try {
  await riskyOperation();
} catch (error) {
  // Empty - error silently swallowed
}

// ❌ HIGH: Minimal implementation
async function validateUser(user: User): Promise<boolean> {
  return true; // Always returns true!
}

// ❌ HIGH: Placeholder return
async function calculateRisk(data: any): Promise<number> {
  return 0; // Placeholder
}

// ❌ MEDIUM: No-op function
function logAuditEvent(event: AuditEvent): void {
  // Not implemented yet
}
```

**Why It's Dangerous**:
- Appears functional but does nothing
- Bypasses critical validation
- Silences errors
- No actual business logic

**Automated Detection**:
```typescript
private checkEmptyImplementations(file: string, lines: string[]): void {
  lines.forEach((line, index) => {
    // Empty catch blocks
    if (line.includes('catch') && index + 2 < lines.length) {
      const catchBlock = lines.slice(index, index + 3).join('\n');
      if (catchBlock.match(/catch.*\{\s*\}/)) {
        this.addFinding({
          severity: 'high',
          category: 'Incomplete - Empty Implementation',
          title: 'Empty catch block',
          description: 'Error is caught but not handled',
          file,
          line: index + 1,
          code: line.trim(),
          recommendation: 'Add proper error handling or logging'
        });
      }
    }

    // Functions that always return true/false/0
    if (line.match(/return\s+(true|false|0|null)\s*;/) && 
        !line.includes('//') && 
        index > 0) {
      const prevLines = lines.slice(Math.max(0, index - 5), index).join('\n');
      if (!prevLines.includes('if') && !prevLines.includes('switch')) {
        this.addFinding({
          severity: 'medium',
          category: 'Incomplete - Minimal Implementation',
          title: 'Function with constant return',
          description: 'Function always returns same value, may be placeholder',
          file,
          line: index + 1,
          code: line.trim(),
          recommendation: 'Verify this is intentional or implement proper logic'
        });
      }
    }
  });
}
```

### 5. Commented Out Code

**Risk Level**: LOW to MEDIUM

**What to Look For**:
```typescript
// ❌ MEDIUM: Large blocks of commented code
// async function oldImplementation() {
//   const data = await fetchData();
//   const processed = processData(data);
//   return processed;
// }

// ❌ LOW: Commented alternatives
function calculateTotal(items: Item[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
  // return items.map(i => i.price).reduce((a, b) => a + b, 0);
  // Alternative implementation above
}
```

**Why It's Problematic**:
- Clutters codebase
- Confuses intent
- May indicate uncertainty
- Should use version control instead

**Automated Detection**:
```typescript
private checkCommentedCode(file: string, lines: string[]): void {
  let commentedLineCount = 0;
  let commentBlockStart = -1;

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Check for commented code patterns
    if (trimmed.startsWith('//') && 
        (trimmed.includes('function') || 
         trimmed.includes('const') || 
         trimmed.includes('await') ||
         trimmed.includes('return'))) {
      
      if (commentBlockStart === -1) {
        commentBlockStart = index;
      }
      commentedLineCount++;
    } else if (commentBlockStart !== -1) {
      // End of comment block
      if (commentedLineCount >= 3) {
        this.addFinding({
          severity: 'low',
          category: 'Code Quality - Commented Code',
          title: 'Large block of commented code',
          description: `${commentedLineCount} lines of commented code found`,
          file,
          line: commentBlockStart + 1,
          code: `${commentedLineCount} lines of commented code`,
          recommendation: 'Remove commented code, use version control instead'
        });
      }
      commentedLineCount = 0;
      commentBlockStart = -1;
    }
  });
}
```

### 6. Generic/Template Names

**Risk Level**: MEDIUM

**What to Look For**:
```typescript
// ❌ MEDIUM: Generic names
class MyService {
  async doSomething(data: any): Promise<any> {
    // Implementation
  }
}

// ❌ MEDIUM: Template names
const thing = getThing();
const stuff = processStuff(thing);
const result = handleResult(stuff);

// ❌ MEDIUM: Placeholder variables
const foo = 123;
const bar = 'test';
const baz = { foo, bar };
```

**Why It's Problematic**:
- Indicates incomplete refactoring
- Reduces code readability
- May hide unclear requirements
- Suggests AI-generated code not reviewed

**Automated Detection**:
```typescript
private checkGenericNames(file: string, lines: string[]): void {
  const genericPatterns = [
    /\b(foo|bar|baz|qux)\b/,
    /\b(thing|stuff|data|item)\b/,
    /\b(doSomething|handleSomething|processSomething)\b/,
    /\bMyClass|MyService|MyComponent\b/,
    /\btemp|tmp\b/
  ];

  lines.forEach((line, index) => {
    // Skip comments and strings
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;

    genericPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        this.addFinding({
          severity: 'low',
          category: 'Code Quality - Generic Names',
          title: 'Generic or template variable name',
          description: 'Variable/function has generic name, may need refactoring',
          file,
          line: index + 1,
          code: line.trim(),
          recommendation: 'Use descriptive, domain-specific names'
        });
      }
    });
  });
}
```

### 7. Incomplete Error Messages

**Risk Level**: MEDIUM

**What to Look For**:
```typescript
// ❌ MEDIUM: Generic error messages
throw new Error('Something went wrong');
throw new Error('Error occurred');
throw new Error('Failed');

// ❌ MEDIUM: Template error messages
throw new Error('TODO: Add proper error message');
throw new Error('[Error message here]');

// ❌ HIGH: No error message
throw new Error();
throw new Error('');
```

**Why It's Problematic**:
- Difficult to debug
- Poor user experience
- Indicates incomplete implementation
- No actionable information

**Automated Detection**:
```typescript
private checkErrorMessages(file: string, lines: string[]): void {
  const genericErrors = [
    /throw new Error\(\s*\)/,
    /throw new Error\(['"]?\s*['"]\)/,
    /throw new Error\(['"]something went wrong['"]\)/i,
    /throw new Error\(['"]error occurred['"]\)/i,
    /throw new Error\(['"]failed['"]\)/i,
    /throw new Error\(['"]TODO:/i,
    /throw new Error\(['"]\[.*\]['"]\)/
  ];

  lines.forEach((line, index) => {
    genericErrors.forEach(pattern => {
      if (pattern.test(line)) {
        this.addFinding({
          severity: 'medium',
          category: 'Code Quality - Error Messages',
          title: 'Generic or missing error message',
          description: 'Error thrown with generic or no message',
          file,
          line: index + 1,
          code: line.trim(),
          recommendation: 'Add specific, actionable error message'
        });
      }
    });
  });
}
```

### 8. Debug/Development Code

**Risk Level**: MEDIUM to HIGH

**What to Look For**:
```typescript
// ❌ HIGH: Debug logging
console.log('DEBUG:', user);
console.log('Testing payment:', paymentData);
debugger;

// ❌ MEDIUM: Development shortcuts
if (process.env.NODE_ENV === 'development') {
  // Bypass authentication
  return true;
}

// ❌ HIGH: Test mode flags
if (TEST_MODE) {
  return mockData;
}
```

**Why It's Dangerous**:
- Exposes sensitive data in logs
- Bypasses security in production
- Performance impact
- Indicates incomplete cleanup

**Automated Detection**:
```typescript
private checkDebugCode(file: string, lines: string[]): void {
  lines.forEach((line, index) => {
    // Console statements in production code
    if (line.includes('console.') && 
        !file.includes('test') && 
        !file.includes('spec') &&
        !line.includes('console.error')) {
      this.addFinding({
        severity: 'medium',
        category: 'Development - Debug Code',
        title: 'Console statement in production code',
        description: 'Console.log or similar found in production code',
        file,
        line: index + 1,
        code: line.trim(),
        recommendation: 'Use proper logging library or remove'
      });
    }

    // Debugger statements
    if (line.includes('debugger')) {
      this.addFinding({
        severity: 'high',
        category: 'Development - Debug Code',
        title: 'Debugger statement',
        description: 'Debugger statement found in code',
        file,
        line: index + 1,
        code: line.trim(),
        recommendation: 'Remove debugger statement'
      });
    }

    // Test mode checks
    if (line.match(/TEST_MODE|DEBUG_MODE|DEV_MODE/)) {
      this.addFinding({
        severity: 'high',
        category: 'Development - Debug Code',
        title: 'Test/debug mode flag',
        description: 'Test or debug mode flag found',
        file,
        line: index + 1,
        code: line.trim(),
        recommendation: 'Remove or properly configure for production'
      });
    }
  });
}
```

## Comprehensive Audit Script

Add these checks to `scripts/audit-codebase.ts`:

```typescript
/**
 * Check for placeholder and incomplete code
 */
private checkPlaceholders(file: string, lines: string[]): void {
  this.checkTodoComments(file, lines);
  this.checkMockImplementations(file, lines);
  this.checkTestData(file, lines);
  this.checkEmptyImplementations(file, lines);
  this.checkCommentedCode(file, lines);
  this.checkGenericNames(file, lines);
  this.checkErrorMessages(file, lines);
  this.checkDebugCode(file, lines);
}

/**
 * Check for TODO/FIXME comments
 */
private checkTodoComments(file: string, lines: string[]): void {
  const todoPatterns = [
    { pattern: /TODO:|FIXME:|HACK:/i, severity: 'medium' as const },
    { pattern: /not implemented|coming soon|placeholder/i, severity: 'high' as const },
    { pattern: /temporary|temp fix|quick fix/i, severity: 'medium' as const }
  ];

  lines.forEach((line, index) => {
    todoPatterns.forEach(({ pattern, severity }) => {
      if (pattern.test(line)) {
        this.addFinding({
          severity,
          category: 'Incomplete - TODO Comment',
          title: 'TODO or incomplete implementation marker',
          description: 'Code contains TODO, FIXME, or incomplete marker',
          file,
          line: index + 1,
          code: line.trim(),
          recommendation: 'Complete implementation or create tracked issue'
        });
      }
    });
  });
}

/**
 * Check for mock implementations
 */
private checkMockImplementations(file: string, lines: string[]): void {
  // Skip test files
  if (file.includes('test') || file.includes('spec') || file.includes('mock')) {
    return;
  }

  lines.forEach((line, index) => {
    // Mock/stub indicators
    if (line.match(/mock|stub|fake/i) && 
        (line.includes('return') || line.includes('class') || line.includes('function'))) {
      this.addFinding({
        severity: 'critical',
        category: 'Incomplete - Mock Implementation',
        title: 'Mock or stub implementation in production code',
        description: 'Mock/stub implementation found outside test files',
        file,
        line: index + 1,
        code: line.trim(),
        recommendation: 'Replace with real implementation'
      });
    }
  });
}
```

## Manual Audit Checklist

Use this checklist when reviewing code:

### Pre-Deployment Checklist

- [ ] No TODO/FIXME comments in critical paths
- [ ] No mock implementations in production code
- [ ] No hardcoded test data or credentials
- [ ] No empty catch blocks or minimal implementations
- [ ] No large blocks of commented code
- [ ] No generic variable names (foo, bar, thing, stuff)
- [ ] All error messages are specific and actionable
- [ ] No console.log or debugger statements
- [ ] No test mode flags or development shortcuts
- [ ] All placeholder text replaced with real content

### Code Review Questions

1. **Completeness**
   - Is this feature fully implemented?
   - Are there any TODOs that should be addressed?
   - Are all edge cases handled?

2. **Production Readiness**
   - Would this work with real data?
   - Are there any mocks that need replacing?
   - Is error handling complete?

3. **Code Quality**
   - Are variable names descriptive?
   - Are error messages helpful?
   - Is debug code removed?

## Automated Detection Commands

```bash
# Run full placeholder audit
npm run audit:codebase:category=incomplete

# Find all TODOs
grep -r "TODO:\|FIXME:\|HACK:" server/ --exclude-dir=node_modules

# Find mock implementations
grep -r "mock\|stub" server/ --include="*.ts" --exclude-dir=__tests__ --exclude-dir=node_modules

# Find test data
grep -r "test@example\|sample\|dummy" server/ --include="*.ts" --exclude-dir=__tests__

# Find console statements
grep -r "console\." server/ --include="*.ts" --exclude-dir=__tests__

# Find debugger statements
grep -r "debugger" server/ --include="*.ts"

# Find generic names
grep -r "\bfoo\b\|\bbar\b\|\bthing\b\|\bstuff\b" server/ --include="*.ts"

# Find empty catch blocks
grep -A2 "catch" server/**/*.ts | grep -B1 "^\s*}\s*$"
```

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
name: Placeholder Detection

on: [push, pull_request]

jobs:
  detect-placeholders:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Check for TODOs
        run: |
          if grep -r "TODO:\|FIXME:" server/ --exclude-dir=node_modules; then
            echo "❌ TODO/FIXME comments found"
            exit 1
          fi
      
      - name: Check for mock implementations
        run: |
          if grep -r "mock\|stub" server/ --include="*.ts" --exclude-dir=__tests__ --exclude-dir=node_modules; then
            echo "❌ Mock implementations found in production code"
            exit 1
          fi
      
      - name: Check for console statements
        run: |
          if grep -r "console\.log\|console\.debug" server/ --include="*.ts" --exclude-dir=__tests__; then
            echo "❌ Console statements found"
            exit 1
          fi
      
      - name: Check for debugger statements
        run: |
          if grep -r "debugger" server/ --include="*.ts"; then
            echo "❌ Debugger statements found"
            exit 1
          fi
      
      - name: Run full audit
        run: npm run audit:codebase:category=incomplete
```

## Pre-Commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Checking for placeholders..."

# Check staged files only
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep "\.ts$" | grep -v "test\|spec")

if [ -n "$STAGED_FILES" ]; then
  # Check for TODOs
  if echo "$STAGED_FILES" | xargs grep -l "TODO:\|FIXME:" 2>/dev/null; then
    echo "❌ TODO/FIXME comments found in staged files"
    echo "Please resolve or create tracked issues"
    exit 1
  fi
  
  # Check for console.log
  if echo "$STAGED_FILES" | xargs grep -l "console\.log\|console\.debug" 2>/dev/null; then
    echo "❌ Console statements found in staged files"
    exit 1
  fi
  
  # Check for debugger
  if echo "$STAGED_FILES" | xargs grep -l "debugger" 2>/dev/null; then
    echo "❌ Debugger statements found in staged files"
    exit 1
  fi
fi

echo "✅ No placeholders detected"
```

## Tracking and Remediation

### Create GitHub Issues for TODOs

```bash
# Script to create issues from TODOs
#!/bin/bash

grep -r "TODO:" server/ --exclude-dir=node_modules | while read -r line; do
  file=$(echo "$line" | cut -d: -f1)
  linenum=$(echo "$line" | cut -d: -f2)
  todo=$(echo "$line" | cut -d: -f3-)
  
  # Create GitHub issue (requires gh CLI)
  gh issue create \
    --title "TODO: $todo" \
    --body "File: $file:$linenum\n\nTODO: $todo" \
    --label "technical-debt,todo"
done
```

### Remediation Priority

1. **Critical** (Fix before deployment)
   - Mock implementations in production code
   - Empty error handling
   - Hardcoded credentials
   - Debugger statements

2. **High** (Fix within sprint)
   - TODO comments in critical paths
   - Test data in production code
   - Missing error messages
   - Test mode flags

3. **Medium** (Fix within month)
   - Console statements
   - Generic variable names
   - Commented code blocks
   - Non-critical TODOs

4. **Low** (Technical debt)
   - Minor naming improvements
   - Code cleanup
   - Documentation TODOs

## Best Practices

### Prevention

1. **Code Review Checklist**
   - Add placeholder detection to PR template
   - Require explanation for any TODOs
   - Block PRs with mock implementations

2. **Development Workflow**
   - Create issues for TODOs immediately
   - Use feature flags instead of test mode
   - Remove debug code before committing

3. **AI Assistance**
   - Review AI-generated code carefully
   - Replace generic names immediately
   - Complete placeholder implementations

4. **Team Standards**
   - Document naming conventions
   - Establish error message standards
   - Define "done" criteria

### Detection

1. **Automated**
   - Run audit script in CI/CD
   - Use pre-commit hooks
   - Schedule regular scans

2. **Manual**
   - Code review focus
   - Sprint retrospectives
   - Quarterly audits

3. **Monitoring**
   - Track TODO count over time
   - Monitor placeholder patterns
   - Measure remediation velocity

## Conclusion

Placeholder and incomplete code detection is crucial when building with AI assistance. These issues represent unfinished work that may appear functional but lacks production readiness.

Key takeaways:
- Automate detection where possible
- Integrate into development workflow
- Track and prioritize remediation
- Establish team standards
- Review AI-generated code carefully

This systematic approach ensures code quality and production readiness, addressing a key operational blindspot when building with AI assistance.

## Resources

- Audit script: `scripts/audit-codebase.ts`
- Audit template: `docs/OPERATIONAL_BLINDSPOT_AUDIT_TEMPLATE.md`
- Tracking template: `docs/AUDIT_TRACKING_TEMPLATE.md`

## Quick Commands

```bash
# Full placeholder audit
npm run audit:codebase:category=incomplete

# Find specific issues
npm run audit:codebase:category=mock
npm run audit:codebase:category=debug

# Generate report
npm run audit:codebase:json > placeholder-report.json
```
