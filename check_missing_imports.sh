#!/bin/bash

echo "=== CHECKING MISSING IMPORTS ==="
echo

# Design system files
echo "1. Design System Imports:"
ls -la client/src/shared/design-system/quality.ts 2>/dev/null || echo "  ❌ quality.ts missing"
ls -la client/src/shared/design-system/tokens/index.ts 2>/dev/null || echo "  ❌ tokens/index.ts missing"
ls -la client/src/shared/design-system/utils/cn.ts 2>/dev/null || echo "  ❌ utils/cn.ts missing"

echo
echo "2. Server Config Files:"
ls -la server/config/index.js 2>/dev/null || echo "  ❌ server/config/index.js missing"
ls -la server/config/index.ts 2>/dev/null || echo "  ✓ server/config/index.ts exists"

echo
echo "3. Auth Service Files:"
ls -la server/core/auth/auth-service.js 2>/dev/null || echo "  ❌ auth-service.js missing"
ls -la server/core/auth/service.ts 2>/dev/null || echo "  ✓ service.ts exists"

echo
echo "4. Validation Service Files:"
ls -la server/core/validation/validation-metrics.js 2>/dev/null || echo "  ❌ validation-metrics.js missing"
ls -la server/core/validation/*.ts 2>/dev/null | head -5

echo
echo "5. Database Service Files:"
ls -la server/infrastructure/database/database-service.ts 2>/dev/null && echo "  ✓ database-service.ts exists" || echo "  ❌ missing"

