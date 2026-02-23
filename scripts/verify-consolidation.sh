#!/bin/bash

echo "=== Client Architecture Consolidation Verification ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# 1. Check infrastructure directory exists
echo "1. Checking infrastructure directory..."
if [ -d "client/src/infrastructure" ]; then
    echo -e "${GREEN}✓${NC} infrastructure/ directory exists"
else
    echo -e "${RED}✗${NC} infrastructure/ directory missing"
    ERRORS=$((ERRORS + 1))
fi

# 2. Check old core directory removed
echo "2. Checking old core directory removed..."
if [ ! -d "client/src/core" ]; then
    echo -e "${GREEN}✓${NC} core/ directory removed"
else
    echo -e "${RED}✗${NC} core/ directory still exists"
    ERRORS=$((ERRORS + 1))
fi

# 3. Check old lib/infrastructure removed
echo "3. Checking old lib/infrastructure removed..."
if [ ! -d "client/src/lib/infrastructure" ]; then
    echo -e "${GREEN}✓${NC} lib/infrastructure/ directory removed"
else
    echo -e "${RED}✗${NC} lib/infrastructure/ directory still exists"
    ERRORS=$((ERRORS + 1))
fi

# 4. Check for old @/core imports
echo "4. Checking for old @/core imports..."
OLD_CORE_IMPORTS=$(find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "from ['\"]@/core/" {} \; 2>/dev/null | wc -l)
if [ "$OLD_CORE_IMPORTS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No @/core imports found"
else
    echo -e "${RED}✗${NC} Found $OLD_CORE_IMPORTS files with @/core imports"
    ERRORS=$((ERRORS + 1))
fi

# 5. Check for old @client/core imports
echo "5. Checking for old @client/core imports..."
OLD_CLIENT_CORE_IMPORTS=$(find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "from ['\"]@client/core/" {} \; 2>/dev/null | wc -l)
if [ "$OLD_CLIENT_CORE_IMPORTS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No @client/core imports found"
else
    echo -e "${RED}✗${NC} Found $OLD_CLIENT_CORE_IMPORTS files with @client/core imports"
    ERRORS=$((ERRORS + 1))
fi

# 6. Check for old @/lib/infrastructure imports
echo "6. Checking for old @/lib/infrastructure imports..."
OLD_LIB_INFRA_IMPORTS=$(find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "from ['\"]@/lib/infrastructure/" {} \; 2>/dev/null | wc -l)
if [ "$OLD_LIB_INFRA_IMPORTS" -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No @/lib/infrastructure imports found"
else
    echo -e "${RED}✗${NC} Found $OLD_LIB_INFRA_IMPORTS files with @/lib/infrastructure imports"
    ERRORS=$((ERRORS + 1))
fi

# 7. Check for new @/infrastructure imports (should exist)
echo "7. Checking for new @/infrastructure imports..."
NEW_INFRA_IMPORTS=$(find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec grep -l "from ['\"]@/infrastructure/" {} \; 2>/dev/null | wc -l)
if [ "$NEW_INFRA_IMPORTS" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $NEW_INFRA_IMPORTS files using @/infrastructure imports"
else
    echo -e "${YELLOW}⚠${NC} No @/infrastructure imports found (might be okay if using @client/infrastructure)"
fi

# 8. Check tsconfig.json has correct paths
echo "8. Checking tsconfig.json paths..."
if grep -q '"@core": \["./src/infrastructure"\]' client/tsconfig.json; then
    echo -e "${GREEN}✓${NC} tsconfig.json @core path correct"
else
    echo -e "${RED}✗${NC} tsconfig.json @core path incorrect"
    ERRORS=$((ERRORS + 1))
fi

# 9. Check vite.config.ts updated
echo "9. Checking vite.config.ts..."
if grep -q "src/infrastructure/" client/vite.config.ts; then
    echo -e "${GREEN}✓${NC} vite.config.ts updated"
else
    echo -e "${RED}✗${NC} vite.config.ts not updated"
    ERRORS=$((ERRORS + 1))
fi

# 10. Count infrastructure modules
echo "10. Checking infrastructure modules..."
INFRA_MODULES=$(ls -d client/src/infrastructure/*/ 2>/dev/null | wc -l)
echo -e "${GREEN}✓${NC} Found $INFRA_MODULES infrastructure modules"

echo ""
echo "=== Summary ==="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "The consolidation is complete and safe to commit."
    exit 0
else
    echo -e "${RED}✗ $ERRORS check(s) failed${NC}"
    echo "Please review the errors above before committing."
    exit 1
fi
