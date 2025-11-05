# Project Structure Management Tools Guide

## Overview

Your Chanuka project now has three specialized tools that work together to maintain a healthy, well-organized codebase. Each tool has a specific purpose and they're designed to be used in a logical sequence that makes sense for different scenarios.

Think of these tools as a three-part health system for your project. The validator acts as your doctor doing check-ups, the import aligner is your physical therapist improving your posture and movement patterns, and the architectural fixer is your surgeon addressing critical issues that prevent the system from functioning properly.

## The Three Tools

### 1. Structure Validator (`validate-structure.ts`)

This is your diagnostic tool that analyzes your project without making any changes. It's completely safe to run at any time because it only reads your code and generates reports.

**What it does:** The validator examines your entire project structure, counting files, analyzing import patterns, checking for anti-patterns like excessive nesting, and verifying that key organizational files exist where they should. It then calculates a health score and provides specific recommendations for improvement.

**When to use it:** Run this tool regularly as part of your development workflow. It's especially useful when you're about to make structural changes and want to know the current state, when you're reviewing pull requests to ensure quality standards are maintained, or when you're onboarding new team members and want to show them the project's structural health.

**Example usage:**
```bash
# Basic health check
npx tsx scripts/validate-structure.ts

# Detailed analysis with progress information
npx tsx scripts/validate-structure.ts --verbose

# Generate JSON report for CI/CD integration
npx tsx scripts/validate-structure.ts --format=json > health-report.json
```

**Understanding the output:** The validator gives you a health score out of 100 with a letter grade. Scores above 90 are excellent, between 80 and 90 are good, and anything below 70 suggests you should address some issues. The report breaks down your project by file counts, directory organization, and import patterns, making it easy to spot areas that need attention.

### 2. Import Aligner (`align-imports.ts`)

This tool modernizes your import statements by converting relative imports to path-mapped shortcuts. It makes your codebase more maintainable because when you move files around, you won't have to update dozens of relative paths—the shortcuts just work.

**What it does:** The aligner scans all your TypeScript files looking for relative imports that go up two or more directory levels. When it finds patterns like `../../server/something`, it converts them to cleaner shortcuts like `@server/something`. It's smart enough to preserve short relative imports within the same directory because those are actually fine and more readable for nearby files.

**When to use it:** Run this after you've made significant structural changes to your project, when you're preparing a major release and want to clean up the codebase, or periodically as part of your technical debt reduction efforts. The tool creates automatic backups before making changes, so you can always revert if something goes wrong.

**Example usage:**
```bash
# Preview what would change without modifying files
npx tsx scripts/align-imports.ts --dry-run

# Apply the changes and create backups
npx tsx scripts/align-imports.ts

# Use a custom backup location
npx tsx scripts/align-imports.ts --backup=./my-backups
```

**Safety features:** The aligner is designed with safety in mind. It creates a timestamped backup of all affected files before making any changes. You can always preview the changes first with the dry-run flag. After running it, you should test your application thoroughly and review the changes with your version control system to ensure everything looks correct.

### 3. Architectural Fixer (`fix-architecture.ts`)

This is your problem-solving tool that addresses specific bugs and misconfigurations that prevent your code from compiling or running correctly. Unlike the import aligner which focuses on style and maintainability, the architectural fixer targets actual functional issues.

**What it fixes:** The fixer addresses five specific categories of problems. First, it corrects database schema import paths that point to the wrong locations. Second, it resolves variable shadowing issues where the same variable name is used in nested scopes, causing TypeScript errors. Third, it verifies that all your database tables are properly exported from the schema files. Fourth, it ensures your TypeScript configuration has all the necessary path mappings. Finally, it standardizes logger imports throughout your server code.

**When to use it:** Run this tool when you're seeing compilation errors related to imports, when database operations fail with "relation does not exist" errors, or when the validator reports critical architectural issues. You can also run it with the check-only flag to diagnose problems without making changes yet.

**Example usage:**
```bash
# Check for issues without fixing them
npx tsx scripts/fix-architecture.ts --check-only

# Apply all fixes
npx tsx scripts/fix-architecture.ts

# Fix only schema import issues
npx tsx scripts/fix-architecture.ts --fix=schema
```

**Available fix categories:** You can target specific problems by using the fix flag. Use `schema` for database schema imports, `shadowing` for variable naming conflicts, `exports` to verify table exports, `tsconfig` for TypeScript configuration, and `logger` for standardizing logger imports. This targeted approach is useful when you know exactly what needs fixing and don't want to run all the fixes.

## Recommended Workflows

### Initial Project Assessment

When you first want to understand the health of your project, follow this sequence:

Start by running the validator with verbose output to get a comprehensive picture of your project structure. This will show you exactly where you stand and what issues exist. Review the health score and pay attention to any errors or warnings. If you see issues related to import paths or TypeScript configuration, those are good candidates for the architectural fixer.

```bash
npx tsx scripts/validate-structure.ts --verbose
```

Based on what you find, you might discover that you have critical errors preventing compilation. That's when you move to the architectural fixer. Run it in check-only mode first to see what it would fix.

```bash
npx tsx scripts/fix-architecture.ts --check-only
```

If the architectural issues look serious and are causing compilation problems, apply the fixes. Then run your test suite to ensure everything still works correctly.

```bash
npx tsx scripts/fix-architecture.ts
npm test
```

Finally, if the validator showed that you have many relative imports that could be modernized, run the import aligner to clean those up. Always start with a dry run to preview the changes.

```bash
npx tsx scripts/align-imports.ts --dry-run
npx tsx scripts/align-imports.ts
npm test
```

### Regular Maintenance

For ongoing project health, incorporate these tools into your regular development practices.

Run the validator at the start of each sprint to check the current health score. This gives you a baseline to work from and helps you track improvements over time. You can even add it to your CI/CD pipeline to prevent structural degradation.

```bash
# In your package.json scripts
"health-check": "tsx scripts/validate-structure.ts"
```

After completing a feature or making structural changes, run the import aligner to keep your imports clean and consistent. This prevents the accumulation of technical debt and makes the codebase easier to navigate.

Use the architectural fixer reactively when you encounter specific problems. If you see TypeScript errors related to imports or database issues, the fixer can often resolve them automatically.

### Pre-Release Cleanup

Before a major release, you want your codebase in the best possible shape. Here's a comprehensive workflow:

First, run a full health check to understand what needs attention. Look for any errors or warnings that should be addressed before the release.

```bash
npx tsx scripts/validate-structure.ts --verbose > pre-release-health.txt
```

Fix any architectural issues that the validator identified. These are often critical problems that could cause runtime failures.

```bash
npx tsx scripts/fix-architecture.ts
```

Modernize your imports to make the codebase more maintainable for future development. This reduces technical debt and makes the project easier to work with.

```bash
npx tsx scripts/align-imports.ts
```

Run your full test suite including integration tests to ensure all the changes work correctly. This is crucial because these tools modify your code, and while they're designed to be safe, testing is always important.

```bash
npm run test
npm run test:integration
```

Finally, commit all the changes with a clear message explaining what was done and why. This helps your team understand the structural improvements that were made.

## Integration with CI/CD

These tools are designed to work well in automated environments. Here's how you can integrate them:

For continuous validation, add the validator to your CI pipeline. Configure it to fail the build if the health score drops below a certain threshold, like 70. This prevents structural decay over time.

```yaml
# Example GitHub Actions workflow
- name: Validate Structure
  run: npx tsx scripts/validate-structure.ts --format=json
  
- name: Check Health Score
  run: |
    SCORE=$(cat health-report.json | jq '.healthScore')
    if [ $SCORE -lt 70 ]; then
      echo "Health score too low: $SCORE"
      exit 1
    fi
```

You can also run the architectural fixer automatically on a schedule to keep the codebase healthy. However, be sure to create pull requests for review rather than committing directly to main.

## Understanding the Health Score

The validator calculates a health score based on multiple factors. Understanding how it works helps you know what to focus on for improvements.

The scoring starts at 100 points and deducts based on issues found. Critical errors remove 15 points each because they prevent the code from working. Warnings remove 5 points each because they indicate maintainability problems. Informational messages remove 2 points each as gentle suggestions for improvement.

The system also awards bonus points for good practices. If more than 60% of your imports use shortcuts instead of relative paths, you get 5 bonus points. If your directory nesting stays at 6 levels or less, you get another 5 bonus points.

A score of 95 or above is excellent and indicates a very well-organized project. Scores between 90 and 95 are very good, between 80 and 90 are good, between 70 and 80 are fair, between 60 and 70 need improvement, and below 60 indicate poor structural health that needs immediate attention.

## Best Practices

To get the most value from these tools, follow these guidelines:

Always run the validator first before making changes. It gives you the information you need to make smart decisions about which tools to use and in what order. Understanding the current state prevents you from making unnecessary changes.

Use dry-run mode when available to preview changes before applying them. Both the import aligner and architectural fixer support check-only modes that let you see what would happen without actually modifying files. This is especially important when you're first learning how the tools work.

Keep backups of your work before running fixers. While these tools create automatic backups, having your code committed to version control provides an additional safety net. You can always use git to revert changes if something unexpected happens.

Test thoroughly after running any fixer. Both the import aligner and architectural fixer modify your code, and while they're designed to preserve functionality, bugs can happen. Running your test suite ensures everything still works as expected.

Review changes before committing them. Use your version control system's diff tools to examine what changed. This helps you learn what the tools are doing and ensures the changes make sense for your project.

## Troubleshooting

If you encounter issues while using these tools, here are some common problems and solutions:

**Import aligner creates too many changes:** This usually means you have a lot of relative imports that could be modernized. Review the preview with dry-run mode first. If some changes don't make sense for your project structure, you might need to adjust your TypeScript path mappings or modify the transform rules in the aligner.

**Health score lower than expected:** Look at the specific issues in the validator report. Often, a few strategic fixes can significantly improve your score. Focus on critical errors first, then warnings, then informational messages.

**Architectural fixer can't find files:** Make sure you're running the script from your project root directory. The tools assume they're being run from the root where your package.json lives. Check that all expected files exist in the locations the fixer expects.

**Changes break the build:** First, revert to your backup or use version control to undo the changes. Then examine what broke and consider running the fixer in check-only mode or using the specific fix flag to target just one category of problems at a time. This helps isolate the issue.

## Maintaining Tool Health

These tools themselves need occasional maintenance to stay effective. Here's what to watch for:

If your project structure changes significantly, like adding new top-level directories or reorganizing major sections, you might need to update the path mappings in the import aligner. The transform rules are designed to be comprehensive, but unusual structures might need custom rules.

The architectural fixer is designed to address specific known issues. As your project evolves, you might discover new patterns that need fixing. You can extend the fixer by adding new fix methods following the existing pattern.

Keep the tools in sync with your TypeScript configuration. If you add new path mappings to tsconfig.json, consider whether the import aligner should also know about them. Consistency between your configuration and your tooling is important.

## Summary

These three tools form a complete system for maintaining structural health in your Chanuka project. The validator diagnoses issues, the import aligner modernizes your code organization, and the architectural fixer resolves critical problems. Used together in a thoughtful sequence, they help you maintain a clean, maintainable, and healthy codebase that your team will enjoy working with.

Remember that these tools are helpers, not replacements for good architectural decisions. They work best when combined with regular code reviews, clear coding standards, and a team culture that values maintainability. The health score is a useful metric, but it's the understanding and care behind the code that really matters.
