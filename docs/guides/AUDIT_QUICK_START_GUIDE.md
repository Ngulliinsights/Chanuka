# Audit Quick Start Guide

## Overview

This guide helps you quickly audit your codebase for operational blindspots using the provided templates and tools.

## Quick Start (5 Minutes)

### 1. Run Automated Audit

```bash
# Install dependencies if needed
npm install -g tsx

# Run full audit
tsx scripts/audit-codebase.ts

# Run audit for specific severity
tsx scripts/audit-codebase.ts --severity=critical

# Run audit for specific category
tsx scripts/audit-codebase.ts --category=security

# Output as JSON
tsx scripts/audit-codebase.ts --output=json
```

### 2. Review Generated Report

The script generates `AUDIT_REPORT.md` with all findings categorized by severity.

### 3. Prioritize Issues

Focus on:
1. **Critical** - Fix immediately (security vulnerabilities)
2. **High** - Fix within sprint (performance, data integrity)
3. **Medium** - Fix within month (observability, resilience)
4. **Low** - Technical debt (architecture improvements)

## Manual Audit Process

### Step 1: Select Component

Choose a high-risk component:
- Services handling sensitive data
- High-traffic endpoints
- Financial transactions
- Authentication/authorization

### Step 2: Use Audit Template

Open `docs/OPERATIONAL_BLINDSPOT_AUDIT_TEMPLATE.md` and go through each category:

1. Security Vulnerabilities
2. Performance & Scalability
3. Error Handling & Resilience
4. Data Integrity & Consistency
5. Observability & Debugging
6. Testing Gaps
7. Configuration & Deployment

### Step 3: Document Findings

Use `docs/AUDIT_TRACKING_TEMPLATE.md` to track:
- Issue ID
- Severity
- Category
- Description
- Location
- Recommendation
- Status

### Step 4: Create Action Plan

Prioritize fixes and assign owners.

## Common Issues to Look For

### Critical (Fix Now)
- [ ] `sql.raw()` usage
- [ ] Hardcoded secrets
- [ ] Missing authorization checks
- [ ] String concatenation in SQL
- [ ] Mock implementations in production
- [ ] "Not implemented yet" functions
- [ ] Placeholder configuration (default passwords, localhost URLs)

### High (Fix This Sprint)
- [ ] N+1 queries
- [ ] Missing error handling
- [ ] No query timeouts
- [ ] Race conditions
- [ ] Missing transactions
- [ ] FIXME/HACK comments
- [ ] Test data in production
- [ ] Debugger statements

### Medium (Fix This Month)
- [ ] Missing logging
- [ ] No retry logic
- [ ] Memory leaks
- [ ] Missing input validation
- [ ] TODO comments
- [ ] Console.log statements
- [ ] Empty interfaces

### Low (Technical Debt)
- [ ] Singleton patterns
- [ ] Missing tests
- [ ] Poor documentation
- [ ] `any` types
- [ ] Commented-out code
- [ ] Generic type names

## Next Steps

1. Run automated audit
2. Review top 10 critical/high issues
3. Create GitHub issues for tracking
4. Schedule fixes in sprint planning
5. Re-run audit monthly

## Resources

- `docs/OPERATIONAL_BLINDSPOT_AUDIT_TEMPLATE.md` - Detailed checklist
- `docs/AUDIT_TRACKING_TEMPLATE.md` - Tracking spreadsheet
- `scripts/audit-codebase.ts` - Automated scanner
- `docs/CODE_QUALITY_DEEP_DIVE_SECURE_QUERY_BUILDER.md` - Example analysis
