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
readonly MAX_PARALLEL_JOBS="${MAX_PARALLEL_JOBS:-4}"

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

# Cache for expensive operations
declare -A RELATIVE_PATH_CACHE
declare -A EXPORT_CONTENT_CACHE
declare -A IMPORT_CACHE

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    # Clean up any background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

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
    
    # Check for required commands
    for cmd in node sed grep find; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "$cmd is required but not found"
            missing_deps+=("$cmd")
        fi
    done
    
    # Verify Node.js version (we need at least v12 for modern features)
    if command -v node &> /dev/null; then
        local node_version
        node_version=$(node --version | sed 's/v//' | cut -d'.' -f1)
        if [[ $node_version -lt 12 ]]; then
            log_error "Node.js version 12 or higher required (found v$node_version)"
            missing_deps+=("node>=12")
        fi
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        return 1
    fi
    
    log_success "All prerequisites verified"
    return 0
}

# ============================================================================
# BACKUP MANAGEMENT
# ============================================================================

create_backup() {
    if [[ "$DRY_RUN" == "false" ]]; then
        log_info "Creating backup at: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
        
        # Use find with -print0 for filenames with spaces
        local total_files
        total_files=$(find . -type f \
            \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/dist/*" \
            -not -path "*/build/*" \
            -not -path "*/.git/*" \
            -not -path "*/backup/*" \
            2>/dev/null | wc -l)
        
        log_info "Backing up $total_files source files..."
        
        # Use tar for efficient backup
        find . -type f \
            \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/dist/*" \
            -not -path "*/build/*" \
            -not -path "*/.git/*" \
            -not -path "*/backup/*" \
            -print0 2>/dev/null | \
            tar --null -T - -czf "$BACKUP_DIR/backup.tar.gz" 2>/dev/null || {
                log_warning "Backup creation had warnings (may not affect operation)"
            }
        
        log_success "Backup created successfully"
    else
        log_info "Dry run mode - no backup needed"
    fi
}

# ============================================================================
# FILE INDEX BUILDING WITH PARALLEL PROCESSING
# ============================================================================

build_file_index() {
    log_info "Building comprehensive file index with export analysis..."
    
    : > "$TEMP_DIR/file_index.txt"
    : > "$TEMP_DIR/export_cache.txt"
    : > "$TEMP_DIR/filename_index.txt"
    
    # Extract paths from structure markdown (fast)
    if [[ -f "$STRUCTURE_FILE" ]]; then
        grep -E "\.(js|jsx|ts|tsx)$" "$STRUCTURE_FILE" 2>/dev/null | \
            sed 's/^[│├└─ ]*//g' | \
            sed 's/\/$//g' | \
            grep -v '^```' | \
            sort -u >> "$TEMP_DIR/file_index.txt" || true
    fi
    
    # Scan actual filesystem (slower but necessary)
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
        -print0 2>/dev/null | \
        xargs -0 -I {} echo {} | \
        sed 's|^\./||' >> "$TEMP_DIR/file_index.txt" || true
    
    # Deduplicate while preserving order
    sort -u "$TEMP_DIR/file_index.txt" -o "$TEMP_DIR/file_index.txt"
    
    local total_files
    total_files=$(wc -l < "$TEMP_DIR/file_index.txt")
    
    if [[ $total_files -eq 0 ]]; then
        log_error "No source files found in project"
        return 1
    fi
    
    log_info "Analyzing exports for $total_files files (using parallel processing)..."
    
    # Process files in parallel using xargs
    cat "$TEMP_DIR/file_index.txt" | \
        xargs -P "$MAX_PARALLEL_JOBS" -I {} bash -c '
            filepath="{}"
            filename=$(basename "$filepath")
            echo "${filename}|${filepath}" >> "'"$TEMP_DIR"'/filename_index.txt.tmp"
            
            if [[ -f "$filepath" ]]; then
                # Call extract_exports function and append to temp cache
                '"$(declare -f extract_exports)"'
                extract_exports "$filepath" >> "'"$TEMP_DIR"'/export_cache.txt.tmp" 2>/dev/null || true
            fi
        ' 2>/dev/null || true
    
    # Consolidate temporary files
    if [[ -f "$TEMP_DIR/filename_index.txt.tmp" ]]; then
        sort "$TEMP_DIR/filename_index.txt.tmp" > "$TEMP_DIR/filename_index.txt"
        rm "$TEMP_DIR/filename_index.txt.tmp"
    fi
    
    if [[ -f "$TEMP_DIR/export_cache.txt.tmp" ]]; then
        sort "$TEMP_DIR/export_cache.txt.tmp" > "$TEMP_DIR/export_cache.txt"
        rm "$TEMP_DIR/export_cache.txt.tmp"
    fi
    
    log_success "Indexed $total_files files with export information"
    return 0
}

# ============================================================================
# CONTENT ANALYSIS - Extract what a file exports using Node.js
# ============================================================================

extract_exports() {
    local filepath="$1"
    
    # Return cached result if available
    if [[ -n "${EXPORT_CONTENT_CACHE[$filepath]:-}" ]]; then
        echo "${EXPORT_CONTENT_CACHE[$filepath]}"
        return 0
    fi
    
    # Use Node.js for robust export extraction
    # Node.js is perfect for this since we're analyzing JS/TS files anyway
    local result
    result=$(node << 'NODESCRIPT' "$filepath"
const fs = require('fs');
const filepath = process.argv[1];

try {
    const content = fs.readFileSync(filepath, 'utf8');
    const exports = new Set();
    
    // Match: export { Name1, Name2 } or export type { Name1, Name2 }
    // We use a regex that captures the content between braces
    const namedExportPattern = /export\s+(?:type\s+)?\{\s*([^}]+)\s*\}/g;
    let match;
    while ((match = namedExportPattern.exec(content)) !== null) {
        const items = match[1];
        // Split by comma and handle "Name as Alias" syntax
        items.split(',').forEach(item => {
            const parts = item.trim().split(/\s+/);
            const name = parts[0];
            // Skip keywords and empty strings
            if (name && name !== 'type' && name !== 'as') {
                exports.add(name);
            }
        });
    }
    
    // Match: export const/let/var/function/class Name
    // This handles direct exports of declarations
    const declarationPattern = /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g;
    while ((match = declarationPattern.exec(content)) !== null) {
        exports.add(match[1]);
    }
    
    // Match: export default Name
    // We capture the identifier if present, or just mark that there's a default
    const defaultMatch = /export\s+default\s+(\w+)/.exec(content);
    if (defaultMatch) {
        exports.add('default:' + defaultMatch[1]);
    } else if (content.includes('export default')) {
        exports.add('default');
    }
    
    // Match: export * from (re-exports)
    // This indicates the file re-exports everything from another module
    if (/export\s+\*/.test(content)) {
        exports.add('*');
    }
    
    // Output format: filepath|export1,export2,export3
    const exportList = Array.from(exports).sort().join(',');
    console.log(`${filepath}|${exportList}`);
    
} catch (error) {
    // Silently fail for files we can't read
    console.log(`${filepath}|`);
    process.exit(0);
}
NODESCRIPT
)
    
    # Cache the result for future use
    EXPORT_CONTENT_CACHE[$filepath]="$result"
    echo "$result"
}

# ============================================================================
# CONTENT-AWARE IMPORT EXTRACTION using Node.js
# ============================================================================

extract_imported_names() {
    local source_file="$1"
    local import_statement="$2"
    
    # Create cache key to avoid re-parsing the same file/import combination
    local cache_key="${source_file}:${import_statement}"
    
    # Check cache first
    if [[ -n "${IMPORT_CACHE[$cache_key]:-}" ]]; then
        echo "${IMPORT_CACHE[$cache_key]}"
        return 0
    fi
    
    # Extract what's being imported from the source file using Node.js
    local result
    result=$(node << 'NODESCRIPT' "$source_file" "$import_statement"
const fs = require('fs');
const sourceFile = process.argv[1];
const importPath = process.argv[2];

try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    const importedNames = new Set();
    
    // Escape special regex characters in the import path
    const escapedPath = importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    
    // Match: import { Name1, Name2 } from 'path' or import type { Name1, Name2 } from 'path'
    // This captures named imports
    const namedPattern = new RegExp(`import\\s+(?:type\\s+)?\\{\\s*([^}]+)\\s*\\}\\s*from\\s*['"]${escapedPath}['"]`, 'g');
    let match;
    while ((match = namedPattern.exec(content)) !== null) {
        const items = match[1];
        items.split(',').forEach(item => {
            // Handle "Name as Alias" - we want the original name
            const parts = item.trim().split(/\s+/);
            if (parts[0] && parts[0] !== 'type') {
                importedNames.add(parts[0]);
            }
        });
    }
    
    // Match: import Name from 'path' (default import)
    const defaultPattern = new RegExp(`import\\s+(\\w+)\\s+from\\s*['"]${escapedPath}['"]`, 'g');
    while ((match = defaultPattern.exec(content)) !== null) {
        importedNames.add('default:' + match[1]);
    }
    
    // Match: import * as Name from 'path' (namespace import)
    const namespacePattern = new RegExp(`import\\s+\\*\\s+as\\s+(\\w+)\\s+from\\s*['"]${escapedPath}['"]`, 'g');
    while ((match = namespacePattern.exec(content)) !== null) {
        importedNames.add('*:' + match[1]);
    }
    
    // Output comma-separated list
    if (importedNames.size > 0) {
        console.log(Array.from(importedNames).sort().join(','));
    }
    
} catch (error) {
    // If we can't parse, return empty
}
NODESCRIPT
)
    
    # Cache the result
    IMPORT_CACHE[$cache_key]="$result"
    
    echo "$result"
}

# ============================================================================
# ALIAS CONFIGURATION DETECTION using Node.js for JSON parsing
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
        return 0
    fi
    
    log_debug "Using config file: $config_file"
    
    # Use Node.js to properly parse JSON (handles comments, trailing commas, etc.)
    node << 'NODESCRIPT' "$config_file" "$TEMP_DIR"
const fs = require('fs');
const configFile = process.argv[1];
const tempDir = process.argv[2];

try {
    // Read the file and strip comments (tsconfig.json often has comments)
    let content = fs.readFileSync(configFile, 'utf8');
    
    // Remove single-line comments
    content = content.replace(/\/\/.*$/gm, '');
    
    // Remove multi-line comments
    content = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Parse the cleaned JSON
    const config = JSON.parse(content);
    const paths = config.compilerOptions?.paths || {};
    
    // Check for multi-codebase aliases
    if (paths['@client/*'] && paths['@server/*'] && paths['@shared/*']) {
        fs.writeFileSync(`${tempDir}/alias_type.txt`, 'multi-codebase');
        
        // Extract base paths for each alias
        const clientBase = paths['@client/*'][0].replace('/*', '');
        const serverBase = paths['@server/*'][0].replace('/*', '');
        const sharedBase = paths['@shared/*'][0].replace('/*', '');
        
        fs.writeFileSync(`${tempDir}/alias_paths.txt`, 
            `client|${clientBase}\nserver|${serverBase}\nshared|${sharedBase}`);
        
        console.log('Detected multi-codebase alias strategy (@client, @server, @shared)');
    }
    // Check for single @ alias
    else if (paths['@/*']) {
        fs.writeFileSync(`${tempDir}/alias_type.txt`, 'single-alias');
        
        const base = paths['@/*'][0].replace('/*', '');
        fs.writeFileSync(`${tempDir}/alias_paths.txt`, `base|${base}`);
        
        console.log('Detected single-alias strategy (@)');
    }
    // No aliases detected
    else {
        fs.writeFileSync(`${tempDir}/alias_type.txt`, 'standard');
        console.log('No aliases detected - using standard relative paths');
    }
    
} catch (error) {
    // If parsing fails, default to standard
    fs.writeFileSync(`${tempDir}/alias_type.txt`, 'standard');
    console.log('Error parsing config, using standard relative paths');
}
NODESCRIPT
    
    # Read what Node.js determined and log accordingly
    local alias_type
    alias_type=$(cat "$TEMP_DIR/alias_type.txt")
    
    case "$alias_type" in
        multi-codebase)
            log_success "Detected multi-codebase alias strategy (@client, @server, @shared)"
            ;;
        single-alias)
            log_success "Detected single-alias strategy (@)"
            ;;
        *)
            log_success "No aliases detected - using standard relative paths"
            ;;
    esac
    
    return 0
}

# ============================================================================
# INTELLIGENT IMPORT RESOLUTION WITH CONTENT MATCHING
# ============================================================================

find_best_match() {
    local import_path="$1"
    local source_file="$2"
    
    log_debug "Finding match for: $import_path (from: $source_file)"
    
    # Extract what's being imported to help with content-aware matching
    local imported_names
    imported_names=$(extract_imported_names "$source_file" "$import_path")
    
    if [[ -n "$imported_names" ]]; then
        log_debug "Looking for exports: $imported_names"
    fi
    
    # Normalize the import path by removing extensions and /index suffixes
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
    for ext in ".ts" ".tsx" ".js" ".jsx" ".mjs" ".cjs"; do
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
    
    # Strategy 4: Content-aware matching (only if we know what's being imported)
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
    
    # Strategy 5: Contextual fuzzy filename match (last resort)
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

# Find files that export what we're looking for (optimized scoring)
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
    
    local source_dir
    source_dir=$(dirname "$source_file")
    
    while IFS= read -r candidate; do
        [[ ! -f "$candidate" ]] && continue
        
        # Get exports for this candidate from our cache
        local candidate_exports
        candidate_exports=$(grep "^${candidate}|" "$TEMP_DIR/export_cache.txt" | cut -d'|' -f2 || echo "")
        
        [[ -z "$candidate_exports" ]] && continue
        
        # Calculate match score
        local score=0
        
        # Convert comma-separated strings to arrays for comparison
        IFS=',' read -ra IMPORTS <<< "$imported_names"
        IFS=',' read -ra EXPORTS <<< "$candidate_exports"
        
        # Count matching exports (higher weight for exact matches)
        for import_name in "${IMPORTS[@]}"; do
            for export_name in "${EXPORTS[@]}"; do
                if [[ "$import_name" == "$export_name" ]]; then
                    score=$((score + 10))  # Exact match is strong evidence
                elif [[ "$import_name" == *":"* ]] && [[ "$export_name" == *":"* ]]; then
                    # Both are default exports
                    score=$((score + 5))
                fi
            done
        done
        
        # Bonus points for directory context (files in same directory are more likely correct)
        local candidate_dir
        candidate_dir=$(dirname "$candidate")
        
        if [[ "$source_dir" == "$candidate_dir" ]]; then
            score=$((score + 20))  # Same directory is very strong signal
        elif [[ "$source_dir" == *"$(basename "$candidate_dir")"* ]]; then
            score=$((score + 10))  # Related directory structure
        fi
        
        log_debug "Candidate: $candidate, Score: $score"
        
        if [[ $score -gt $best_score ]]; then
            best_score=$score
            best_match="$candidate"
        fi
    done <<< "$candidates"
    
    # Only return match if score indicates confidence (at least one export matched)
    if [[ $best_score -ge 10 ]]; then
        log_success "Content match found with score $best_score: $best_match"
        echo "$best_match"
        return 0
    fi
    
    log_debug "No confident content match (best score: $best_score)"
    return 1
}

# ============================================================================
# PATH CALCULATION using Node.js (with caching)
# ============================================================================

calculate_relative_path() {
    local source_file="$1"
    local target_file="$2"
    
    # Check cache first to avoid redundant calculations
    local cache_key="${source_file}:${target_file}"
    if [[ -n "${RELATIVE_PATH_CACHE[$cache_key]:-}" ]]; then
        echo "${RELATIVE_PATH_CACHE[$cache_key]}"
        return 0
    fi
    
    # Use Node.js path module for reliable path calculations
    local result
    result=$(node << 'NODESCRIPT' "$source_file" "$target_file"
const path = require('path');

const sourceFile = process.argv[1];
const targetFile = process.argv[2];

try {
    // Get the directory of the source file
    const sourceDir = path.dirname(sourceFile);
    
    // Calculate relative path from source directory to target
    let relativePath = path.relative(sourceDir, targetFile);
    
    // Ensure relative paths start with ./
    if (!relativePath.startsWith('..')) {
        relativePath = './' + relativePath;
    }
    
    // Remove file extension for imports (JS/TS convention)
    const ext = path.extname(relativePath);
    if (['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) {
        relativePath = relativePath.slice(0, -ext.length);
    }
    
    // Normalize to forward slashes (even on Windows)
    relativePath = relativePath.replace(/\\/g, '/');
    
    console.log(relativePath);
} catch (error) {
    console.log(targetFile);
    process.exit(1);
}
NODESCRIPT
)
    
    # Cache the result for future use
    RELATIVE_PATH_CACHE[$cache_key]="$result"
    echo "$result"
}

determine_import_path() {
    local source_file="$1"
    local target_file="$2"
    local alias_type
    alias_type=$(cat "$TEMP_DIR/alias_type.txt")
    
    log_debug "Determining import path: source=$source_file, target=$target_file, strategy=$alias_type"
    
    case "$alias_type" in
        multi-codebase)
            # Determine which codebase each file belongs to
            local source_base=""
            local target_base=""
            
            for base in client server shared; do
                [[ "$source_file" == ${base}/* ]] && source_base="$base"
                [[ "$target_file" == ${base}/* ]] && target_base="$base"
            done
            
            # Shared code always uses alias (accessible from anywhere)
            if [[ "$target_base" == "shared" ]]; then
                echo "@shared/${target_file#shared/}"
            # Same codebase - use alias if configured
            elif [[ "$source_base" == "$target_base" ]] && [[ -n "$source_base" ]]; then
                case "$target_base" in
                    client)
                        # Remove src prefix if present
                        local path="${target_file#client/}"
                        path="${path#src/}"
                        echo "@client/${path}"
                        ;;
                    server)
                        echo "@server/${target_file#server/}"
                        ;;
                    *)
                        calculate_relative_path "$source_file" "$target_file"
                        ;;
                esac
            # Cross-codebase - use relative path
            else
                calculate_relative_path "$source_file" "$target_file"
            fi
            ;;
            
        single-alias)
            # Check if file is in src directory (common convention)
            if [[ "$target_file" == */src/* ]]; then
                local after_src="${target_file#*/src/}"
                echo "@/${after_src}"
            else
                calculate_relative_path "$source_file" "$target_file"
            fi
            ;;
            
        *)
            # No aliases - always use relative paths
            calculate_relative_path "$source_file" "$target_file"
            ;;
    esac
}

# ============================================================================
# IMPORT FIXING (with atomic file updates)
# ============================================================================

fix_import() {
    local source_file="$1"
    local old_import="$2"
    
    FIXES_ATTEMPTED=$((FIXES_ATTEMPTED + 1))
    
    # Skip external package imports (improved detection)
    # External packages don't start with ./ or ../ or @/ (our aliases)
    if [[ "$old_import" =~ ^[a-zA-Z@][a-zA-Z0-9_@/-]*$ ]] && \
       [[ "$old_import" != @/* ]] && \
       [[ "$old_import" != ./* ]] && \
       [[ "$old_import" != ../* ]]; then
        log_debug "Skipping external package: $old_import"
        FIXES_SKIPPED=$((FIXES_SKIPPED + 1))
        return 0
    fi
    
    # Find the target file using intelligent matching
    local target_file
    if ! target_file=$(find_best_match "$old_import" "$source_file"); then
        log_warning "No suitable match found for: $old_import in $source_file"
        log_warning "This import may reference a deleted, renamed, or relocated file."
        FIXES_FAILED=$((FIXES_FAILED + 1))
        return 1
    fi
    
    # Calculate the new import path
    local new_import
    new_import=$(determine_import_path "$source_file" "$target_file")
    
    # Skip if already correct
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
        # Create temp file for atomic update (prevents data loss on failure)
        local temp_file="${source_file}.tmp.$$"
        
        # Escape special characters for sed
        local escaped_old escaped_new
        escaped_old=$(printf '%s\n' "$old_import" | sed 's/[[\.*^$/]/\\&/g')
        escaped_new=$(printf '%s\n' "$new_import" | sed 's/[\/&]/\\&/g')
        
        # Perform replacements safely - handles both single and double quotes
        if sed "s|from ['\"]${escaped_old}['\"]|from '${escaped_new}'|g; \
                s|import(['\"]${escaped_old}['\"])|import('${escaped_new}')|g" \
                "$source_file" > "$temp_file"; then
            
            # Only replace original if sed succeeded
            mv "$temp_file" "$source_file"
            FIXES_SUCCESSFUL=$((FIXES_SUCCESSFUL + 1))
        else
            log_error "Failed to update $source_file"
            rm -f "$temp_file"
            FIXES_FAILED=$((FIXES_FAILED + 1))
            return 1
        fi
    else
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
    
    [[ ! -f "$ANALYSIS_FILE" ]] && { log_error "Analysis file not found: $ANALYSIS_FILE"; return 1; }
    
    local current_file=""
    local in_missing_section=false
    local line_number=0
    
    while IFS= read -r line; do
        line_number=$((line_number + 1))
        
        # Detect the section we care about
        if [[ "$line" == "## Missing or Invalid Imports" ]]; then
            in_missing_section=true
            log_debug "Found missing imports section at line $line_number"
            continue
        fi
        
        # Exit when we hit another section (sections start with ##)
        if [[ "$in_missing_section" == true ]] && \
           [[ "$line" =~ ^##[[:space:]] ]] && \
           [[ "$line" != "## Missing or Invalid Imports" ]]; then
            log_debug "Exiting missing imports section at line $line_number"
            break
        fi
        
        if [[ "$in_missing_section" == true ]]; then
            # Parse file headers (### followed by backtick-wrapped filename)
            if [[ "$line" =~ ^###[[:space:]]\`([^\`]+)\` ]]; then
                current_file="${BASH_REMATCH[1]}"
                FILES_PROCESSED=$((FILES_PROCESSED + 1))
                log_debug "Processing file: $current_file"
                continue
            fi
            
            # Parse import lines (starts with - and has ❌ or ✗)
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
    return 0
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
    
    [[ $CONTENT_MATCHES_USED -gt 0 ]] && {
        echo -e "${CYAN}ℹ${NC} Used intelligent content analysis for $CONTENT_MATCHES_USED imports"
        echo "  These matches were based on actual exported functions/types"
        echo ""
    }
    
    [[ $FIXES_FAILED -gt 0 ]] && {
        echo -e "${YELLOW}⚠${NC} $FIXES_FAILED imports could not be resolved automatically"
        echo "  These may reference deleted, renamed, or relocated files"
        echo "  Review the log and fix these manually"
        echo ""
    }
    
    if [[ "$DRY_RUN" == "true" ]]; then
        echo -e "${YELLOW}⚠  DRY RUN MODE${NC} - No files were modified"
        echo ""
        echo "  To apply changes:"
        echo -e "  ${CYAN}DRY_RUN=false $0${NC}"
        echo ""
        echo "  With debug output:"
        echo -e "  ${CYAN}DEBUG=true DRY_RUN=false $0${NC}"
    else
        echo -e "${GREEN}✓ Changes applied successfully${NC}"
        echo ""
        echo "  Backup:     $BACKUP_DIR/backup.tar.gz"
        echo "  Log file:   $LOG_FILE"
        echo ""
        echo "  Next steps:"
        echo "    1. Review:      git diff"
        echo "    2. Type check:  npm run type-check"
        echo "    3. Test:        npm test"
        echo "    4. Lint:        npm run lint"
        echo ""
        echo "  To restore backup:"
        echo "    tar -xzf $BACKUP_DIR/backup.tar.gz"
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

Intelligently analyzes and fixes broken imports by examining actual file 
exports, ensuring logical resolution based on what's being imported rather
than just filename matching.

${YELLOW}Key Features:${NC}
    • Content-aware matching using export analysis
    • Parallel processing for faster execution
    • Intelligent caching to avoid redundant work
    • Detects removed/renamed files
    • Respects TypeScript alias configuration
    • Atomic file updates for safety
    • Pure Node.js implementation (no Python required)

${YELLOW}Usage:${NC}
    $0                              # Dry run (preview changes)
    DRY_RUN=false $0               # Apply changes
    DEBUG=true DRY_RUN=false $0    # Apply with debug output

${YELLOW}Options:${NC}
    --help, -h                      Show this help message

${YELLOW}Environment Variables:${NC}
    DRY_RUN=true|false             Apply changes (default: true)
    DEBUG=true|false               Enable debug output (default: false)
    MAX_PARALLEL_JOBS=N            Parallel jobs (default: 4)

${YELLOW}How Content Matching Works:${NC}
    1. Extracts exports from all project files using Node.js
    2. Analyzes what the importing file needs
    3. Scores candidates based on export matches
    4. Considers directory context and boundaries
    5. Only suggests matches with high confidence

${YELLOW}Example:${NC}
    If you have:
      - client/utils/formatDate.ts → exports: formatDate, parseDate
      - server/utils/formatDate.ts → exports: formatISO, formatSQL
    
    And an import breaks:
      import { formatDate } from './utils/formatDate'
    
    The script analyzes which file exports 'formatDate' and resolves to
    the correct one based on actual content, not just filename similarity.

EOF
}

main() {
    : > "$LOG_FILE"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${CYAN}Enhanced Import Resolver${NC} - Content-Aware Import Fixing"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    [[ "$DRY_RUN" == "true" ]] && log_warning "Running in DRY RUN mode - no files will be modified"
    [[ "$DRY_RUN" == "false" ]] && log_info "Running in LIVE mode - files will be modified"
    [[ "${DEBUG:-false}" == "true" ]] && log_info "Debug mode enabled"
    
    echo ""
    
    check_prerequisites || exit 1
    detect_alias_config || exit 1
    build_file_index || exit 1
    create_backup
    
    echo ""
    parse_and_fix_imports
    
    generate_summary
    
    [[ "$DRY_RUN" == "false" ]] && cp "$LOG_FILE" "$BACKUP_DIR/resolution.log"
    
    # Exit with appropriate code
    [[ $FIXES_FAILED -gt 0 ]] || [[ $FIXES_ATTEMPTED -eq 0 ]] && exit 1
    exit 0
}

# Entry point
[[ "${1:-}" =~ ^(-h|--help)$ ]] && { show_help; exit 0; }

main "$@"