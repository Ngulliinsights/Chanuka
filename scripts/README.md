# Scripts Directory Documentation

This directory contains permanent tooling scripts for the Chanuka project. All scripts are actively maintained and referenced in `package.json`, `nx.json`, or CI/CD workflows.

**Last Updated**: 2026-02-19  
**Classification Document**: See `CLASSIFICATION.md` for complete script inventory

---

## Table of Contents

1. [Quick Reference](#quick-reference)
2. [Database Operations](#database-operations)
3. [Graph Database Operations](#graph-database-operations)
4. [Quality Assurance](#quality-assurance)
5. [Analysis & Monitoring](#analysis--monitoring)
6. [Build & Deployment](#build--deployment)
7. [Testing Infrastructure](#testing-infrastructure)
8. [Usage Guidelines](#usage-guidelines)

---

## Quick Reference

### Most Common Commands

```bash
# Database
npm run db:init              # Initialize database integration
npm run db:migrate           # Run pending migrations
npm run db:seed              # Seed database with sample data
npm run db:health            # Check database health

# Quality Checks
npm run scan:type-violations # Scan for type safety issues
npm run scan:todos           # Scan for TODO/FIXME comments
npm run quality:check        # Run quality gate checks
npm run track:progress       # Track bug fix progress

# Analysis
npm run analyze:modern       # Run modern project analysis
npm run analyze:bundle       # Analyze bundle size
npm run api:verify-contracts # Verify API contract coverage

# Graph Database
npm run graph:init           # Initialize Neo4j graph database
npm run graph:sync           # Sync data to graph database
```

---

## Database Operations

### Core Database Scripts

Located in `scripts/database/`

#### `initialize-database-integration.ts`

**Purpose**: Initializes and tests the comprehensive database integration system.

**Usage**:
```bash
npm run db:init
# or
tsx scripts/database/initialize-database-integration.ts
```

**What it does**:
- Creates database integration service
- Runs health checks on all database components
- Tests basic database operations (queries, transactions)
- Validates migration status
- Checks connection pool metrics
- Runs database monitoring (if enabled)

**When to run**:
- First-time project setup
- After database configuration changes
- To verify database connectivity
- Before running migrations

**Exit codes**:
- `0`: Success - database integration initialized
- `1`: Failure - check logs for errors

---

#### `migrate.ts`

**Purpose**: Strategic consolidated migration script using Drizzle ORM.

**Usage**:
```bash
# Apply pending migrations
npm run db:migrate

# Validate migrations
npm run db:migrate:validate

# Dry run (preview changes)
npm run db:migrate:dry-run

# Rollback to version (requires --force)
tsx scripts/database/migrate.ts --rollback v1.0.0 --force

# Run migration tests
tsx scripts/database/migrate.ts --test

# Test with performance metrics
tsx scripts/database/migrate.ts --test --performance
```

**Options**:
- `--validate`: Validate all migration files
- `--dry-run`: Show pending migrations without applying
- `--test`: Run comprehensive migration tests
- `--performance`: Include performance testing (with --test)
- `--rollback <version>`: Rollback to specific version
- `--force`: Force rollback without confirmation

**What it does**:
- Runs pending database migrations
- Validates migration files
- Tracks migration history
- Provides rollback capabilities
- Measures migration performance

**When to run**:
- After pulling new code with schema changes
- Before deploying to production
- When database schema is out of sync
- To validate migration integrity

**Exit codes**:
- `0`: Success - migrations applied
- `1`: Failure - migration error

---

#### `reset.ts`

**Purpose**: Reset database to clean state.

**Usage**:
```bash
# Safe reset (with confirmation)
npm run db:reset:safe

# Force reset (no confirmation)
npm run db:reset:force

# Full reset
npm run db:reset
```

**What it does**:
- Drops all tables
- Resets sequences
- Clears all data
- Optionally re-runs migrations

**When to run**:
- Development environment cleanup
- Before running integration tests
- When database is in inconsistent state

**⚠️ WARNING**: Never run in production!

---

#### `health-check.ts`

**Purpose**: Comprehensive database health monitoring.

**Usage**:
```bash
# Single health check
npm run db:health

# Continuous monitoring
npm run db:health:watch
```

**What it checks**:
- Connection pool status
- Query performance
- Replication lag (if applicable)
- Disk space
- Active connections
- Long-running queries

**When to run**:
- Before deployments
- During performance issues
- As part of monitoring setup
- In CI/CD pipelines

---

#### `generate-migration.ts`

**Purpose**: Generate new migration files from schema changes.

**Usage**:
```bash
npm run db:generate
```

**What it does**:
- Compares current schema with database
- Generates migration SQL
- Creates timestamped migration file
- Validates generated migration

**When to run**:
- After modifying Drizzle schema files
- Before committing schema changes

---

#### `generate-types-simple.ts`

**Purpose**: Generate TypeScript types from database schema.

**Usage**:
```bash
npm run db:generate-types
```

**What it does**:
- Introspects database schema
- Generates TypeScript interfaces
- Creates type-safe query builders
- Updates type definition files

**When to run**:
- After running migrations
- When types are out of sync with database
- As part of build process

---

### Database Validation Scripts

#### `verify-schema-type-alignment.ts` / `verify-schema-type-alignment-v2.ts`

**Purpose**: Verify alignment between database schema and TypeScript types.

**Usage**:
```bash
npm run db:verify-schema-alignment
npm run db:verify-alignment
```

**What it checks**:
- Column types match TypeScript types
- Required fields are non-nullable
- Enum values are consistent
- Foreign key relationships

**When to run**:
- After schema changes
- Before production deployments
- In CI/CD pipelines

---

#### `align-enums.ts`

**Purpose**: Align enum definitions between database and TypeScript.

**Usage**:
```bash
npm run db:align-enums
```

**What it does**:
- Finds enum mismatches
- Generates migration to fix enums
- Updates TypeScript enum definitions

**When to run**:
- When enum validation fails
- After adding/removing enum values

---

#### `validate-migration.ts`

**Purpose**: Validate migration files for correctness.

**Usage**:
```bash
npm run db:validate-migration
```

**What it checks**:
- SQL syntax
- Migration file naming
- Up/down migration pairs
- Idempotency

**When to run**:
- Before committing migrations
- In pre-commit hooks
- In CI/CD pipelines

---

#### `migration-verification-framework.ts`

**Purpose**: Comprehensive migration verification framework.

**Usage**:
```bash
npm run db:verify-migration
```

**What it does**:
- Runs migrations in test environment
- Verifies data integrity
- Tests rollback procedures
- Checks performance impact

**When to run**:
- Before production deployments
- For complex migrations
- As part of release process

---

#### `migrate-with-verification.ts`

**Purpose**: Run migrations with automatic verification.

**Usage**:
```bash
npm run db:migrate-verified
```

**What it does**:
- Runs migrations
- Verifies schema alignment
- Checks data integrity
- Rolls back on failure

**When to run**:
- Production deployments
- When extra safety is needed

---

#### `rollback-with-verification.ts`

**Purpose**: Rollback migrations with verification.

**Usage**:
```bash
npm run db:rollback-verified
npm run db:rollback-test
```

**What it does**:
- Rolls back migrations
- Verifies database state
- Tests rollback in isolated environment

**When to run**:
- After failed migrations
- To test rollback procedures

---

#### `check-schema.ts`

**Purpose**: Check database schema for issues.

**Usage**:
```bash
npm run db:schema:check
```

**What it checks**:
- Missing indexes
- Unused indexes
- Foreign key constraints
- Table statistics

**When to run**:
- Performance optimization
- Schema audits
- Before major releases

---

#### `schema-drift-detection.ts`

**Purpose**: Detect schema drift between environments.

**Usage**:
```bash
npm run db:schema:drift
```

**What it does**:
- Compares schemas across environments
- Identifies differences
- Generates alignment migrations
- Used in CI workflows

**When to run**:
- Before deployments
- In CI/CD pipelines (automated)
- When environments are out of sync

---

## Graph Database Operations

### Neo4j Integration Scripts

Located in `scripts/database/graph/`

#### `initialize-graph.ts`

**Purpose**: Initialize Neo4j graph database with schema and constraints.

**Usage**:
```bash
npm run graph:init
```

**What it does**:
- Creates node labels
- Sets up constraints
- Creates indexes
- Validates connection

**When to run**:
- First-time Neo4j setup
- After graph schema changes

---

#### `sync-demo.ts`

**Purpose**: Sync data from PostgreSQL to Neo4j.

**Usage**:
```bash
npm run graph:sync
```

**What it does**:
- Extracts data from PostgreSQL
- Transforms to graph format
- Loads into Neo4j
- Validates sync integrity

**When to run**:
- After significant data changes
- To refresh graph database
- For demo/testing purposes

---

#### `discover-patterns.ts`

**Purpose**: Discover patterns in graph data.

**Usage**:
```bash
npm run graph:discover-patterns
```

**What it does**:
- Analyzes graph structure
- Identifies common patterns
- Detects communities
- Generates insights

**When to run**:
- Data analysis
- Research purposes
- Pattern discovery

---

#### `analyze-influence.ts`

**Purpose**: Analyze influence networks in graph data.

**Usage**:
```bash
npm run graph:analyze-influence
```

**What it does**:
- Calculates influence scores
- Identifies key influencers
- Maps influence networks
- Generates reports

**When to run**:
- Social network analysis
- Influence mapping
- Research purposes

---

#### `sync-advanced-relationships.ts`

**Purpose**: Sync advanced relationship data to Neo4j.

**Usage**:
```bash
npm run graph:sync-advanced
```

**What it does**:
- Syncs complex relationships
- Handles multi-hop connections
- Updates relationship properties

**When to run**:
- After relationship schema changes
- For advanced graph features

---

#### `discover-networks.ts`

**Purpose**: Discover network structures in graph data.

**Usage**:
```bash
npm run graph:discover-networks
```

**What it does**:
- Identifies network clusters
- Analyzes network topology
- Detects communities

**When to run**:
- Network analysis
- Community detection

---

#### `sync-networks.ts`

**Purpose**: Sync network data to Neo4j.

**Usage**:
```bash
npm run graph:sync-networks
```

**What it does**:
- Syncs network structures
- Updates network properties
- Maintains network integrity

**When to run**:
- After network data changes
- Regular network updates

---

## Quality Assurance

### Type Safety Scanning

#### `scan-type-violations.ts`

**Purpose**: Scan codebase for type safety violations (`as any`, `as unknown`).

**Usage**:
```bash
npm run scan:type-violations
```

**What it scans**:
- `as any` type assertions
- `as unknown` casts
- Unsafe type conversions
- Dynamic property access

**Output**:
- JSON report: `analysis-results/type-violations.json`
- HTML dashboard: `analysis-results/type-violations.html`

**Categorizes by**:
- Severity (critical, high, medium, low)
- Category (enum, API, database, etc.)
- File location

**When to run**:
- Before commits (pre-commit hook)
- In CI/CD pipelines
- Weekly code quality checks

---

#### `scan-client-type-violations.ts`

**Purpose**: Scan client-specific type violations.

**Usage**:
```bash
npm run scan:client-types
```

**What it does**:
- Focuses on client/ directory
- Identifies React-specific issues
- Checks prop types

**When to run**:
- Client-side development
- Before frontend deployments

---

### Code Quality Scanning

#### `scan-todos.ts`

**Purpose**: Scan for TODO/FIXME/BUG comments in codebase.

**Usage**:
```bash
npm run scan:todos
```

**What it scans**:
- TODO comments
- FIXME comments
- BUG comments
- HACK comments
- WORKAROUND comments

**Output**:
- JSON report: `analysis-results/todo-comments.json`
- HTML dashboard: `analysis-results/todo-comments.html`

**Categorizes by**:
- Type (TODO, FIXME, BUG, etc.)
- Priority (high, medium, low)
- Age (how long it's been there)

**When to run**:
- Sprint planning
- Before releases
- Technical debt reviews

---

#### `scan-eslint-suppressions.ts`

**Purpose**: Scan for ESLint suppression comments.

**Usage**:
```bash
npm run scan:eslint-suppressions
```

**What it scans**:
- `eslint-disable`
- `eslint-disable-next-line`
- `eslint-disable-line`

**What it reports**:
- Total suppressions
- Suppressions by rule
- Suppressions by file
- Unjustified suppressions

**When to run**:
- Code quality audits
- Before releases
- Technical debt reviews

---

### Quality Gates

#### `check-thresholds.js`

**Purpose**: Enforce code quality standards with configurable thresholds.

**Usage**:
```bash
# Check all quality gates
npm run quality:check

# Environment-specific checks
npm run quality:check:dev
npm run quality:check:staging
npm run quality:check:pr
npm run quality:check:prod

# With custom config
node scripts/check-thresholds.js --config custom-config.json

# Initialize config file
node scripts/check-thresholds.js --init
```

**What it checks**:
- Global severity thresholds
- Module-specific thresholds
- Error type thresholds
- Quality trends vs baseline

**Configuration**:
- Global thresholds (critical, error, warning, info)
- Module thresholds (shared, server, client)
- Error type thresholds (specific patterns)
- Trend thresholds (compared to baseline)

**Exit codes**:
- `0`: All checks passed
- `1`: Blocking violations detected

**When to run**:
- In CI/CD pipelines (automated)
- Before merging PRs
- Before deployments

---

### Progress Tracking

#### `track-progress.ts`

**Purpose**: Track progress on comprehensive bug fixes with interactive dashboard.

**Usage**:
```bash
npm run track:progress
```

**What it tracks**:
- Type safety violations
- TODO/FIXME comments
- ESLint suppressions
- Commented imports
- TypeScript suppressions
- Property test pass rate
- Syntax errors

**Output**:
- JSON report: `analysis-results/progress-report.json`
- HTML dashboard: `analysis-results/progress-dashboard.html`

**Features**:
- Progress percentage
- Velocity (bugs fixed per day)
- Estimated completion date
- Phase tracking
- Blocker identification
- Interactive charts

**When to run**:
- Daily/weekly progress updates
- Sprint reviews
- Stakeholder reporting

---

#### `verify-metrics.ts`

**Purpose**: Verify that metrics meet target thresholds.

**Usage**:
```bash
npm run verify:metrics
```

**What it verifies**:
- All quality metrics
- Compares against targets
- Identifies gaps

**When to run**:
- Before releases
- Quality gate checks

---

## Analysis & Monitoring

### Project Analysis

#### `modern-project-analyzer.ts`

**Purpose**: Comprehensive project analysis using modern tools (madge, jscpd, knip).

**Usage**:
```bash
npm run analyze:modern
npm run analyze:architecture
```

**What it analyzes**:
- Circular dependencies (using madge)
- Code duplication (using jscpd)
- Dead code (using knip)
- Import patterns
- Architectural violations

**Output**:
- Unified report with recommendations
- Visual dependency graphs
- Actionable insights

**When to run**:
- Weekly health checks
- Before major refactors
- Architecture reviews

---

### API Contract Verification

#### `verify-api-contract-coverage.ts`

**Purpose**: Verify that all API endpoints have corresponding contracts, validation, and tests.

**Usage**:
```bash
npm run api:verify-contracts
```

**What it verifies**:
- All endpoints have contracts
- All contracts have validation schemas
- All contracts have tests

**Output**:
- Coverage report
- Missing contracts list
- Missing validation list
- Missing tests list

**Exit codes**:
- `0`: Full coverage
- `1`: Missing coverage

**When to run**:
- Before API changes
- In CI/CD pipelines
- API documentation updates

---

### Bundle Analysis

#### `analyze-bundle.cjs`

**Purpose**: Analyze bundle size and composition.

**Usage**:
```bash
npm run analyze:bundle
```

**What it analyzes**:
- Bundle size by module
- Duplicate dependencies
- Tree-shaking effectiveness
- Code splitting

**Output**:
- Interactive bundle visualization
- Size breakdown
- Optimization recommendations

**When to run**:
- Performance optimization
- Before releases
- After dependency updates

---

#### `bundle-analysis-plugin.js`

**Purpose**: Webpack plugin for bundle analysis during build.

**Usage**: Automatically used during build process.

**What it does**:
- Collects bundle metrics
- Generates analysis data
- Integrates with build pipeline

---

#### `bundle-analyzer.js`

**Purpose**: Generate bundle analysis reports.

**Usage**: Part of build tooling.

**What it generates**:
- Bundle composition reports
- Size trends
- Optimization suggestions

---

#### `generate-bundle-report.js`

**Purpose**: Generate comprehensive bundle reports.

**Usage**: Part of build tooling.

**What it generates**:
- Detailed bundle reports
- Historical comparisons
- Performance metrics

---

### Performance Monitoring

#### `performance-budget-enforcer.cjs`

**Purpose**: Enforce performance budgets in CI.

**Usage**: Automatically runs in CI (bundle-analysis.yml).

**What it enforces**:
- Maximum bundle size
- Maximum chunk size
- Asset size limits

**Exit codes**:
- `0`: Within budget
- `1`: Budget exceeded

---

#### `web-vitals-checker.js`

**Purpose**: Check Web Vitals metrics.

**Usage**: Automatically runs in CI (bundle-analysis.yml).

**What it checks**:
- Largest Contentful Paint (LCP)
- First Input Delay (FID)
- Cumulative Layout Shift (CLS)

---

#### `performance-regression-detector.js`

**Purpose**: Detect performance regressions.

**Usage**: Automatically runs in CI (bundle-analysis.yml).

**What it detects**:
- Bundle size increases
- Load time regressions
- Metric degradation

---

#### `performance-trend-analyzer.cjs`

**Purpose**: Analyze performance trends over time.

**Usage**: Part of performance monitoring.

**What it analyzes**:
- Historical performance data
- Trend identification
- Anomaly detection

---

### Dependency Analysis

#### `dependency-cruiser.js`

**Purpose**: Analyze import dependencies and architectural boundaries.

**Usage**:
```bash
npm run analyze:imports
```

**What it analyzes**:
- Import/export relationships
- Circular dependencies
- Architectural violations
- Dependency depth

**Configuration**: `.dependency-cruiser.cjs`

**When to run**:
- Architecture reviews
- Before major refactors
- Dependency audits

---

### Architecture Validation

#### `check-architecture.js`

**Purpose**: Validate architectural boundaries and rules.

**Usage**: Automatically runs in CI (analytics-ci.yml).

**What it validates**:
- Layer boundaries
- Module dependencies
- Architectural patterns

**Exit codes**:
- `0`: Architecture valid
- `1`: Violations detected

---

## Build & Deployment

### Deployment Scripts

#### `deploy-production.js`

**Purpose**: Deploy application to production environment.

**Usage**:
```bash
npm run deploy:production
npm run deploy:staging
```

**What it does**:
- Runs pre-deployment checks
- Builds production bundle
- Deploys to target environment
- Runs post-deployment verification

**When to run**:
- Production releases
- Staging deployments
- Automated in CI (production-deployment.yml)

---

### Memory Management

#### `immediate-memory-cleanup.cjs`

**Purpose**: Clean up memory during build process.

**Usage**:
```bash
npm run cleanup:memory
```

**What it does**:
- Forces garbage collection
- Clears build caches
- Frees memory resources

**When to run**:
- During large builds
- When memory is constrained
- In CI environments

---

## Testing Infrastructure

### Test Setup

#### `setup-playwright.js`

**Purpose**: Set up Playwright for end-to-end testing.

**Usage**: Automatically runs during test setup.

**What it does**:
- Installs Playwright browsers
- Configures test environment
- Sets up test fixtures

---

## Usage Guidelines

### Best Practices

1. **Always run validation before migrations**
   ```bash
   npm run db:migrate:validate
   npm run db:migrate:dry-run
   npm run db:migrate
   ```

2. **Check quality gates before committing**
   ```bash
   npm run scan:type-violations
   npm run scan:todos
   npm run quality:check:dev
   ```

3. **Track progress regularly**
   ```bash
   npm run track:progress  # Weekly
   ```

4. **Verify API contracts after changes**
   ```bash
   npm run api:verify-contracts
   ```

5. **Analyze bundle size before releases**
   ```bash
   npm run analyze:bundle
   ```

### CI/CD Integration

Most scripts are integrated into CI/CD workflows:

- **Pre-commit**: Type violations, ESLint suppressions
- **PR checks**: Quality gates, architecture validation
- **Pre-deployment**: Schema drift, API contracts, bundle analysis
- **Post-deployment**: Health checks, performance monitoring

### Troubleshooting

#### Database connection issues
```bash
npm run db:health  # Check database status
```

#### Migration failures
```bash
npm run db:migrate:validate  # Validate migrations
npm run db:rollback-verified  # Rollback if needed
```

#### Type safety issues
```bash
npm run scan:type-violations  # Identify violations
# Open analysis-results/type-violations.html for details
```

#### Performance issues
```bash
npm run analyze:bundle  # Check bundle size
npm run db:schema:check  # Check for missing indexes
```

---

## Configuration Files

- `.dependency-cruiser.cjs` - Dependency analysis rules
- `.jscpd.json` - Code duplication detection config
- `knip.json` - Dead code detection config
- `quality-gate-config.json` - Quality threshold config (create with `--init`)

---

## Support

For issues or questions:

1. Check script output for error messages
2. Review relevant configuration files
3. Check CI/CD logs for automated runs
4. Consult team documentation

---

## Maintenance

**Script Classification**: See `CLASSIFICATION.md` for complete inventory

**Adding New Scripts**:
1. Add JSDoc comments with purpose, usage, and when to run
2. Add npm script in `package.json`
3. Update this README
4. Update `CLASSIFICATION.md`

**Deprecating Scripts**:
1. Mark as deprecated in code
2. Update `CLASSIFICATION.md`
3. Remove from `package.json` after grace period
4. Move to `archived-migration-tools/` if needed
