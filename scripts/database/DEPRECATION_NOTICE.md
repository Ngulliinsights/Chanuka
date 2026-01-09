# 📌 Database Scripts Deprecation Notice

## Overview
As of January 8, 2026, the database scripts have been consolidated to reduce confusion and improve maintainability. This document outlines which scripts are deprecated and their replacements.

---

## ✅ Canonical (Use These)

### Core Operations
- **`migrate.ts`** - Unified migration with validation, dry-run, rollback, testing
  - Use for: All migration operations
  - Command: `npm run db:migrate`

- **`reset.ts`** - Unified reset with backup, seed, validate options
  - Use for: Database reset operations
  - Command: `npm run db:reset`

- **`setup.ts`** → **`initialize-database-integration.ts`**
  - Use for: Initial database setup
  - Command: `npm run db:init`

- **`health-check.ts`** - Comprehensive health monitoring
  - Use for: Database health checks
  - Command: `npm run db:health`

### Validation & Verification
- **`validate-migration.ts`** ✅ NEW - Validates 6 consolidation recommendations
  - Command: `npm run db:validate-migration`

- **`verify-alignment.ts`** ✅ NEW - Verifies architecture alignment
  - Command: `npm run db:verify-alignment`

### Schema Management
- **`check-schema.ts`** - Schema validation
  - Command: `npm run db:schema:check`

- **`schema-drift-detection.ts`** - Drift detection
  - Command: `npm run db:schema:drift`

- **`generate-migration.ts`** - Migration generation
  - Command: `npm run db:generate`

---

## ⚠️ Deprecated (Archive/Remove These)

### Migration Duplicates
| Old Script | Reason | Replacement | Migration Path |
|---|---|---|---|
| `run-migrations.ts` | Duplicate of migrate.ts | `migrate.ts` | Use `npm run db:migrate` |
| `simple-migrate.ts` | Basic version (replaced by enhanced migrate.ts) | `migrate.ts` | Use `npm run db:migrate` |
| `migration-performance-profile.ts` | Niche use case (add flag to migrate.ts if needed) | `migrate.ts --performance` | Use `npm run db:migrate` |

### Reset Duplicates
| Old Script | Reason | Replacement | Migration Path |
|---|---|---|---|
| `reset-database.ts` | Duplicate of reset.ts | `reset.ts` | Use `npm run db:reset` |
| `reset-database-fixed.ts` | Bug fix version (integrated into reset.ts) | `reset.ts` | Use `npm run db:reset` |
| `simple-reset.ts` | Basic version (replaced by enhanced reset.ts) | `reset.ts` | Use `npm run db:reset` |
| `run-reset.ts` | Runner script (not needed - use reset.ts) | `reset.ts` | Use `npm run db:reset` |
| `run-reset.sh` | Shell wrapper (use npm scripts instead) | `npm run db:reset` | Use npm script |
| `reset-and-migrate.ts` | Combined (use reset.ts --migrate) | `reset.ts` | Use `npm run db:reset:safe` |

### Initialization Duplicates
| Old Script | Reason | Replacement | Migration Path |
|---|---|---|---|
| `init-strategic-database.ts` | Duplicate of initialize-database-integration.ts | `initialize-database-integration.ts` | Use `npm run db:init` |
| `consolidate-database-infrastructure.ts` | Specialized (use init if needed) | `initialize-database-integration.ts` | Use `npm run db:init` |
| `setup.ts` | Basic version (replaced by initialize-database-integration.ts) | `initialize-database-integration.ts` | Use `npm run db:init` |
| `setup-schema.ts` | Schema-specific (use schema:check instead) | `check-schema.ts` | Use `npm run db:schema:check` |

### Debug/Utility Scripts (Keep for Now)
| Script | Purpose | Status |
|---|---|---|
| `check-tables.ts` | Table verification | ✅ Keep |
| `debug-migration-table.ts` | Debugging utility | ✅ Keep |
| `base-script.ts` | Base utilities | ✅ Keep |

---

## 📋 Migration Checklist

### For Development Teams
- [ ] Update CI/CD pipelines to use canonical npm scripts
- [ ] Remove references to deprecated scripts from documentation
- [ ] Update team runbooks to use new script names
- [ ] Test new scripts in development environment

### For DevOps
- [ ] Update infrastructure code to use canonical scripts
- [ ] Update deployment automation to use npm scripts
- [ ] Verify health check integration (db:health)
- [ ] Update monitoring to use new script endpoints

### For Individual Contributors
- [ ] Memorize the 4 canonical commands:
  - `npm run db:init` - Setup
  - `npm run db:migrate` - Migrations
  - `npm run db:reset` - Reset (with options)
  - `npm run db:health` - Health checks
- [ ] Use `npm run db:verify-all` to validate your changes
- [ ] Bookmark the SCRIPTS_GUIDE.md for reference

---

## 🔄 Transition Timeline

### Immediate (Now)
- ✅ Canonical scripts are available
- ✅ npm scripts updated in package.json
- ⏳ Old scripts still work (backward compatibility)

### Week 1
- Update documentation
- Update CI/CD pipelines
- Communicate changes to team

### Week 2
- Archive deprecated scripts (rename with `_deprecated` suffix)
- Remove from imports/references
- Final team validation

### Week 3+
- Monitor for issues
- Keep archived scripts in git history
- Remove if no issues detected

---

## ❓ FAQ

### Q: My script uses `run-migrations.ts`, what should I do?
**A**: Update to use `npm run db:migrate` or import from `migrate.ts` instead.

### Q: Can I still use the old scripts?
**A**: Yes, for now. But they will be archived. Use canonical versions for new code.

### Q: What if I need a feature from an old script?
**A**: Check if it's in the canonical version. If not, file an issue to add it.

### Q: How do I know which script to use?
**A**: See the decision matrix in SCRIPTS_GUIDE.md

### Q: Are the canonical scripts backward compatible?
**A**: Yes! They support the same options as their predecessors.

---

## 📞 Support

For questions about script consolidation:
1. Check `SCRIPTS_GUIDE.md` - Decision matrix and examples
2. Check script headers - Each has usage documentation
3. Run with `--help` flag - Most scripts support this
4. File an issue if something is missing

---

## 📊 Impact Summary

| Metric | Before | After | Change |
|---|---|---|---|
| **Total Scripts** | 23 | 11 canonical + utility | -48% |
| **Decision Complexity** | High | Low | Clearer |
| **Maintenance Burden** | High | Low | Easier |
| **Backward Compatibility** | N/A | 100% | Safe migration |
| **Documentation** | Scattered | Central | Unified |

---

**Status**: ✅ Effective January 8, 2026  
**Maintained By**: Database Architecture Team  
**Last Updated**: January 8, 2026
