#!/bin/bash

# MVP Endpoints Testing Script
# Tests Community and Analysis features

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
AUTH_TOKEN="${AUTH_TOKEN:-}"

echo "🧪 MVP Endpoints Testing Script"
echo "================================"
echo "Base URL: $BASE_URL"
echo ""

# Function to make API call and check response
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  
  echo -n "Testing: $description... "
  
  if [ -n "$data" ]; then
    response=$(curl -s -X $method "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$data")
  else
    response=$(curl -s -X $method "$BASE_URL$endpoint" \
      -H "Authorization: Bearer $AUTH_TOKEN")
  fi
  
  if echo "$response" | grep -q '"success":true\|"status":"ok"\|"data"'; then
    echo -e "${GREEN}✓ PASS${NC}"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "Response: $response"
    return 1
  fi
}

# Get a bill ID from database
echo "📋 Getting test bill ID..."
BILL_ID=$(psql -d your_database -t -c "SELECT id FROM bills LIMIT 1" 2>/dev/null | tr -d ' ' || echo "1")
echo "Using Bill ID: $BILL_ID"
echo ""

# Test counter
PASSED=0
FAILED=0

# ============================================================================
# COMMUNITY FEATURE TESTS
# ============================================================================

echo "🏘️  Testing Community Feature"
echo "----------------------------"

# Test 1: Get comments for a bill
if test_endpoint "GET" "/api/community/bills/$BILL_ID/comments" "" "Get comments for bill"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 2: Get comments with sorting
if test_endpoint "GET" "/api/community/bills/$BILL_ID/comments?sort_by=quality" "" "Get comments sorted by quality"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 3: Get comments with quality filter
if test_endpoint "GET" "/api/community/bills/$BILL_ID/comments?min_quality_score=7.0" "" "Get high-quality comments"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 4: Get debate quality metrics
if test_endpoint "GET" "/api/community/bills/$BILL_ID/debate-quality" "" "Get debate quality metrics"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 5: Create comment (requires auth)
if [ -n "$AUTH_TOKEN" ]; then
  COMMENT_DATA="{\"bill_id\":$BILL_ID,\"content\":\"According to the CBO report, this bill will reduce costs by 15%. The evidence shows clear benefits.\",\"analyze_argument\":true}"
  if test_endpoint "POST" "/api/community/comments" "$COMMENT_DATA" "Create comment with analysis"; then
    ((PASSED++))
  else
    ((FAILED++))
  fi
else
  echo -e "${YELLOW}⊘ SKIP${NC} Create comment (no auth token)"
fi

echo ""

# ============================================================================
# ANALYSIS FEATURE TESTS
# ============================================================================

echo "📊 Testing Analysis Feature"
echo "---------------------------"

# Test 6: Get comprehensive analysis
if test_endpoint "GET" "/api/analysis/bills/$BILL_ID/comprehensive" "" "Get comprehensive analysis"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 7: Get analysis with force reanalysis
if test_endpoint "GET" "/api/analysis/bills/$BILL_ID/comprehensive?force=true" "" "Force reanalysis"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 8: Get analysis history
if test_endpoint "GET" "/api/analysis/bills/$BILL_ID/history" "" "Get analysis history"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 9: Get analysis history with limit
if test_endpoint "GET" "/api/analysis/bills/$BILL_ID/history?limit=5" "" "Get analysis history (limited)"; then
  ((PASSED++))
else
  ((FAILED++))
fi

# Test 10: Health check
if test_endpoint "GET" "/api/analysis/health" "" "Analysis health check"; then
  ((PASSED++))
else
  ((FAILED++))
fi

echo ""

# ============================================================================
# SUMMARY
# ============================================================================

echo "================================"
echo "📈 Test Summary"
echo "================================"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
