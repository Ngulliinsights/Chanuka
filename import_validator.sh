#!/bin/bash

# Import Validator - Analyzes imports and validates against project structure
# This script scans source files across multiple languages, extracts import statements,
# and validates that the imported files exist in your project structure

set -euo pipefail  # Exit on errors, undefined variables, and pipe failures

# Configuration
OUTPUT_FILE="docs/import-analysis.md"
TEMP_DIR=$(mktemp -d)
readonly OUTPUT_FILE TEMP_DIR

# Color codes for terminal output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'  # No Color

# Create docs directory if it doesn't exist
mkdir -p docs

# Cleanup function to remove temporary files
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Logging functions for consistent output
log_info() {
    echo -e "${BLUE}$1${NC}"
}

log_success() {
    echo -e "${GREEN}$1${NC}"
}

log_warning() {
    echo -e "${YELLOW}$1${NC}"
}

log_error() {
    echo -e "${RED}$1${NC}"
}

# Extract imports from source files based on language syntax
extract_imports() {
    local file="$1"
    local ext="${file##*.}"
    
    case "$ext" in
        js|jsx|ts|tsx)
            # Match ES6 imports, CommonJS require, and dynamic imports
            # This handles: import X from 'Y', require('Y'), import('Y')
            {
                # ES6 static imports
                grep -E "^[[:space:]]*import .* from ['\"]" "$file" 2>/dev/null || true
                # CommonJS require
                grep -E "^[[:space:]]*(const|let|var).* = require\(['\"]" "$file" 2>/dev/null || true
                # Dynamic imports
                grep -E "import\(['\"]" "$file" 2>/dev/null || true
            } | sed -E "s/.*from ['\"]([^'\"]+)['\"].*/\1/; s/.*require\(['\"]([^'\"]+)['\"]\).*/\1/; s/.*import\(['\"]([^'\"]+)['\"]\).*/\1/" | \
            grep -v "^import\|^const\|^let\|^var" | \
            sort -u
            ;;
        py)
            # Match Python imports: 'import X' and 'from X import Y'
            {
                grep -E "^[[:space:]]*from [[:alnum:]._]+ import " "$file" 2>/dev/null || true
                grep -E "^[[:space:]]*import [[:alnum:]._]+" "$file" 2>/dev/null || true
            } | sed -E 's/^[[:space:]]*from ([^ ]+) import .*/\1/; s/^[[:space:]]*import ([^ ,]+).*/\1/' | \
            sed 's/\./\//g' | \
            sort -u
            ;;
        go)
            # Extract Go imports from both single-line and multi-line import blocks
            awk '
                /^import "/ {
                    gsub(/^import "/, ""); 
                    gsub(/".*$/, ""); 
                    if (length($0) > 0) print
                }
                /^import \($/,/^\)$/ {
                    if ($0 !~ /^import|^\)/) {
                        gsub(/"/, ""); 
                        gsub(/^[[:space:]]+/, ""); 
                        gsub(/[[:space:]]+$/, "");
                        if (length($0) > 0) print
                    }
                }
            ' "$file" 2>/dev/null | sort -u
            ;;
        java)
            # Extract Java imports and convert dot notation to paths
            grep -E "^[[:space:]]*import " "$file" 2>/dev/null | \
            sed 's/^[[:space:]]*import //; s/;[[:space:]]*$//; s/[[:space:]]*$//' | \
            sed 's/\./\//g' | \
            sort -u
            ;;
        rb)
            # Extract Ruby require and require_relative statements
            grep -E "^[[:space:]]*(require|require_relative) ['\"]" "$file" 2>/dev/null | \
            sed "s/^[[:space:]]*require ['\"]//; s/^[[:space:]]*require_relative ['\"]//; s/['\"].*//; s/[[:space:]]*$//" | \
            sort -u
            ;;
    esac
}

# Check if an import path exists in the project structure
check_import_exists() {
    local import_path="$1"
    local source_file="$2"
    local source_dir
    source_dir=$(dirname "$source_file")
    
    # Skip validation for external packages
    # These patterns match npm packages, Python standard library, Go modules, etc.
    if [[ "$import_path" =~ ^[@a-zA-Z][a-zA-Z0-9_-]*(/|$) ]] || \
       [[ "$import_path" =~ ^[a-z]+\.[a-z]+ ]] || \
       [[ "$import_path" == /* ]]; then
        return 0
    fi
    
    # Handle relative imports (./file or ../file)
    if [[ "$import_path" == ./* ]] || [[ "$import_path" == ../* ]]; then
        local resolved_path="$source_dir/$import_path"
        
        # Try to normalize the path
        if command -v realpath &> /dev/null; then
            resolved_path=$(realpath -m "$resolved_path" 2>/dev/null || echo "$resolved_path")
        fi
        
        # Check if file exists with various extensions
        for ext in "" .js .jsx .ts .tsx .py .go .java .rb .mjs .cjs; do
            if [[ -f "${resolved_path}${ext}" ]]; then
                return 0
            fi
        done
        
        # Check for directory with index files
        if [[ -d "$resolved_path" ]]; then
            for index in index.js index.jsx index.ts index.tsx index.mjs __init__.py; do
                if [[ -f "${resolved_path}/${index}" ]]; then
                    return 0
                fi
            done
        fi
        
        return 1
    fi
    
    # Handle absolute imports from project root or configured paths
    for ext in "" .js .jsx .ts .tsx .py .go .java .rb .mjs .cjs; do
        if [[ -f "./${import_path}${ext}" ]]; then
            return 0
        fi
    done
    
    # Check common source directories
    for base in src lib app components utils helpers services modules pkg internal; do
        for ext in "" .js .jsx .ts .tsx .py .go .java .rb .mjs .cjs; do
            if [[ -f "./${base}/${import_path}${ext}" ]]; then
                return 0
            fi
        done
        
        # Check for directory with index files
        if [[ -d "./${base}/${import_path}" ]]; then
            for index in index.js index.jsx index.ts index.tsx index.mjs __init__.py; do
                if [[ -f "./${base}/${import_path}/${index}" ]]; then
                    return 0
                fi
            done
        fi
    done
    
    return 1
}

# Main analysis function
analyze_imports() {
    log_info "🔍 Starting import analysis...\n"
    log_info "📂 Scanning project files...\n"
    
    # Initialize temporary files
    : > "$TEMP_DIR/analyzed.txt"
    : > "$TEMP_DIR/missing.txt"
    
    local file_count=0
    local import_count=0
    
    # Find all source files, excluding common build/dependency directories
    # Using a simpler approach without eval for better reliability
    find . -type f \
        \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \
        -o -name "*.py" -o -name "*.go" -o -name "*.java" -o -name "*.rb" \
        -o -name "*.mjs" -o -name "*.cjs" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.git/*" \
        -not -path "*/vendor/*" \
        -not -path "*/__pycache__/*" \
        -not -path "*/coverage/*" \
        -not -path "*/.next/*" \
        -not -path "*/out/*" \
        -not -path "*/target/*" \
        -not -path "*/.venv/*" \
        -not -path "*/venv/*" \
        2>/dev/null | while IFS= read -r file; do
        
        # Skip empty results
        [[ -z "$file" ]] && continue
        
        file_count=$((file_count + 1))
        
        # Clean file path
        local clean_file="${file#./}"
        
        # Extract imports
        local imports
        imports=$(extract_imports "$file" 2>/dev/null || echo "")
        
        # Skip if no imports found
        if [[ -z "$imports" ]]; then
            continue
        fi
        
        # Record analyzed file
        echo "$clean_file" >> "$TEMP_DIR/analyzed.txt"
        
        # Process each import
        while IFS= read -r import_path; do
            [[ -z "$import_path" ]] && continue
            
            import_count=$((import_count + 1))
            
            # Check if import exists
            if ! check_import_exists "$import_path" "$file"; then
                echo "$clean_file|$import_path" >> "$TEMP_DIR/missing.txt"
            fi
        done <<< "$imports"
        
        # Show progress every 10 files
        if [[ $((file_count % 10)) -eq 0 ]]; then
            echo -ne "\r   Processed $file_count files..." >&2
        fi
    done
    
    # Clear progress line
    echo -ne "\r\033[K" >&2
}

# Generate the markdown report
generate_report() {
    log_info "📝 Generating report...\n"
    
    # Count results from temp files
    local total_files=0
    local missing_imports=0
    
    if [[ -f "$TEMP_DIR/analyzed.txt" ]]; then
        total_files=$(grep -c . "$TEMP_DIR/analyzed.txt" 2>/dev/null || echo 0)
    fi
    
    if [[ -f "$TEMP_DIR/missing.txt" ]]; then
        missing_imports=$(grep -c . "$TEMP_DIR/missing.txt" 2>/dev/null || echo 0)
    fi
    
    # Generate report
    {
        echo "# Import Analysis Report"
        echo ""
        echo "This report validates all import statements in your project against the actual file structure."
        echo ""
        echo "## Summary"
        echo ""
        echo "- **Files Analyzed:** $total_files"
        echo "- **Missing/Invalid Imports:** $missing_imports"
        echo "- **Status:** $([ "$missing_imports" -eq 0 ] && echo "✅ All imports valid" || echo "⚠️ Issues detected")"
        echo ""
        
        if [[ "$missing_imports" -gt 0 ]] && [[ -f "$TEMP_DIR/missing.txt" ]]; then
            echo "## Missing or Invalid Imports"
            echo ""
            echo "The following imports could not be resolved in your project structure:"
            echo ""
            
            local current_file=""
            while IFS='|' read -r file import; do
                if [[ "$file" != "$current_file" ]]; then
                    [[ -n "$current_file" ]] && echo ""
                    echo "### \`$file\`"
                    echo ""
                    current_file="$file"
                fi
                echo "- ❌ \`$import\`"
            done < "$TEMP_DIR/missing.txt"
            
            echo ""
            echo "## How to Fix"
            echo ""
            echo "1. **Verify file paths** - Check that imported files exist at specified locations"
            echo "2. **Install dependencies** - Run \`npm install\`, \`pip install\`, etc. for missing packages"
            echo "3. **Fix relative paths** - Ensure \`./\` and \`../\` imports point to correct locations"
            echo "4. **Check extensions** - Some frameworks require explicit file extensions"
            echo "5. **Review aliases** - Verify path aliases in tsconfig.json, webpack.config.js, etc."
            echo ""
        else
            echo "## ✅ All Imports Valid"
            echo ""
            echo "All imports have been validated successfully!"
            echo ""
        fi
        
        echo "---"
        echo ""
        echo "**Note:** External packages (npm, PyPI, Go modules, etc.) are assumed valid if installed."
        echo ""
        echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S')"
    } > "$OUTPUT_FILE"
    
    # Terminal summary
    log_success "✅ Analysis complete!\n"
    log_info "📊 Results:"
    echo -e "   Files analyzed: ${GREEN}$total_files${NC}"
    
    if [[ "$missing_imports" -eq 0 ]]; then
        echo -e "   Missing imports: ${GREEN}$missing_imports${NC} 🎉"
    else
        echo -e "   Missing imports: ${RED}$missing_imports${NC} ⚠️"
    fi
    
    echo -e "\n📄 Report: ${BLUE}$OUTPUT_FILE${NC}\n"
    
    # Return status based on findings
    return $([[ "$missing_imports" -eq 0 ]] && echo 0 || echo 1)
}

# Main execution
main() {
    analyze_imports
    generate_report
    local exit_code=$?
    
    if [[ $exit_code -eq 0 ]]; then
        log_success "✨ All imports are valid!\n"
    else
        log_warning "⚠️  Some imports need attention - check the report.\n"
    fi
    
    exit $exit_code
}

# Run main function
main