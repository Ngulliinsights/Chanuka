#!/bin/bash

# Import Resolver - Intelligent automatic import path fixing
# This script analyzes broken imports and fixes them using project structure analysis
# and TypeScript alias configuration while maintaining comprehensive safety checks

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly ANALYSIS_FILE="docs/import-analysis.md"
readonly STRUCTURE_FILE="docs/project-structure.md"
readonly BACKUP_DIR="backup/imports-$(date +%Y%m%d_%H%M%S)"
readonly DRY_RUN="${DRY_RUN:-true}"
readonly TEMP_DIR=$(mktemp -d)
readonly LOG_FILE="${TEMP_DIR}/resolver.log"

# Color codes for terminal output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m'

# Statistics counters
declare -i FIXES_ATTEMPTED=0
declare -i FIXES_SUCCESSFUL=0
declare -i FIXES_FAILED=0
declare -i FIXES_SKIPPED=0
declare -i FILES_PROCESSED=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# Cleanup temporary files on exit
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

# Logging functions with consistent formatting
log_info() {
    echo -e "${BLUE}ℹ${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"
}

log_fix() {
    echo -e "${CYAN}→${NC} $1" | tee -a "$LOG_FILE"
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]]; then
        echo -e "${MAGENTA}[DEBUG]${NC} $1" | tee -a "$LOG_FILE"
    fi
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

check_prerequisites() {
    log_info "Verifying prerequisites..."
    
    local missing_deps=()
    
    # Check for required files
    if [[ ! -f "$ANALYSIS_FILE" ]]; then
        log_error "Import analysis file not found: $ANALYSIS_FILE"
        echo "         Run ./import_validator.sh first to generate the analysis"
        missing_deps+=("import_validator.sh")
    fi
    
    if [[ ! -f "$STRUCTURE_FILE" ]]; then
        log_error "Project structure file not found: $STRUCTURE_FILE"
        echo "         Run ./generate-structure-to-file.sh first"
        missing_deps+=("generate-structure-to-file.sh")
    fi
    
    # Check for required commands
    if ! command -v python3 &> /dev/null; then
        log_error "python3 is required but not found"
        missing_deps+=("python3")
    fi
    
    if ! command -v sed &> /dev/null; then
        log_error "sed is required but not found"
        missing_deps+=("sed")
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi
    
    log_success "All prerequisites verified"
}

# ============================================================================
# BACKUP MANAGEMENT
# ============================================================================

create_backup() {
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Creating backup at: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        
        # Count files to backup for progress indication
        local total_files
        total_files=$(find . -type f \
            \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/dist/*" \
            -not -path "*/build/*" \
            -not -path "*/.git/*" \
            -not -path "*/backup/*" 2>/dev/null | wc -l)
        
        log_info "Backing up $total_files source files..."
        
        # Perform backup with error handling
        find . -type f \
            \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/dist/*" \
            -not -path "*/build/*" \
            -not -path "*/.git/*" \
            -not -path "*/backup/*" \
            -exec cp --parents {} "$BACKUP_DIR/" \; 2>/dev/null || {
                log_warning "Some files could not be backed up (may not affect operation)"
            }
        
        log_success "Backup created successfully"
    else
        log_info "Dry run mode - no backup needed"
    fi
}

# ============================================================================
# FILE INDEX BUILDING
# ============================================================================

build_file_index() {
    log_info "Building comprehensive file index..."
    
    # Initialize index file
    : > "$TEMP_DIR/file_index.txt"
    
    # Extract paths from structure markdown with better parsing
    if [[ -f "$STRUCTURE_FILE" ]]; then
        # This captures files from the tree structure, handling various tree characters
        grep -E "\.(js|jsx|ts|tsx|py|go|java|rb)$" "$STRUCTURE_FILE" 2>/dev/null | \
            sed 's/^[│├└─ ]*//g' | \
            sed 's/\/$//g' | \
            grep -v '^```' | \
            sort -u >> "$TEMP_DIR/file_index.txt" || true
    fi
    
    # Scan actual filesystem for completeness and accuracy
    # This ensures we catch files that might not be in the structure doc
    find . -type f \
        \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/build/*" \
        -not -path "*/.git/*" \
        -not -path "*/coverage/*" \
        -not -path "*/backup/*" \
        -not -path "*/.next/*" \
        -not -path "*/out/*" \
        2>/dev/null | sed 's|^\./||' >> "$TEMP_DIR/file_index.txt" || true
    
    # Remove duplicates and sort for efficient searching
    sort -u "$TEMP_DIR/file_index.txt" -o "$TEMP_DIR/file_index.txt"
    
    # Build a secondary index by filename for faster fuzzy matching
    while IFS= read -r filepath; do
        local filename
        filename=$(basename "$filepath")
        echo "${filename}|${filepath}" >> "$TEMP_DIR/filename_index.txt"
    done < "$TEMP_DIR/file_index.txt"
    
    sort "$TEMP_DIR/filename_index.txt" -o "$TEMP_DIR/filename_index.txt"
    
    local file_count
    file_count=$(wc -l < "$TEMP_DIR/file_index.txt")
    log_success "Indexed $file_count files"
    
    log_debug "Sample index entries: $(head -3 "$TEMP_DIR/file_index.txt" | tr '\n' ', ')"
}

# ============================================================================
# ALIAS CONFIGURATION DETECTION
# ============================================================================

detect_alias_config() {
    log_info "Analyzing TypeScript configuration..."
    
    local tsconfig="tsconfig.json"
    local client_tsconfig="client/tsconfig.json"
    local server_tsconfig="server/tsconfig.json"
    
    # Look for tsconfig in common locations
    local config_file=""
    for cfg in "$tsconfig" "$client_tsconfig" "$server_tsconfig"; do
        if [[ -f "$cfg" ]]; then
            config_file="$cfg"
            break
        fi
    done
    
    if [[ -z "$config_file" ]]; then
        log_warning "No tsconfig.json found - using standard relative paths"
        echo "standard" > "$TEMP_DIR/alias_type.txt"
        return
    fi
    
    log_debug "Using config file: $config_file"
    
    # Detect multi-codebase strategy (strategic approach)
    if grep -q '"@client/\*"' "$config_file" && \
       grep -q '"@server/\*"' "$config_file" && \
       grep -q '"@shared/\*"' "$config_file"; then
        echo "multi-codebase" > "$TEMP_DIR/alias_type.txt"
        log_success "Detected multi-codebase alias strategy (@client, @server, @shared)"
        
        # Extract base paths for each alias
        grep -A 1 '"@client/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/client_base.txt"
        grep -A 1 '"@server/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/server_base.txt"
        grep -A 1 '"@shared/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/shared_base.txt"
        
    # Detect single-alias strategy
    elif grep -q '"@/\*"' "$config_file"; then
        echo "single-alias" > "$TEMP_DIR/alias_type.txt"
        log_success "Detected single-alias strategy (@)"
        
        # Extract base path for @ alias
        grep -A 1 '"@/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/alias_base.txt"
        
    else
        echo "standard" > "$TEMP_DIR/alias_type.txt"
        log_success "No aliases detected - using standard relative paths"
    fi
}

# ============================================================================
# IMPORT RESOLUTION LOGIC
# ============================================================================

# Find the best matching file for an import path
find_best_match() {
    local import_path="$1"
    local source_file="$2"
    
    log_debug "Finding match for: $import_path (from: $source_file)"
    
    # Normalize the import path for matching
    local clean_import
    clean_import=$(echo "$import_path" | sed -E 's/\.(jsx?|tsx?)$//')
    clean_import=$(echo "$clean_import" | sed 's/\/index$//')
    
    # Strategy 1: Exact path match (most reliable)
    local exact_match
    exact_match=$(grep -F "$clean_import" "$TEMP_DIR/file_index.txt" | head -1 || true)
    
    if [[ -n "$exact_match" ]]; then
        log_debug "Found exact match: $exact_match"
        echo "$exact_match"
        return 0
    fi
    
    # Strategy 2: Match with common extensions
    for ext in ".ts" ".tsx" ".js" ".jsx"; do
        local match
        match=$(grep -F "${clean_import}${ext}" "$TEMP_DIR/file_index.txt" | head -1 || true)
        if [[ -n "$match" ]]; then
            log_debug "Found match with extension: $match"
            echo "$match"
            return 0
        fi
    done
    
    # Strategy 3: Match with index files
    for index in "/index.ts" "/index.tsx" "/index.js" "/index.jsx"; do
        local match
        match=$(grep -F "${clean_import}${index}" "$TEMP_DIR/file_index.txt" | head -1 || true)
        if [[ -n "$match" ]]; then
            log_debug "Found index file match: $match"
            echo "$match"
            return 0
        fi
    done
    
    # Strategy 4: Fuzzy filename match (least reliable, use with caution)
    local filename
    filename=$(basename "$clean_import")
    
    if [[ -f "$TEMP_DIR/filename_index.txt" ]]; then
        local fuzzy_matches
        fuzzy_matches=$(grep -i "^${filename}" "$TEMP_DIR/filename_index.txt" || true)
        
        if [[ -n "$fuzzy_matches" ]]; then
            # Prefer matches in same feature directory
            local source_feature
            source_feature=$(echo "$source_file" | cut -d'/' -f1-3)
            
            local best_match
            best_match=$(echo "$fuzzy_matches" | grep "$source_feature" | cut -d'|' -f2 | head -1 || \
                        echo "$fuzzy_matches" | cut -d'|' -f2 | head -1)
            
            if [[ -n "$best_match" ]]; then
                log_debug "Found fuzzy match: $best_match"
                echo "$best_match"
                return 0
            fi
        fi
    fi
    
    log_debug "No match found for: $import_path"
    return 1
}

# Calculate relative path from source to target using Python
calculate_relative_path() {
    local source_file="$1"
    local target_file="$2"
    
    python3 << EOF
import os
import sys

source = os.path.dirname("$source_file")
target = "$target_file"

try:
    rel = os.path.relpath(target, source)
    
    # Ensure path starts with ./ or ../
    if not rel.startswith('..'):
        rel = './' + rel
    
    # Remove file extension for TypeScript/JavaScript imports
    base = os.path.basename(rel)
    if '.' in base:
        parts = rel.rsplit('.', 1)
        if parts[1] in ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs']:
            rel = parts[0]
    
    print(rel)
except ValueError as e:
    # Fallback if paths are on different drives (Windows) or other issues
    print(target)
    sys.exit(1)
EOF
}

# Determine the best import path based on alias strategy and context
determine_import_path() {
    local source_file="$1"
    local target_file="$2"
    local alias_type
    alias_type=$(cat "$TEMP_DIR/alias_type.txt")
    
    log_debug "Determining import path: source=$source_file, target=$target_file, strategy=$alias_type"
    
    case "$alias_type" in
        multi-codebase)
            # Strategic multi-codebase approach with clear boundaries
            
            # Determine which codebase each file belongs to
            local source_base=""
            local target_base=""
            
            if [[ "$source_file" == client/* ]]; then
                source_base="client"
            elif [[ "$source_file" == server/* ]]; then
                source_base="server"
            elif [[ "$source_file" == shared/* ]]; then
                source_base="shared"
            fi
            
            if [[ "$target_file" == client/* ]]; then
                target_base="client"
            elif [[ "$target_file" == server/* ]]; then
                target_base="server"
            elif [[ "$target_file" == shared/* ]]; then
                target_base="shared"
            fi
            
            # Apply strategic import rules based on boundaries
            if [[ "$target_base" == "shared" ]]; then
                # Always use @shared for shared code (clear boundary marker)
                echo "@shared/${target_file#shared/}"
            elif [[ "$source_base" == "$target_base" ]] && [[ -n "$source_base" ]]; then
                # Same codebase - use alias for clarity
                case "$target_base" in
                    client)
                        if [[ "$target_file" == client/src/* ]]; then
                            echo "@client/${target_file#client/src/}"
                        else
                            echo "@client/${target_file#client/}"
                        fi
                        ;;
                    server)
                        echo "@server/${target_file#server/}"
                        ;;
                    *)
                        calculate_relative_path "$source_file" "$target_file"
                        ;;
                esac
            else
                # Cross-codebase or unclear context - use relative path
                calculate_relative_path "$source_file" "$target_file"
            fi
            ;;
            
        single-alias)
            # Single alias strategy - use @ for src directory
            if [[ "$target_file" == */src/* ]]; then
                # Extract the part after src/
                local after_src="${target_file#*/src/}"
                echo "@/${after_src}"
            else
                calculate_relative_path "$source_file" "$target_file"
            fi
            ;;
            
        *)
            # Standard relative paths - safest default
            calculate_relative_path "$source_file" "$target_file"
            ;;
    esac
}

# ============================================================================
# IMPORT FIXING
# ============================================================================

fix_import() {
    local source_file="$1"
    local old_import="$2"
    
    FIXES_ATTEMPTED=$((FIXES_ATTEMPTED + 1))
    
    # Skip external package imports (they're not broken, just external)
    if [[ "$old_import" =~ ^[@a-zA-Z][a-zA-Z0-9_-]*(/|$) ]] && \
       [[ "$old_import" != @/* ]]; then
        log_debug "Skipping external package: $old_import"
        FIXES_SKIPPED=$((FIXES_SKIPPED + 1))
        return 0
    fi
    
    # Find the target file
    local target_file
    if ! target_file=$(find_best_match "$old_import" "$source_file"); then
        log_warning "No match found for: $old_import in $source_file"
        FIXES_FAILED=$((FIXES_FAILED + 1))
        return 1
    fi
    
    # Calculate the new import path
    local new_import
    new_import=$(determine_import_path "$source_file" "$target_file")
    
    # Verify new import is different and valid
    if [[ "$old_import" == "$new_import" ]]; then
        log_debug "Import already correct: $old_import"
        FIXES_SKIPPED=$((FIXES_SKIPPED + 1))
        return 0
    fi
    
    # Display the fix
    log_fix "In $source_file:"
    echo -e "   ${RED}−${NC} from '$old_import'"
    echo -e "   ${GREEN}+${NC} from '$new_import'"
    
    if [[ "$DRY_RUN" == "false" ]]; then
        # Perform the actual replacement with proper escaping
        local escaped_old escaped_new
        
        # Escape special regex characters in old import
        escaped_old=$(printf '%s\n' "$old_import" | sed 's/[[\.*^$/]/\\&/g')
        
        # Escape special sed replacement characters in new import
        escaped_new=$(printf '%s\n' "$new_import" | sed 's/[\/&]/\\&/g')
        
        # Replace in various import formats
        # ES6 static imports with single quotes
        sed -i "s|from '${escaped_old}'|from '${escaped_new}'|g" "$source_file"
        
        # ES6 static imports with double quotes
        sed -i "s|from \"${escaped_old}\"|from \"${escaped_new}\"|g" "$source_file"
        
        # Dynamic imports with single quotes
        sed -i "s|import('${escaped_old}')|import('${escaped_new}')|g" "$source_file"
        
        # Dynamic imports with double quotes
        sed -i "s|import(\"${escaped_old}\")|import(\"${escaped_new}\")|g" "$source_file"
        
        FIXES_SUCCESSFUL=$((FIXES_SUCCESSFUL + 1))
    else
        # In dry run, count as successful to show what would happen
        FIXES_SUCCESSFUL=$((FIXES_SUCCESSFUL + 1))
    fi
    
    return 0
}

# ============================================================================
# ANALYSIS PARSING
# ============================================================================

parse_and_fix_imports() {
    log_info "Parsing import analysis and resolving issues..."
    echo ""
    
    if [[ ! -f "$ANALYSIS_FILE" ]]; then
        log_error "Analysis file not found: $ANALYSIS_FILE"
        return 1
    fi
    
    local current_file=""
    local in_missing_section=false
    local line_number=0
    
    while IFS= read -r line; do
        line_number=$((line_number + 1))
        
        # Detect the missing imports section
        if [[ "$line" == "## Missing or Invalid Imports" ]]; then
            in_missing_section=true
            log_debug "Found missing imports section at line $line_number"
            continue
        fi
        
        # Stop when we reach the next major section
        if [[ "$in_missing_section" == true ]] && \
           [[ "$line" =~ ^##[[:space:]] ]] && \
           [[ "$line" != "## Missing or Invalid Imports" ]]; then
            log_debug "Exiting missing imports section at line $line_number"
            break
        fi
        
        if [[ "$in_missing_section" == true ]]; then
            # Extract file path from markdown heading (### `path/to/file.ts`)
            if [[ "$line" =~ ^###[[:space:]]\`([^\`]+)\` ]]; then
                current_file="${BASH_REMATCH[1]}"
                FILES_PROCESSED=$((FILES_PROCESSED + 1))
                log_debug "Processing file: $current_file"
                continue
            fi
            
            # Extract import path from list item (- ❌ `import/path`)
            if [[ "$line" =~ ^-[[:space:]][❌✗][[:space:]]\`([^\`]+)\` ]]; then
                local import_path="${BASH_REMATCH[1]}"
                
                if [[ -n "$current_file" ]]; then
                    if [[ -f "$current_file" ]]; then
                        fix_import "$current_file" "$import_path" || true
                    else
                        log_warning "Source file not found: $current_file"
                        FIXES_FAILED=$((FIXES_FAILED + 1))
                    fi
                fi
            fi
        fi
    done < "$ANALYSIS_FILE"
    
    log_debug "Processed $FILES_PROCESSED files with import issues"
}

# ============================================================================
# REPORTING
# ============================================================================

generate_summary() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Import Resolution Summary${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Files with issues: $FILES_PROCESSED"
    echo "  Imports attempted: $FIXES_ATTEMPTED"
    echo -e "  Successful:        ${GREEN}$FIXES_SUCCESSFUL${NC}"
    echo -e "  Failed:            ${RED}$FIXES_FAILED${NC}"
    echo -e "  Skipped:           ${YELLOW}$FIXES_SKIPPED${NC}"
    
    # Calculate success rate
    if [[ $FIXES_ATTEMPTED -gt 0 ]]; then
        local success_rate
        success_rate=$(( (FIXES_SUCCESSFUL * 100) / FIXES_ATTEMPTED ))
        echo -e "  Success rate:      ${GREEN}${success_rate}%${NC}"
    fi
    
    echo ""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}⚠  DRY RUN MODE${NC} - No files were modified"
        echo ""
        echo "  To apply these changes, run:"
        echo -e "  ${CYAN}DRY_RUN=false $0${NC}"
        echo ""
        echo "  Or with debug output:"
        echo -e "  ${CYAN}DEBUG=true DRY_RUN=false $0${NC}"
    else
        echo -e "${GREEN}✓ Changes applied successfully${NC}"
        echo ""
        echo "  Backup location: $BACKUP_DIR"
        echo "  Log file:        $LOG_FILE"
        echo ""
        echo "  Recommended next steps:"
        echo "    1. Review changes:    git diff"
        echo "    2. Type checking:     npm run type-check"
        echo "    3. Run tests:         npm test"
        echo "    4. Lint files:        npm run lint"
        echo ""
        echo "  If issues occur, restore from backup:"
        echo "    cp -r $BACKUP_DIR/* ."
    fi
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# MAIN EXECUTION
# ============================================================================

show_help() {
    cat << EOF
${CYAN}Import Resolver${NC} - Intelligent automatic import path fixing

This script analyzes broken imports from import-analysis.md and automatically
fixes them based on your project structure and TypeScript alias configuration.

${YELLOW}Usage:${NC}
    $0                              # Dry run (preview changes)
    DRY_RUN=false $0               # Apply changes
    DEBUG=true DRY_RUN=false $0    # Apply with debug output

${YELLOW}Options:${NC}
    --help, -h                      Show this help message

${YELLOW}Environment Variables:${NC}
    DRY_RUN=true|false             Control whether to apply changes (default: true)
    DEBUG=true|false               Enable detailed debug output (default: false)

${YELLOW}Safety Features:${NC}
    • Dry run mode by default - preview before applying
    • Automatic backup of all source files before changes
    • Intelligent path resolution based on project structure
    • Respects your alias configuration (@client, @server, @shared or @)
    • Skips external package imports
    • Comprehensive logging for troubleshooting

${YELLOW}Prerequisites:${NC}
    • docs/import-analysis.md (from import_validator.sh)
    • docs/project-structure.md (from generate-structure-to-file.sh)
    • python3 (for path calculations)

${YELLOW}Import Strategy Detection:${NC}
    The script automatically detects your import strategy:
    • Multi-codebase: Uses @client, @server, @shared for clear boundaries
    • Single-alias:   Uses @ for cleaner imports
    • Standard:       Uses relative paths only

${YELLOW}Examples:${NC}
    # Preview what would be fixed
    ./import_resolver.sh

    # Apply fixes with confirmation
    DRY_RUN=false ./import_resolver.sh

    # Debug mode to see detailed resolution logic
    DEBUG=true ./import_resolver.sh

    # Restore from backup if needed
    cp -r backup/imports-TIMESTAMP/* .

${YELLOW}Workflow Integration:${NC}
    1. Run structure generator:  ./generate-structure-to-file.sh
    2. Run import validator:     ./import_validator.sh
    3. Review analysis:          cat docs/import-analysis.md
    4. Preview fixes:            ./import_resolver.sh
    5. Apply fixes:              DRY_RUN=false ./import_resolver.sh
    6. Verify changes:           npm run type-check && npm test

EOF
}

main() {
    # Initialize log file
    : > "$LOG_FILE"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Import Resolver${NC} - Automatic Import Path Fixing"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_warning "Running in DRY RUN mode - no files will be modified"
    else
        log_info "Running in LIVE mode - files will be modified"
    fi
    
    if [[ "${DEBUG:-false}" == "true" ]]; then
        log_info "Debug mode enabled - detailed output will be shown"
    fi
    
    echo ""
    
    # Execute resolution pipeline
    check_prerequisites
    detect_alias_config
    build_file_index
    create_backup
    
    echo ""
    parse_and_fix_imports
    
    generate_summary
    
    # Copy log file to backup if we made changes
    if [[ "$DRY_RUN" == "false" ]]; then
        cp "$LOG_FILE" "$BACKUP_DIR/resolution.log"
    fi
    
    # Exit with appropriate status code
    if [[ $FIXES_FAILED -gt 0 ]] || [[ $FIXES_ATTEMPTED -eq 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

# Handle help flag
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

# Execute main function
main
