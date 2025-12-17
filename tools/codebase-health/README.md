# Codebase Health Remediation Tool

This tool systematically resolves import/export mismatches and type inconsistencies in TypeScript codebases.

## Project Structure

```
tools/codebase-health/
├── src/
│   ├── analysis/           # Analysis engine and core scanning logic
│   │   └── AnalysisEngine.ts
│   ├── classification/     # Issue classification and prioritization
│   │   └── IssueClassifier.ts
│   ├── models/            # Core data models and interfaces
│   │   ├── CodeIssue.ts
│   │   └── FixResult.ts
│   ├── utils/             # Utility functions
│   │   ├── FileUtils.ts
│   │   └── ASTUtils.ts
│   └── index.ts           # Main exports
├── tests/                 # Test files and test data
│   ├── test-data/         # Sample files with known issues
│   ├── models/            # Model tests
│   ├── classification/    # Classification tests
│   ├── analysis/          # Analysis engine tests
│   ├── utils/             # Utility tests
│   └── setup.ts           # Jest setup
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Core Interfaces

### AnalysisEngine
- `scanCodebase()` - Analyzes entire codebase for issues
- `validateImports()` - Validates imports for specific file
- `checkTypeConsistency()` - Checks type consistency for specific file
- `detectCircularDependencies()` - Detects circular dependency cycles

### IssueClassifier
- `classifyIssue()` - Categorizes issues by severity and impact
- `prioritizeIssues()` - Orders issues by priority for resolution
- `determineResolutionStrategy()` - Determines if issue can be automated

### Core Models
- `CodeIssue` - Base interface for all code issues
- `ImportExportIssue` - Import/export mismatch issues
- `TypeIssue` - Type consistency issues
- `CircularDependency` - Circular dependency issues

## Test Data

The `tests/test-data/` directory contains sample TypeScript files with known issues:

- `sample-with-issues.ts` - File with various import/export and type issues
- `correct-file.ts` - File with correct exports for testing import resolution
- `circular-import-file.ts` - File that creates circular dependencies

## Running Tests

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Building

```bash
# Build TypeScript to JavaScript
npm run build

# Clean build artifacts
npm run clean
```

This foundation provides the core structure and interfaces needed for the codebase health remediation system.