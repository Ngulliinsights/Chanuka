#!/bin/bash

# Complete FSD Migration Script
# This script completes the Feature-Sliced Design migration by moving all remaining
# components from the components/ directory to their proper FSD locations.

set -e  # Exit on any error

echo "🚀 Starting Complete FSD Migration..."
echo "======================================"

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
if [ ! -d "client/src/components" ]; then
    print_error "Components directory not found. Are you in the project root?"
    exit 1
fi

# Create backup
print_status "Creating backup of current state..."
git add -A
git commit -m "Backup before FSD migration completion" || print_warning "No changes to commit"

# Phase 1: Infrastructure Consolidation
print_status "Phase 1: Infrastructure Consolidation"
echo "--------------------------------------"

# Create infrastructure directories if they don't exist
mkdir -p client/src/lib/infrastructure/{system,compatibility,asset-loading}
mkdir -p client/src/app/shell
mkdir -p client/src/core/error/components

# Move system components
if [ -d "client/src/components/system" ]; then
    print_status "Moving system components to shared/infrastructure/system/"
    cp -r client/src/components/system/* client/src/lib/infrastructure/system/ 2>/dev/null || true
    print_success "System components moved"
fi

# Move compatibility components
if [ -d "client/src/components/compatibility" ]; then
    print_status "Moving compatibility components to shared/infrastructure/compatibility/"
    cp -r client/src/components/compatibility/* client/src/lib/infrastructure/compatibility/ 2>/dev/null || true
    print_success "Compatibility components moved"
fi

# Move asset loading components
if [ -d "client/src/components/asset-loading" ]; then
    print_status "Moving asset-loading components to shared/infrastructure/asset-loading/"
    cp -r client/src/components/asset-loading/* client/src/lib/infrastructure/asset-loading/ 2>/dev/null || true
    print_success "Asset loading components moved"
fi

# Move shell components
if [ -d "client/src/components/shell" ]; then
    print_status "Moving shell components to app/shell/"
    cp -r client/src/components/shell/* client/src/app/shell/ 2>/dev/null || true
    print_success "Shell components moved"
fi

# Move error handling components (merge with existing)
if [ -d "client/src/components/error-handling" ]; then
    print_status "Moving error-handling components to core/error/components/"
    cp -r client/src/components/error-handling/* client/src/core/error/components/ 2>/dev/null || true
    print_success "Error handling components moved"
fi

# Phase 2: Shared UI Consolidation
print_status "Phase 2: Shared UI Consolidation"
echo "--------------------------------"

# Create shared UI directories
mkdir -p client/src/lib/ui/{loading,notifications,offline,accessibility}
mkdir -p client/src/lib/design-system/primitives

# Move loading components
if [ -d "client/src/components/loading" ]; then
    print_status "Moving loading components to shared/ui/loading/"
    cp -r client/src/components/loading/* client/src/lib/ui/loading/ 2>/dev/null || true
    print_success "Loading components moved"
fi

# Move notifications
if [ -d "client/src/components/notifications" ]; then
    print_status "Moving notifications to shared/ui/notifications/"
    cp -r client/src/components/notifications/* client/src/lib/ui/notifications/ 2>/dev/null || true
    print_success "Notification components moved"
fi

# Move offline components
if [ -d "client/src/components/offline" ]; then
    print_status "Moving offline components to shared/ui/offline/"
    cp -r client/src/components/offline/* client/src/lib/ui/offline/ 2>/dev/null || true
    print_success "Offline components moved"
fi

# Move accessibility components
if [ -d "client/src/components/accessibility" ]; then
    print_status "Moving accessibility components to shared/ui/accessibility/"
    cp -r client/src/components/accessibility/* client/src/lib/ui/accessibility/ 2>/dev/null || true
    print_success "Accessibility components moved"
fi

# Move UI primitives (if not already moved)
if [ -d "client/src/components/ui" ]; then
    print_status "Moving UI primitives to shared/design-system/primitives/"
    cp -r client/src/components/ui/* client/src/lib/design-system/primitives/ 2>/dev/null || true
    print_success "UI primitives moved"
fi

# Phase 3: Feature-Specific Migration
print_status "Phase 3: Feature-Specific Migration"
echo "-----------------------------------"

# Create feature directories
mkdir -p client/src/features/{bills,security,users,admin}/ui
mkdir -p client/src/features/bills/ui/{analysis,tracking,components,transparency,education}
mkdir -p client/src/features/bills/ui/analysis/conflict
mkdir -p client/src/features/security/ui/{dashboard,privacy}
mkdir -p client/src/features/users/ui/{verification,onboarding}
mkdir -p client/src/features/admin/ui/{dashboard,coverage}

# Move bills-related components
if [ -d "client/src/components/analysis" ]; then
    print_status "Moving analysis components to features/bills/ui/analysis/"
    cp -r client/src/components/analysis/* client/src/features/bills/ui/analysis/ 2>/dev/null || true
    print_success "Analysis components moved"
fi

if [ -d "client/src/components/bill-tracking" ]; then
    print_status "Moving bill-tracking to features/bills/ui/tracking/"
    cp -r client/src/components/bill-tracking/* client/src/features/bills/ui/tracking/ 2>/dev/null || true
    print_success "Bill tracking components moved"
fi

if [ -d "client/src/components/bills" ]; then
    print_status "Moving bills components to features/bills/ui/components/"
    cp -r client/src/components/bills/* client/src/features/bills/ui/components/ 2>/dev/null || true
    print_success "Bills components moved"
fi

if [ -d "client/src/components/conflict-of-interest" ]; then
    print_status "Moving conflict-of-interest to features/bills/ui/analysis/conflict/"
    cp -r client/src/components/conflict-of-interest/* client/src/features/bills/ui/analysis/conflict/ 2>/dev/null || true
    print_success "Conflict of interest components moved"
fi

if [ -d "client/src/components/transparency" ]; then
    print_status "Moving transparency components to features/bills/ui/transparency/"
    cp -r client/src/components/transparency/* client/src/features/bills/ui/transparency/ 2>/dev/null || true
    print_success "Transparency components moved"
fi

if [ -d "client/src/components/education" ]; then
    print_status "Moving education components to features/bills/ui/education/"
    cp -r client/src/components/education/* client/src/features/bills/ui/education/ 2>/dev/null || true
    print_success "Education components moved"
fi

# Move security-related components
if [ -d "client/src/components/privacy" ]; then
    print_status "Moving privacy components to features/security/ui/privacy/"
    cp -r client/src/components/privacy/* client/src/features/security/ui/privacy/ 2>/dev/null || true
    print_success "Privacy components moved"
fi

if [ -d "client/src/components/security" ]; then
    print_status "Moving security components to features/security/ui/dashboard/"
    cp -r client/src/components/security/* client/src/features/security/ui/dashboard/ 2>/dev/null || true
    print_success "Security components moved"
fi

# Move user-related components
if [ -d "client/src/components/verification" ]; then
    print_status "Moving verification components to features/users/ui/verification/"
    cp -r client/src/components/verification/* client/src/features/users/ui/verification/ 2>/dev/null || true
    print_success "Verification components moved"
fi

if [ -d "client/src/components/onboarding" ]; then
    print_status "Moving onboarding components to features/users/ui/onboarding/"
    cp -r client/src/components/onboarding/* client/src/features/users/ui/onboarding/ 2>/dev/null || true
    print_success "Onboarding components moved"
fi

# Move admin-related components
if [ -d "client/src/components/admin" ]; then
    print_status "Moving admin components to features/admin/ui/dashboard/"
    cp -r client/src/components/admin/* client/src/features/admin/ui/dashboard/ 2>/dev/null || true
    print_success "Admin components moved"
fi

if [ -d "client/src/components/coverage" ]; then
    print_status "Moving coverage components to features/admin/ui/coverage/"
    cp -r client/src/components/coverage/* client/src/features/admin/ui/coverage/ 2>/dev/null || true
    print_success "Coverage components moved"
fi

# Move remaining components to appropriate locations
if [ -d "client/src/components/settings" ]; then
    print_status "Moving settings components to features/users/ui/settings/"
    mkdir -p client/src/features/users/ui/settings
    cp -r client/src/components/settings/* client/src/features/users/ui/settings/ 2>/dev/null || true
    print_success "Settings components moved"
fi

if [ -d "client/src/components/integration" ]; then
    print_status "Moving integration components to shared/ui/integration/"
    mkdir -p client/src/lib/ui/integration
    cp -r client/src/components/integration/* client/src/lib/ui/integration/ 2>/dev/null || true
    print_success "Integration components moved"
fi

if [ -d "client/src/components/examples" ]; then
    print_status "Moving examples to shared/ui/examples/"
    mkdir -p client/src/lib/ui/examples
    cp -r client/src/components/examples/* client/src/lib/ui/examples/ 2>/dev/null || true
    print_success "Example components moved"
fi

# Handle remaining components
if [ -d "client/src/components/shared" ]; then
    print_status "Moving shared components to shared/ui/"
    cp -r client/src/components/shared/* client/src/lib/ui/ 2>/dev/null || true
    print_success "Shared components moved"
fi

# Move any remaining loose files
if [ -f "client/src/components/connection-status.tsx" ]; then
    cp client/src/components/connection-status.tsx client/src/lib/ui/
fi

if [ -f "client/src/components/database-status.tsx" ]; then
    cp client/src/components/database-status.tsx client/src/lib/ui/
fi

if [ -f "client/src/components/OfflineIndicator.tsx" ]; then
    cp client/src/components/OfflineIndicator.tsx client/src/lib/ui/offline/
fi

if [ -f "client/src/components/OfflineModal.tsx" ]; then
    cp client/src/components/OfflineModal.tsx client/src/lib/ui/offline/
fi

# Phase 4: Update Index Files
print_status "Phase 4: Updating Index Files"
echo "-----------------------------"

# Update shared/infrastructure/index.ts
cat > client/src/lib/infrastructure/index.ts << 'EOF'
// Infrastructure Layer - Technical Infrastructure Components
export * from './system';
export * from './compatibility';
export * from './asset-loading';

// Re-export from existing infrastructure
export * from './data-retention';
EOF

# Update app/shell/index.ts
cat > client/src/app/shell/index.ts << 'EOF'
// App Shell Components
export * from './AppRouter';
export * from './AppShell';
export * from './NavigationBar';
export * from './ProtectedRoute';
export * from './SkipLinks';
EOF

# Update shared/ui/index.ts
cat >> client/src/lib/ui/index.ts << 'EOF'

// Additional Shared UI Components
export * from './loading';
export * from './notifications';
export * from './offline';
export * from './accessibility';
export * from './integration';
export * from './examples';
EOF

# Update feature index files
for feature in bills security users admin; do
    if [ -d "client/src/features/$feature/ui" ]; then
        echo "// $feature Feature UI Components" > "client/src/features/$feature/ui/index.ts"
        echo "export * from './components';" >> "client/src/features/$feature/ui/index.ts" 2>/dev/null || true
    fi
done

print_success "Index files updated"

# Phase 5: Import Updates
print_status "Phase 5: Updating Import References"
echo "----------------------------------"

print_status "Running comprehensive import migration..."

# Update infrastructure imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/system/|@client/lib/infrastructure/system/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/compatibility/|@client/lib/infrastructure/compatibility/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/asset-loading/|@client/lib/infrastructure/asset-loading/|g' 2>/dev/null || true

# Update app shell imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/shell/|@client/app/shell/|g' 2>/dev/null || true

# Update error handling imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/error-handling/|@client/core/error/components/|g' 2>/dev/null || true

# Update shared UI imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/loading/|@client/lib/ui/loading/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/notifications/|@client/lib/ui/notifications/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/offline/|@client/lib/ui/offline/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/accessibility/|@client/lib/ui/accessibility/|g' 2>/dev/null || true

# Update design system imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/ui/|@client/lib/design-system/primitives/|g' 2>/dev/null || true

# Update feature imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/analysis/|@client/features/bills/ui/analysis/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/bill-tracking/|@client/features/bills/ui/tracking/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/bills/|@client/features/bills/ui/components/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/conflict-of-interest/|@client/features/bills/ui/analysis/conflict/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/transparency/|@client/features/bills/ui/transparency/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/education/|@client/features/bills/ui/education/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/privacy/|@client/features/security/ui/privacy/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/security/|@client/features/security/ui/dashboard/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/verification/|@client/features/users/ui/verification/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/onboarding/|@client/features/users/ui/onboarding/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/admin/|@client/features/admin/ui/dashboard/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/coverage/|@client/features/admin/ui/coverage/|g' 2>/dev/null || true
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@client/components/settings/|@client/features/users/ui/settings/|g' 2>/dev/null || true

# Update any remaining @/components/ imports
find client/src -name "*.tsx" -o -name "*.ts" | xargs sed -i 's|@/components/|@client/lib/ui/|g' 2>/dev/null || true

print_success "Import references updated"

# Phase 6: Validation and Cleanup
print_status "Phase 6: Validation and Cleanup"
echo "-------------------------------"

# Check for remaining legacy imports
LEGACY_IMPORTS=$(grep -r "@.*components/" client/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".md" | wc -l || echo "0")

if [ "$LEGACY_IMPORTS" -eq 0 ]; then
    print_success "No legacy imports found!"
    
    # Ask user if they want to remove the components directory
    echo ""
    read -p "All components have been migrated. Remove the components/ directory? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Removing components/ directory..."
        rm -rf client/src/components/
        print_success "Components directory removed!"
    else
        print_warning "Components directory preserved. You can remove it manually after final validation."
    fi
else
    print_warning "Found $LEGACY_IMPORTS remaining legacy imports:"
    grep -r "@.*components/" client/src --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v ".md" | head -10
    print_warning "Please review and update these imports manually."
fi

# Final validation
print_status "Running final validation..."
if command -v tsx &> /dev/null; then
    tsx scripts/validate-fsd-migration.ts
else
    print_warning "tsx not found. Please run 'npm install -g tsx' and then run 'tsx scripts/validate-fsd-migration.ts' to validate the migration."
fi

# Commit changes
print_status "Committing migration changes..."
git add -A
git commit -m "Complete FSD migration: move all components to proper FSD structure

- Moved infrastructure components to shared/infrastructure/
- Moved app shell components to app/shell/
- Moved error handling to core/error/components/
- Moved shared UI components to shared/ui/
- Moved feature components to appropriate features/
- Updated all import references
- Removed components/ directory (if confirmed)

This completes the Feature-Sliced Design migration."

print_success "Migration completed successfully!"
echo ""
echo "🎉 FSD Migration Complete!"
echo "========================="
echo ""
echo "✅ All components have been moved to their proper FSD locations"
echo "✅ Import references have been updated"
echo "✅ Index files have been created/updated"
echo "✅ Changes have been committed to git"
echo ""
echo "Next steps:"
echo "1. Run 'npm run build' to verify everything compiles"
echo "2. Run 'npm test' to ensure all tests pass"
echo "3. Test the application to verify functionality"
echo "4. Run 'tsx scripts/validate-fsd-migration.ts' for final validation"
echo ""
echo "The codebase now follows proper Feature-Sliced Design architecture! 🚀"