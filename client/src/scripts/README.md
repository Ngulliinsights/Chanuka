# 🛠️ Migration Scripts

This directory contains automated tools for migrating and maintaining the unified styling system.

## 📋 Available Scripts

### 🔄 Component Migration

```bash
# Migrate components automatically (dry run first)
npm run migrate:components:dry-run

# Apply migrations
npm run migrate:components

# Verbose output for debugging
npm run migrate:components:verbose
```

**What it does:**

- Converts legacy Button/Card/Badge imports to unified components
- Updates hardcoded colors to design tokens
- Adds accessibility improvements (button types, touch targets)
- Fixes common styling issues

### 📊 Bundle Analysis

```bash
# Analyze current CSS bundle
npm run analyze:bundle

# Compare before/after performance
npm run analyze:bundle:compare
```

**What it does:**

- Measures CSS bundle size and compression
- Identifies duplicate rules and optimization opportunities
- Provides actionable recommendations
- Tracks performance improvements over time

### ⚡ Performance Audit

```bash
# Run performance audit
npm run audit:performance

# Compare with baseline
npm run audit:performance:compare baseline.json

# Generate detailed report
npm run audit:performance:report performance-report.json
```

**What it does:**

- Measures bundle sizes (raw and gzipped)
- Analyzes code complexity and duplicates
- Estimates loading performance metrics
- Provides performance grades and recommendations

### ✅ Migration Validation

```bash
# Validate migration completeness
npm run validate:migration

# Check migration status
npm run migration:status

# Complete validation with status
npm run migration:complete
```

**What it does:**

- Verifies unified components are properly set up
- Checks design tokens are correctly configured
- Scans for legacy patterns that need migration
- Provides detailed validation report

### 🧪 Testing

```bash
# Run visual regression tests
npm run test:visual

# Run all component tests
npm run test:components
```

## 🎯 Usage Examples

### Migrating a New Component

```bash
# 1. First, run a dry run to see what would change
npm run migrate:components:dry-run

# 2. Apply the changes
npm run migrate:components

# 3. Validate the migration
npm run validate:migration

# 4. Run tests to ensure nothing broke
npm run test:components
```

### Performance Monitoring

```bash
# 1. Create a baseline before changes
npm run audit:performance:compare baseline.json

# 2. Make your changes...

# 3. Compare performance after changes
npm run audit:performance:compare baseline.json

# 4. Generate a detailed report
npm run audit:performance:report report.json
```

### Bundle Optimization

```bash
# 1. Analyze current bundle
npm run analyze:bundle

# 2. Look for optimization opportunities in the output

# 3. Apply optimizations (remove duplicates, etc.)

# 4. Re-analyze to confirm improvements
npm run analyze:bundle
```

## 📁 Script Details

### migrate-components.ts

- **Purpose**: Automated component migration
- **Features**:
  - Import statement updates
  - Component usage replacements
  - Style token migrations
  - Accessibility improvements
- **Safety**: Includes dry-run mode and backup recommendations

### analyze-bundle.ts

- **Purpose**: CSS bundle analysis and optimization
- **Features**:
  - File size measurement
  - Duplicate rule detection
  - Performance recommendations
  - Before/after comparisons

### performance-audit.ts

- **Purpose**: Comprehensive performance monitoring
- **Features**:
  - Bundle size tracking
  - Code complexity analysis
  - Loading performance estimation
  - Performance grading system

### validate-migration.ts

- **Purpose**: Migration completeness validation
- **Features**:
  - Component setup verification
  - Design token validation
  - Legacy pattern detection
  - Detailed reporting

## 🔧 Configuration

### Migration Rules

Edit `migrate-components.ts` to add new migration patterns:

```typescript
const COMPONENT_MIGRATIONS: MigrationRule[] = [
  {
    pattern: /old-pattern/g,
    replacement: 'new-pattern',
    description: 'Description of what this fixes',
  },
];
```

### Performance Thresholds

Adjust performance thresholds in `performance-audit.ts`:

```typescript
// Bundle size warnings
if (bundleSize.css.total > 100000) {
  // 100KB threshold
  recommendations.push('Bundle size warning...');
}
```

### Validation Rules

Add new validation checks in `validate-migration.ts`:

```typescript
const legacyPatterns = [
  {
    pattern: /legacy-pattern/g,
    message: 'Description of the issue',
  },
];
```

## 🚨 Troubleshooting

### Common Issues

**"Module not found" errors:**

```bash
# Install missing dependencies
npm install tsx glob zlib
```

**Permission errors:**

```bash
# Make scripts executable (Unix/Mac)
chmod +x src/scripts/*.ts
```

**TypeScript compilation errors:**

```bash
# Check TypeScript configuration
npx tsc --noEmit src/scripts/migrate-components.ts
```

### Debug Mode

Add `--verbose` flag to any script for detailed output:

```bash
npm run migrate:components -- --verbose
```

### Dry Run Mode

Always test migrations first:

```bash
npm run migrate:components:dry-run
```

## 📊 Performance Benchmarks

### Expected Results After Migration

- **Bundle Size**: 15-20% reduction
- **Duplicate Rules**: 50-80% reduction
- **Performance Score**: 80+ (out of 100)
- **Loading Time**: 10-15% improvement

### Monitoring

Set up automated monitoring in CI/CD:

```bash
# In your CI pipeline
npm run audit:performance:compare baseline.json
if [ $? -ne 0 ]; then
  echo "Performance regression detected!"
  exit 1
fi
```

## 🤝 Contributing

### Adding New Migration Rules

1. Identify the pattern to migrate
2. Add the rule to the appropriate script
3. Test with dry-run mode
4. Update documentation
5. Add validation checks

### Improving Performance Analysis

1. Add new metrics to track
2. Update threshold recommendations
3. Enhance reporting format
4. Test with various codebases

## 📚 Resources

- [Migration Guide](../styles/MIGRATION_GUIDE.md)
- [Style Guide](../styles/STYLE_GUIDE.md)
- [Unified Components](../components/ui/unified-components.tsx)
- [Design Tokens](../styles/design-tokens.css)

---

## 🎉 Success!

These scripts have successfully migrated your styling system to a unified, optimized, and maintainable architecture. Use them regularly to maintain code quality and performance as your project grows!
