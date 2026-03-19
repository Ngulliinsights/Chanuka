# Status Vocabulary — Chanuka Platform

**Purpose:** Define three separate status dimensions used consistently across all documentation.

**Last Updated:** March 6, 2026

---

## The Three Status Dimensions

The Chanuka Platform uses three independent status dimensions. A feature can score differently on each:

### 1. Code Health

**What it measures:** Engineering quality, technical debt, maintainability

**Criteria:**
- Type safety (TypeScript errors resolved)
- Test coverage (unit, integration, e2e)
- Code structure (follows architectural patterns)
- Documentation (inline comments, README)
- Linting compliance (ESLint, Prettier)
- Security best practices

**Scale:**
- 🔴 Poor (0-60%): Significant technical debt, many errors, low test coverage
- 🟡 Fair (60-80%): Some technical debt, moderate test coverage, mostly type-safe
- ✅ Good (80-95%): Production-grade code, well-tested, type-safe, documented
- ⭐ Excellent (95-100%): Exemplary code quality, comprehensive tests, zero technical debt

**Example:** Constitutional analysis has 90% code health — well-structured, type-safe, tested, documented.

---

### 2. Feature Completeness

**What it measures:** Does the feature deliver on its promise to end users?

**Criteria:**
- Core functionality implemented
- User-facing features work as designed
- Data requirements met (ML models trained, databases populated)
- Edge cases handled
- Error states managed
- User experience polished

**Scale:**
- 🔴 Incomplete (0-40%): Core functionality missing or broken
- 🟡 Partial (40-70%): Core works, but missing key capabilities or data
- ✅ Complete (70-95%): Delivers on promise, minor gaps acceptable
- ⭐ Polished (95-100%): Exceeds expectations, delightful UX

**Example:** Constitutional analysis is 60% feature complete — provision matching works, but ML training data needed for full intelligence.

---

### 3. Launch Readiness

**What it measures:** Is the entire platform ready to serve the public?

**Criteria:**
- All critical features complete
- Security audit passed
- Performance benchmarks met
- Accessibility compliance (WCAG AA)
- Legal requirements satisfied (privacy policy, terms)
- Infrastructure scaled for expected load
- Monitoring and alerting in place
- Support processes established

**Scale:**
- 🔴 Pre-alpha: Core features incomplete, not ready for any users
- 🟡 Beta: Core features work, ready for limited testing with known issues
- ✅ Launch-ready: All criteria met, ready for public release
- ⭐ Production-stable: Launched, proven stable, actively maintained

**Example:** Chanuka Platform is 🟡 Beta (pre-launch) — core features work, but accessibility, security audit, and infrastructure scaling in progress. Target: Q2 2026.

---

## How to Use These Dimensions

### In Documentation

Always specify which dimension you're describing:

✅ **Good:**
- "Constitutional analysis: 90% code health, 60% feature complete"
- "Platform launch readiness: Beta (Q2 2026 target)"
- "Bills feature: Production-grade code (85% health), fully complete"

❌ **Avoid:**
- "Constitutional analysis is 90% done" (which dimension?)
- "Platform is ready" (ready for what? launch? testing?)
- "Bills feature works" (code quality? user experience?)

### In Status Updates

Use all three dimensions for major features:

```markdown
## Bills Feature Status

- **Code Health:** ✅ Good (85%) — Type-safe, well-tested, documented
- **Feature Completeness:** ✅ Complete (90%) — All core functionality working
- **Launch Readiness:** ✅ Ready — Meets all launch criteria
```

### In README Files

Use the dimension most relevant to your audience:

- **For developers:** Emphasize code health
- **For product managers:** Emphasize feature completeness
- **For stakeholders:** Emphasize launch readiness

---

## Common Scenarios

### Scenario 1: High Code Quality, Low Feature Completeness

**Example:** Constitutional analysis
- Code health: 90% (excellent architecture, type-safe, tested)
- Feature completeness: 60% (provision matching works, ML training needed)

**Interpretation:** The engineering is solid, but the feature doesn't yet deliver its full promise to users.

### Scenario 2: Feature Complete, Technical Debt

**Example:** Legacy notification system (hypothetical)
- Code health: 65% (works but has technical debt, needs refactoring)
- Feature completeness: 85% (delivers on user expectations)

**Interpretation:** Users are happy, but developers need to address technical debt before adding new capabilities.

### Scenario 3: Everything Ready, Platform Not Launched

**Example:** Bills feature
- Code health: 85% (production-grade)
- Feature completeness: 90% (fully functional)
- Launch readiness: Beta (platform not yet launched)

**Interpretation:** The feature is ready, but the platform as a whole isn't launched yet.

---

## Resolving Apparent Contradictions

### "Working" vs "Partial"

- README.md says: ✅ Constitutional analysis working
- EXECUTIVE_SUMMARY says: ⚠️ Constitutional analysis partial

**Resolution:** Both are correct. The feature works (code health is good), but it's partial (feature completeness needs ML training).

### "Production-Ready" vs "Pre-Launch"

- client/README.md says: Production-ready
- README.md says: Pre-launch

**Resolution:** Both are correct. The client code is production-grade (code health), but the platform hasn't launched yet (launch readiness).

---

## Version History

- **v1.0** (March 6, 2026): Initial vocabulary definition

---

**See Also:**
- [README.md](../README.md) — Platform overview and launch status
- [CURRENT_CAPABILITIES.md](../CURRENT_CAPABILITIES.md) — Feature-by-feature status
- [CODE_AUDIT_2026-03-06.md](CODE_AUDIT_2026-03-06.md) — Code health assessment
