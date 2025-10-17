# Migration Tooling

Comprehensive automated tooling for safe, gradual migration from old structure to new consolidated structure with zero-downtime capabilities.

## Overview

This migration tooling provides:
- **Automated codemod scripts** for import path updates
- **Validation tools** to detect incomplete migrations
- **Rollback procedures** with zero data loss
- **Feature flag management** for gradual rollout
- **Comprehensive test coverage** for all migration tooling

## Directory Structure

```
migration/
├── scripts/           # Automated migration scripts
├── validation/        # Validation and verification tools
├── rollback/          # Rollback procedures and backup management
├── __tests__/         # Comprehensive test suite
├── feature-flags.js   # Feature flag management system
├── package.json       # Migration tooling dependencies
└── README.md         # This documentation
```

## Migration Phases

The migration is structured in phases for safe, gradual rollout:

1. **Phase 1: Primitives** - Enable new primitive types and constants
2. **Phase 2: Error Management** - Enable new error management system
3. **Phase 3: Validation** - Enable new validation system
4. **Phase 4: Infrastructure** - Enable new infrastructure components
5. **Phase 5: Features** - Enable new feature modules

## Quick Start

### 1. Install Dependencies
```bash
cd migration
npm install
```

### 2. Check Feature Flag Status
```bash
npm run flags:status
```

### 3. Enable Migration Phase (Example: Phase 1 at 25% rollout)
```bash
node feature-flags.js enable MIGRATION_PHASE_1 25
```

### 4. Run Validation (Should fail initially)
```bash
npm run validate
```

### 5. Create Full Backup
```bash
cd rollback
node rollback-migration.js  # Creates backups automatically
```

### 6. Run Migration
```bash
npm run migrate
```

### 7. Validate Migration Success
```bash
npm run validate
```

### 8. Run Tests
```bash
npm test
```

## Detailed Procedures

### Pre-Migration Checklist

- [ ] All tests passing in current state
- [ ] Full backup created
- [ ] Feature flags configured for target rollout percentage
- [ ] Validation tools confirm clean state
- [ ] Rollback procedures tested

### Migration Execution

1. **Enable Target Phase**
   ```bash
   node feature-flags.js enable MIGRATION_PHASE_1 10  # Start with 10%
   ```

2. **Validate Current State**
   ```bash
   npm run validate
   # Should show issues to be fixed
   ```

3. **Execute Migration**
   ```bash
   npm run migrate
   # Updates import paths automatically
   ```

4. **Validate Migration**
   ```bash
   npm run validate
   # Should pass with no issues
   ```

5. **Gradual Rollout**
   ```bash
   # Increase rollout percentage gradually
   node feature-flags.js rollout MIGRATION_PHASE_1 25
   node feature-flags.js rollout MIGRATION_PHASE_1 50
   node feature-flags.js rollout MIGRATION_PHASE_1 100
   ```

6. **Monitor and Verify**
   - Check application logs for errors
   - Run integration tests
   - Monitor performance metrics

### Rollback Procedures

If issues are detected during migration:

1. **Immediate Rollback**
   ```bash
   npm run rollback
   # Restores all files from backup
   ```

2. **Selective Rollback**
   ```bash
   npm run rollback:selective "src/**/*.ts" "src/**/*.js"
   # Rollback specific file patterns
   ```

3. **Disable Feature Flags**
   ```bash
   node feature-flags.js disable MIGRATION_PHASE_1
   ```

4. **Cleanup Backups** (after successful migration)
   ```bash
   npm run cleanup
   ```

## Migration Mappings

Current import path mappings:

| Old Path | New Path |
|----------|----------|
| `shared/core/error-handling/` | `shared/core/error-management/` |
| `shared/core/validation/` | `shared/core/validation/` |

## Success Criteria

Migration is considered successful when:

- [ ] All import paths updated to new structure
- [ ] Validation tools pass with zero issues
- [ ] All tests passing
- [ ] Application functionality verified
- [ ] Performance metrics within acceptable ranges
- [ ] No rollback required

## Safety Features

### Automatic Backups
- All modified files automatically backed up with `.backup` extension
- Backups created before any file modifications
- Backup integrity verified before restoration

### Validation Checks
- Pre-migration validation ensures clean starting state
- Post-migration validation confirms completeness
- Continuous validation during rollout phases

### Feature Flags
- Granular control over migration rollout
- Percentage-based rollout for canary deployments
- Instant disable capability for emergency rollback

### Rollback Capabilities
- Full system rollback to pre-migration state
- Selective rollback for specific components
- Zero data loss guaranteed
- Backup cleanup after successful migration

## Testing

Run the comprehensive test suite:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- __tests__/codemod-imports.test.js
```

Test coverage includes:
- Import path transformation logic
- Validation algorithms
- Rollback procedures
- Feature flag management
- Error handling and edge cases

## Troubleshooting

### Common Issues

**Validation fails after migration:**
- Check that all import paths were updated
- Verify new module paths exist
- Run `npm run validate` for detailed error report

**Backup files not found:**
- Ensure migration was run before attempting rollback
- Check file permissions
- Verify backup creation in logs

**Feature flags not working:**
- Check `migration/feature-flags.json` configuration
- Verify flag names match expected values
- Restart application after flag changes

### Emergency Procedures

1. **Disable all migration flags immediately:**
   ```bash
   node feature-flags.js disable MIGRATION_PHASE_1
   node feature-flags.js disable MIGRATION_PHASE_2
   # ... disable all phases
   ```

2. **Full system rollback:**
   ```bash
   npm run rollback
   ```

3. **Validate rollback success:**
   ```bash
   npm run validate
   ```

## Monitoring and Metrics

Track these metrics during migration:

- Import path update success rate
- Validation error counts over time
- Rollback frequency
- Performance impact
- Error rates by component

## Support

For issues or questions:
1. Check this documentation first
2. Review test failures for guidance
3. Check application logs
4. Use rollback procedures if needed

## Version History

- **v1.0.0** - Initial release with full migration tooling
  - Automated codemod scripts
  - Validation and rollback tools
  - Feature flag management
  - Comprehensive test suite