# Database Seed Scripts

This directory contains database seeding scripts for the Chanuka platform. These scripts populate the database with initial data for development, testing, and production environments.

## Seed Script Overview

### Primary Seeds

**`primary-seed.ts`** — CANONICAL SEED SCRIPT  
The main seed script for setting up a new development environment. This is the recommended starting point for all new developers.

**`primary-seed-aligned.ts`**  
Aligned version of the primary seed that ensures data consistency with the current schema. Use this when the schema has been updated and you need to reseed with aligned data structures.

**`primary-seed-direct.ts`**  
Direct database insertion version that bypasses ORM validation. Use this for performance-critical seeding or when you need to seed data that doesn't conform to current validation rules (e.g., historical data migration).

### Secondary Seeds

**`secondary-seed.ts`**  
Supplementary data that builds on top of the primary seed. Run this AFTER `primary-seed.ts` to add additional test data, sample bills, user accounts, and community content.

**`secondary-seed-aligned.ts`**  
Aligned version of the secondary seed. Use this after running `primary-seed-aligned.ts` to maintain data consistency.

### Utility Scripts

**`test-connection.ts`**  
Tests database connectivity before running seeds. Useful for debugging connection issues.

## Usage

### First-Time Setup (Recommended)

```bash
# 1. Test database connection
npm run seed:test-connection

# 2. Run primary seed
npm run seed:primary

# 3. (Optional) Run secondary seed for additional test data
npm run seed:secondary
```

### Schema Update Scenario

When the database schema has been updated and you need to reseed:

```bash
# 1. Drop existing data (if needed)
npm run db:reset

# 2. Run aligned primary seed
npm run seed:primary-aligned

# 3. Run aligned secondary seed
npm run seed:secondary-aligned
```

### Performance / Migration Scenario

When seeding large amounts of data or migrating historical data:

```bash
# Use direct insertion for better performance
npm run seed:primary-direct
```

## Execution Order

**CRITICAL:** Always run seeds in this order:

1. `primary-seed.ts` (or variant) — Creates foundational data
2. `secondary-seed.ts` (or variant) — Adds supplementary data

Running secondary seeds before primary seeds will fail due to missing foreign key references.

## Terminology

- **Aligned**: Data structures match current schema exactly, with all validation rules enforced
- **Direct**: Bypasses ORM and validation for raw SQL insertion (faster, less safe)
- **Primary**: Foundational data required for the application to function
- **Secondary**: Optional supplementary data for testing and development

## Environment Variables

Ensure these environment variables are set before running seeds:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/chanuka
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

## Troubleshooting

**"Connection refused" errors:**  
Run `test-connection.ts` to verify database connectivity.

**"Foreign key constraint violation" errors:**  
Ensure you're running primary seed before secondary seed.

**"Duplicate key" errors:**  
Drop and recreate the database, or use `db:reset` before reseeding.

**Schema mismatch errors:**  
Use the `-aligned` variants of the seed scripts.

## Adding New Seed Data

When adding new seed data:

1. Add to the appropriate seed file (primary for foundational, secondary for supplementary)
2. Maintain the aligned/direct variants if the data structure differs
3. Update this README with any new seed scripts or execution requirements
4. Test the full seed sequence: `primary → secondary`

## Notes

- Seed scripts are idempotent where possible (they check for existing data before inserting)
- Production seeding should use the aligned variants for data integrity
- Direct variants should only be used when performance is critical
- Always backup production data before running seed scripts

---

**Last Updated:** March 6, 2026  
**Maintainer:** Chanuka Platform Team
