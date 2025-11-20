#!/bin/bash
# ============================================================================
# SCHEMA TEST RUNNER
# ============================================================================
# Comprehensive test execution script for all schema domains

echo "🧪 Kenya Legislative Platform - Schema Test Suite"
echo "=================================================="

# Check if vitest is available
if ! command -v npx &> /dev/null; then
    echo "❌ Error: npx not found. Please install Node.js and npm."
    exit 1
fi

# Set test environment
export NODE_ENV=test

# Test files to run
TEST_FILES=(
    "foundation.test.ts"
    "citizen_participation.test.ts"
    "parliamentary_process.test.ts"
    "constitutional_intelligence.test.ts"
    "argument_intelligence.test.ts"
    "advocacy_coordination.test.ts"
    "universal_access.test.ts"
    "integrity_operations.test.ts"
    "platform_operations.test.ts"
    "transparency_analysis.test.ts"
    "impact_measurement.test.ts"
)

PASSED=0
FAILED=0
TOTAL=${#TEST_FILES[@]}

echo "📊 Running $TOTAL test suites..."
echo ""

# Run each test file
for test_file in "${TEST_FILES[@]}"; do
    echo "🔍 Testing $test_file..."
    
    if npx vitest run "shared/schema/__tests__/$test_file" --reporter=basic 2>/dev/null; then
        echo "✅ $test_file - PASSED"
        ((PASSED++))
    else
        echo "❌ $test_file - FAILED"
        ((FAILED++))
    fi
    echo ""
done

# Print summary
echo "=================================================="
echo "📋 TEST SUMMARY"
echo "=================================================="
echo "✅ Passed: $PASSED/$TOTAL"
echo "❌ Failed: $FAILED/$TOTAL"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "🎉 All tests passed successfully!"
    echo ""
    echo "🎯 SCHEMA COVERAGE COMPLETE:"
    echo "  ✅ Foundation Schema - Core legislative entities"
    echo "  ✅ Citizen Participation - Public engagement layer"
    echo "  ✅ Parliamentary Process - Legislative workflows"
    echo "  ✅ Constitutional Intelligence - Legal analysis"
    echo "  ✅ Argument Intelligence - Argument synthesis"
    echo "  ✅ Advocacy Coordination - Campaign infrastructure"
    echo "  ✅ Universal Access - Offline engagement"
    echo "  ✅ Integrity Operations - Moderation & security"
    echo "  ✅ Platform Operations - Analytics & metrics"
    echo "  ✅ Transparency Analysis - Corporate influence"
    echo "  ✅ Impact Measurement - Outcome tracking"
    echo ""
    echo "🧪 TEST CATEGORIES VALIDATED:"
    echo "  • CRUD Operations - Create, Read, Update, Delete"
    echo "  • Data Validation - Constraints and type checking"
    echo "  • Relationships - Foreign keys and joins"
    echo "  • Complex Queries - Multi-table operations"
    echo "  • Performance - Index usage and optimization"
    echo "  • Edge Cases - Error handling and boundaries"
    echo "  • Integration - Cross-schema functionality"
    exit 0
else
    echo ""
    echo "💥 Some tests failed. Please check the output above."
    exit 1
fi

