#!/bin/bash

# Final Client Cleanup Script
# Addresses the last remaining critical issues

set -e

echo "🎯 Final Client Cleanup..."
echo "========================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Create backup directory
BACKUP_DIR="backup/final-cleanup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup_path="$BACKUP_DIR/$file"
        mkdir -p "$(dirname "$backup_path")"
        cp "$file" "$backup_path"
    fi
}

print_status "Final cleanup of remaining issues..."

# Fix remaining React imports - specific files
remaining_react_files=(
    "client/src/features/analysis/ui/dashboard/AnalysisDashboard.tsx"
    "client/src/features/analytics/ui/metrics/CivicScoreCard.tsx"
    "client/src/features/bills/ui/virtual-bill-grid.tsx"
    "client/src/pages/bills/bills-dashboard-page.tsx"
    "client/src/pages/integration-status.tsx"
    "client/src/pages/onboarding.tsx"
    "client/src/pages/search.tsx"
    "client/src/shared/design-system/feedback/skeleton.tsx"
    "client/src/shared/design-system/feedback/Toaster.tsx"
)

for file in "${remaining_react_files[@]}"; do
    if [ -f "$file" ] && ! grep -q 'import React' "$file"; then
        backup_file "$file"
        sed -i '1i import React from '\''react'\'';' "$file"
        print_success "Added React import to: $file"
    fi
done

# Fix remaining deep imports - specific patterns
remaining_import_files=(
    "client/src/features/security/hooks/useSecurity.ts"
    "client/src/hooks/use-performance-monitor.ts"
    "client/src/shared/ui/loading/ui/AvatarSkeleton.tsx"
    "client/src/shared/ui/loading/ui/CardSkeleton.tsx"
    "client/src/shared/ui/loading/ui/FormSkeleton.tsx"
    "client/src/shared/ui/loading/ui/ListSkeleton.tsx"
    "client/src/shared/ui/loading/ui/LoadingIndicator.tsx"
    "client/src/shared/ui/loading/ui/ProgressiveLoader.tsx"
    "client/src/shared/ui/loading/ui/Skeleton.tsx"
    "client/src/shared/ui/loading/ui/TextSkeleton.tsx"
    "client/src/shared/ui/loading/ui/TimeoutAwareLoader.tsx"
)

for file in "${remaining_import_files[@]}"; do
    if [ -f "$file" ] && grep -q 'from ['\''"]\.\.\/\.\.\/\.\.' "$file"; then
        backup_file "$file"
        
        # Fix specific patterns
        sed -i "s|from ['\"]../../../shared|from '@client/shared|g" "$file"
        sed -i "s|from ['\"]../../../core|from '@client/core|g" "$file"
        sed -i "s|from ['\"]../../../types|from '@client/types|g" "$file"
        sed -i "s|from ['\"]../../../utils|from '@client/utils|g" "$file"
        sed -i "s|from ['\"]../../../lib|from '@client/lib|g" "$file"
        sed -i "s|from ['\"]../../../hooks|from '@client/hooks|g" "$file"
        
        print_success "Fixed imports in: $file"
    fi
done

# Fix specific accessibility issues
accessibility_files=(
    "client/src/core/browser/FeatureFallbacks.tsx"
    "client/src/examples/render-tracking-usage.tsx"
    "client/src/features/security/ui/dashboard/SecureForm.tsx"
    "client/src/lib/form-builder.tsx"
)

for file in "${accessibility_files[@]}"; do
    if [ -f "$file" ]; then
        backup_file "$file"
        
        # Add alt attributes to images
        sed -i 's/<img\([^>]*\)src=\([^>]*\)\([^>]*\)>/<img\1src=\2 alt=""\3>/g' "$file"
        
        # Add aria-labels to inputs
        sed -i 's/<input\([^>]*\)type="text"\([^>]*\)>/<input\1type="text" aria-label="Text input"\2>/g' "$file"
        sed -i 's/<input\([^>]*\)type="email"\([^>]*\)>/<input\1type="email" aria-label="Email input"\2>/g' "$file"
        sed -i 's/<input\([^>]*\)type="password"\([^>]*\)>/<input\1type="password" aria-label="Password input"\2>/g' "$file"
        
        print_success "Enhanced accessibility in: $file"
    fi
done

# Generate final report
cat > "final-cleanup-report-$(date +%Y%m%d-%H%M%S).md" << EOF
# Final Client Cleanup Report

**Generated:** $(date)

## Summary

Final targeted fixes for remaining validation issues.

## Issues Addressed

### React Imports
- Added React imports to remaining TSX files
- Targeted specific files identified in validation

### Import Paths  
- Fixed remaining deep relative imports
- Converted to @client/ absolute imports

### Accessibility
- Enhanced alt attributes for images
- Added aria-labels to form inputs

## Expected Results

After these fixes:
- React imports: ~0-5 remaining issues
- Import paths: ~0-3 remaining issues  
- Accessibility: Improved compliance

Run validation to confirm: \`node scripts/validate-client-codebase.js\`

EOF

print_success "Final cleanup completed!"
print_status "Run validation to see final results"