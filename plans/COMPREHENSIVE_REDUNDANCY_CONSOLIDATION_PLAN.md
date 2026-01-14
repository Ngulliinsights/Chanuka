# Comprehensive Redundancy Consolidation Plan

**Generated**: January 14, 2026
**Objective**: Consolidate and optimize the database schema and React hooks by addressing redundancies across critical, major, and pattern-level categories.

---

## 📌 Executive Summary

The analysis reveals significant redundancy in the database schema, with **160+ unused tables** out of a total of **120+ defined tables**. Only **9 tables** are actively used in the codebase. This plan outlines a phased approach to consolidate these redundancies, ensuring a lean, efficient, and maintainable schema.

---

## 🎯 Goals

1. **Eliminate Critical Redundancies**: Remove or consolidate tables and hooks that are entirely unused or redundant.
2. **Address Major Redundancies**: Optimize tables and hooks that are partially used or can be merged.
3. **Resolve Pattern-Level Redundancies**: Standardize naming conventions, data types, and relationships in both database schema and React hooks.
4. **Define Clear Timelines**: Establish a phased rollout plan with measurable outcomes.
5. **Document the Strategy**: Provide a comprehensive guide for implementation and future reference.

---

## 🔍 Redundancy Categories

### 1. Critical Redundancies (High Priority)

These redundancies impact performance, maintainability, and scalability.

#### **Unused Tables**
- **Issue**: 160+ tables are defined but not used in the codebase.
- **Impact**: Schema bloat, slower migrations, increased complexity.
- **Action**: Remove or archive unused tables.

#### **Duplicate Tables**
- **Issue**: Tables like `user_sessions` duplicate functionality in `sessions`.
- **Impact**: Data inconsistency, confusion in queries.
- **Action**: Consolidate into a single table.

#### **Redundant Relationships**
- **Issue**: Overlapping relationships in `bill_sponsorships` and `sponsors`.
- **Impact**: Query complexity, potential data duplication.
- **Action**: Streamline relationships and merge where possible.

#### **Unused Hooks**
- **Issue**: Multiple hooks are defined but not used in the codebase.
- **Impact**: Increased bundle size, maintenance overhead.
- **Action**: Remove or archive unused hooks.

#### **Duplicate Hooks**
- **Issue**: Hooks like `useLoading` and `useLoadingState` have overlapping functionality.
- **Impact**: Confusion in usage, potential inconsistencies.
- **Action**: Consolidate into a single, unified hook.

### 2. Major Redundancies (Medium Priority)

These redundancies affect efficiency and clarity but are not immediately critical.

#### **Partially Used Tables**
- **Issue**: Tables like `user_profiles` are partially implemented or merged into other tables.
- **Impact**: Inconsistent data handling, potential for errors.
- **Action**: Fully integrate or remove partial implementations.

#### **Overlapping Features**
- **Issue**: Tables for advanced features (e.g., `bill_amendments`, `bill_votes`) are defined but not integrated.
- **Impact**: Unnecessary complexity in the schema.
- **Action**: Defer or remove until features are fully implemented.

#### **Legacy Tables**
- **Issue**: Tables like `oauth_providers` and `oauth_tokens` are defined but not used.
- **Impact**: Clutter in the schema, potential security risks.
- **Action**: Archive or remove legacy tables.

#### **Partially Used Hooks**
- **Issue**: Hooks like `useProgressiveLoading` are partially implemented or not fully integrated.
- **Impact**: Inconsistent behavior, potential for errors.
- **Action**: Fully integrate or remove partial implementations.

#### **Overlapping Hook Features**
- **Issue**: Hooks for advanced features (e.g., `useTimeoutAwareLoading`) are defined but not integrated.
- **Impact**: Unnecessary complexity in the codebase.
- **Action**: Defer or remove until features are fully implemented.

### 3. Pattern-Level Redundancies (Low Priority)

These redundancies are related to naming, structure, and consistency.

#### **Naming Conventions**
- **Issue**: Inconsistent naming (e.g., `user_id` vs. `userId`).
- **Impact**: Confusion in queries and joins.
- **Action**: Standardize naming conventions across all tables.

#### **Data Types**
- **Issue**: Inconsistent data types (e.g., `UUID` vs. `VARCHAR` for IDs).
- **Impact**: Potential type errors, inefficiencies in storage.
- **Action**: Standardize data types for consistency.

#### **Indexing**
- **Issue**: Missing or redundant indexes on high-use columns.
- **Impact**: Performance bottlenecks, slower queries.
- **Action**: Optimize indexing for frequently queried columns.

#### **Hook Naming Conventions**
- **Issue**: Inconsistent naming (e.g., `useLoading` vs. `useLoadingState`).
- **Impact**: Confusion in usage and integration.
- **Action**: Standardize naming conventions across all hooks.

#### **Hook Patterns**
- **Issue**: Inconsistent patterns in hook implementations (e.g., error handling, state management).
- **Impact**: Potential inconsistencies in behavior.
- **Action**: Standardize patterns for consistency.

---

## 📅 Consolidation Timeline

### Phase 1: Critical Redundancies (Week 1-2)

| Task | Action | Timeline | Expected Outcome |
|------|--------|----------|------------------|
| Remove unused tables | Archive or drop 160+ unused tables | Day 1-3 | Lean schema, faster migrations |
| Consolidate duplicate tables | Merge `user_sessions` into `sessions` | Day 4-5 | Simplified session management |
| Streamline relationships | Optimize `bill_sponsorships` and `sponsors` | Day 6-7 | Clearer data relationships |
| Remove unused hooks | Archive or drop unused hooks | Day 8-10 | Reduced bundle size, improved performance |
| Consolidate duplicate hooks | Merge `useLoading` and `useLoadingState` into a unified hook | Day 11-14 | Simplified hook usage, consistent behavior |

### Phase 2: Major Redundancies (Week 3-4)

| Task | Action | Timeline | Expected Outcome |
|------|--------|----------|------------------|
| Integrate partial tables | Fully merge `user_profiles` into `users` | Day 8-10 | Consistent user data handling |
| Defer advanced features | Remove `bill_amendments`, `bill_votes` | Day 11-12 | Reduced schema complexity |
| Archive legacy tables | Remove `oauth_providers`, `oauth_tokens` | Day 13-14 | Cleaner schema, reduced risk |
| Integrate partial hooks | Fully integrate `useProgressiveLoading` into the codebase | Day 15-17 | Consistent behavior, improved usability |
| Defer advanced hook features | Remove `useTimeoutAwareLoading` until fully implemented | Day 18-19 | Reduced complexity, clearer focus |

### Phase 3: Pattern-Level Redundancies (Week 5-6)

| Task | Action | Timeline | Expected Outcome |
|------|--------|----------|------------------|
| Standardize naming | Align naming conventions (e.g., `user_id`) | Day 15-17 | Consistent queries and joins |
| Standardize data types | Ensure `UUID` consistency | Day 18-19 | Reduced type errors |
| Optimize indexing | Add missing indexes, remove redundant ones | Day 20-21 | Improved query performance |
| Standardize hook naming | Align naming conventions (e.g., `useLoading`) | Day 22-23 | Consistent usage and integration |
| Standardize hook patterns | Ensure consistent error handling and state management | Day 24-25 | Reduced inconsistencies, improved maintainability |

---

## 📋 Implementation Plan

### Step 1: Backup and Validation
- **Action**: Backup the current database schema and data.
- **Tool**: Use `pg_dump` or similar tools to create a full backup.
- **Validation**: Verify backup integrity before proceeding.

### Step 2: Remove Unused Tables
- **Action**: Drop or archive tables identified as unused.
- **Script**: Use SQL scripts to drop tables or move them to an archive schema.
- **Validation**: Ensure no active queries reference these tables.

### Step 3: Consolidate Duplicates
- **Action**: Merge duplicate tables (e.g., `user_sessions` into `sessions`).
- **Script**: Write migration scripts to transfer data and update references.
- **Validation**: Test queries to ensure data integrity.

### Step 4: Streamline Relationships
- **Action**: Optimize relationships in `bill_sponsorships` and `sponsors`.
- **Script**: Update foreign keys and relationships for clarity.
- **Validation**: Verify all bill-sponsor queries work correctly.

### Step 5: Integrate Partial Tables
- **Action**: Fully integrate `user_profiles` into `users`.
- **Script**: Migrate data and update all references.
- **Validation**: Ensure user data is consistent and accessible.

### Step 6: Defer Advanced Features
- **Action**: Remove tables for unimplemented features (e.g., `bill_amendments`).
- **Script**: Drop tables and update schema documentation.
- **Validation**: Confirm no dependencies on these tables.

### Step 7: Archive Legacy Tables
- **Action**: Remove or archive legacy tables (e.g., `oauth_providers`).
- **Script**: Drop tables or move to an archive schema.
- **Validation**: Ensure no active features rely on these tables.

### Step 8: Standardize Naming
- **Action**: Align naming conventions across all tables.
- **Script**: Rename columns and update references.
- **Validation**: Test all queries for correctness.

### Step 9: Standardize Data Types
- **Action**: Ensure consistent data types (e.g., `UUID`).
- **Script**: Alter columns to use standardized types.
- **Validation**: Verify data integrity post-migration.

### Step 10: Optimize Indexing
- **Action**: Add missing indexes and remove redundant ones.
- **Script**: Create or drop indexes based on query analysis.
- **Validation**: Monitor query performance improvements.

### Step 11: Remove Unused Hooks
- **Action**: Identify and remove unused hooks.
- **Script**: Use a script to scan the codebase and remove unused hooks.
- **Validation**: Ensure no components rely on these hooks.

### Step 12: Consolidate Duplicate Hooks
- **Action**: Merge duplicate hooks (e.g., `useLoading` and `useLoadingState`).
- **Script**: Update components to use the unified hook.
- **Validation**: Test components to ensure consistent behavior.

### Step 13: Integrate Partial Hooks
- **Action**: Fully integrate partially implemented hooks (e.g., `useProgressiveLoading`).
- **Script**: Complete the implementation and update components.
- **Validation**: Ensure hooks work as expected.

### Step 14: Defer Advanced Hook Features
- **Action**: Remove hooks for unimplemented features (e.g., `useTimeoutAwareLoading`).
- **Script**: Drop hooks and update documentation.
- **Validation**: Confirm no components rely on these hooks.

### Step 15: Standardize Hook Naming
- **Action**: Align naming conventions across all hooks.
- **Script**: Rename hooks and update references.
- **Validation**: Test components for correctness.

### Step 16: Standardize Hook Patterns
- **Action**: Ensure consistent patterns in hook implementations.
- **Script**: Update hooks to follow standardized patterns.
- **Validation**: Verify hooks behave consistently.

---

## 📊 Expected Outcomes

### Short-Term (Phase 1)
- **Schema Size**: Reduced from 120+ tables to ~20-30 tables.
- **Migration Time**: Faster migrations due to fewer tables.
- **Query Performance**: Improved due to reduced complexity.
- **Bundle Size**: Reduced bundle size due to fewer unused hooks.
- **Performance**: Improved performance due to optimized hooks.

### Medium-Term (Phase 2)
- **Data Consistency**: Eliminated partial implementations and duplicates.
- **Maintainability**: Simplified schema for easier updates.
- **Security**: Reduced risk from legacy tables.
- **Hook Consistency**: Eliminated partial implementations and duplicates in hooks.
- **Hook Maintainability**: Simplified hook usage for easier updates.

### Long-Term (Phase 3)
- **Query Efficiency**: Optimized indexing and standardized naming.
- **Scalability**: Lean schema supports future growth.
- **Developer Experience**: Consistent conventions improve productivity.
- **Hook Efficiency**: Optimized hook patterns and standardized naming.
- **Hook Scalability**: Lean hook structure supports future growth.

---

## 🧪 Validation and Testing

### Pre-Migration
- **Backup**: Ensure full backup of schema and data.
- **Dependency Check**: Verify no active queries reference tables to be removed.
- **Script Review**: Validate all migration scripts for correctness.
- **Hook Dependency Check**: Verify no components rely on hooks to be removed.

### Post-Migration
- **Data Integrity**: Confirm all data is intact and accessible.
- **Query Testing**: Test all critical queries for correctness.
- **Performance Monitoring**: Track query performance improvements.
- **Hook Testing**: Test all components to ensure hooks work as expected.

---

## 📚 Documentation

### Deliverables
1. **Migration Scripts**: SQL scripts for each phase of consolidation.
2. **Validation Scripts**: Tools to verify data integrity post-migration.
3. **Updated Schema Documentation**: Reflect changes in schema diagrams and descriptions.
4. **Implementation Guide**: Step-by-step instructions for executing the plan.
5. **Hook Consolidation Scripts**: Scripts to consolidate and optimize hooks.
6. **Hook Documentation**: Updated documentation for hooks.

### Files
- **Migration Scripts**: `drizzle/0001_consolidate_critical_redundancies.sql`
- **Validation Scripts**: `scripts/database/validate-consolidation.ts`
- **Schema Documentation**: `docs/DATABASE_SCHEMA_CONSOLIDATION.md`
- **Implementation Guide**: `plans/COMPREHENSIVE_REDUNDANCY_CONSOLIDATION_PLAN.md`
- **Hook Consolidation Scripts**: `scripts/hooks/consolidate-hooks.ts`
- **Hook Documentation**: `docs/HOOKS_CONSOLIDATION.md`

---

## 🚀 Next Steps

1. **Review Plan**: Share this plan with stakeholders for feedback.
2. **Backup Data**: Ensure a full backup is available before starting.
3. **Execute Phase 1**: Begin with critical redundancies.
4. **Monitor Progress**: Track outcomes and adjust as needed.
5. **Proceed to Phase 2**: Address major redundancies.
6. **Finalize with Phase 3**: Resolve pattern-level redundancies.
7. **Consolidate Hooks**: Begin with critical hook redundancies.
8. **Monitor Hook Progress**: Track outcomes and adjust as needed.

---

**Status**: Ready for Implementation 🎯
**Timeline**: 6 Weeks to Full Consolidation 🚀
**Outcome**: Optimized, Lean, and Maintainable Schema ✅