# Feature Templates

## Overview

This directory contains reusable templates for common development tasks in the Chanuka Platform. Each template provides step-by-step instructions with code examples that follow established integration patterns.

## Available Templates

### 1. [New Domain Entity Template](./new-entity-template.md)

**Use when:** Adding a completely new entity to the system (e.g., Vote, Comment, Tag)

**Includes:**
- Branded ID type definition
- Domain type definition
- Database schema creation
- Validation schemas
- Transformation utilities
- API contracts
- Repository layer
- Service layer
- API routes
- Client API layer
- React components
- Unit and integration tests

**Time estimate:** 2-4 hours for complete implementation

---

### 2. [New API Endpoint Template](./new-api-endpoint-template.md)

**Use when:** Adding a new endpoint to an existing entity (e.g., GET /bills/:id/statistics)

**Includes:**
- API contract types
- Validation schemas
- Service method
- Route handler
- Client API method
- React component
- Unit and integration tests

**Time estimate:** 30 minutes - 1 hour

---

### 3. [New Database Migration Template](./new-migration-template.md)

**Use when:** Making any database schema change

**Covers:**
- Adding a new table
- Adding a column
- Modifying a column
- Removing a column
- Adding an index
- Adding a constraint

**Includes:**
- Migration generation
- Schema updates
- Type updates
- Validation updates
- Transformer updates
- Migration verification
- Testing procedures
- Rollback procedures

**Time estimate:** 30 minutes - 2 hours depending on complexity

---

## How to Use These Templates

### Step 1: Choose the Right Template

- **New feature with data persistence?** → Start with New Domain Entity Template
- **New operation on existing entity?** → Use New API Endpoint Template
- **Database schema change?** → Use New Database Migration Template

### Step 2: Copy the Template Content

Each template contains placeholder text that you'll replace:

- `{Entity}` - Entity name in PascalCase (e.g., `Vote`, `Comment`)
- `{entity}` - Entity name in camelCase (e.g., `vote`, `comment`)
- `{entities}` - Plural form in camelCase (e.g., `votes`, `comments`)
- `{ENTITY}` - Entity name in UPPER_CASE (e.g., `VOTE`, `COMMENT`)
- `{field_name}` - Field name in snake_case (e.g., `vote_count`)
- `{fieldName}` - Field name in camelCase (e.g., `voteCount`)

### Step 3: Follow the Checklist

Each template includes a checklist at the top. Work through it step by step:

```markdown
- [ ] Step 1: Define branded ID type
- [ ] Step 2: Define domain type
- [ ] Step 3: Create database schema
...
```

### Step 4: Verify Integration

After completing a template:

1. **Run type checking:**
   ```bash
   npm run type-check
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Verify type alignment:**
   ```bash
   npm run verify:types
   ```

4. **Test manually:**
   - Use Postman or curl to test API endpoints
   - Test UI components in the browser
   - Verify database changes in DB studio

---

## Template Philosophy

These templates follow the Chanuka Platform's integration principles:

### 1. Single Source of Truth
Each entity, type, and validation rule is defined exactly once in the shared layer.

### 2. Type-Driven Development
TypeScript types drive database schemas, API contracts, and validation.

### 3. Fail-Fast Validation
Errors are caught at compile time whenever possible, runtime otherwise.

### 4. Layer Separation
Clear boundaries between layers with explicit integration points:
- **Client Layer**: React components, state management
- **Shared Layer**: Types, validation, utilities
- **Server Layer**: Routes, services, repositories
- **Database Layer**: Schema, migrations

### 5. Transformation Pipeline
Data flows through consistent transformations:
```
Database → Domain → API → Client
```

---

## Common Workflows

### Workflow 1: Adding a Complete Feature

**Example:** Add voting functionality to bills

1. Use **New Domain Entity Template** to create Vote entity
2. Use **New API Endpoint Template** to add GET /bills/:id/votes
3. Use **New API Endpoint Template** to add POST /votes
4. Use **New API Endpoint Template** to add DELETE /votes/:id

### Workflow 2: Extending an Existing Feature

**Example:** Add statistics to bills

1. Use **New API Endpoint Template** to add GET /bills/:id/statistics
2. Update service layer with calculation logic
3. Create React component to display statistics

### Workflow 3: Schema Evolution

**Example:** Add optional "reason" field to votes

1. Use **New Database Migration Template** (Type 2: Adding a Column)
2. Follow steps to update types, validation, and transformers
3. Update API contracts to expose new field
4. Update UI to allow entering reason

---

## Best Practices

### DO:
✅ Follow templates step-by-step  
✅ Use branded types for all entity IDs  
✅ Define types in shared layer  
✅ Validate at all boundaries  
✅ Write both unit and integration tests  
✅ Run verification tools after changes  
✅ Test migrations forward and backward  

### DON'T:
❌ Skip steps in the template  
❌ Define types in multiple places  
❌ Use raw strings for entity IDs  
❌ Skip validation schemas  
❌ Forget to update transformers  
❌ Deploy without testing migrations  
❌ Modify applied migrations in production  

---

## Getting Help

### Template Issues

If you encounter issues with a template:

1. **Check the integration pattern examples:**
   - See [Integration Pattern Examples](../integration-pattern-examples.md)

2. **Review the design document:**
   - See [Full-Stack Integration Design](.kiro/specs/full-stack-integration/design.md)

3. **Check existing implementations:**
   - Look at similar entities in the codebase
   - Review recent pull requests

4. **Ask the team:**
   - Post in #development channel
   - Tag @architecture-team for design questions

### Common Problems

**Problem:** Type errors after adding new field  
**Solution:** Ensure you updated all layers: domain types, validation schemas, transformers, and API contracts

**Problem:** Migration fails to apply  
**Solution:** Check for syntax errors in SQL, verify foreign key references exist, ensure constraints are valid

**Problem:** Tests fail after changes  
**Solution:** Update test fixtures to include new fields, verify mock data matches new schema

**Problem:** Circular dependency errors  
**Solution:** Review import paths, ensure shared layer doesn't import from server/client layers

---

## Template Maintenance

These templates are living documents. If you find:

- Missing steps
- Outdated patterns
- Unclear instructions
- Better approaches

Please:

1. Create an issue describing the problem
2. Submit a PR with improvements
3. Update related documentation

---

## Quick Reference

### File Locations

```
shared/
├── types/
│   ├── core/branded.ts          # Branded ID types
│   ├── domains/{entity}.ts      # Domain types
│   └── api/contracts/{entity}.contract.ts  # API contracts
├── validation/
│   └── schemas/{entity}.schema.ts  # Validation schemas
└── utils/
    └── transformers/{entity}.transformer.ts  # Transformers

server/
├── infrastructure/
│   ├── schema/{entities}.ts     # Database schema
│   └── repositories/{entity}.repository.ts  # Data access
├── services/{entity}.service.ts  # Business logic
└── routes/{entities}.ts         # API routes

client/
├── src/
│   ├── api/{entities}.api.ts    # API client
│   └── features/{entities}/     # React components

tests/
├── unit/{entity}.test.ts        # Unit tests
└── integration/{entity}.integration.test.ts  # Integration tests
```

### Command Reference

```bash
# Type checking
npm run type-check

# Run tests
npm test
npm test {entity}
npm test:integration

# Database operations
npm run db:generate          # Generate migration
npm run db:migrate          # Apply migrations
npm run db:studio           # Open database UI

# Verification
npm run verify:types        # Verify type alignment
npm run verify:migration    # Verify migration safety

# Development
npm run dev                 # Start dev server
npm run build              # Build for production
```

---

## Related Documentation

- [Integration Pattern Examples](../integration-pattern-examples.md) - Detailed examples with explanations
- [Code Organization Standards](../code-organization-standards.md) - Where to place different types of code
- [Developer Onboarding](../developer-onboarding.md) - Getting started guide
- [Architecture Documentation](../../technical/architecture.md) - System architecture overview

---

## Version History

- **v1.0** (2024-01-XX) - Initial template creation
  - New Domain Entity Template
  - New API Endpoint Template
  - New Database Migration Template

---

**Last Updated:** 2024-01-XX  
**Maintained By:** Architecture Team  
**Questions?** Contact @architecture-team or post in #development
