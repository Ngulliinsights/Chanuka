#!/bin/bash

set -e  # Exit on any error

echo "🔧 Starting Codebase Flattening..."
echo "⚠️  This will modify your file structure. Make sure you have a backup!"

# Function to safely move files
safe_move() {
    local src="$1"
    local dest="$2"
    local description="$3"
    
    if [ -e "$src" ]; then
        if [ -e "$dest" ]; then
            echo "   ⚠️  Destination $dest already exists, skipping $description"
            return 1
        else
            mv "$src" "$dest"
            echo "   ✅ $description"
            return 0
        fi
    else
        echo "   ℹ️  Source $src not found, skipping $description"
        return 1
    fi
}

# Function to safely remove directory if empty
safe_rmdir() {
    local dir="$1"
    local description="$2"
    
    if [ -d "$dir" ]; then
        if rmdir "$dir" 2>/dev/null; then
            echo "   🗑️  Removed empty directory: $description"
        else
            echo "   ⚠️  Directory $dir not empty, keeping it"
        fi
    fi
}

# ==========================================
# 1. FLATTEN CLIENT AUTH (Core)
# ==========================================
echo ""
echo "👉 Flattening Client Auth Core..."

# Move useAuth hook up
for ext in ts tsx; do
    if safe_move "client/src/core/auth/hooks/useAuth.$ext" "client/src/core/auth/useAuth.$ext" "Moved useAuth.$ext to core/auth root"; then
        break
    fi
done

# Remove hooks directory if empty
safe_rmdir "client/src/core/auth/hooks" "auth hooks directory"

# Move types up (if it exists as a folder)
if [ -d "client/src/core/auth/types" ]; then
    if safe_move "client/src/core/auth/types/index.ts" "client/src/core/auth/types.ts" "Flattened auth types"; then
        safe_rmdir "client/src/core/auth/types" "auth types directory"
    fi
fi

# ==========================================
# 2. FLATTEN SERVER FEATURES (Presentation Layer)
# ==========================================
echo ""
echo "👉 Flattening Server Features..."

# Function to flatten presentation layers
flatten_presentation() {
    local feature=$1
    local presentation_path="server/features/$feature/presentation"
    local feature_path="server/features/$feature"
    
    if [ -d "$presentation_path" ]; then
        echo "   📁 Processing $feature feature..."
        
        # Count files to move
        local file_count=$(find "$presentation_path" -maxdepth 1 -type f | wc -l)
        
        if [ "$file_count" -gt 0 ]; then
            # Move all files up one level
            local moved_count=0
            for file in "$presentation_path"/*; do
                if [ -f "$file" ]; then
                    local filename=$(basename "$file")
                    if safe_move "$file" "$feature_path/$filename" "Moved $filename from presentation/"; then
                        ((moved_count++))
                    fi
                fi
            done
            
            echo "   📊 Moved $moved_count/$file_count files for $feature"
            
            # Remove presentation directory if empty
            safe_rmdir "$presentation_path" "$feature presentation directory"
        else
            echo "   ℹ️  No files to move in $feature presentation layer"
        fi
    else
        echo "   ℹ️  No presentation layer found for $feature"
    fi
}

# Process each feature
flatten_presentation "bills"
flatten_presentation "users" 
flatten_presentation "analysis"
flatten_presentation "admin"
flatten_presentation "sponsors"
flatten_presentation "community"
flatten_presentation "search"
flatten_presentation "privacy"
flatten_presentation "constitutional-analysis"
flatten_presentation "argument-intelligence"
flatten_presentation "recommendation"

# ==========================================
# 3. CLEANUP EMPTY DIRS
# ==========================================
echo ""
echo "🧹 Cleaning up empty directories..."

# Function to clean empty directories safely
cleanup_empty_dirs() {
    local base_path="$1"
    local description="$2"
    
    if [ -d "$base_path" ]; then
        local removed_count=0
        # Find and remove empty directories (deepest first)
        while IFS= read -r -d '' dir; do
            if rmdir "$dir" 2>/dev/null; then
                ((removed_count++))
            fi
        done < <(find "$base_path" -type d -empty -print0 2>/dev/null)
        
        if [ "$removed_count" -gt 0 ]; then
            echo "   🗑️  Removed $removed_count empty directories from $description"
        else
            echo "   ℹ️  No empty directories found in $description"
        fi
    fi
}

cleanup_empty_dirs "client/src" "client source"
cleanup_empty_dirs "server/features" "server features"

# ==========================================
# 4. SUMMARY & NEXT STEPS
# ==========================================
echo ""
echo "✨ Flattening complete!"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Update import statements in affected files"
echo "   2. Update index.ts exports to match new paths"
echo "   3. Run your linter/formatter to catch any issues"
echo "   4. Test your application to ensure everything works"
echo ""
echo "🔍 Files that may need import updates:"
echo "   - Any files importing from flattened directories"
echo "   - Index files that re-export moved modules"
echo "   - Test files that import the moved components"
echo ""
echo "💡 TIP: Use your IDE's 'Find and Replace' to update import paths"