#!/bin/bash

# Analyze Internal Import Violations
# Identifies patterns in infrastructure-internal-imports violations

echo "🔍 Analyzing Internal Import Violations"
echo "========================================"
echo ""

# Run dependency-cruiser and capture violations
violations=$(npx dependency-cruiser --validate .dependency-cruiser.cjs client/src/infrastructure 2>&1)

# Count total violations
total=$(echo "$violations" | grep -c "infrastructure-internal-imports")
echo "📊 Total internal import violations: $total"
echo ""

# Extract and analyze most violated target modules
echo "🎯 Most Frequently Violated Modules:"
echo "-----------------------------------"
echo "$violations" | \
  grep "infrastructure-internal-imports" | \
  sed 's/.*→ //' | \
  awk '{print $1}' | \
  sed 's/client\/src\/infrastructure\///' | \
  awk -F'/' '{print $1}' | \
  sort | uniq -c | sort -rn | head -n 10 | \
  awk '{printf "  %3d violations - %s\n", $1, $2}'

echo ""
echo "📁 Most Common Violation Patterns:"
echo "----------------------------------"

# Pattern 1: index.ts importing from internal files
pattern1=$(echo "$violations" | grep "infrastructure-internal-imports" | grep "/index.ts →" | wc -l)
echo "  $pattern1 - index.ts importing internal files (should re-export)"

# Pattern 2: Tests importing internal files
pattern2=$(echo "$violations" | grep "infrastructure-internal-imports" | grep "/__tests__/" | wc -l)
echo "  $pattern2 - Test files importing internal files (acceptable)"

# Pattern 3: Cross-module internal imports
pattern3=$(echo "$violations" | grep "infrastructure-internal-imports" | grep -v "/index.ts" | grep -v "/__tests__/" | wc -l)
echo "  $pattern3 - Cross-module internal imports (need public API)"

echo ""
echo "🔧 Recommended Actions:"
echo "----------------------"
echo "  1. Fix index.ts files to properly re-export internal modules"
echo "  2. Add missing exports to module public APIs"
echo "  3. Update cross-module imports to use public APIs"
echo "  4. Consider allowing test file exceptions"
echo ""

# Show sample violations for top 3 modules
echo "📋 Sample Violations (Top 3 Modules):"
echo "-------------------------------------"

for module in $(echo "$violations" | \
  grep "infrastructure-internal-imports" | \
  sed 's/.*→ //' | \
  awk '{print $1}' | \
  sed 's/client\/src\/infrastructure\///' | \
  awk -F'/' '{print $1}' | \
  sort | uniq -c | sort -rn | head -n 3 | awk '{print $2}'); do
  
  echo ""
  echo "Module: $module"
  echo "$violations" | \
    grep "infrastructure-internal-imports" | \
    grep "→ client/src/infrastructure/$module/" | \
    head -n 3 | \
    sed 's/.*error infrastructure-internal-imports: /  /' | \
    sed 's/ →/\n    →/'
done

echo ""
