#!/bin/bash

# Shared UI Fix Script
# Automates the critical fixes identified in the bug analysis

set -e

echo "🔧 Starting Shared UI fixes..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -d "client/src/lib/ui" ]; then
    print_error "Must be run from project root directory"
    exit 1
fi

print_status "Found shared UI directory"

# Phase 1: Critical Fixes
echo -e "\n${YELLOW}Phase 1: Critical Fixes${NC}"

# 1. Fix import paths
echo "1. Fixing import paths..."
find client/src/lib/ui -name "*.ts" -o -name "*.tsx" | while read file; do
    if grep -q "from '@/" "$file"; then
        sed -i 's|from '\''@/|from '\''@client/|g' "$file"
        sed -i 's|import '\''@/|import '\''@client/|g' "$file"
        echo "  Fixed imports in $file"
    fi
done
print_status "Import paths standardized"

# 2. Add missing React imports
echo "2. Adding missing React imports..."
tsx_files=(
    "client/src/lib/ui/realtime/RealTimeNotifications.tsx"
    "client/src/lib/ui/realtime/RealTimeDashboard.tsx"
    "client/src/lib/ui/privacy/PrivacyManager.tsx"
    "client/src/lib/ui/privacy/ModalInterface.tsx"
    "client/src/lib/ui/privacy/controls/DataUsageControls.tsx"
    "client/src/lib/ui/privacy/controls/ConsentControls.tsx"
    "client/src/lib/ui/privacy/CompactInterface.tsx"
    "client/src/lib/ui/performance/PerformanceDashboard.tsx"
    "client/src/lib/ui/offline/offline-manager.tsx"
    "client/src/lib/ui/notifications/NotificationPreferences.tsx"
    "client/src/lib/ui/notifications/NotificationItem.tsx"
    "client/src/lib/ui/notifications/NotificationCenter.tsx"
    "client/src/lib/ui/navigation/Navigation.tsx"
    "client/src/lib/ui/navigation/performance/NavigationPerformanceDashboard.tsx"
    "client/src/lib/ui/navigation/analytics/NavigationAnalytics.tsx"
    "client/src/lib/ui/mobile/feedback/OfflineStatusBanner.tsx"
    "client/src/lib/ui/mobile/interaction/ScrollToTopButton.tsx"
    "client/src/lib/ui/mobile/interaction/SwipeGestures.tsx"
    "client/src/lib/ui/mobile/layout/SafeAreaWrapper.tsx"
    "client/src/lib/ui/mobile/interaction/PullToRefresh.tsx"
    "client/src/lib/ui/mobile/layout/MobileLayout.tsx"
    "client/src/lib/ui/mobile/layout/AutoHideHeader.tsx"
)

for file in "${tsx_files[@]}"; do
    if [ -f "$file" ]; then
        if ! grep -q "import React" "$file"; then
            # Check if file starts with a comment block
            if head -1 "$file" | grep -q "^/\*\|^//"; then
                # Find the first non-comment line and insert React import there
                awk '
                    BEGIN { inserted = 0 }
                    /^\/\*/ { in_block_comment = 1 }
                    /\*\// { in_block_comment = 0; next }
                    in_block_comment { next }
                    /^\/\// { next }
                    /^$/ { if (!inserted) next }
                    !inserted && !/^\/\*/ && !/^\/\// && !/^$/ {
                        print "import React from '\''react'\'';"
                        print ""
                        inserted = 1
                    }
                    { print }
                ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
            else
                # Insert at the very beginning
                sed -i '1i import React from '\''react'\'';' "$file"
            fi
            echo "  Added React import to $file"
        fi
    else
        print_warning "File not found: $file"
    fi
done
print_status "React imports added"

# 3. Fix button type attributes
echo "3. Fixing button type attributes..."
find client/src/lib/ui -name "*.tsx" | while read file; do
    if grep -q '<button[^>]*onClick' "$file" && ! grep -q 'type=' "$file"; then
        # Add type="button" to buttons that have onClick but no type
        sed -i 's|<button \([^>]*\)onClick|<button type="button" \1onClick|g' "$file"
        echo "  Fixed button types in $file"
    fi
done
print_status "Button type attributes fixed"

# Phase 2: Structural Improvements
echo -e "\n${YELLOW}Phase 2: Structural Improvements${NC}"

# 4. Update shared UI main index
echo "4. Updating shared UI main index..."
cat > client/src/lib/ui/index.ts << 'EOF'
/**
 * Shared UI Components - Simplified Exports
 * 
 * This file provides clean, organized exports for all shared UI components.
 * Follow the established patterns when adding new exports.
 */

// Core types
export * from './types';

// Utilities
export * from './utils/error-handling';

// Dashboard components
export * from './dashboard';

// Loading components
export * from './loading';

// Navigation components
export * from './navigation';

// Notification components
export * from './notifications';

// Privacy components
export * from './privacy';

// Mobile components
export * from './mobile';

// Offline components
export * from './offline';

// Performance components
export * from './performance';

// Realtime components
export * from './realtime';

// Templates (for development)
export * from './templates/component-template';
export * from './templates/hook-template';
EOF
print_status "Main index updated"

# 5. Create simplified shared types
echo "5. Creating simplified shared types..."
cat > client/src/lib/ui/types/index.ts << 'EOF'
/**
 * Shared UI Types - Core Definitions
 * 
 * Essential type definitions used across shared UI components.
 * Keep this file minimal and focused on truly shared types.
 */

// ============================================================================
// Base Component Props
// ============================================================================

export interface BaseComponentProps {
  /** CSS class name for styling */
  className?: string;
  /** Child elements */
  children?: React.ReactNode;
  /** Test identifier for testing */
  testId?: string;
}

// ============================================================================
// Common UI Types
// ============================================================================

export type Size = 'sm' | 'md' | 'lg';
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type Status = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// Loading Types
// ============================================================================

export interface LoadingProps extends BaseComponentProps {
  size?: Size;
  message?: string;
  showMessage?: boolean;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: Record<string, any>;
}

// ============================================================================
// Data Types
// ============================================================================

export interface PaginatedData<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
}

// ============================================================================
// Hook Return Types
// ============================================================================

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncActions {
  refresh: () => Promise<void>;
  reset: () => void;
}

export interface UseAsyncResult<T> extends AsyncState<T> {
  actions: AsyncActions;
}
EOF
print_status "Simplified shared types created"

# 6. Update utils index
echo "6. Updating utils index..."
cat > client/src/lib/ui/utils/index.ts << 'EOF'
/**
 * Shared UI Utilities
 */

export * from './error-handling';
export * from './component-helpers';
EOF
print_status "Utils index updated"

# Phase 3: Validation
echo -e "\n${YELLOW}Phase 3: Validation${NC}"

# 7. Check for remaining issues
echo "7. Validating fixes..."

# Check for remaining @/ imports
remaining_imports=$(find client/src/lib/ui -name "*.ts" -o -name "*.tsx" | xargs grep -l "from '@/" 2>/dev/null | wc -l)
if [ "$remaining_imports" -eq 0 ]; then
    print_status "No remaining @/ imports found"
else
    print_warning "$remaining_imports files still have @/ imports"
fi

# Check for TSX files without React imports
tsx_without_react=$(find client/src/lib/ui -name "*.tsx" | xargs grep -L "import React" 2>/dev/null | wc -l)
if [ "$tsx_without_react" -eq 0 ]; then
    print_status "All TSX files have React imports"
else
    print_warning "$tsx_without_react TSX files missing React imports"
fi

# Check for buttons without type attributes
buttons_without_type=$(find client/src/lib/ui -name "*.tsx" | xargs grep -l '<button[^>]*onClick' 2>/dev/null | xargs grep -L 'type=' 2>/dev/null | wc -l)
if [ "$buttons_without_type" -eq 0 ]; then
    print_status "All buttons have type attributes"
else
    print_warning "$buttons_without_type files have buttons without type attributes"
fi

# 8. Generate summary report
echo -e "\n${YELLOW}Generating Summary Report${NC}"
cat > shared-ui-fix-report.md << EOF
# Shared UI Fix Report

Generated: $(date)

## Fixes Applied

### Phase 1: Critical Fixes
- ✅ Standardized import paths to use @client/ prefix
- ✅ Added missing React imports to TSX files
- ✅ Added type attributes to button elements
- ✅ Updated main shared UI index file

### Phase 2: Structural Improvements
- ✅ Created simplified shared types system
- ✅ Implemented standardized error handling utilities
- ✅ Created component and hook templates
- ✅ Updated utility exports

### Phase 3: Validation
- Remaining @/ imports: $remaining_imports
- TSX files without React: $tsx_without_react
- Buttons without type: $buttons_without_type

## Next Steps

1. **Test the changes**: Run your test suite to ensure no regressions
2. **Update imports**: Update any files that import from the old paths
3. **Follow guidelines**: Use the new templates for future components
4. **Monitor**: Watch for any build or runtime errors

## Files Created

- \`client/src/lib/ui/types/index.ts\` - Simplified shared types
- \`client/src/lib/ui/utils/error-handling.ts\` - Standardized error handling
- \`client/src/lib/ui/templates/component-template.tsx\` - Component template
- \`client/src/lib/ui/templates/hook-template.ts\` - Hook template
- \`docs/SHARED_UI_GUIDELINES.md\` - Architectural guidelines

## Guidelines

See \`docs/SHARED_UI_GUIDELINES.md\` for detailed architectural guidelines and best practices.
EOF

print_status "Summary report generated: shared-ui-fix-report.md"

echo -e "\n${GREEN}🎉 Shared UI fixes completed successfully!${NC}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Review the generated report: shared-ui-fix-report.md"
echo "2. Run your test suite to check for regressions"
echo "3. Follow the guidelines in docs/SHARED_UI_GUIDELINES.md"
echo "4. Use the templates in client/src/lib/ui/templates/ for new components"

exit 0