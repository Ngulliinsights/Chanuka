Fixing Bugs vs Running Tests — Practical Workflow

Short answer: usually fix known, blocking bugs first, but get a failing test before you change code when possible.

Overview

This document explains when to fix bugs before running tests, a pragmatic workflow to follow, and a small checklist you can export or include in PRs.

Why this matters

- Running tests on a broken codebase wastes time and generates noise.
- But changing code without a failing test increases regression risk.
- The goal: minimize wasted runs while keeping good regression protection.

Recommended workflow

1. Quick triage
   - If the bug prevents compiling or running tests (toolchain/test harness broken, missing types), fix that first.
   - If the bug is a functional/regression that tests should catch, write or run a focused failing test first.

2. Reproduce (minimal)
   - Run a focused test that demonstrates the bug, or add a small failing test that reproduces the issue.
   - Capture failure output and logs — keep this as the regression test.

3. Implement a small fix
   - Keep the change minimal and scoped to the bug.
   - Prefer code that’s easy to review and that maps to the failing test.

4. Run tests incrementally
   - Run the focused test(s) first and confirm they pass.
   - Run related unit/integration tests.
   - Run the full suite and CI if applicable.

5. Clean up and document
   - Commit with a clear message and reference the failing test/issue.
   - In the PR description include: reproduction steps, why the fix works, and what tests were added.

When NOT to run full tests first

- The project doesn’t compile or the test runner crashes.
- Tests are extremely slow and you already know the failing area.
- Infrastructure issues prevent meaningful test runs (DB, secrets, env variables).

Edge cases & practical tips

- If tests are flaky, stabilize tests/environment before changing business logic.
- For large repos, run only impacted tests by filename or pattern.
- Keep a regression test for each bug fixed.
- If a production hotfix is necessary, still add tests and a proper fix in a follow-up PR.

Mini checklist

- [ ] Can I run the test runner / compiler? If not → fix the toolchain first.
- [ ] Can I reproduce with a focused test? If not → write a failing test (or capture repro steps).
- [ ] Implement fix.
- [ ] Run focused tests → run related suite → run full suite/CI.
- [ ] Push, open PR with notes and link the test/issue.

Export and usage notes

- This file is Markdown and can be opened in any editor.
- To export as PDF with pandoc (if installed):

```bash
# from repo root
pandoc docs/fix-before-tests.md -o docs/fix-before-tests.pdf
```

- You can also open the file in VS Code and use the Markdown preview and export features.

Contact

If you want, I can:
- Add a failing test for a specific bug in this repo.
- Triaging which tests to run first (fast vs slow) in this project.

---
Generated on: 2025-10-15
