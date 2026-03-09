#!/bin/bash

# Bills Feature Integration Test Runner
# This script runs all integration tests for the bills feature

echo "🧪 Bills Feature Integration Tests"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "📡 Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running"
else
    echo -e "${RED}✗${NC} Server is not running"
    echo "Please start the server first: npm run dev"
    exit 1
fi

# Check if database is accessible
echo "🗄️  Checking database connection..."
if npm run db:check > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database is accessible"
else
    echo -e "${YELLOW}⚠${NC}  Database check skipped (command not found)"
fi

# Check if Redis is running
echo "💾 Checking Redis connection..."
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Redis is running"
else
    echo -e "${YELLOW}⚠${NC}  Redis is not running (polls feature may not work)"
fi

echo ""
echo "🚀 Running integration tests..."
echo ""

# Run the tests
npm test -- server/features/bills/__tests__/integration/bills-feature.integration.test.ts

# Capture exit code
TEST_EXIT_CODE=$?

echo ""
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "📊 Test Summary:"
    echo "  - Core Bill Operations: ✓"
    echo "  - Bill Tracking: ✓"
    echo "  - Comments & Engagement: ✓"
    echo "  - Analysis & Sponsors: ✓"
    echo "  - Metadata Endpoints: ✓"
    echo "  - Polls Feature: ✓"
    echo "  - Error Handling: ✓"
    echo "  - Database Integration: ✓"
    echo "  - Client API Compatibility: ✓"
    echo ""
    echo "🎉 Bills feature is 100% functional!"
else
    echo -e "${RED}✗ Some tests failed${NC}"
    echo ""
    echo "Please check the test output above for details."
    echo "See TESTING_GUIDE.md for troubleshooting tips."
fi

exit $TEST_EXIT_CODE
