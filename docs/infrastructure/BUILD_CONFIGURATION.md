# Infrastructure Build Configuration

This document describes the build configuration and quality gates for the client infrastructure consolidation project.

## TypeScript Configuration

### Strict Mode
The project uses TypeScript strict mode with all strict checks enabled:

- `strict: true` - Enables all strict type checking options
- `noImplicitAny: true` - Errors on expressions with implied 'any' type
- `strictNullChecks: true` - Enables strict null checking
- `strictFunctionTypes: true` - Enables strict checking of function types
- `noImplicitReturns: true` - Errors on functions that don't return a value
- `noImplicitThis: true` - Errors on 'this' expressions with implied 'any' type
- `noUncheckedIndexedAccess: true` - Adds undefined to index signature results

### Path Aliases
The following path aliases are configured for infrastructure imports:

```typescript
"@/infrastructure": ["./src/infrastructure"]
"@/infrastructure/*": ["./src/infrastructure/*"]
"@core": ["./src/infrastructure"]
"@core/*": ["./src/infrastructure/*"]
```

### Build Failure on Type Errors
The build is configured to fail on any type errors:
- `noEmit: true` - TypeScript only checks types, doesn't emit files
- Vite handles the actual build process
- CI pipeline runs `npm run type-check` which fails on any type errors

## Dependency Analysis Tools

### Madge
Madge is used for circular dependency detection:

```bash
# Check for circular dependencies in infrastructure
npm run analyze:infrastructure:circular

# Generate dependency graph visualization
npm run analyze:infrastructure:graph
```

Configuration: `.madgerc`

### Dependency Cruiser
Dependency-cruiser validates module boundaries and architectural rules:

```bash
# Analyze dependencies
npm run analyze:imports

# Generate dependency visualization
npm run analyze:infrastructure:deps
```

Configuration: `.dependency-cruiser.cjs`

Rules enforced:
- No circular dependencies in infrastructure modules
- Infrastructure modules should be imported through public API (index.ts)
- No client-to-server or server-to-client imports

### ts-morph
ts-morph is used for TypeScript AST manipulation and analysis:

```bash
# Analyze infrastructure modules
npm run analyze:infrastructure
```

Script: `scripts/analyze-infrastructure.ts`

## Pre-commit Hooks

### Husky
Husky is configured to run pre-commit hooks:

```bash
# Install Husky (if not already installed)
npm install --save-dev husky lint-staged
npm run prepare
```

Pre-commit checks:
1. TypeScript type checking
2. ESLint linting
3. Circular dependency detection

Configuration: `.husky/pre-commit`

### Lint-staged
Lint-staged runs linters on staged files:

```json
{
  "lint-staged": {
    "client/**/*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "client/src/infrastructure/**/*.{ts,tsx}": [
      "npm run analyze:infrastructure:circular"
    ]
  }
}
```

## CI/CD Pipeline

### GitHub Actions Workflow
The CI pipeline runs on every pull request and push to main/develop:

**Quality Gates:**
1. TypeScript type checking
2. Circular dependency check
3. Dependency boundary validation
4. ESLint with accessibility rules
5. Prettier code formatting
6. Unit tests with coverage

**Accessibility Tests:**
- Automated accessibility testing
- Accessibility report generation

**Performance Tests:**
- Bundle size analysis
- Performance budget checks

**Security Scanning:**
- Trivy vulnerability scanner
- npm audit

Configuration: `.github/workflows/chanuka-client-ci.yml`

### Validation Script
A comprehensive validation script runs all checks:

```bash
# Run all infrastructure validations
npm run validate:infrastructure
```

This script validates:
1. TypeScript type checking
2. Circular dependencies
3. Linting
4. Build success

Script: `scripts/validate-infrastructure.ts`

## Build Quality Enforcement

### Build Failure Conditions
The build will fail if:
- Any TypeScript type errors exist
- Circular dependencies are detected in infrastructure
- ESLint errors are found
- Tests fail
- Module boundary violations are detected

### Success Criteria
For the build to pass:
- Zero type errors
- Zero circular dependencies
- Zero ESLint errors
- All tests passing
- All module boundaries respected

## Usage

### Local Development
```bash
# Run type checking
cd client && npm run type-check

# Check for circular dependencies
npm run analyze:infrastructure:circular

# Run all validations
npm run validate:infrastructure
```

### CI/CD
The CI pipeline automatically runs all validations on:
- Pull requests to main/develop
- Pushes to main/develop
- Changes to client code or CI configuration

### Pre-commit
Pre-commit hooks automatically run on every commit:
```bash
git commit -m "Your commit message"
# Hooks run automatically:
# - Type checking
# - Linting
# - Circular dependency check
```

## Troubleshooting

### Type Errors
If you encounter type errors:
1. Run `cd client && npm run type-check` to see all errors
2. Fix errors one by one
3. Use `// @ts-expect-error` only as a last resort with explanation

### Circular Dependencies
If circular dependencies are detected:
1. Run `npm run analyze:infrastructure:circular` to see the cycle
2. Use dependency injection or interface extraction to break the cycle
3. See `docs/architecture/CIRCULAR_DEPENDENCY_RESOLUTION.md` for strategies

### Build Failures
If the build fails:
1. Check the CI logs for specific errors
2. Run `npm run validate:infrastructure` locally to reproduce
3. Fix errors and push again

## References

- [TypeScript Strict Mode](https://www.typescriptlang.org/tsconfig#strict)
- [Madge Documentation](https://github.com/pahen/madge)
- [Dependency Cruiser Documentation](https://github.com/sverweij/dependency-cruiser)
- [Husky Documentation](https://typicode.github.io/husky/)
