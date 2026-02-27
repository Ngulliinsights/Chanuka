#!/bin/bash

# Fix Internal Import Violations
# Automatically updates imports to use public APIs

echo "🔧 Fixing Internal Import Violations"
echo "====================================="
echo ""

# Function to fix imports in a file
fix_imports() {
  local file="$1"
  local module="$2"
  local pattern="$3"
  local replacement="$4"
  
  if grep -q "$pattern" "$file" 2>/dev/null; then
    sed -i "s|$pattern|$replacement|g" "$file"
    echo "  ✓ Fixed: $file"
    return 0
  fi
  return 1
}

# Counter
fixed=0

echo "📦 Fixing error module imports..."
echo "----------------------------------"

# Fix error/handler imports
for file in $(grep -r "from '@client/infrastructure/error/handler'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null); do
  if fix_imports "$file" "error" "from '@client/infrastructure/error/handler'" "from '@client/infrastructure/error'"; then
    ((fixed++))
  fi
done

# Fix error/constants imports
for file in $(grep -r "from '@client/infrastructure/error/constants'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null); do
  if fix_imports "$file" "error" "from '@client/infrastructure/error/constants'" "from '@client/infrastructure/error'"; then
    ((fixed++))
  fi
done

# Fix error/classes imports
for file in $(grep -r "from '@client/infrastructure/error/classes'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null); do
  if fix_imports "$file" "error" "from '@client/infrastructure/error/classes'" "from '@client/infrastructure/error'"; then
    ((fixed++))
  fi
done

# Fix error/factory imports
for file in $(grep -r "from '@client/infrastructure/error/factory'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null); do
  if fix_imports "$file" "error" "from '@client/infrastructure/error/factory'" "from '@client/infrastructure/error'"; then
    ((fixed++))
  fi
done

# Fix error/recovery imports
for file in $(grep -r "from '@client/infrastructure/error/recovery'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null); do
  if fix_imports "$file" "error" "from '@client/infrastructure/error/recovery'" "from '@client/infrastructure/error'"; then
    ((fixed++))
  fi
done

# Fix error/components imports
for file in $(grep -r "from '@client/infrastructure/error/components/" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null); do
  # More specific replacements for components
  sed -i "s|from '@client/infrastructure/error/components/ErrorBoundary'|from '@client/infrastructure/error'|g" "$file" 2>/dev/null
  sed -i "s|from '@client/infrastructure/error/components/SimpleErrorBoundary'|from '@client/infrastructure/error'|g" "$file" 2>/dev/null
  sed -i "s|from '@client/infrastructure/error/components/ErrorFallback'|from '@client/infrastructure/error'|g" "$file" 2>/dev/null
  sed -i "s|from '@client/infrastructure/error/components'|from '@client/infrastructure/error'|g" "$file" 2>/dev/null
  echo "  ✓ Fixed: $file"
  ((fixed++))
done

echo ""
echo "📦 Fixing API module imports..."
echo "-------------------------------"

# Fix api/client imports
for file in $(grep -r "from '@client/infrastructure/api/client'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v "client/src/infrastructure/api"); do
  if fix_imports "$file" "api" "from '@client/infrastructure/api/client'" "from '@client/infrastructure/api'"; then
    ((fixed++))
  fi
done

# Fix api/errors imports
for file in $(grep -r "from '@client/infrastructure/api/errors'" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v "client/src/infrastructure/api"); do
  if fix_imports "$file" "api" "from '@client/infrastructure/api/errors'" "from '@client/infrastructure/api'"; then
    ((fixed++))
  fi
done

echo ""
echo "📦 Fixing auth module imports..."
echo "--------------------------------"

# Fix auth/services imports (external files only)
for file in $(grep -r "from '@client/infrastructure/auth/services/" client/src --include="*.ts" --include="*.tsx" -l 2>/dev/null | grep -v "client/src/infrastructure/auth"); do
  sed -i "s|from '@client/infrastructure/auth/services/token-manager'|from '@client/infrastructure/auth'|g" "$file" 2>/dev/null
  sed -i "s|from '@client/infrastructure/auth/services/session-manager'|from '@client/infrastructure/auth'|g" "$file" 2>/dev/null
  sed -i "s|from '@client/infrastructure/auth/services/auth-api-service'|from '@client/infrastructure/auth'|g" "$file" 2>/dev/null
  echo "  ✓ Fixed: $file"
  ((fixed++))
done

echo ""
echo "✅ Summary"
echo "----------"
echo "  Fixed $fixed files"
echo ""
echo "🔍 Run dependency-cruiser again to verify improvements"
echo ""
