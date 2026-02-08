# Phase 6: Import Cleanup and Validation

This directory contains scripts for Phase 6 of the client error remediation process.

## Overview

Phase 6 focuses on:
1. **Import Cleanup** - Removing unused imports and correcting incorrect paths
2. **Type Assertion Analysis** - Identifying and validating type assertions
3. **Final Validation** - Running full TypeScript compilation and tests
4. **Final Report** - Generating comprehensive remediation documentation

## Scripts

### Run All Phase 6 Tasks

```bash
cd scripts/error-remediation
npx tsx run-phase-6.ts
```

This orchestrates all Phase 6 tasks in sequence.

### Individual Task Scripts

#### Task 16.1: Import Cleanup

```bash
npx tsx run-import-cleanup.ts
```

**What it does:**
- Scans all TypeScript files for unused imports
- Identifies incorrect import paths
- Generates fixes for both issues
- Applies fixes in batches with validation
- Reports on files modified and errors fixed

**Output:**
- `reports/import-analysis-report.json` - Detailed analysis of all imports
- Console output showing unused imports and incorrect paths

#### Task 16.3: Type Assertion Analysis

```bash
npx tsx run-type-assertion-analysis.ts
```

**What it does:**
- Finds all existing type assertions in the codebase
- Identifies potential locations that might need assertions
- Validates safety of each assertion
- Determines if assertions are necessary
- Generates recommendations for each assertion

**Output:**
- `reports/type-assertion-analysis-report.json` - Full analysis results
- `reports/type-assertion-recommendations.json` - Actionable recommendations
- Console output categorizing assertions as safe/unsafe/unnecessary

**Assertion Categories:**
- **Safe and Necessary** - Keep with justification comments
- **Unsafe** - Add runtime validation or use type guards
- **Unnecessary** - Remove or replace with better typing

#### Task 16.5: Final Validation

```bash
npx tsx run-final-validation.ts
```

**What it does:**
- Runs full TypeScript compilation on entire client codebase
- Compares current errors with initial error report
- Detects any regressions introduced
- Runs existing test suite (if available)
- Generates comprehensive validation report

**Output:**
- `reports/final-validation-report.json` - Complete validation results
- Console output showing:
  - Total errors remaining
  - Errors by category and severity
  - Top files with errors
  - Regression analysis
  - Test results

**Exit codes:**
- `0` - Zero errors and all tests passed
- `1` - Errors remain or tests failed

#### Task 16.6: Final Report Generation

```bash
npx tsx generate-final-report.ts
```

**What it does:**
- Aggregates data from all phases
- Documents all fixes applied
- Calculates statistics (errors fixed, fix rate, etc.)
- Lists files modified
- Documents type consolidation decisions
- Identifies breaking changes
- Lists manual fixes required
- Generates recommendations

**Output:**
- `reports/final-remediation-report.json` - Machine-readable report
- `reports/FINAL-REMEDIATION-REPORT.md` - Human-readable markdown report
- Console output with summary statistics

## Report Files

All reports are saved to the `reports/` directory:

### Import Analysis
- `import-analysis-report.json` - Unused imports and incorrect paths

### Type Assertions
- `type-assertion-analysis-report.json` - All type assertions analyzed
- `type-assertion-recommendations.json` - Recommendations for each assertion

### Validation
- `final-validation-report.json` - TypeScript compilation and test results
- `initial-error-report.json` - Baseline error count (for comparison)

### Final Report
- `final-remediation-report.json` - Complete remediation summary (JSON)
- `FINAL-REMEDIATION-REPORT.md` - Complete remediation summary (Markdown)

## Understanding the Reports

### Import Analysis Report

```json
{
  "unusedImports": [
    {
      "file": "path/to/file.ts",
      "importPath": "@client/unused-module",
      "importedNames": ["UnusedType"],
      "line": 5
    }
  ],
  "incorrectPaths": [
    {
      "file": "path/to/file.ts",
      "importPath": "./wrong-path",
      "reason": "File does not exist",
      "line": 10,
      "suggestedFix": "./correct-path"
    }
  ]
}
```

### Type Assertion Analysis Report

```json
{
  "safeAssertions": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "expression": "value",
      "currentType": "unknown",
      "targetType": "string",
      "isSafe": true,
      "isNecessary": true,
      "reason": "Safe and necessary - keep with justification comment"
    }
  ],
  "unsafeAssertions": [...],
  "unnecessaryAssertions": [...]
}
```

### Final Validation Report

```json
{
  "totalErrors": 0,
  "errorsByCategory": {
    "MODULE_RESOLUTION": 0,
    "TYPE_COMPARISON": 0
  },
  "regressions": [],
  "testResults": {
    "passed": true,
    "totalTests": 150,
    "passedTests": 150,
    "failedTests": 0
  }
}
```

### Final Remediation Report

```json
{
  "summary": {
    "initialErrors": 360,
    "finalErrors": 0,
    "errorsFixed": 360,
    "fixRate": "100%"
  },
  "phaseBreakdown": [...],
  "typeConsolidation": {
    "typesConsolidated": 8,
    "canonicalLocations": {
      "DashboardPreferences": "shared/types/dashboard/index.ts"
    }
  },
  "breakingChanges": [],
  "manualFixesRequired": []
}
```

## Workflow

### Standard Workflow

1. **Run import cleanup** to remove unused imports and fix paths
2. **Analyze type assertions** to identify unsafe or unnecessary assertions
3. **Run final validation** to verify zero errors
4. **Generate final report** to document all work

### Quick Validation

If you just want to check the current state:

```bash
npx tsx run-final-validation.ts
```

### Full Phase 6 Execution

To run everything in sequence:

```bash
npx tsx run-phase-6.ts
```

## Troubleshooting

### Import Cleanup Issues

**Problem:** Import removal introduces new errors

**Solution:** The script validates after each batch and rolls back if errors increase. Check the console output for which imports caused issues.

### Type Assertion Issues

**Problem:** Many unsafe assertions detected

**Solution:** Review the recommendations in `type-assertion-recommendations.json`. For each unsafe assertion:
- Add runtime validation if asserting from `any`/`unknown`
- Use type guards if narrowing union types
- Improve function signatures if possible

### Validation Failures

**Problem:** Final validation shows errors remain

**Solution:** 
1. Check `final-validation-report.json` for error details
2. Review errors by category to identify patterns
3. Focus on high-severity errors first
4. Check for regressions that may have been introduced

### Report Generation Issues

**Problem:** Missing data in final report

**Solution:** Ensure all previous phases have been run and their reports exist in the `reports/` directory.

## Design Principles

Phase 6 follows these key principles:

1. **No New Modules** - No stubs, adapters, or compatibility layers are created
2. **Validation First** - All changes are validated before being committed
3. **Rollback on Failure** - Batches that introduce errors are rolled back
4. **Comprehensive Documentation** - All changes are documented in reports
5. **Type Safety** - Type assertions are used strategically and safely

## Next Steps

After Phase 6 completion:

1. Review the final remediation report
2. Address any manual fixes required
3. Implement recommendations for ongoing maintenance
4. Set up continuous validation (e.g., pre-commit hooks)
5. Document any breaking changes for the team

## Support

For issues or questions:
1. Check the console output for detailed error messages
2. Review the JSON reports for raw data
3. Check the markdown report for human-readable summaries
4. Refer to the main remediation design document
