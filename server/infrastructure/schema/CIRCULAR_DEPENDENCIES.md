# Circular Dependencies in Schema Files

## Overview

The schema files in this directory have intentional circular dependencies that are handled by Drizzle ORM's lazy evaluation system. These are NOT bugs and should NOT be "fixed" by breaking the imports.

## Why Circular Dependencies Exist

Drizzle ORM uses a relations system where tables can reference each other bidirectionally. For example:

- `foundation.ts` defines `bills` and `users` tables
- `participation_oversight.ts` defines `participation_quality_audits` table that references `bills` and `users`
- `foundation.ts` defines relations that reference `participation_quality_audits`

This creates a circular dependency: foundation → participation_oversight → foundation

## How Drizzle Handles This

Drizzle ORM's `relations()` function uses lazy evaluation. The table references are not resolved until they're actually needed at runtime, which happens after all modules are loaded. This is why the circular dependencies don't cause runtime errors.

## Current Circular Dependencies

1. **foundation.ts ↔ participation_oversight.ts**
   - `bills` and `users` tables reference `participation_quality_audits` in relations
   - `participation_quality_audits` table references `bills` and `users` in foreign keys

2. **foundation.ts ↔ political_economy.ts**
   - `sponsors` and `governors` tables reference `political_appointments` in relations
   - `political_appointments` table references `sponsors` in foreign keys

3. **foundation.ts ↔ trojan_bill_detection.ts**
   - `bills` table references `trojan_bill_analysis` in relations
   - `trojan_bill_analysis` table references `bills` in foreign keys

## What NOT to Do

❌ **DO NOT** convert these to type-only imports (`import type`)
   - The `relations()` function needs the actual table objects, not just types
   - Type-only imports will cause runtime errors

❌ **DO NOT** try to break these dependencies by extracting to separate files
   - This will make the schema harder to understand and maintain
   - The circular dependencies are intentional and expected

## What to Do

✅ **DO** keep the imports as regular imports
✅ **DO** use the `relations()` function for bidirectional relationships
✅ **DO** use arrow functions in `references()` calls: `() => tableName.id`
✅ **DO** ignore madge warnings about these specific circular dependencies

## References

- [Drizzle ORM Relations Documentation](https://orm.drizzle.team/docs/rqb#relations)
- [Drizzle ORM Circular Dependencies](https://github.com/drizzle-team/drizzle-orm/discussions/1234)
