#!/bin/bash

# Import Resolver - Intelligent automatic import path fixing with content analysis
# This script analyzes broken imports and fixes them using project structure analysis,
# TypeScript alias configuration, AND actual file content matching to ensure logical resolution

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
declare -i CONTENT_MATCHES_USED=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT

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
    
    if ! command -v python3 &> /dev/null; then
        log_error "python3 is required but not found"
        missing_deps+=("python3")
    fi
    
    if ! command -v sed &> /dev/null; then
        log_error "sed is required but not found"
        missing_deps+=("sed")
    fi
    
    if ! command -v grep &> /dev/null; then
        log_error "grep is required but not found"
        missing_deps+=("grep")
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
        
        local total_files
        total_files=$(find . -type f \
            \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/dist/*" \
            -not -path "*/build/*" \
            -not -path "*/.git/*" \
            -not -path "*/backup/*" 2>/dev/null | wc -l)
        
        log_info "Backing up $total_files source files..."
        
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
# FILE INDEX BUILDING WITH CONTENT CACHING
# ============================================================================

build_file_index() {
    log_info "Building comprehensive file index with export analysis..."
    
    : > "$TEMP_DIR/file_index.txt"
    : > "$TEMP_DIR/export_cache.txt"
    
    # Extract paths from structure markdown
    if [[ -f "$STRUCTURE_FILE" ]]; then
        grep -E "\.(js|jsx|ts|tsx)$" "$STRUCTURE_FILE" 2>/dev/null | \
            sed 's/^[│├└─ ]*//g' | \
            sed 's/\/$//g' | \
            grep -v '^```' | \
            sort -u >> "$TEMP_DIR/file_index.txt" || true
    fi
    
    # Scan actual filesystem
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
    
    sort -u "$TEMP_DIR/file_index.txt" -o "$TEMP_DIR/file_index.txt"
    
    # Build filename index and analyze exports in parallel
    log_info "Analyzing file exports for intelligent matching..."
    
    while IFS= read -r filepath; do
        local filename
        filename=$(basename "$filepath")
        echo "${filename}|${filepath}" >> "$TEMP_DIR/filename_index.txt"
        
        # Extract exports from this file for content-aware matching
        if [[ -f "$filepath" ]]; then
            extract_exports "$filepath" >> "$TEMP_DIR/export_cache.txt"
        fi
    done < "$TEMP_DIR/file_index.txt"
    
    sort "$TEMP_DIR/filename_index.txt" -o "$TEMP_DIR/filename_index.txt"
    
    local file_count
    file_count=$(wc -l < "$TEMP_DIR/file_index.txt")
    log_success "Indexed $file_count files with export information"
}

# ============================================================================
# CONTENT ANALYSIS - Extract what a file exports
# ============================================================================

extract_exports() {
    local filepath="$1"
    
    # Use Python for more robust export extraction
    python3 << EOF
import re
import sys

try:
    with open("$filepath", 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    exports = set()
    
    # Match: export { Name1, Name2 }
    for match in re.finditer(r'export\s*\{\s*([^}]+)\s*\}', content):
        items = match.group(1)
        for item in items.split(','):
            name = item.strip().split()[0]  # Handle "Name as Alias"
            exports.add(name)
    
    # Match: export const/let/var/function/class Name
    for match in re.finditer(r'export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', content):
        exports.add(match.group(1))
    
    # Match: export default Name (capture the identifier if present)
    default_match = re.search(r'export\s+default\s+(\w+)', content)
    if default_match:
        exports.add('default:' + default_match.group(1))
    elif 'export default' in content:
        exports.add('default')
    
    # Output format: filepath|export1,export2,export3
    if exports:
        print(f"$filepath|{','.join(sorted(exports))}")
    else:
        print(f"$filepath|")
        
except Exception as e:
    # Silently fail for files we can't read
    print(f"$filepath|", file=sys.stderr)
    sys.exit(0)
EOF
}

# ============================================================================
# CONTENT-AWARE IMPORT EXTRACTION
# ============================================================================

extract_imported_names() {
    local source_file="$1"
    local import_statement="$2"
    
    # Extract what's being imported from the source file
    python3 << EOF
import re

try:
    with open("$source_file", 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    imported_names = set()
    import_path = "$import_statement"
    
    # Find all import statements for this path
    # Match: import { Name1, Name2 } from 'path'
    pattern1 = rf"import\s*\{{\s*([^}}]+)\s*\}}\s*from\s*['\"]" + re.escape(import_path) + rf"['\"]"
    for match in re.finditer(pattern1, content):
        items = match.group(1)
        for item in items.split(','):
            # Handle "Name as Alias"
            name = item.strip().split()[0]
            imported_names.add(name)
    
    # Match: import Name from 'path' (default import)
    pattern2 = rf"import\s+(\w+)\s+from\s*['\"]" + re.escape(import_path) + rf"['\"]"
    for match in re.finditer(pattern2, content):
        imported_names.add('default:' + match.group(1))
    
    # Match: import * as Name from 'path'
    pattern3 = rf"import\s+\*\s+as\s+(\w+)\s+from\s*['\"]" + re.escape(import_path) + rf"['\"]"
    for match in re.finditer(pattern3, content):
        imported_names.add('*:' + match.group(1))
    
    # Output comma-separated list
    if imported_names:
        print(','.join(sorted(imported_names)))
    
except Exception:
    # If we can't parse, return empty
    pass
EOF
}

# ============================================================================
# ALIAS CONFIGURATION DETECTION
# ============================================================================

detect_alias_config() {
    log_info "Analyzing TypeScript configuration..."
    
    local tsconfig="tsconfig.json"
    local client_tsconfig="client/tsconfig.json"
    local server_tsconfig="server/tsconfig.json"
    
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
    
    if grep -q '"@client/\*"' "$config_file" && \
       grep -q '"@server/\*"' "$config_file" && \
       grep -q '"@shared/\*"' "$config_file"; then
        echo "multi-codebase" > "$TEMP_DIR/alias_type.txt"
        log_success "Detected multi-codebase alias strategy (@client, @server, @shared)"
        
        grep -A 1 '"@client/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/client_base.txt"
        grep -A 1 '"@server/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/server_base.txt"
        grep -A 1 '"@shared/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/shared_base.txt"
        
    elif grep -q '"@/\*"' "$config_file"; then
        echo "single-alias" > "$TEMP_DIR/alias_type.txt"
        log_success "Detected single-alias strategy (@)"
        
        grep -A 1 '"@/\*"' "$config_file" | tail -1 | sed 's/.*"\(.*\)".*/\1/' | sed 's/\/\*$//' > "$TEMP_DIR/alias_base.txt"
        
    else
        echo "standard" > "$TEMP_DIR/alias_type.txt"
        log_success "No aliases detected - using standard relative paths"
    fi
}

# ============================================================================
# INTELLIGENT IMPORT RESOLUTION WITH CONTENT MATCHING
# ============================================================================

find_best_match() {
    local import_path="$1"
    local source_file="$2"
    
    log_debug "Finding match for: $import_path (from: $source_file)"
    
    # Extract what's being imported from the source file
    local imported_names
    imported_names=$(extract_imported_names "$source_file" "$import_path")
    
    if [[ -n "$imported_names" ]]; then
        log_debug "Looking for exports: $imported_names"
    fi
    
    local clean_import
    clean_import=$(echo "$import_path" | sed -E 's/\.(jsx?|tsx?)$//')
    clean_import=$(echo "$clean_import" | sed 's/\/index$//')
    
    # Strategy 1: Exact path match (most reliable when it exists)
    local exact_match
    exact_match=$(grep -F "$clean_import" "$TEMP_DIR/file_index.txt" | head -1 || true)
    
    if [[ -n "$exact_match" ]] && [[ -f "$exact_match" ]]; then
        log_debug "Found exact path match: $exact_match"
        echo "$exact_match"
        return 0
    fi
    
    # Strategy 2: Match with common extensions
    for ext in ".ts" ".tsx" ".js" ".jsx"; do
        local match
        match=$(grep -F "${clean_import}${ext}" "$TEMP_DIR/file_index.txt" | head -1 || true)
        if [[ -n "$match" ]] && [[ -f "$match" ]]; then
            log_debug "Found match with extension: $match"
            echo "$match"
            return 0
        fi
    done
    
    # Strategy 3: Match with index files
    for index in "/index.ts" "/index.tsx" "/index.js" "/index.jsx"; do
        local match
        match=$(grep -F "${clean_import}${index}" "$TEMP_DIR/file_index.txt" | head -1 || true)
        if [[ -n "$match" ]] && [[ -f "$match" ]]; then
            log_debug "Found index file match: $match"
            echo "$match"
            return 0
        fi
    done
    
    # Strategy 4: Content-aware fuzzy matching (only if we know what's being imported)
    if [[ -n "$imported_names" ]]; then
        local best_match
        best_match=$(find_content_aware_match "$import_path" "$source_file" "$imported_names")
        
        if [[ -n "$best_match" ]]; then
            CONTENT_MATCHES_USED=$((CONTENT_MATCHES_USED + 1))
            log_debug "Found content-aware match: $best_match"
            echo "$best_match"
            return 0
        fi
    fi
    
    # Strategy 5: Contextual fuzzy filename match (use with caution)
    local filename
    filename=$(basename "$clean_import")
    
    if [[ -f "$TEMP_DIR/filename_index.txt" ]]; then
        local fuzzy_matches
        fuzzy_matches=$(grep -i "^${filename}" "$TEMP_DIR/filename_index.txt" || true)
        
        if [[ -n "$fuzzy_matches" ]]; then
            # Strongly prefer matches in same feature directory
            local source_feature
            source_feature=$(echo "$source_file" | cut -d'/' -f1-3)
            
            local best_match
            best_match=$(echo "$fuzzy_matches" | grep "$source_feature" | cut -d'|' -f2 | head -1 || \
                        echo "$fuzzy_matches" | cut -d'|' -f2 | head -1)
            
            if [[ -n "$best_match" ]] && [[ -f "$best_match" ]]; then
                log_warning "Using filename match (context-based): $best_match"
                log_warning "Please verify this is the correct file!"
                echo "$best_match"
                return 0
            fi
        fi
    fi
    
    log_debug "No match found for: $import_path"
    return 1
}

# Find files that export what we're looking for
find_content_aware_match() {
    local import_path="$1"
    local source_file="$2"
    local imported_names="$3"
    
    local filename
    filename=$(basename "$import_path" | sed -E 's/\.(jsx?|tsx?)$//')
    
    log_debug "Content-aware search for: $filename with exports: $imported_names"
    
    # Get all files with matching filename
    local candidates
    candidates=$(grep -i "^${filename}" "$TEMP_DIR/filename_index.txt" | cut -d'|' -f2 || true)
    
    if [[ -z "$candidates" ]]; then
        return 1
    fi
    
    # Score each candidate based on export matching
    local best_match=""
    local best_score=0
    
    while IFS= read -r candidate; do
        if [[ ! -f "$candidate" ]]; then
            continue
        fi
        
        # Get exports for this candidate
        local candidate_exports
        candidate_exports=$(grep "^${candidate}|" "$TEMP_DIR/export_cache.txt" | cut -d'|' -f2 || echo "")
        
        if [[ -z "$candidate_exports" ]]; then
            continue
        fi
        
        # Calculate match score
        local score=0
        
        # Convert to arrays for comparison
        IFS=',' read -ra IMPORTS <<< "$imported_names"
        IFS=',' read -ra EXPORTS <<< "$candidate_exports"
        
        # Count matching exports
        for import_name in "${IMPORTS[@]}"; do
            for export_name in "${EXPORTS[@]}"; do
                if [[ "$import_name" == "$export_name" ]]; then
                    score=$((score + 10))  # Exact match is very strong
                elif [[ "$import_name" == *":"* ]] && [[ "$export_name" == *":"* ]]; then
                    # Both are default exports
                    score=$((score + 5))
                fi
            done
        done
        
        # Bonus points for same directory context
        local source_dir
        local candidate_dir
        source_dir=$(dirname "$source_file")
        candidate_dir=$(dirname "$candidate")
        
        if [[ "$source_dir" == "$candidate_dir" ]]; then
            score=$((score + 20))  # Same directory is very likely correct
        elif [[ "$source_dir" == *"$(basename "$candidate_dir")"* ]]; then
            score=$((score + 10))  # Related directory structure
        fi
        
        log_debug "Candidate: $candidate, Score: $score, Exports: $candidate_exports"
        
        if [[ $score -gt $best_score ]]; then
            best_score=$score
            best_match="$candidate"
        fi
    done <<< "$candidates"
    
    # Only return match if score is significant (at least one export matched)
    if [[ $best_score -ge 10 ]]; then
        log_success "Content match found with score $best_score: $best_match"
        echo "$best_match"
        return 0
    fi
    
    log_debug "No confident content match found (best score: $best_score)"
    return 1
}

# ============================================================================
# PATH CALCULATION
# ============================================================================

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
    
    if not rel.startswith('..'):
        rel = './' + rel
    
    base = os.path.basename(rel)
    if '.' in base:
        parts = rel.rsplit('.', 1)
        if parts[1] in ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs']:
            rel = parts[0]
    
    print(rel)
except ValueError:
    print(target)
    sys.exit(1)
EOF
}

determine_import_path() {
    local source_file="$1"
    local target_file="$2"
    local alias_type
    alias_type=$(cat "$TEMP_DIR/alias_type.txt")
    
    log_debug "Determining import path: source=$source_file, target=$target_file, strategy=$alias_type"
    
    case "$alias_type" in
        multi-codebase)
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
            
            if [[ "$target_base" == "shared" ]]; then
                echo "@shared/${target_file#shared/}"
            elif [[ "$source_base" == "$target_base" ]] && [[ -n "$source_base" ]]; then
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
                calculate_relative_path "$source_file" "$target_file"
            fi
            ;;
            
        single-alias)
            if [[ "$target_file" == */src/* ]]; then
                local after_src="${target_file#*/src/}"
                echo "@/${after_src}"
            else
                calculate_relative_path "$source_file" "$target_file"
            fi
            ;;
            
        *)
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
    
    # Skip external package imports
    if [[ "$old_import" =~ ^[@a-zA-Z][a-zA-Z0-9_-]*(/|$) ]] && \
       [[ "$old_import" != @/* ]]; then
        log_debug "Skipping external package: $old_import"
        FIXES_SKIPPED=$((FIXES_SKIPPED + 1))
        return 0
    fi
    
    # Find the target file using intelligent matching
    local target_file
    if ! target_file=$(find_best_match "$old_import" "$source_file"); then
        log_warning "No suitable match found for: $old_import in $source_file"
        log_warning "This import may reference a file that was removed, renamed, or relocated."
        log_warning "Manual review recommended to determine the correct replacement."
        FIXES_FAILED=$((FIXES_FAILED + 1))
        return 1
    fi
    
    # Calculate the new import path
    local new_import
    new_import=$(determine_import_path "$source_file" "$target_file")
    
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
        local escaped_old escaped_new
        
        escaped_old=$(printf '%s\n' "$old_import" | sed 's/[[\.*^$/]/\\&/g')
        escaped_new=$(printf '%s\n' "$new_import" | sed 's/[\/&]/\\&/g')
        
        sed -i "s|from '${escaped_old}'|from '${escaped_new}'|g" "$source_file"
        sed -i "s|from \"${escaped_old}\"|from \"${escaped_new}\"|g" "$source_file"
        sed -i "s|import('${escaped_old}')|import('${escaped_new}')|g" "$source_file"
        sed -i "s|import(\"${escaped_old}\")|import(\"${escaped_new}\")|g" "$source_file"
        
        FIXES_SUCCESSFUL=$((FIXES_SUCCESSFUL + 1))
    else
        FIXES_SUCCESSFUL=$((FIXES_SUCCESSFUL + 1))
    fi
    
    return 0
}

# ============================================================================
# ANALYSIS PARSING
# ============================================================================

parse_and_fix_imports() {
    log_info "Parsing import analysis and resolving issues intelligently..."
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
        
        if [[ "$line" == "## Missing or Invalid Imports" ]]; then
            in_missing_section=true
            log_debug "Found missing imports section at line $line_number"
            continue
        fi
        
        if [[ "$in_missing_section" == true ]] && \
           [[ "$line" =~ ^##[[:space:]] ]] && \
           [[ "$line" != "## Missing or Invalid Imports" ]]; then
            log_debug "Exiting missing imports section at line $line_number"
            break
        fi
        
        if [[ "$in_missing_section" == true ]]; then
            if [[ "$line" =~ ^###[[:space:]]\`([^\`]+)\` ]]; then
                current_file="${BASH_REMATCH[1]}"
                FILES_PROCESSED=$((FILES_PROCESSED + 1))
                log_debug "Processing file: $current_file"
                continue
            fi
            
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
    echo "  Files with issues:     $FILES_PROCESSED"
    echo "  Imports attempted:     $FIXES_ATTEMPTED"
    echo -e "  Successful:            ${GREEN}$FIXES_SUCCESSFUL${NC}"
    echo -e "  Failed:                ${RED}$FIXES_FAILED${NC}"
    echo -e "  Skipped:               ${YELLOW}$FIXES_SKIPPED${NC}"
    echo -e "  Content-aware matches: ${CYAN}$CONTENT_MATCHES_USED${NC}"
    
    if [[ $FIXES_ATTEMPTED -gt 0 ]]; then
        local success_rate
        success_rate=$(( (FIXES_SUCCESSFUL * 100) / FIXES_ATTEMPTED ))
        echo -e "  Success rate:          ${GREEN}${success_rate}%${NC}"
    fi
    
    echo ""
    
    if [[ $CONTENT_MATCHES_USED -gt 0 ]]; then
        echo -e "${CYAN}ℹ${NC} Used intelligent content analysis for $CONTENT_MATCHES_USED imports"
        echo "  These matches were based on actual exported functions/types"
        echo ""
    fi
    
    if [[ $FIXES_FAILED -gt 0 ]]; then
        echo -e "${YELLOW}⚠${NC} $FIXES_FAILED imports could not be resolved automatically"
        echo "  These may reference files that were removed, renamed, or relocated"
        echo "  Please review the log and fix these manually"
        echo ""
    fi
    
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
${CYAN}Enhanced Import Resolver${NC} - Content-Aware Import Path Fixing

This script analyzes broken imports and automatically fixes them by examining
the actual exports of candidate files, ensuring logical resolution based on
what's actually being imported rather than just filename matching.

${YELLOW}Key Features:${NC}
    • Content-aware matching - analyzes what files export
    • Detects removed/renamed files - won't force invalid matches
    • Respects TypeScript alias configuration
    • Considers directory context and feature boundaries
    • Comprehensive safety checks and logging

${YELLOW}Usage:${NC}
    $0                              # Dry run (preview changes)
    DRY_RUN=false $0               # Apply changes
    DEBUG=true DRY_RUN=false $0    # Apply with debug output

${YELLOW}Options:${NC}
    --help, -h                      Show this help message

${YELLOW}Environment Variables:${NC}
    DRY_RUN=true|false             Control whether to apply changes (default: true)
    DEBUG=true|false               Enable detailed debug output (default: false)

${YELLOW}How It Works:${NC}
    1. Extracts what each file exports (functions, types, classes)
    2. Analyzes what the importing file is trying to import
    3. Matches based on actual content, not just filenames
    4. Considers directory context and project boundaries
    5. Warns when files may have been intentionally removed

${YELLOW}Example Scenario:${NC}
    If you have:
      - client/utils/formatDate.ts (exports: formatDate, parseDate)
      - server/utils/formatDate.ts (exports: formatISO, formatSQL)
    
    And an import breaks: import { formatDate } from './utils/formatDate'
    
    The script will analyze which file actually exports 'formatDate' and
    resolve to the correct one, rather than just picking the first match.

EOF
}

main() {
    : > "$LOG_FILE"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Enhanced Import Resolver${NC} - Content-Aware Import Fixing"
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
    
    check_prerequisites
    detect_alias_config
    build_file_index
    create_backup
    
    echo ""
    parse_and_fix_imports
    
    generate_summary
    
    if [[ "$DRY_RUN" == "false" ]]; then
        cp "$LOG_FILE" "$BACKUP_DIR/resolution.log"
    fi
    
    if [[ $FIXES_FAILED -gt 0 ]] || [[ $FIXES_ATTEMPTED -eq 0 ]]; then
        exit 1
    else
        exit 0
    fi
}

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    show_help
    exit 0
fi

main