#!/bin/bash

set -e

echo "🔄 Updating imports after codebase flattening..."

# Function to update imports in files
update_imports() {
    local pattern="$1"
    local replacement="$2"
    local description="$3"
    local file_pattern="$4"
    
    echo "   🔍 $description..."
    
    # Use find to locate files and sed to replace
    local count=0
    while IFS= read -r -d '' file; do
        if grep -q "$pattern" "$file" 2>/dev/null; then
            sed -i.bak "s|$pattern|$replacement|g" "$file"
            ((count++))
        fi
    done < <(find . -name "$file_pattern" -type f -print0 2>/dev/null)
    
    if [ "$count" -gt 0 ]; then
        echo "   ✅ Updated $count files"
    else
        echo "   ℹ️  No files needed updating"
    fi
}

# ==========================================
# 1. UPDATE CLIENT AUTH IMPORTS
# ==========================================
echo ""
echo "👉 Updating Client Auth imports..."

# Update useAuth hook imports
update_imports \
    "from ['\"]@client/infrastructure/auth/hooks/useAuth['\"]" \
    "from '@client/infrastructure/auth/useAuth'" \
    "Updating useAuth hook imports" \
    "*.ts"

update_imports \
    "from ['\"]@client/infrastructure/auth/hooks/useAuth['\"]" \
    "from '@client/infrastructure/auth/useAuth'" \
    "Updating useAuth hook imports in TSX files" \
    "*.tsx"

# Update auth types imports
update_imports \
    "from ['\"]@client/infrastructure/auth/types['\"]" \
    "from '@client/infrastructure/auth/types'" \
    "Updating auth types imports" \
    "*.ts"

update_imports \
    "from ['\"]@client/infrastructure/auth/types['\"]" \
    "from '@client/infrastructure/auth/types'" \
    "Updating auth types imports in TSX files" \
    "*.tsx"

# ==========================================
# 2. UPDATE SERVER FEATURE IMPORTS
# ==========================================
echo ""
echo "👉 Updating Server Feature imports..."

# Function to update feature presentation imports
update_feature_imports() {
    local feature="$1"
    
    echo "   📁 Updating $feature feature imports..."
    
    # Update imports from presentation subdirectory
    update_imports \
        "from ['\"]@server/features/$feature/presentation/" \
        "from '@server/features/$feature/" \
        "Updating $feature presentation imports" \
        "*.ts"
    
    # Also handle relative imports
    update_imports \
        "from ['\"]\\./presentation/" \
        "from './" \
        "Updating $feature relative presentation imports" \
        "*.ts"
}

# Update each feature
update_feature_imports "bills"
update_feature_imports "users"
update_feature_imports "analysis" 
update_feature_imports "admin"
update_feature_imports "sponsors"
update_feature_imports "community"
update_feature_imports "search"
update_feature_imports "privacy"
update_feature_imports "constitutional-analysis"
update_feature_imports "argument-intelligence"
update_feature_imports "recommendation"

# ==========================================
# 3. UPDATE INDEX FILES
# ==========================================
echo ""
echo "👉 Checking index.ts files that may need updates..."

# Find index files that might need updating
echo "   🔍 Index files found:"
find . -name "index.ts" -type f | grep -E "(auth|features)" | while read -r file; do
    echo "     📄 $file"
done

# ==========================================
# 4. CLEANUP BACKUP FILES
# ==========================================
echo ""
echo "🧹 Cleaning up backup files..."

backup_count=$(find . -name "*.bak" -type f | wc -l)
if [ "$backup_count" -gt 0 ]; then
    echo "   Found $backup_count backup files (.bak)"
    read -p "   Delete backup files? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        find . -name "*.bak" -type f -delete
        echo "   🗑️  Deleted backup files"
    else
        echo "   ℹ️  Keeping backup files (you can delete them manually later)"
    fi
else
    echo "   ℹ️  No backup files found"
fi

# ==========================================
# 5. SUMMARY
# ==========================================
echo ""
echo "✨ Import updates complete!"
echo ""
echo "📋 RECOMMENDED NEXT STEPS:"
echo "   1. Run TypeScript compiler to check for errors: npm run type-check"
echo "   2. Run your linter: npm run lint"
echo "   3. Run tests to ensure everything works: npm test"
echo "   4. Check for any remaining import issues in your IDE"
echo ""
echo "🔍 If you find issues, check these files manually:"
echo "   - server/index.ts (main server file)"
echo "   - Any index.ts files in affected directories"
echo "   - Test files that import moved modules"