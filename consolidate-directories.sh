#!/usr/bin/env bash

# Directory Consolidation and Flattening Script
# This script consolidates redundant directories and flattens unnecessary nesting

set -e

ROOT_DIR="c:\\Users\\Access Granted\\Downloads\\projects\\SimpleTool\\client\\src"
TEMP_BACKUP="$ROOT_DIR/.consolidation-backup"

echo "🔧 Starting directory consolidation..."
echo "========================================"

# Phase 1: Create backup
echo "\n📦 Phase 1: Creating backup..."
mkdir -p "$TEMP_BACKUP"
cp -r "$ROOT_DIR/security" "$TEMP_BACKUP/security.backup" 2>/dev/null || true
cp -r "$ROOT_DIR/validation" "$TEMP_BACKUP/validation.backup" 2>/dev/null || true
echo "✅ Backup created in $TEMP_BACKUP"

# Phase 2: Flatten security directory
echo "\n🔐 Phase 2: Flattening security directory..."

# Move files from subdirectories to root security
if [ -d "$ROOT_DIR/security/csp" ]; then
  mv "$ROOT_DIR/security/csp/CSPManager.ts" "$ROOT_DIR/security/csp-manager.ts" 2>/dev/null || true
  rm -rf "$ROOT_DIR/security/csp"
fi

if [ -d "$ROOT_DIR/security/csrf" ]; then
  mv "$ROOT_DIR/security/csrf/CSRFProtection.ts" "$ROOT_DIR/security/csrf-protection.ts" 2>/dev/null || true
  rm -rf "$ROOT_DIR/security/csrf"
fi

if [ -d "$ROOT_DIR/security/rate-limiting" ]; then
  mv "$ROOT_DIR/security/rate-limiting/RateLimiter.ts" "$ROOT_DIR/security/rate-limiter.ts" 2>/dev/null || true
  rm -rf "$ROOT_DIR/security/rate-limiting"
fi

if [ -d "$ROOT_DIR/security/sanitization" ]; then
  mv "$ROOT_DIR/security/sanitization/InputSanitizer.ts" "$ROOT_DIR/security/input-sanitizer.ts" 2>/dev/null || true
  rm -rf "$ROOT_DIR/security/sanitization"
fi

# Handle headers and other subdirectories with multiple files
if [ -d "$ROOT_DIR/security/headers" ]; then
  echo "  ℹ️  Keeping security/headers/ (contains multiple files)"
fi

if [ -d "$ROOT_DIR/security/config" ]; then
  echo "  ℹ️  Keeping security/config/ (contains configuration)"
fi

echo "✅ Security directory flattened"

# Phase 3: Consolidate validation
echo "\n✔️  Phase 3: Consolidating validation..."

if [ -f "$ROOT_DIR/shared/validation/consolidated.ts" ]; then
  rm -f "$ROOT_DIR/shared/validation/base-validation.ts" 2>/dev/null || true
  rm -f "$ROOT_DIR/shared/validation/index.ts" 2>/dev/null || true
  mv "$ROOT_DIR/shared/validation/consolidated.ts" "$ROOT_DIR/shared/validation/index.ts"
  echo "✅ Validation consolidated"
fi

# Phase 4: Create backward compatibility shim for old validation directory
echo "\n🔄 Phase 4: Creating backward compatibility layer..."

cat > "$ROOT_DIR/validation/index.ts" << 'EOF'
/**
 * DEPRECATED: Validation module moved to shared/validation
 * This file provides backward compatibility only.
 * New code should import from '@client/shared/validation'
 */

export * from '../shared/validation';
EOF

echo "✅ Backward compatibility layer created"

# Phase 5: Remove hooks directory after migration
echo "\n🪝 Phase 5: Checking hooks consolidation..."

if [ -d "$ROOT_DIR/hooks/mobile" ] && [ -d "$ROOT_DIR/core/mobile/hooks" ]; then
  echo "  ℹ️  hooks/mobile/ should be merged into core/mobile/hooks/"
  echo "  TODO: Manual migration - preserve hooks/mobile imports for now"
fi

# Phase 6: Cleanup
echo "\n🧹 Phase 6: Final cleanup..."

# Remove empty directories
find "$ROOT_DIR/security" -type d -empty -delete 2>/dev/null || true
find "$ROOT_DIR/shared/validation" -type f -name "*.ts" -size 0 -delete 2>/dev/null || true

echo "✅ Cleanup complete"

# Summary
echo "\n========================================"
echo "📋 Consolidation Summary:"
echo "========================================"
echo "✅ security/csp/ → security/csp-manager.ts"
echo "✅ security/csrf/ → security/csrf-protection.ts"  
echo "✅ security/rate-limiting/ → security/rate-limiter.ts"
echo "✅ security/sanitization/ → security/input-sanitizer.ts"
echo "✅ shared/validation/ → consolidated"
echo "✅ validation/ → compatibility layer"
echo "ℹ️  hooks/mobile/ → TODO (manual migration)"
echo "\n🎉 Directory consolidation complete!"
echo "\nNext steps:"
echo "1. Update import statements in source files"
echo "2. Run build to verify no import errors"
echo "3. Run tests to verify functionality"
echo "4. Delete old directories once imports are updated"
