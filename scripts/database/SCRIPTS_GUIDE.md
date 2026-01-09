# 📚 Database Scripts Guide

**Complete reference for database operations in the Chanuka platform**

---

## 🚀 Quick Start

### Most Common Operations

```bash
# Initialize database (first time setup)
npm run db:init

# Run pending migrations
npm run db:migrate

# Check database health
npm run db:health

# Reset database (development only!)
npm run db:reset --force

# Validate consolidation recommendations
npm run db:verify-all
```

---

## 📋 Decision Matrix: Which Script to Use?

```
┌─────────────────────────────────────────────────────────────┐
│ WHAT DO YOU WANT TO DO?                                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Set up database first time                               │
│    → npm run db:init                                        │
│                                                             │
│ 2. Run migrations                                           │
│    → npm run db:migrate                                     │
│    → npm run db:migrate:validate (with validation)          │
│    → npm run db:migrate:dry-run (preview changes)           │
│                                                             │
│ 3. Check database health                                    │
│    → npm run db:health                                      │
│    → npm run db:health:watch (continuous monitoring)        │
│                                                             │
│ 4. Reset database (⚠️ DESTRUCTIVE!)                        │
│    → npm run db:reset (requires confirmation)               │
│    → npm run db:reset:safe (with validation)                │
│    → npm run db:reset:force (skip confirmation)             │
│                                                             │
│ 5. Verify configuration                                     │
│    → npm run db:validate-migration (recommendations)        │
│    → npm run db:verify-alignment (architecture)             │
│    → npm run db:verify-all (both)                           │
│                                                             │
│ 6. Schema management                                        │
│    → npm run db:schema:check (validate schema)              │
│    → npm run db:schema:drift (detect changes)               │
│    → npm run db:generate (create migration)                 │
│                                                             │
│ 7. Seed data                                                │
│    → npm run db:seed (base seed)                            │
│    → npm run db:seed:legislative (legislative data)         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📖 Detailed Script Reference

### 🟢 CORE OPERATIONS (Use These Daily)

#### `npm run db:init` - Initialize Database
**Purpose**: Set up database from scratch  
**Script**: `initialize-database-integration.ts`  
**When to use**:
- First time setting up the project
- Clean environment setup
- Docker/CI environment initialization

**Command line options**:
```bash
# Basic setup
npm run db:init

# With validation
npm run db:init --validate

# With seeding
npm run db:init --seed
```

**Example output**:
```
✅ Database initialized successfully
✅ Migrations applied: 15 files
✅ Health check passed
```

---

#### `npm run db:migrate` - Run Migrations
**Purpose**: Apply pending database migrations  
**Script**: `migrate.ts`  
**When to use**:
- After pulling code with new migrations
- Deploying to staging/production
- Adding new features that need schema changes

**Command line options**:
```bash
# Apply all pending migrations
npm run db:migrate

# Validate before applying
npm run db:migrate:validate

# Preview without applying
npm run db:migrate:dry-run

# Run with rollback on failure
npm run db:migrate -- --rollback auto

# Test migrations
npm run db:migrate -- --test
```

**Expected output**:
```
🚀 Starting migration process...
✅ Migration 0001_init.sql applied
✅ Migration 0002_users.sql applied
✅ 2 migrations completed in 1.23s
```

**Troubleshooting**:
```bash
# See what will be applied (dry run)
npm run db:migrate:dry-run

# Validate schema after
npm run db:schema:check
```

---

#### `npm run db:reset` - Reset Database
**Purpose**: Completely clear and reinitialize database  
**Script**: `reset.ts`  
**⚠️ DANGER**: This deletes all data!  
**When to use**:
- Development/testing only
- Cleaning up corrupted state
- Starting fresh with new seed data

**Command line options**:
```bash
# Interactive confirmation
npm run db:reset

# Skip confirmation (use carefully!)
npm run db:reset:force

# Reset with automatic migration
npm run db:reset:safe

# Reset with all options
npm run db:reset:force --migrate --seed --validate

# With backup before reset
npm run db:reset -- --backup
```

**Safety features**:
- ⚠️ Requires confirmation by default (unless --force)
- ✅ Can create backup before reset (--backup)
- ✅ Optional auto-migration after reset (--migrate)
- ✅ Optional auto-seeding after reset (--seed)
- ✅ Optional validation after reset (--validate)

**Example**:
```bash
# Safe development reset
npm run db:reset:safe

# Quick reset in CI (no prompts)
npm run db:reset:force
```

---

#### `npm run db:health` - Health Check
**Purpose**: Verify database is working correctly  
**Script**: `health-check.ts`  
**When to use**:
- Before deployments
- Troubleshooting database issues
- Continuous monitoring (use --watch)

**Command line options**:
```bash
# Basic health check
npm run db:health

# Detailed report
npm run db:health --detailed

# Continuous monitoring (watch mode)
npm run db:health:watch

# With performance metrics
npm run db:health -- --performance

# JSON output (for parsing)
npm run db:health -- --json
```

**Healthy output looks like**:
```
🏥 Database Health Status
├─ Connection: ✅ HEALTHY
├─ Migrations: ✅ UP TO DATE
├─ Schema: ✅ VALID
├─ Performance: ✅ GOOD (avg 45ms)
└─ Overall: ✅ HEALTHY
```

**What to check if unhealthy**:
```
❌ Connection Issues
  → Check DATABASE_URL
  → Verify network connectivity
  → Check credentials

❌ Migration Issues
  → Check for incomplete migrations
  → Run: npm run db:migrate
  → Check migration logs

❌ Schema Issues
  → Run: npm run db:schema:check
  → Check for schema drift: npm run db:schema:drift
```

---

### 🟡 VALIDATION & VERIFICATION (Use Before Committing)

#### `npm run db:validate-migration` - Validate Consolidation
**Purpose**: Verify all 6 consolidation recommendations are implemented  
**Script**: `validate-migration.ts`  
**When to use**:
- Before committing database changes
- Verifying setup is correct
- CI/CD validation

**What it checks**:
```
✅ Recommendation 1: Circuit Breaker
✅ Recommendation 2: Health Monitoring
✅ Recommendation 3: Automatic Retry
✅ Recommendation 4: Keep-Alive Configuration
✅ Recommendation 5: Slow Query Detection
✅ Recommendation 6: Read/Write Configuration
```

**Example output**:
```
🔍 Validating Database Consolidation...
✅ All 6 recommendations implemented
✅ File structure complete
✅ Integration points verified
✅ Ready for production
```

---

#### `npm run db:verify-alignment` - Verify Architecture Alignment
**Purpose**: Check integration with shared/database layer  
**Script**: `verify-alignment.ts`  
**When to use**:
- Verifying architecture consistency
- Integration validation
- Structural integrity checks

**What it checks**:
```
✅ Alignment with shared/database/
✅ Proper imports and exports
✅ Type safety verification
✅ Dependency resolution
✅ Configuration consistency
```

---

#### `npm run db:verify-all` - Run All Validations
**Purpose**: Comprehensive verification (validate + verify-alignment)  
**When to use**:
- Final pre-commit check
- CI/CD validation step
- Deployment preparation

**Command**:
```bash
npm run db:verify-all
```

**Expected output**:
```
🔍 Running comprehensive database verification...
✅ Consolidation validation passed
✅ Alignment verification passed
✅ All checks passed - ready to deploy
```

---

### 🔵 SCHEMA MANAGEMENT (Use for Schema Changes)

#### `npm run db:generate` - Generate Migration
**Purpose**: Create new migration file  
**Script**: `generate-migration.ts`  
**When to use**:
- After modifying schema files
- Creating new tables/columns
- Schema change automation

**Usage**:
```bash
# Generate migration from schema changes
npm run db:generate

# The tool will:
# 1. Compare schema files to migrations
# 2. Generate SQL for differences
# 3. Create new migration file
# 4. Suggest review points
```

**Example**:
```bash
$ npm run db:generate
🔍 Comparing schema to migrations...
📝 Generated: drizzle/0027_add_new_tables.sql
✅ Review and commit the migration file
```

---

#### `npm run db:schema:check` - Validate Schema
**Purpose**: Verify schema integrity  
**Script**: `check-schema.ts`  
**When to use**:
- Verifying schema is valid
- Troubleshooting schema issues
- Pre-deployment checks

**Command**:
```bash
npm run db:schema:check
```

---

#### `npm run db:schema:drift` - Detect Drift
**Purpose**: Identify differences between schema and database  
**Script**: `schema-drift-detection.ts`  
**When to use**:
- Detecting unauthorized changes
- Verifying migrations applied correctly
- Production troubleshooting

**Command**:
```bash
npm run db:schema:drift
```

**Output example**:
```
🔍 Detecting schema drift...
✅ No drift detected - schema matches database
```

Or if drift found:
```
⚠️ Schema drift detected:
  - Table 'users' missing column 'updated_at'
  - Table 'posts' has extra column 'legacy_id'
→ Run migrations to fix drift
```

---

### 🟣 SEEDING (Use for Sample Data)

#### `npm run db:seed` - Seed Base Data
**Purpose**: Populate database with sample/default data  
**Script**: `scripts/seeds/seed.ts`  
**When to use**:
- Development environment setup
- After reset in development
- Testing with sample data

**Command**:
```bash
npm run db:seed
```

---

#### `npm run db:seed:legislative` - Seed Legislative Data
**Purpose**: Populate with legislative domain data  
**Script**: `scripts/seeds/legislative-seed.ts`  
**When to use**:
- Full feature testing
- Demo/presentation environments
- Complex test scenarios

**Command**:
```bash
npm run db:seed:legislative
```

---

## 🎯 Common Workflows

### 1. First Time Setup
```bash
# Clone repo
git clone ...
cd project

# Install dependencies
pnpm install

# Set up database
npm run db:init

# Run migrations
npm run db:migrate

# Seed data
npm run db:seed

# Verify setup
npm run db:verify-all

# Start development
npm run dev
```

---

### 2. After Pulling New Code
```bash
# Pull changes
git pull

# Apply new migrations
npm run db:migrate

# Verify everything
npm run db:health

# If health check fails:
npm run db:schema:check
npm run db:schema:drift
```

---

### 3. Preparing for Deployment
```bash
# Validate all changes
npm run db:verify-all

# Check health
npm run db:health --detailed

# Run dry-run migration
npm run db:migrate:dry-run

# If all good:
# Commit and deploy
```

---

### 4. Fixing Database Issues
```bash
# Step 1: Check what's wrong
npm run db:health --detailed

# Step 2: Check schema
npm run db:schema:check

# Step 3: Detect drift
npm run db:schema:drift

# Step 4: Run pending migrations
npm run db:migrate

# Step 5: Verify fix
npm run db:health
```

---

### 5. Development: Make Schema Changes
```bash
# 1. Modify schema files in shared/schema/

# 2. Generate migration
npm run db:generate

# 3. Review generated migration in drizzle/

# 4. Apply migration
npm run db:migrate

# 5. Verify
npm run db:verify-all

# 6. Commit
git add . && git commit -m "feat: update schema"
```

---

### 6. Reset Development Environment
```bash
# Option A: Safe reset (with migration & validation)
npm run db:reset:safe

# Option B: Force reset (skip confirmation)
npm run db:reset:force

# Option C: Reset with full reinit
npm run db:reset:force --migrate --seed --validate
```

---

## 🆘 Troubleshooting

### Connection Issues

**Problem**: `Error: connect ECONNREFUSED`

**Solution**:
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Verify database is running
npm run db:health

# Check connection details
npm run db:schema:check
```

---

### Migration Issues

**Problem**: `Migration 0020_something.sql failed`

**Solution**:
```bash
# Check what happened
npm run db:health --detailed

# See migration status
npm run db:migrate:dry-run

# Check schema drift
npm run db:schema:drift

# Try fresh start (development only!)
npm run db:reset:force
```

---

### Schema Mismatch

**Problem**: `Schema validation failed`

**Solution**:
```bash
# Detect what's different
npm run db:schema:drift

# Update schema files if needed

# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate

# Verify
npm run db:schema:check
```

---

### Performance Issues

**Problem**: `Queries are slow`

**Solution**:
```bash
# Check health metrics
npm run db:health --detailed

# Look for slow query detection
npm run db:health -- --performance

# Check indexes are created properly
npm run db:schema:check
```

---

## 📊 Reference: All npm Scripts

### Database Operations
| Command | Purpose | When to Use |
|---|---|---|
| `npm run db:init` | Initialize database | First time setup |
| `npm run db:migrate` | Apply migrations | After code pull |
| `npm run db:migrate:validate` | Validate migrations | Before applying |
| `npm run db:migrate:dry-run` | Preview migrations | Check what will happen |
| `npm run db:reset` | Reset database | Development only |
| `npm run db:reset:safe` | Safe reset | With migration + validate |
| `npm run db:reset:force` | Force reset | CI/automated processes |
| `npm run db:health` | Health check | Troubleshooting |
| `npm run db:health:watch` | Watch health | Continuous monitoring |
| `npm run db:generate` | Generate migration | After schema changes |
| `npm run db:validate-migration` | Validate setup | Pre-commit |
| `npm run db:verify-alignment` | Verify alignment | Architecture validation |
| `npm run db:verify-all` | Run all validations | Final check before commit |
| `npm run db:schema:check` | Validate schema | Schema issues |
| `npm run db:schema:drift` | Detect drift | Production troubleshooting |
| `npm run db:seed` | Seed data | Test data |
| `npm run db:seed:legislative` | Seed legislative | Full feature testing |
| `npm run db:studio` | Drizzle Studio | Visual database editor |

---

## 💡 Pro Tips

### 1. Always validate before committing
```bash
npm run db:verify-all
```

### 2. Use dry-run to preview changes
```bash
npm run db:migrate:dry-run
```

### 3. Monitor health in watch mode during debugging
```bash
npm run db:health:watch
```

### 4. Generate migrations automatically
```bash
npm run db:generate
```

### 5. Check drift in production
```bash
npm run db:schema:drift
```

### 6. Use Drizzle Studio for visual editing
```bash
npm run db:studio
```

---

## 📚 Related Documentation

- [DATABASE_CONSOLIDATION_MIGRATION.md](DATABASE_CONSOLIDATION_MIGRATION.md) - Implementation details
- [DATABASE_ALIGNMENT_ANALYSIS.md](DATABASE_ALIGNMENT_ANALYSIS.md) - Architecture alignment
- [DATABASE_ARCHITECTURE_COHERENCE_ANALYSIS.md](../DATABASE_ARCHITECTURE_COHERENCE_ANALYSIS.md) - System analysis
- [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md) - Deprecated scripts

---

**Last Updated**: January 8, 2026  
**Status**: ✅ Current  
**Maintained By**: Database Architecture Team
