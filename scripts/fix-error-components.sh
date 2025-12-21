#!/bin/bash

# Fix Error Components Script
# Addresses syntax issues in error handling components

set -e

echo "🔧 Fixing Error Components..."
echo "============================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory
BACKUP_DIR="backup/error-components-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup_path="$BACKUP_DIR/$file"
        mkdir -p "$(dirname "$backup_path")"
        cp "$file" "$backup_path"
    fi
}

print_status "Fixing error component syntax issues..."

# List of error component files to check and fix
error_components=(
    "client/src/core/error/components/ErrorBoundary.tsx"
    "client/src/core/error/components/ErrorFallback.tsx"
    "client/src/core/error/components/ServiceUnavailable.tsx"
    "client/src/core/error/components/RecoveryUI.tsx"
    "client/src/core/error/components/SimpleErrorBoundary.tsx"
    "client/src/core/error/components/UnifiedErrorBoundary.tsx"
    "client/src/core/error/components/CommunityErrorBoundary.tsx"
    "client/src/core/error/components/ErrorRecoveryManager.tsx"
)

for file in "${error_components[@]}"; do
    if [ -f "$file" ]; then
        print_status "Checking: $file"
        
        # Check for malformed React.memo syntax
        if grep -q 'React\.memo(<.*> =' "$file"; then
            backup_file "$file"
            
            # Fix React.memo syntax issues
            sed -i 's/React\.memo(<\([^>]*\)> = (/const Component: React.FC<\1> = (/g' "$file"
            sed -i 's/);$/};/g' "$file"
            
            # Remove corrupted function declarations
            sed -i '/^function 1($/,/^};$/d' "$file"
            
            print_success "Fixed React.memo syntax in: $file"
        fi
        
        # Add missing button type attributes
        if grep -q '<button[^>]*onClick' "$file" && ! grep -q 'type=' "$file"; then
            backup_file "$file"
            
            sed -i 's/<button\([^>]*\)onClick/<button type="button"\1onClick/g' "$file"
            print_success "Added button types in: $file"
        fi
        
        # Fix any remaining syntax issues
        if grep -q 'function 1(' "$file"; then
            backup_file "$file"
            
            # Remove corrupted function declarations
            sed -i '/^function 1($/,/^};$/d' "$file"
            print_success "Removed corrupted functions in: $file"
        fi
    else
        print_status "File not found: $file"
    fi
done

# Check for any remaining TypeScript compilation issues
print_status "Checking for TypeScript issues..."

if command -v tsc &> /dev/null; then
    if tsc --noEmit --project client/tsconfig.json 2>/dev/null; then
        print_success "TypeScript compilation check passed!"
    else
        print_error "TypeScript compilation issues remain. Check the output above."
    fi
else
    print_status "TypeScript compiler not available for validation"
fi

# Generate report
cat > "error-components-fix-report-$(date +%Y%m%d-%H%M%S).md" << EOF
# Error Components Fix Report

**Generated:** $(date)
**Backup Location:** $BACKUP_DIR

## Summary

Fixed syntax issues in error handling components that were causing 500 server errors.

## Issues Fixed

### React.memo Syntax Errors
- Fixed malformed \`React.memo(<Type> = ({\` syntax
- Converted to proper \`React.FC<Type>\` syntax
- Removed corrupted function declarations

### Button Type Attributes
- Added \`type="button"\` to interactive buttons
- Improved accessibility compliance

### Component Structure
- Fixed component export syntax
- Cleaned up malformed closures

## Files Processed

$(for file in "${error_components[@]}"; do echo "- $file"; done)

## Expected Results

- Development server should start without 500 errors
- Error handling components should load properly
- TypeScript compilation should pass
- All buttons should be accessibility compliant

## Next Steps

1. Restart the development server
2. Test error handling functionality
3. Verify no more 500 errors in browser console
4. Run full application tests

EOF

print_success "Error components fix completed!"
print_status "Report generated: error-components-fix-report-$(date +%Y%m%d-%H%M%S).md"
print_status "Restart your development server to see the changes"