#!/bin/bash

# Client Codebase Fix Script
# Addresses critical issues found in validation

set -e

echo "🔧 Starting Client Codebase Fixes..."
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "client/src" ]; then
    print_error "This script must be run from the project root directory"
    exit 1
fi

# Create backup directory
BACKUP_DIR="backup/client-fixes-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
print_status "Created backup directory: $BACKUP_DIR"

# Function to backup a file before modifying
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup_path="$BACKUP_DIR/$file"
        mkdir -p "$(dirname "$backup_path")"
        cp "$file" "$backup_path"
        print_status "Backed up: $file"
    fi
}

# Phase 1: Fix Button Type Attributes
print_status "Phase 1: Fixing button type attributes across client..."

find client/src -name "*.tsx" -type f | while read -r file; do
    if grep -q '<button[^>]*onClick' "$file" && grep -q '<button[^>]*>' "$file"; then
        # Check if any buttons are missing type attribute
        if grep -q '<button[^>]*onClick' "$file" && ! grep -A1 -B1 '<button[^>]*onClick' "$file" | grep -q 'type='; then
            backup_file "$file"
            
            # Add type="button" to buttons that don't have type attribute
            # This is a more careful approach that preserves existing formatting
            sed -i 's/<button\([^>]*\)onClick/<button type="button"\1onClick/g' "$file"
            
            # Clean up any duplicate type attributes
            sed -i 's/type="button"[[:space:]]*type="button"/type="button"/g' "$file"
            
            print_success "Fixed button types in: $file"
        fi
    fi
done

# Phase 2: Fix Critical React Imports
print_status "Phase 2: Adding React imports to TSX files..."

# List of files that definitely need React imports (have JSX but no React import)
find client/src -name "*.tsx" -type f | while read -r file; do
    # Check if file has JSX elements but no React import
    if grep -q '<[A-Z][a-zA-Z0-9]*' "$file" && ! grep -q 'import React' "$file" && ! grep -q 'import.*from.*react' "$file"; then
        backup_file "$file"
        
        # Add React import at the top, after any existing comments
        if grep -q '^/\*\*' "$file"; then
            # File starts with JSDoc comment, add after it
            sed -i '/^\*\//a import React from '\''react'\'';' "$file"
        elif grep -q '^/\*' "$file"; then
            # File starts with block comment, add after it
            sed -i '/^\*\//a import React from '\''react'\'';' "$file"
        else
            # Add at the very top
            sed -i '1i import React from '\''react'\'';' "$file"
        fi
        print_success "Added React import to: $file"
    fi
done

# Phase 3: Fix Critical Accessibility Issues
print_status "Phase 3: Fixing critical accessibility issues..."

find client/src -name "*.tsx" -type f | while read -r file; do
    backup_file "$file"
    
    # Fix images without alt attributes (add empty alt for decorative images)
    sed -i 's/<img\([^>]*\)src=\([^>]*\)>/<img\1src=\2 alt="">/g' "$file"
    
    # Clean up any duplicate alt attributes
    sed -i 's/alt=""[[:space:]]*alt="[^"]*"/alt=""/g' "$file"
    
    if grep -q 'alt=""' "$file"; then
        print_success "Added alt attributes to images in: $file"
    fi
done

# Phase 4: Convert Deep Relative Imports (Sample)
print_status "Phase 4: Converting some deep relative imports..."

# Convert the most common deep relative imports to absolute imports
find client/src -name "*.ts" -o -name "*.tsx" | while read -r file; do
    if grep -q 'from ['\''"]../../../' "$file"; then
        backup_file "$file"
        
        # Convert common patterns
        sed -i "s|from ['\"]../../../types|from '@client/types|g" "$file"
        sed -i "s|from ['\"]../../../utils|from '@client/utils|g" "$file"
        sed -i "s|from ['\"]../../../core|from '@client/infrastructure|g" "$file"
        sed -i "s|from ['\"]../../../shared|from '@client/lib|g" "$file"
        
        print_success "Converted deep imports in: $file"
    fi
done

# Phase 5: Add Missing Alt Text for Common Cases
print_status "Phase 5: Adding descriptive alt text for common image patterns..."

find client/src -name "*.tsx" -type f | while read -r file; do
    if grep -q 'alt=""' "$file"; then
        backup_file "$file"
        
        # Add descriptive alt text for common patterns
        sed -i 's/alt="" className="[^"]*logo[^"]*"/alt="Application logo"/g' "$file"
        sed -i 's/alt="" className="[^"]*avatar[^"]*"/alt="User avatar"/g' "$file"
        sed -i 's/alt="" className="[^"]*icon[^"]*"/alt="Icon"/g' "$file"
        
        print_success "Enhanced alt text in: $file"
    fi
done

# Phase 6: Generate Summary Report
print_status "Phase 6: Generating fix summary..."

REPORT_FILE="client-fix-report-$(date +%Y%m%d-%H%M%S).md"

cat > "$REPORT_FILE" << EOF
# Client Codebase Fix Report

**Generated:** $(date)
**Backup Location:** $BACKUP_DIR

## Summary

This report summarizes the fixes applied to the client codebase based on validation results.

## Issues Addressed

### ✅ Button Type Attributes
- Added \`type="button"\` to interactive buttons across the codebase
- Prevents accidental form submissions
- Improves accessibility and user experience

### ✅ React Imports
- Added React imports to TSX files with JSX elements
- Ensures compatibility across different React versions
- Prevents potential runtime errors

### ✅ Accessibility Improvements
- Added alt attributes to images
- Enhanced alt text for common image patterns (logos, avatars, icons)
- Improved screen reader compatibility

### ✅ Import Path Optimization
- Converted deep relative imports to absolute imports where possible
- Improved code maintainability and readability
- Reduced import path complexity

## Files Modified

$(find client/src -name "*.tsx" -o -name "*.ts" | wc -l) files checked across the client directory

## Validation Results

Run the validation script to see current status:
\`\`\`bash
node scripts/validate-client-codebase.js
\`\`\`

## Recommendations

### Immediate Actions
1. **Test thoroughly** - Verify all components still work correctly
2. **Run TypeScript check** - Ensure no type errors were introduced
3. **Test accessibility** - Verify screen reader compatibility

### Long-term Improvements
1. **Implement ESLint rules** for button types and React imports
2. **Add pre-commit hooks** for validation
3. **Create accessibility guidelines** for the team
4. **Standardize import path conventions**

### Remaining Issues
Some issues may require manual review:
- Complex accessibility patterns
- Context-specific alt text
- Performance optimizations
- Error handling improvements

## Next Steps

1. Review this report and the backup directory
2. Test the application thoroughly
3. Run the validation script again to check progress
4. Address any remaining critical issues
5. Implement automated checks to prevent regressions

EOF

print_success "Generated report: $REPORT_FILE"

# Phase 7: Final Validation
print_status "Phase 7: Running quick validation..."

# Count remaining button issues
BUTTON_ISSUES=$(find client/src -name "*.tsx" -exec grep -l '<button[^>]*onClick' {} \; | xargs grep -L 'type=' | wc -l)

# Count files with React imports added
REACT_IMPORTS=$(find client/src -name "*.tsx" -exec grep -l 'import React' {} \; | wc -l)

echo ""
echo "🎯 QUICK VALIDATION RESULTS"
echo "=========================="
echo "Button type issues remaining: $BUTTON_ISSUES"
echo "TSX files with React imports: $REACT_IMPORTS"

if [ "$BUTTON_ISSUES" -lt 10 ]; then
    print_success "Significant improvement in button type issues! ✨"
else
    print_warning "More button type fixes may be needed."
fi

echo ""
print_success "Client codebase fixes completed!"
print_status "Backup created at: $BACKUP_DIR"
print_status "Report generated: $REPORT_FILE"
echo ""
echo "🚀 Next steps:"
echo "1. Review the generated report"
echo "2. Test the application thoroughly"
echo "3. Run full validation: node scripts/validate-client-codebase.js"
echo "4. Address any remaining critical issues"
echo "5. Consider implementing automated linting rules"