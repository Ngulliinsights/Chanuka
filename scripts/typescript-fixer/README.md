# TypeScript Error Fixer

An automated TypeScript error fixing tool specifically designed for the Chanuka project codebase. This tool systematically resolves import issues, schema reference problems, unused variables, and type compatibility issues that have accumulated through organic growth and multiple refactors.

## Features

- **Schema Import Fixing**: Automatically fixes missing schema imports from `@shared/schema`
- **Shared Core Utilities**: Resolves import paths for shared utilities from `shared/core`
- **Database Connection Imports**: Fixes database service and connection imports
- **Unused Variable Cleanup**: Removes unused imports and variables
- **API Response Utilities**: Fixes parameter mismatches in API response functions
- **Optional Property Types**: Handles `exactOptionalPropertyTypes` configuration issues
- **Project Structure Analysis**: Understands Chanuka-specific patterns and conventions

## Installation

```bash
cd scripts/typescript-fixer
npm install
npm run build
```

## Usage

### Command Line Interface

#### Analyze Project Structure

```bash
# Analyze the current project
npm run dev analyze

# Analyze a specific project
npm run dev analyze --project /path/to/chanuka

# Output as JSON
npm run dev analyze --output json

# Output as Markdown
npm run dev analyze --output markdown
```

#### Fix TypeScript Errors

```bash
# Fix all errors in the project (preview mode)
npm run dev fix --preview

# Fix specific files
npm run dev fix server/features/users/user-service.ts

# Fix specific directories
npm run dev fix server/features/users/

# Fix specific error types only
npm run dev fix --errors 2304,6133

# Skip backup creation
npm run dev fix --no-backup

# Output results as JSON
npm run dev fix --output json
```

#### Show Configuration

```bash
npm run dev config
```

### Programmatic Usage

```typescript
import { TypeScriptErrorFixer, ProjectAnalyzer } from './src';

// Analyze project structure
const analyzer = new ProjectAnalyzer('/path/to/chanuka');
const structure = await analyzer.analyzeProject();

// Create fixer instance
const fixer = new TypeScriptErrorFixer('/path/to/chanuka');
const projectStructure = await fixer.analyzeProject();
```

## Supported Error Types

The tool currently handles these TypeScript error codes:

- **TS2304**: Cannot find name (missing imports)
- **TS6133**: Declared but never used (unused variables/imports)
- **TS2375**: Duplicate identifier / exactOptionalPropertyTypes issues
- **TS7030**: Not all code paths return a value
- **TS2345**: Argument type not assignable to parameter type
- **TS2339**: Property does not exist on type
- **TS2322**: Type is missing properties

## Project Structure

```
scripts/typescript-fixer/
├── src/
│   ├── types/
│   │   └── core.ts              # Core type definitions
│   ├── analyzers/
│   │   └── project-analyzer.ts  # Project structure analysis
│   ├── cli.ts                   # Command line interface
│   └── index.ts                 # Main entry point
├── tests/
│   ├── analyzers/
│   │   └── project-analyzer.test.ts
│   └── setup.ts                 # Test utilities
├── package.json
├── tsconfig.json
├── jest.config.js
└── README.md
```

## Configuration

The tool uses a default configuration optimized for the Chanuka project:

```typescript
{
  enabledErrorTypes: [2304, 6133, 2375, 7030, 2345, 2339, 2322],
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/*.d.ts',
    '**/tests/**',
    '**/__tests__/**',
    '**/*.test.ts',
    '**/*.spec.ts',
  ],
  includePatterns: [
    'server/**/*.ts',
    'client/src/**/*.ts',
    'client/src/**/*.tsx',
    'shared/**/*.ts',
  ],
  backupFiles: true,
  previewMode: false,
  outputFormat: 'console',
  maxConcurrency: 4,
  continueOnError: true,
}
```

## Development

### Running Tests

```bash
npm test
npm run test:watch
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev -- analyze
npm run dev -- fix --preview
```

## Chanuka Project Integration

This tool is specifically designed for the Chanuka project and understands:

- **Schema Structure**: Tables like `users`, `bills`, `user_profiles`, `impact_measurement`
- **Shared Utilities**: Common utilities from `shared/core/src`
- **Database Patterns**: Connection patterns and service usage
- **API Response Patterns**: `ApiSuccess`, `ApiError`, `ApiValidationError` usage
- **Import Conventions**: Alias paths and relative import patterns

## Safety Features

- **Backup Creation**: Automatically creates `.backup` files before modifications
- **Preview Mode**: Shows proposed changes without applying them
- **Rollback Support**: Can restore from backup files
- **Validation**: Re-compiles code after fixes to verify correctness
- **Incremental Processing**: Continues even if some files fail

## Troubleshooting

### Common Issues

1. **TypeScript Config Not Found**
   - Ensure `tsconfig.json` exists in the project root
   - Use `--project` flag to specify correct path

2. **Permission Errors**
   - Check file permissions
   - Run with appropriate user privileges

3. **Memory Issues with Large Projects**
   - Reduce `maxConcurrency` setting
   - Process files in smaller batches

### Getting Help

Run any command with `--help` for detailed usage information:

```bash
npm run dev -- --help
npm run dev -- analyze --help
npm run dev -- fix --help
```

## Contributing

This tool is part of the Chanuka project infrastructure. When adding new error handlers or features:

1. Add appropriate type definitions to `src/types/core.ts`
2. Implement the handler following existing patterns
3. Add comprehensive tests
4. Update this README with new capabilities

## License

MIT License - See the main Chanuka project for full license details.