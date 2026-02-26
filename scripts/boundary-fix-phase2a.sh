#!/bin/bash

# Boundary Fix Phase 2A - Automated Implementation
# This script implements the boundary fixes outlined in BOUNDARY_FIX_PLAN.md

set -e  # Exit on error

echo "🔍 Phase 2A: Boundary Fixes - Starting..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: Verify No Client Dependencies
# ============================================================================

echo "📋 Step 1: Verifying no client dependencies on server-only modules..."

check_imports() {
    local pattern=$1
    local description=$2
    
    if grep -r "$pattern" client/src/ 2>/dev/null; then
        echo -e "${RED}❌ ERROR: Client imports found for $description${NC}"
        echo "Please remove these imports before proceeding."
        exit 1
    else
        echo -e "${GREEN}✅ No client imports for $description${NC}"
    fi
}

check_imports "from '@shared/core/observability" "observability"
check_imports "from '@shared/core/caching" "caching"
check_imports "from '@shared/core/middleware" "middleware"
check_imports "from '@shared/validation/middleware" "validation middleware"

echo ""

# ============================================================================
# STEP 2: Delete Server-Only Modules
# ============================================================================

echo "🗑️  Step 2: Deleting server-only modules from shared..."

# Delete observability if it exists
if [ -d "shared/core/observability" ]; then
    echo "Deleting shared/core/observability/..."
    rm -rf shared/core/observability/
    echo -e "${GREEN}✅ Deleted observability${NC}"
else
    echo -e "${YELLOW}⚠️  observability already deleted${NC}"
fi

# Delete unused utilities
delete_if_exists() {
    local file=$1
    if [ -f "$file" ]; then
        rm "$file"
        echo -e "${GREEN}✅ Deleted $(basename $file)${NC}"
    else
        echo -e "${YELLOW}⚠️  $(basename $file) already deleted${NC}"
    fi
}

echo "Deleting unused utilities..."
delete_if_exists "shared/core/utils/browser-logger.ts"
delete_if_exists "shared/core/utils/dashboard-utils.ts"
delete_if_exists "shared/core/utils/loading-utils.ts"
delete_if_exists "shared/core/utils/navigation-utils.ts"
delete_if_exists "shared/core/utils/performance-utils.ts"
delete_if_exists "shared/core/utils/race-condition-prevention.ts"
delete_if_exists "shared/core/utils/concurrency-adapter.ts"
delete_if_exists "shared/core/utils/http-utils.ts"

echo ""

# ============================================================================
# STEP 3: Move Validation Middleware
# ============================================================================

echo "📦 Step 3: Moving validation middleware to server..."

# Create server validation middleware directory
mkdir -p server/infrastructure/validation/middleware

# Move middleware file if it exists
if [ -f "shared/validation/middleware.ts" ]; then
    mv shared/validation/middleware.ts server/infrastructure/validation/middleware/
    echo -e "${GREEN}✅ Moved validation middleware to server${NC}"
else
    echo -e "${YELLOW}⚠️  Validation middleware already moved or doesn't exist${NC}"
fi

echo ""

# ============================================================================
# STEP 4: Move Seed Scripts
# ============================================================================

echo "📦 Step 4: Moving seed scripts to server..."

# Move seeds to server if they exist in root
if [ -d "scripts/seeds" ]; then
    mkdir -p server/scripts
    mv scripts/seeds/ server/scripts/seeds/
    echo -e "${GREEN}✅ Moved seed scripts to server/scripts/seeds/${NC}"
else
    echo -e "${YELLOW}⚠️  Seed scripts already moved or don't exist in scripts/${NC}"
fi

echo ""

# ============================================================================
# STEP 5: Update Package.json Scripts
# ============================================================================

echo "📝 Step 5: Updating package.json scripts..."

# Note: This requires manual update or use of jq
echo -e "${YELLOW}⚠️  Manual action required:${NC}"
echo "   Update package.json to change seed script paths:"
echo "   From: scripts/tsconfig.json scripts/seeds/"
echo "   To:   server/tsconfig.json server/scripts/seeds/"
echo ""

# ============================================================================
# STEP 6: Verify Build
# ============================================================================

echo "🔨 Step 6: Verifying build..."

if npm run build 2>&1 | tee /tmp/build-output.log; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed. Check /tmp/build-output.log for details${NC}"
    exit 1
fi

echo ""

# ============================================================================
# Summary
# ============================================================================

echo "📊 Summary of Changes:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Deleted:"
echo "  - shared/core/observability/"
echo "  - shared/core/utils/browser-logger.ts"
echo "  - shared/core/utils/dashboard-utils.ts"
echo "  - shared/core/utils/loading-utils.ts"
echo "  - shared/core/utils/navigation-utils.ts"
echo "  - shared/core/utils/performance-utils.ts"
echo "  - shared/core/utils/race-condition-prevention.ts"
echo "  - shared/core/utils/concurrency-adapter.ts"
echo "  - shared/core/utils/http-utils.ts"
echo ""
echo "Moved:"
echo "  - shared/validation/middleware.ts → server/infrastructure/validation/middleware/"
echo "  - scripts/seeds/ → server/scripts/seeds/"
echo ""
echo "Manual Actions Required:"
echo "  1. Update package.json seed script paths"
echo "  2. Update shared/core/index.ts to remove deleted exports"
echo "  3. Update server/infrastructure/validation/index.ts to export middleware"
echo "  4. Run: npm run test"
echo ""
echo -e "${GREEN}✅ Phase 2A: Boundary Fixes Complete!${NC}"
echo ""
echo "Next Steps:"
echo "  1. Review changes: git status"
echo "  2. Test thoroughly: npm run test"
echo "  3. Commit changes: git add . && git commit -m 'Phase 2A: Boundary fixes'"
echo "  4. Proceed to Phase 2B: Simplify shared structure"
