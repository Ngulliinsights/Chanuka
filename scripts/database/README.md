# 📦 Database Scripts Directory

**Central repository for all database operations and management tools**

---

## 📂 Directory Structure

```
scripts/database/
├── 📖 README.md (this file)
├── 📖 SCRIPTS_GUIDE.md              # Complete script reference & usage guide
├── 📖 DEPRECATION_NOTICE.md         # Deprecated scripts & migration path
├── 📖 DATABASE_DRIVER_STRATEGY.md   # Driver selection & configuration
│
├── ✅ Canonical Scripts (use these)
│   ├── migrate.ts                   # Main migration runner
│   ├── reset.ts                     # Main reset script
│   ├── initialize-database-integration.ts  # Database initialization
│   ├── health-check.ts              # Health monitoring
│   ├── generate-migration.ts        # Migration generation
│   ├── check-schema.ts              # Schema validation
│   ├── check-tables.ts              # Table verification
│   ├── schema-drift-detection.ts    # Drift detection
│   └── base-script.ts               # Base utilities
│
├── ✨ New Validation Scripts
│   ├── validate-migration.ts        # Validates 6 consolidation recommendations
│   └── verify-alignment.ts          # Verifies architecture alignment
│
└── ⚠️ Deprecated Scripts (for reference only)
    ├── run-migrations.ts            # Use migrate.ts instead
    ├── simple-migrate.ts            # Use migrate.ts instead
    ├── migration-performance-profile.ts  # Use migrate.ts instead
    ├── reset-database.ts            # Use reset.ts instead
    ├── reset-database-fixed.ts      # Use reset.ts instead
    ├── simple-reset.ts              # Use reset.ts instead
    ├── run-reset.ts                 # Use reset.ts instead
    ├── reset-and-migrate.ts         # Use reset.ts --migrate instead
    ├── run-reset.sh                 # Use npm scripts instead
    ├── init-strategic-database.ts   # Use initialize-database-integration.ts instead
    ├── setup.ts                     # Use initialize-database-integration.ts instead
    └── setup-schema.ts              # Use check-schema.ts instead
    
└── 🔧 Utility/Debug Scripts
    ├── debug-migration-table.ts     # Debugging helper
    ├── migration-performance-profile.ts  # Performance profiling
```

---

## 🚀 Quick Start

### Daily Operations

```bash
# 1. Initialize database (first time)
npm run db:init

# 2. Run migrations
npm run db:migrate

# 3. Check health
npm run db:health

# 4. Reset (development only!)
npm run db:reset --force
```

### Verification

```bash
# Validate consolidation
npm run db:validate-migration

# Verify alignment
npm run db:verify-alignment

# Both
npm run db:verify-all
```

### Schema Management

```bash
# Generate migration
npm run db:generate

# Validate schema
npm run db:schema:check

# Detect drift
npm run db:schema:drift
```

---

## 📚 Documentation Files

### [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md)
**Complete reference for all database operations**

Contents:
- 📋 Decision matrix (which script to use?)
- 📖 Detailed documentation for each script
- 🎯 Common workflows
- 🆘 Troubleshooting guide
- 📊 Full reference table

**Use this when**: You need to know how to use a specific script

---

### [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md)
**Lists all deprecated scripts and their replacements**

Contents:
- ✅ Canonical scripts (use these)
- ⚠️ Deprecated scripts (don't use)
- 📋 Migration checklist
- ❓ FAQ
- 📊 Impact summary

**Use this when**: You encounter an old script or want to migrate

---

### [DATABASE_DRIVER_STRATEGY.md](DATABASE_DRIVER_STRATEGY.md)
**Clarifies driver selection and configuration**

Contents:
- 🎯 Executive summary (which driver where?)
- 📦 Driver comparison
- ⚙️ Configuration per environment
- 🐛 Troubleshooting
- 📊 Performance considerations
- ✅ Setup checklist

**Use this when**: You need to understand database drivers or configure environments

---

## 🎯 Script Categories

### ✅ Core Operations (Use Daily)

| Script | Purpose | Command | When |
|---|---|---|---|
| **migrate.ts** | Apply migrations | `npm run db:migrate` | After code pull |
| **reset.ts** | Reset database | `npm run db:reset` | Dev only |
| **initialize-database-integration.ts** | Initialize DB | `npm run db:init` | First setup |
| **health-check.ts** | Check health | `npm run db:health` | Troubleshooting |

### 🔵 Schema Management (Use for Schema Changes)

| Script | Purpose | Command | When |
|---|---|---|---|
| **generate-migration.ts** | Create migration | `npm run db:generate` | After schema changes |
| **check-schema.ts** | Validate schema | `npm run db:schema:check` | Schema issues |
| **schema-drift-detection.ts** | Detect drift | `npm run db:schema:drift` | Production check |

### ✨ Validation (Use Before Commit)

| Script | Purpose | Command | When |
|---|---|---|---|
| **validate-migration.ts** | Validate setup | `npm run db:validate-migration` | Pre-commit |
| **verify-alignment.ts** | Verify alignment | `npm run db:verify-alignment` | Architecture check |

### 🔧 Utilities (Use as Needed)

| Script | Purpose | Notes |
|---|---|---|
| **base-script.ts** | Base utilities | For other scripts |
| **check-tables.ts** | Table verification | Utility |
| **debug-migration-table.ts** | Debug helper | Troubleshooting |

---

## 🔄 Common Workflows

### Workflow 1: First Time Setup
```bash
cd project
npm install
npm run db:init              # Initialize
npm run db:migrate           # Apply migrations
npm run db:seed              # Seed data
npm run db:verify-all        # Validate
npm run dev                  # Start development
```

### Workflow 2: Pull & Update
```bash
git pull
npm install
npm run db:migrate           # Apply new migrations
npm run db:health            # Verify
npm run dev
```

### Workflow 3: Make Schema Changes
```bash
# 1. Edit shared/schema/*.ts files
npm run db:generate          # Generate migration
# 2. Review drizzle/XXXX_*.sql
npm run db:migrate           # Apply migration
npm run db:verify-all        # Validate
git add . && git commit      # Commit
```

### Workflow 4: Fix Database Issues
```bash
npm run db:health --detailed # Diagnose
npm run db:schema:check      # Validate schema
npm run db:schema:drift      # Detect drift
npm run db:migrate           # Apply fixes
npm run db:health            # Verify fix
```

---

## 🆘 Troubleshooting

### Can't connect to database?
See: [DATABASE_DRIVER_STRATEGY.md → Troubleshooting](DATABASE_DRIVER_STRATEGY.md#troubleshooting)

### Which script should I use?
See: [SCRIPTS_GUIDE.md → Decision Matrix](SCRIPTS_GUIDE.md#-decision-matrix-which-script-to-use)

### Old script still being used?
See: [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md)

### Migration failed?
See: [SCRIPTS_GUIDE.md → Troubleshooting](SCRIPTS_GUIDE.md#-troubleshooting)

### Schema mismatch?
See: [SCRIPTS_GUIDE.md → Schema Mismatch](SCRIPTS_GUIDE.md#schema-mismatch)

---

## 📊 Migration Status (Jan 8, 2026)

### Completed ✅
- [x] Identified canonical scripts
- [x] Added deprecation notices to duplicates
- [x] Updated npm scripts in package.json
- [x] Created SCRIPTS_GUIDE.md
- [x] Created DATABASE_DRIVER_STRATEGY.md
- [x] Created DEPRECATION_NOTICE.md
- [x] Created this README

### In Progress ⏳
- [ ] Notify team of changes
- [ ] Update CI/CD pipelines
- [ ] Archive deprecated scripts

### Not Started ⏹️
- [ ] (None - consolidation complete!)

---

## 📋 Before You Run a Script

✅ Checklist:
- [ ] Read [SCRIPTS_GUIDE.md](SCRIPTS_GUIDE.md) if unsure
- [ ] Check [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md) if script is old
- [ ] Verify DATABASE_URL is set: `echo $DATABASE_URL`
- [ ] Run `npm run db:health` to test connection
- [ ] For destructive operations (reset), understand implications
- [ ] Backup important data before reset in production

---

## 🎓 Key Concepts

### Canonical vs Deprecated
- **Canonical**: Current, recommended scripts (e.g., `migrate.ts`)
- **Deprecated**: Old scripts being phased out (e.g., `run-migrations.ts`)
- **Use canonical scripts only** - they're better maintained

### Drivers
- **Production/Staging**: `@neondatabase/serverless` (Neon)
- **Development/Testing**: `pg` (node-postgres)
- See [DATABASE_DRIVER_STRATEGY.md](DATABASE_DRIVER_STRATEGY.md) for details

### Environment Variables
```bash
DATABASE_URL=postgresql://...     # Connection string (required)
DATABASE_POOL_MAX=20              # Pool size (optional)
DATABASE_LOG_LEVEL=info           # Logging (optional)
```

---

## 🔗 Related Documentation

- [Database Architecture Coherence Analysis](../DATABASE_ARCHITECTURE_COHERENCE_ANALYSIS.md)
- [Database Consolidation Migration](../DATABASE_CONSOLIDATION_MIGRATION.md)
- [Database Alignment Analysis](../DATABASE_ALIGNMENT_ANALYSIS.md)
- [Database Strategic Migration Complete](../DATABASE_STRATEGIC_MIGRATION_COMPLETE.md)
- [Database Executive Summary](../DATABASE_CONSOLIDATION_EXECUTIVE_SUMMARY.md)

---

## 💡 Pro Tips

1. **Use decision matrix** when unsure which script to use
2. **Always validate** before committing: `npm run db:verify-all`
3. **Read deprecation notices** if you encounter old scripts
4. **Check DATABASE_DRIVER_STRATEGY** for environment-specific setup
5. **Use --help flag** on scripts for additional options

---

## 📞 Support

**For questions about database scripts:**

1. **Which script to use?** → See [SCRIPTS_GUIDE.md Decision Matrix](SCRIPTS_GUIDE.md#-decision-matrix-which-script-to-use)
2. **How to use a script?** → See [SCRIPTS_GUIDE.md Detailed Reference](SCRIPTS_GUIDE.md#-detailed-script-reference)
3. **Old script is deprecated?** → See [DEPRECATION_NOTICE.md](DEPRECATION_NOTICE.md)
4. **Driver/environment issue?** → See [DATABASE_DRIVER_STRATEGY.md](DATABASE_DRIVER_STRATEGY.md)
5. **Specific problem?** → See [SCRIPTS_GUIDE.md Troubleshooting](SCRIPTS_GUIDE.md#-troubleshooting)

---

## ✨ What's New (Jan 8, 2026)

### New Documentation
- ✅ Comprehensive SCRIPTS_GUIDE.md
- ✅ DEPRECATION_NOTICE.md with clear migration path
- ✅ DATABASE_DRIVER_STRATEGY.md for environment setup
- ✅ This README.md for quick navigation

### Script Updates
- ✅ Deprecated old duplicate scripts
- ✅ Canonical scripts fully documented
- ✅ New validation scripts added:
  - `validate-migration.ts` - Validates consolidation
  - `verify-alignment.ts` - Verifies architecture

### npm Scripts Updated
- ✅ Clear naming convention
- ✅ Grouped by purpose
- ✅ All documented
- ✅ Deprecated scripts show helpful message

---

**Status**: ✅ Implementation Complete  
**Date**: January 8, 2026  
**Quality**: Production Ready  
**Team**: Database Architecture Team
