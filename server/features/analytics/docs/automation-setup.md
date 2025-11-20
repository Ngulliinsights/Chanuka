# Analytics Code Quality Automation Setup

This document explains how to set up and use the automated code quality checks for the analytics module.

## Pre-commit Hooks Setup

### Installation

1. **Install pre-commit** (if not already installed):
   ```bash
   pip install pre-commit
   ```

2. **Install the hooks** in your local repository:
   ```bash
   pre-commit install
   ```

3. **(Optional) Install commit-msg hooks** for conventional commits:
   ```bash
   pre-commit install --hook-type commit-msg
   ```

### What the Hooks Do

The pre-commit hooks run the following checks automatically:

#### TypeScript Type Check
- Runs `npm run type-check`
- Ensures all TypeScript code compiles without errors
- Fails if there are type errors

#### ESLint
- Runs ESLint on all JavaScript/TypeScript files
- Checks for code style and potential bugs
- Uses the project's ESLint configuration

#### Prettier
- Formats code automatically
- Ensures consistent code formatting
- Modifies files in place (no failures, just formatting)

#### Unit Tests
- Runs unit tests for analytics and related utilities
- Includes cache, database helpers, and controller wrapper tests
- Fails if any tests fail

#### Architecture Boundary Check
- Runs custom script to enforce architectural rules
- Checks for forbidden imports between layers
- Validates no business logic in storage layer
- Detects circular dependencies

#### Test Coverage Check
- Runs tests with coverage analysis
- Fails if coverage drops below thresholds:
  - Statements: 80%
  - Branches: 70%
  - Functions: 80%
  - Lines: 80%

#### Security Checks
- Scans for secrets and sensitive data
- Uses detect-secrets with baseline file

#### Conventional Commits
- Validates commit messages follow conventional format
- Required format: `type(scope): description`

### Running Hooks Manually

To run all hooks manually:
```bash
pre-commit run --all-files
```

To run specific hooks:
```bash
pre-commit run type-check --all-files
pre-commit run eslint --all-files
pre-commit run architecture-check --all-files
```

### Bypassing Hooks (Emergency Only)

In rare emergency situations, you can bypass hooks:
```bash
git commit --no-verify -m "Emergency fix: brief description"
```

**⚠️ Warning:** Only use `--no-verify` in true emergencies. All checks must be run before merging.

## CI Pipeline Setup

### GitHub Actions

The analytics module includes a dedicated CI pipeline in `.github/workflows/analytics-ci.yml`.

#### Pipeline Stages

1. **Test Stage**
   - Runs on Ubuntu with PostgreSQL and Redis services
   - Executes type checking, linting, and architecture checks
   - Runs analytics and related utility tests
   - Generates and uploads coverage reports
   - Enforces coverage thresholds

2. **Security Stage**
   - Runs Trivy vulnerability scanner
   - Scans analytics module for security issues
   - Uploads results to GitHub Security tab

3. **Complexity Stage**
   - Analyzes code complexity using complexity-report
   - Fails if any file has complexity > 50
   - Uploads complexity report as artifact

4. **Deployment Stages**
   - Deploys to staging on `develop` branch pushes
   - Deploys to production on `main` branch pushes

#### Trigger Conditions

The pipeline runs on:
- Pushes to `main` or `develop` branches affecting analytics files
- Pull requests to `main` or `develop` branches affecting analytics files

### Local CI Simulation

To simulate the CI pipeline locally:

```bash
# Run all checks
npm run type-check
npm run lint
node scripts/check-architecture.js
npm test -- --testPathPattern=analytics --coverage

# Check complexity (requires global install)
npx complexity-report server/features/analytics/**/*.ts
```

## Architecture Boundary Checks

### What Gets Checked

The `scripts/check-architecture.js` script enforces these rules:

#### Layer Separation
- **Controllers** cannot import from `storage/`
- **Services** cannot import Express or HTTP modules
- **Storage** cannot contain business logic keywords

#### Import Restrictions
```javascript
// ❌ Forbidden: Controller importing storage
import { ProgressStorage } from '../storage';

// ❌ Forbidden: Service importing Express
import express from 'express';

// ❌ Forbidden: Storage with business logic
function calculateEngagementScore() { /* ... */ }
```

#### Content Restrictions
Storage files cannot contain:
- `calculate`, `compute`, `analyze`, `process`
- `transform`, `validate`, `authorize`

#### Circular Dependencies
Detects and prevents circular import chains between files.

#### Test Coverage
Ensures test files exist for:
- All controllers
- All services
- All storage classes
- All utilities

#### Logging Standards
Prevents use of `console.log`, `console.error`, etc. in favor of the logger.

### Fixing Architecture Violations

#### Controller Importing Storage
**Problem:**
```typescript
// controllers/engagement.controller.ts
import { ProgressStorage } from '../storage';
```

**Solution:**
```typescript
// controllers/engagement.controller.ts
// Remove direct storage import

// services/engagement.service.ts
import { ProgressStorage } from '../storage';

async getEngagementData() {
  return await this.storage.getEngagementData();
}

// controllers/engagement.controller.ts
async getEngagementMetrics() {
  return await engagementService.getEngagementData();
}
```

#### Service Importing Express
**Problem:**
```typescript
// services/engagement.service.ts
import { Request, Response } from 'express';
```

**Solution:**
```typescript
// services/engagement.service.ts
// Remove HTTP imports - services should be HTTP-agnostic

// controllers/engagement.controller.ts
import { Request, Response } from 'express';

async getEngagementMetrics(req: Request, res: Response) {
  const data = await engagementService.getEngagementData();
  res.json(data);
}
```

#### Business Logic in Storage
**Problem:**
```typescript
// storage/progress.storage.ts
async calculateEngagementScore(userId: string) {
  const data = await this.getUserData(userId);
  return data.comments * 2 + data.votes; // Business logic
}
```

**Solution:**
```typescript
// storage/progress.storage.ts
async getUserData(userId: string) {
  // Only data access logic
  return await db.selectFrom('users').where('id', userId).selectAll().executeTakeFirst();
}

// services/engagement.service.ts
calculateEngagementScore(userData: UserData) {
  return userData.comments * 2 + userData.votes; // Business logic here
}
```

## Coverage Thresholds

### Current Thresholds

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| Statements | 80% | Core business logic coverage |
| Branches | 70% | Conditional logic coverage |
| Functions | 80% | API surface coverage |
| Lines | 80% | Code execution coverage |

### Increasing Coverage

To increase coverage for failing tests:

1. **Add missing test cases:**
   ```typescript
   describe('Edge Cases', () => {
     it('should handle empty data', async () => {
       mockStorage.getData.mockResolvedValue([]);
       const result = await service.getData();
       expect(result).toEqual([]);
     });
   });
   ```

2. **Test error paths:**
   ```typescript
   it('should handle database errors', async () => {
     mockStorage.getData.mockRejectedValue(new Error('DB Error'));
     await expect(service.getData()).rejects.toThrow('DB Error');
   });
   ```

3. **Test conditional branches:**
   ```typescript
   it('should handle null values', () => {
     const result = service.processData(null);
     expect(result).toBeNull();
   });
   ```

### Coverage Exclusions

Some code may be legitimately excluded from coverage:

```typescript
/* istanbul ignore next */
if (process.env.NODE_ENV === 'development') {
  // Development-only code
}
```

## Complexity Monitoring

### What Gets Measured

Code complexity is measured using cyclomatic complexity:
- Based on number of paths through code
- Calculated from control flow statements
- Higher numbers indicate more complex code

### Thresholds

- **Warning**: Complexity > 20
- **Error**: Complexity > 50
- **Refactor**: Complexity > 30

### Reducing Complexity

#### Extract Methods
**Before:**
```typescript
async getEngagementMetrics(timeframe: string) {
  let data;
  if (timeframe === '7d') {
    data = await this.getLast7DaysData();
  } else if (timeframe === '30d') {
    data = await this.getLast30DaysData();
  } else {
    data = await this.getAllData();
  }

  const processed = data.map(item => ({
    id: item.id,
    score: item.comments * 2 + item.votes,
    category: this.categorizeScore(item.comments * 2 + item.votes)
  }));

  return processed.sort((a, b) => b.score - a.score);
}
```

**After:**
```typescript
async getEngagementMetrics(timeframe: string) {
  const data = await this.getDataForTimeframe(timeframe);
  const processed = this.processEngagementData(data);
  return this.sortByScore(processed);
}

private async getDataForTimeframe(timeframe: string) {
  switch (timeframe) {
    case '7d': return this.getLast7DaysData();
    case '30d': return this.getLast30DaysData();
    default: return this.getAllData();
  }
}

private processEngagementData(data: RawData[]) {
  return data.map(item => ({
    id: item.id,
    score: this.calculateScore(item),
    category: this.categorizeScore(this.calculateScore(item))
  }));
}

private calculateScore(item: RawData) {
  return item.comments * 2 + item.votes;
}

private sortByScore(data: ProcessedData[]) {
  return data.sort((a, b) => b.score - a.score);
}
```

## Troubleshooting Automation

### Pre-commit Hooks Not Running

**Problem:** Hooks don't run on commit

**Solutions:**
```bash
# Re-install hooks
pre-commit install

# Check hook file exists
ls -la .git/hooks/pre-commit

# Run manually
pre-commit run --all-files
```

### CI Pipeline Failing

**Problem:** GitHub Actions failing

**Debug:**
```bash
# Run locally first
npm run type-check
npm run lint
node scripts/check-architecture.js

# Check service availability
docker ps  # For local DB/Redis

# Check environment variables
echo $DATABASE_URL
echo $REDIS_URL
```

### Architecture Check False Positives

**Problem:** Legitimate code flagged as violation

**Solutions:**
- Update `scripts/check-architecture.js` with exceptions
- Add comments explaining legitimate violations
- Move code to appropriate layer

### Coverage Not Meeting Thresholds

**Problem:** Coverage below 80%

**Solutions:**
- Add missing test cases
- Use coverage exclusions for legitimate untested code
- Simplify complex functions to make testing easier

## Maintenance

### Updating Automation

#### Adding New Rules
```javascript
// scripts/check-architecture.js
const RULES = {
  newRule: {
    pattern: /server\/features\/analytics\/.*\.ts$/,
    forbiddenContent: [/newForbiddenPattern/],
    message: 'New rule description'
  }
};
```

#### Updating CI Pipeline
```yaml
# .github/workflows/analytics-ci.yml
- name: New Check
  run: npm run new-check
```

#### Updating Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
- repo: local
  hooks:
    - id: new-check
      name: New Check
      entry: npm run new-check
```

### Monitoring Automation Health

#### Check Hook Effectiveness
```bash
# Test all hooks
pre-commit run --all-files

# Check hook installation
pre-commit --version
ls .git/hooks/
```

#### Monitor CI Performance
- Check GitHub Actions run times
- Review failure patterns
- Update timeouts if needed

#### Review Coverage Trends
```bash
# Generate coverage history
npm run test:coverage -- --testPathPattern=analytics
# Compare with previous runs
```

## Emergency Procedures

### Bypassing Checks

Only use in critical situations:

```bash
# Skip all pre-commit hooks
git commit --no-verify -m "HOTFIX: critical issue"

# Skip CI (not recommended)
# Add [skip ci] to commit message
```

### Restoring Automation

After emergency bypass:

```bash
# Run all checks manually
pre-commit run --all-files

# Fix any issues found
# Commit fixes normally
```

## Best Practices

1. **Run checks early**: Fix issues before they reach CI
2. **Keep hooks updated**: Update pre-commit hooks regularly
3. **Monitor coverage**: Don't let coverage slip below thresholds
4. **Review complexity**: Refactor high-complexity functions
5. **Document exceptions**: Explain any legitimate rule violations
6. **Test automation**: Verify automation works as expected
7. **Update documentation**: Keep this guide current with changes
