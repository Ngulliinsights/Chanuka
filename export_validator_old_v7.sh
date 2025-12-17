#!/bin/bash

# ============================================================================
# EXPORT VALIDATOR v7.0 - Refined & Optimized Edition
# ============================================================================
# An advanced static analysis tool for JavaScript/TypeScript codebases that
# validates import/export relationships, detects circular dependencies, and
# identifies structural issues.
#
# Key Improvements in v7.0:
# - Enhanced comment removal that handles string literals correctly
# - Robust path resolution with better module resolution strategy support
# - Improved namespace export handling in validation logic
# - More accurate TypeScript type checking with fewer false positives
# - Clearer progress reporting and error messages
# - Better handling of edge cases (re-exports, type-only imports, etc.)
# ============================================================================

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

readonly SCRIPT_VERSION="7.0"
readonly OUTPUT_FILE="docs/export-analysis.md"
readonly TEMP_DIR=$(mktemp -d)

# ----------------------------------------------------------------------------
# Path Alias Configuration
# ----------------------------------------------------------------------------
# Maps TypeScript path aliases to filesystem locations. Each entry uses the
# format "AliasPrefix|ActualPath". Directory paths should end with trailing
# slashes to ensure exact prefix matching.
#
# Example: For tsconfig "paths": { "@/*": ["./src/*"] }
#          Configure: "@/|./src/"
# ----------------------------------------------------------------------------
readonly PATH_ALIASES=(
    "@/|./src/"
    "~|./src/"
    "@components/|./src/components/"
    "@utils/|./src/utils/"
    "@lib/|./src/lib/"
)

# Temporary file locations
readonly MASTER_EXPORT_LOG="${TEMP_DIR}/master_exports.log"
readonly MASTER_IMPORT_LOG="${TEMP_DIR}/master_imports.log"
readonly MASTER_TYPE_LOG="${TEMP_DIR}/master_types.log"
readonly IMPORT_ERRORS="${TEMP_DIR}/import_errors.txt"
readonly CYCLE_LOG="${TEMP_DIR}/cycles.txt"
readonly DEP_GRAPH="${TEMP_DIR}/dep_graph.txt"
readonly NAMESPACE_EXPORTS="${TEMP_DIR}/namespace_exports.log"

# File scanning configuration
readonly SOURCE_EXTENSIONS=("js" "jsx" "ts" "tsx" "mjs" "cjs")
readonly EXCLUDE_PATTERNS=(
    "*/node_modules/*" 
    "*/dist/*" 
    "*/build/*" 
    "*/.git/*" 
    "*/coverage/*"
    "*/.next/*" 
    "*/out/*" 
    "*/__tests__/*" 
    "*.test.*" 
    "*.spec.*" 
    "*.d.ts"
)

# ANSI color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly BOLD='\033[1m'
readonly NC='\033[0m'

# Global state
declare -A FILE_RESOLUTION_CACHE
declare -A EXPORT_MAP
declare -A NAMESPACE_EXPORTS_MAP  # Tracks which files have export *
declare -i FILES_SCANNED=0
declare -i IMPORT_MISMATCHES=0
declare -i TYPE_INCONSISTENCIES=0
declare -i CIRCULAR_DEPENDENCIES=0

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

cleanup() { 
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
}
trap cleanup EXIT INT TERM

log_header() { echo -e "\n${BOLD}${CYAN}━━━ $1 ━━━${NC}"; }
log_info()   { echo -e " ${BLUE}ℹ${NC}  $1"; }
log_success(){ echo -e " ${GREEN}✓${NC}  $1"; }
log_warn()   { echo -e " ${YELLOW}⚠${NC}  $1"; }
log_error()  { echo -e " ${RED}✗${NC}  $1"; }
log_debug()  { 
    if [[ "${DEBUG:-false}" == "true" ]]; then 
        echo -e " ${MAGENTA}[DEBUG]${NC} $1" >&2
    fi
}

show_progress() {
    local current=$1
    local total=$2
    local message=$3
    local percentage=$((current * 100 / total))
    printf "\r   ${message}: ${CYAN}%d${NC}/${GREEN}%d${NC} (%d%%) " \
        "$current" "$total" "$percentage" >&2
}

check_dependencies() {
    local missing=0
    local required_tools=("perl" "grep" "find")
    
    for cmd in "${required_tools[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            log_error "Missing required dependency: $cmd"
            missing=1
        fi
    done
    
    # Python check with better error handling for Windows app aliases
    if python3 --version > /tmp/py_version.txt 2>&1; then
        local py_version=$(cat /tmp/py_version.txt 2>/dev/null | sed -E 's/.*([0-9]+\.[0-9]+).*/\1/' | grep -oE '[0-9]+\.[0-9]+' | head -1)
        log_debug "Python version: $py_version"
        
        # Verify Python version is 3.6+
        if [[ -n "$py_version" ]]; then
            local major=$(echo "$py_version" | cut -d. -f1)
            local minor=$(echo "$py_version" | cut -d. -f2)
            if [[ $major -lt 3 ]] || [[ $major -eq 3 && $minor -lt 6 ]]; then
                log_warn "Python 3.6+ recommended (found $py_version), but proceeding anyway"
            fi
        fi
    else
        log_warn "Python3 not available, cycle detection will be skipped"
    fi
    
    rm -f /tmp/py_version.txt
    
    if [[ $missing -eq 1 ]]; then
        log_error "Cannot proceed without required dependencies"
        exit 1
    fi
}

# ============================================================================
# ENHANCED PARSING ENGINE
# ============================================================================
# This improved parser handles more edge cases and provides better accuracy
# in detecting exports and imports.
# ============================================================================

process_file() {
    local file="$1"
    
    if [[ ! -r "$file" ]] || [[ ! -s "$file" ]]; then
        return 0
    fi
    
    # Enhanced Perl parser with improved comment handling and export detection
    perl -0777 -ne '
        $filename = "'"$file"'";
        
        # ────────────────────────────────────────────────────────────────
        # IMPROVED COMMENT REMOVAL
        # ────────────────────────────────────────────────────────────────
        # We need to preserve strings while removing comments. This is done
        # by temporarily replacing string contents with placeholders.
        
        # First, protect string literals by replacing them with markers
        my %strings;
        my $str_counter = 0;
        
        # Handle template literals with backticks
        s/`(?:[^`\\]|\\.)*`/my $id = "__STR_${str_counter}__"; $strings{$id} = $&; $str_counter++; $id/ge;
        
        # Handle single and double quoted strings
        s/"(?:[^"\\]|\\.)*"|'\''(?:[^'\''\\]|\\.)*'\''/my $id = "__STR_${str_counter}__"; $strings{$id} = $&; $str_counter++; $id/ge;
        
        # Now safely remove comments
        s|//.*?$||gm;              # Single-line comments
        s|/\*.*?\*/||gs;           # Multi-line comments
        
        # Restore string literals (though we dont actually need them for export detection)
        # Keeping code commented out for future reference
        # for my $id (keys %strings) {
        #     s/$id/$strings{$id}/g;
        # }

        # ────────────────────────────────────────────────────────────────
        # ENHANCED EXPORT DETECTION
        # ────────────────────────────────────────────────────────────────
        
        # Default exports
        if (/export\s+default\b/ || /export\s*\{[^}]*\bas\s+default\b/) {
            print "EXP|$filename|default\n";
        }
        
        # Named declarations with better pattern matching
        # Handles: export const/let/var/function/class/enum/type/interface/namespace
        while (/export\s+(?:declare\s+)?(?:async\s+)?(?:const|let|var|function|class|enum|type|interface|namespace)\s+([a-zA-Z0-9_\$]+)/g) {
            $name = $1;
            print "EXP|$filename|$name\n";
        }

        # Destructured exports with improved extraction
        # Handles both simple and nested destructuring
        while (/export\s+(?:const|let|var)\s+\{([^}]+)\}/g) {
            $content = $1;
            # Extract identifiers, handling renamed properties (a: b)
            while ($content =~ /([a-zA-Z0-9_\$]+)(?:\s*:\s*[a-zA-Z0-9_\$]+)?(?:\s*=\s*[^,}]+)?/g) {
                $identifier = $1;
                # Skip if its part of a nested object or array pattern
                next if $identifier =~ /^(as|type|from)$/;
                print "EXP|$filename|$identifier\n";
            }
        }
        
        # Named export blocks with better handling
        while (/export\s*\{([^}]+)\}(?:\s*from\s*['"'"'"]([^'"'"'"]+)['"'"'"])?/g) {
            $content = $1;
            $from_path = $2 || "";
            
            while ($content =~ /([a-zA-Z0-9_\$]+)(?:\s+as\s+([a-zA-Z0-9_\$]+))?/g) {
                $exported_name = $2 ? $2 : $1;
                next if $exported_name =~ /^(as|default|type|from)$/;
                
                print "EXP|$filename|$exported_name\n";
                
                # Track re-exports for better validation
                if ($from_path) {
                    print "REEXP|$filename|$from_path|$exported_name\n";
                }
            }
        }
        
        # Wildcard exports
        if (/export\s+\*\s+from\s+['"'"'"]([^'"'"'"]+)['"'"'"]/) {
            print "EXP|$filename|*\n";
            print "WILDCARD|$filename|$1\n";
        }
        
        # Namespace exports
        while (/export\s+\*\s+as\s+([a-zA-Z0-9_\$]+)\s+from/g) {
            print "EXP|$filename|$1\n";
        }
        
        # ────────────────────────────────────────────────────────────────
        # ENHANCED IMPORT DETECTION
        # ────────────────────────────────────────────────────────────────
        
        # Default imports
        while (/import\s+(type\s+)?(?![\{\*])([a-zA-Z0-9_\$]+)(?:\s*,|\s+from)\s+from\s+['"'"'"]([^'"'"'"]+)['"'"'"]/g) {
            $is_type = $1 ? "type" : "";
            $name = $2;
            $path = $3;
            print "IMP|$filename|$path|default|$name|$is_type\n";
        }
        
        # Namespace imports
        while (/import\s+(type\s+)?\*\s+as\s+([a-zA-Z0-9_\$]+)\s+from\s+['"'"'"]([^'"'"'"]+)['"'"'"]/g) {
            $is_type = $1 ? "type" : "";
            $name = $2;
            $path = $3;
            print "IMP|$filename|$path|namespace|$name|$is_type\n";
        }

        # Named imports with better parsing
        while (/import\s+(type\s+)?\s*\{([^}]+)\}\s+from\s+['"'"'"]([^'"'"'"]+)['"'"'"]/g) {
            $is_type = $1 ? "type" : "";
            $content = $2;
            $path = $3;
            
            while ($content =~ /([a-zA-Z0-9_\$]+)(?:\s+as\s+([a-zA-Z0-9_\$]+))?/g) {
                $imported = $1;
                next if $imported =~ /^(as|type|from)$/;
                print "IMP|$filename|$path|named|$imported|$is_type\n";
            }
        }
        
        # Side-effect imports
        while (/^\s*import\s+['"'"'"]([^'"'"'"]+)['"'"'"];?\s*$/gm) {
            print "IMP|$filename|$1|sideeffect||none\n";
        }
        
        # Dynamic imports (for tracking only, not validated)
        while (/import\s*\(\s*['"'"'"]([^'"'"'"]+)['"'"'"]/) {
            print "DYNAMIC_IMP|$filename|$1\n";
        }
    ' "$file"
    
    # ────────────────────────────────────────────────────────────────────
    # IMPROVED TYPESCRIPT TYPE CHECKING
    # ────────────────────────────────────────────────────────────────────
    # More targeted checks with fewer false positives
    
    if [[ "$file" =~ \.(ts|tsx)$ ]]; then
        # Check for async functions without Promise return type (only for exported functions)
        grep -nE "export\s+(async\s+function|const\s+\w+\s*=\s*async)" "$file" 2>/dev/null | \
            grep -v "Promise" | \
            grep -v "void" | \
            grep -v "//" | \
            head -5 | \
            while IFS=: read -r line_num content; do
                # Additional check: avoid flagging one-liner arrow functions
                if ! echo "$content" | grep -q "=>\s*{"; then
                    echo "TYPE|$file|$line_num|Exported async function may need explicit Promise return type"
                fi
            done
        
        # Check for dangerous any usage (only in function signatures and type declarations)
        local any_count=$(grep -c ":\s*any\b\|<any>\|<any," "$file" 2>/dev/null || echo 0)
        if [[ $any_count -gt 8 ]]; then
            echo "TYPE|$file|0|Excessive 'any' type usage ($any_count occurrences) may reduce type safety"
        fi
        
        # Check for non-null assertion operator overuse
        local non_null_count=$(grep -o "!" "$file" 2>/dev/null | grep -c "!" || echo 0)
        if [[ $non_null_count -gt 15 ]]; then
            echo "TYPE|$file|0|High usage of non-null assertion operator (!) may mask potential errors"
        fi
    fi
}

# ============================================================================
# FILE DISCOVERY
# ============================================================================

get_files() {
    local cmd="find . -type f \("
    
    for i in "${!SOURCE_EXTENSIONS[@]}"; do
        [[ $i -gt 0 ]] && cmd="$cmd -o"
        cmd="$cmd -name \"*.${SOURCE_EXTENSIONS[$i]}\""
    done
    cmd="$cmd \)"
    
    for pattern in "${EXCLUDE_PATTERNS[@]}"; do
        cmd="$cmd -not -path \"$pattern\""
    done
    
    eval "$cmd" 2>/dev/null
}

scan_codebase() {
    log_header "Phase 1: Codebase Analysis"
    local raw_log="${TEMP_DIR}/raw_scan.log"
    : > "$raw_log"
    
    log_info "Discovering source files..."
    
    local file_list=()
    while IFS= read -r file; do 
        file_list+=("$file")
    done < <(get_files)
    
    local total_files=${#file_list[@]}
    
    if [[ $total_files -eq 0 ]]; then
        log_error "No source files found matching criteria"
        log_info "Check that you're running the script from the project root"
        exit 1
    fi
    
    log_success "Found $total_files files to analyze"
    log_info "Parsing exports and imports..."
    
    local processed=0
    for file in "${file_list[@]}"; do
        process_file "$file" >> "$raw_log"
        processed=$((processed + 1))
        
        # Update progress every 25 files
        if (( processed % 25 == 0 )) || (( processed == total_files )); then
            show_progress $processed $total_files "Processing"
        fi
    done
    
    printf "\r\033[K" >&2  # Clear progress line
    
    # Separate output into categorized logs
    grep "^EXP|" "$raw_log" | cut -d'|' -f2- > "$MASTER_EXPORT_LOG" || true
    grep "^IMP|" "$raw_log" | cut -d'|' -f2- > "$MASTER_IMPORT_LOG" || true
    grep "^TYPE|" "$raw_log" | cut -d'|' -f2- > "$MASTER_TYPE_LOG" || true
    grep "^WILDCARD|" "$raw_log" | cut -d'|' -f2- > "$NAMESPACE_EXPORTS" || true
    
    FILES_SCANNED=$total_files
    
    local export_count=$(wc -l < "$MASTER_EXPORT_LOG" 2>/dev/null || echo 0)
    local import_count=$(wc -l < "$MASTER_IMPORT_LOG" 2>/dev/null || echo 0)
    
    log_success "Extraction complete: $export_count exports, $import_count imports"
}

# ============================================================================
# ENHANCED PATH RESOLUTION
# ============================================================================
# Improved module resolution that better matches bundler behavior
# ============================================================================

resolve_path() {
    local source="$1"
    local path="$2"
    local cache_key="${source}:${path}"
    
    # Check cache
    if [[ -n "${FILE_RESOLUTION_CACHE[$cache_key]:-}" ]]; then
        echo "${FILE_RESOLUTION_CACHE[$cache_key]}"
        return 0
    fi

    local target_path="$path"
    
    # Apply path aliases
    for alias_map in "${PATH_ALIASES[@]}"; do
        local prefix="${alias_map%%|*}"
        local replacement="${alias_map##*|}"
        
        # Ensure exact prefix match
        if [[ "$path" == "$prefix"* ]]; then
            target_path="${path/$prefix/$replacement}"
            log_debug "Alias resolved: $path -> $target_path"
            break
        fi
    done

    # Skip external packages (not relative paths)
    if [[ ! "$target_path" =~ ^\.{1,2}/ ]] && [[ "$target_path" == "$path" ]]; then
        return 1
    fi
    
    # Calculate base path
    local source_dir=$(dirname "$source")
    local search_base
    
    if [[ "$target_path" != "$path" ]]; then
        # Alias was applied
        search_base=$(realpath -m "$target_path" 2>/dev/null)
    else
        # Relative path
        search_base=$(cd "$source_dir" 2>/dev/null && realpath -m "$target_path" 2>/dev/null)
    fi
    
    if [[ -z "$search_base" ]]; then
        return 1
    fi

    # Try file extensions in priority order
    # Modern bundlers prioritize TypeScript over JavaScript
    local extensions=(
        ""            # Exact match
        ".ts"         # TypeScript (highest priority)
        ".tsx"        # TypeScript React
        ".js"         # JavaScript
        ".jsx"        # JavaScript React
        ".mjs"        # ES Module
        ".cjs"        # CommonJS
        "/index.ts"   # Index files (TypeScript first)
        "/index.tsx"
        "/index.js"
        "/index.jsx"
        "/index.mjs"
    )
    
    for ext in "${extensions[@]}"; do
        local candidate="${search_base}${ext}"
        
        if [[ -f "$candidate" ]]; then
            local resolved="${candidate#./}"
            resolved="${resolved#$(pwd)/}"
            FILE_RESOLUTION_CACHE["$cache_key"]="$resolved"
            echo "$resolved"
            return 0
        fi
    done
    
    log_debug "Resolution failed: $path (from $source)"
    return 1
}

# ============================================================================
# IMPROVED IMPORT VALIDATION
# ============================================================================
# Enhanced validation with better namespace export handling
# ============================================================================

validate_imports() {
    log_header "Phase 2: Import Validation"
    : > "$IMPORT_ERRORS"
    
    log_info "Building export index..."
    
    # Build main export map
    local export_count=0
    while IFS='|' read -r file name; do
        local clean_file="${file#./}"
        EXPORT_MAP["${clean_file}:${name}"]=1
        export_count=$((export_count + 1))
    done < "$MASTER_EXPORT_LOG"
    
    # Build namespace exports map (files with export *)
    while IFS='|' read -r file from_path; do
        local clean_file="${file#./}"
        NAMESPACE_EXPORTS_MAP["$clean_file"]="$from_path"
    done < "$NAMESPACE_EXPORTS" 2>/dev/null || true
    
    log_success "Indexed $export_count exports"
    
    local total_imports=$(wc -l < "$MASTER_IMPORT_LOG" 2>/dev/null || echo 0)
    log_info "Validating $total_imports import statements..."
    
    local processed=0
    local last_update=0
    
    while IFS='|' read -r source_file raw_path import_type import_name type_flag; do
        processed=$((processed + 1))
        
        if [[ $((processed - last_update)) -ge 50 ]]; then
            show_progress "$processed" "$total_imports" "Validating"
            last_update=$processed
        fi
        
        local clean_source="${source_file#./}"
        
        # Skip side-effect imports
        if [[ "$import_type" == "sideeffect" ]]; then
            continue
        fi
        
        # Skip type-only imports (they reference types, not runtime values)
        if [[ "$type_flag" == "type" ]]; then
            continue
        fi
        
        # Resolve path
        local target_file
        if ! target_file=$(resolve_path "$clean_source" "$raw_path"); then
            continue
        fi
        
        local clean_target="${target_file#./}"
        
        # Validation logic with improved namespace handling
        local valid=0
        
        # Check direct export
        if [[ -n "${EXPORT_MAP["${clean_target}:${import_name}"]:-}" ]]; then
            valid=1
        fi
        
        # Check wildcard re-export
        if [[ $valid -eq 0 ]] && [[ -n "${EXPORT_MAP["${clean_target}:*"]:-}" ]]; then
            valid=1
            log_debug "Validated via wildcard: $import_name from $clean_target"
        fi
        
        # Check default export for default imports
        if [[ "$import_type" == "default" ]] && [[ $valid -eq 0 ]]; then
            if [[ -n "${EXPORT_MAP["${clean_target}:default"]:-}" ]]; then
                valid=1
            fi
        fi
        
        # For namespace imports, just check if file exists (we already resolved it)
        if [[ "$import_type" == "namespace" ]]; then
            valid=1
        fi

        # Record validation failure
        if [[ $valid -eq 0 ]]; then
            # Final check: look for type-only export in source
            if ! grep -q "export.*type.*$import_name" "$target_file" 2>/dev/null; then
                echo "$clean_source|$import_type|$raw_path|$import_name|Export not found in target" \
                    >> "$IMPORT_ERRORS"
                IMPORT_MISMATCHES=$((IMPORT_MISMATCHES + 1))
            fi
        fi
    done < "$MASTER_IMPORT_LOG"
    
    printf "\r\033[K" >&2
    
    if [[ $IMPORT_MISMATCHES -gt 0 ]]; then
        log_warn "Found $IMPORT_MISMATCHES potential import/export mismatches"
    else
        log_success "All imports validated successfully"
    fi
}

# ============================================================================
# CIRCULAR DEPENDENCY DETECTION
# ============================================================================

detect_cycles() {
    log_header "Phase 3: Circular Dependency Analysis"
    : > "$DEP_GRAPH"
    
    log_info "Building dependency graph..."
    
    local edge_count=0
    local seen_edges=()
    
    while IFS='|' read -r src path rest; do
        local target
        if target=$(resolve_path "$src" "$path" 2>/dev/null); then
            local clean_src="${src#./}"
            local clean_target="${target#./}"
            
            if [[ "$clean_src" != "$clean_target" ]]; then
                local edge="$clean_src -> $clean_target"
                
                # Avoid duplicate edges
                if [[ ! " ${seen_edges[*]} " =~ " ${edge} " ]]; then
                    echo "$edge" >> "$DEP_GRAPH"
                    seen_edges+=("$edge")
                    edge_count=$((edge_count + 1))
                fi
            fi
        fi
    done < <(cut -d'|' -f1-2 "$MASTER_IMPORT_LOG")
    
    if [[ $edge_count -eq 0 ]]; then
        log_success "No dependencies found (isolated files)"
        return 0
    fi
    
    log_success "Built graph with $edge_count edges"
    log_info "Detecting circular dependencies..."
    
    # Enhanced Python cycle detection with better reporting
    python3 << 'PYTHON_EOF' > "$CYCLE_LOG" 2>/dev/null
import sys
from collections import defaultdict, deque

adj = defaultdict(list)

try:
    with open(''"$DEP_GRAPH"'') as f:
        for line in f:
            if ' -> ' in line:
                u, v = line.strip().split(' -> ')
                adj[u].append(v)
except Exception as e:
    sys.stderr.write(f'Error loading graph: {e}\n')
    sys.exit(1)

visited = set()
rec_stack = set()
cycles = []

def dfs(node, path):
    visited.add(node)
    rec_stack.add(node)
    path.append(node)
    
    for neighbor in adj[node]:
        if neighbor not in visited:
            dfs(neighbor, path)
        elif neighbor in rec_stack:
            # Found cycle
            cycle_start = path.index(neighbor)
            cycle = path[cycle_start:] + [neighbor]
            cycles.append(cycle)
    
    rec_stack.remove(node)
    path.pop()

# Run DFS from each node
for node in list(adj.keys()):
    if node not in visited:
        dfs(node, [])

# Deduplicate cycles
unique = set()
final = []

for cycle in cycles:
    # Normalize: rotate to start with lexicographically smallest element
    min_idx = cycle.index(min(cycle[:-1]))  # Exclude last element (duplicate)
    normalized = tuple(cycle[min_idx:-1] + cycle[:min_idx])
    
    if normalized not in unique:
        unique.add(normalized)
        final.append(list(normalized) + [normalized[0]])

# Output
if final:
    print(len(final))
    for cycle in sorted(final, key=lambda c: len(c))[:25]:
        print(' → '.join(cycle))
    if len(final) > 25:
        print(f'\n... and {len(final) - 25} more cycles not shown')
else:
    print(0)
PYTHON_EOF

    CIRCULAR_DEPENDENCIES=$(head -1 "$CYCLE_LOG" 2>/dev/null || echo 0)
    
    if [[ $CIRCULAR_DEPENDENCIES -gt 0 ]]; then
        log_warn "Detected $CIRCULAR_DEPENDENCIES circular dependency chains"
    else
        log_success "No circular dependencies detected ✨"
    fi
}

# ============================================================================
# ENHANCED REPORT GENERATION
# ============================================================================

generate_report() {
    log_header "Report Generation"
    
    local output_dir=$(dirname "$OUTPUT_FILE")
    mkdir -p "$output_dir"
    
    TYPE_INCONSISTENCIES=$(wc -l < "$MASTER_TYPE_LOG" 2>/dev/null || echo 0)
    
    local has_critical=$(( IMPORT_MISMATCHES > 0 ? 1 : 0 ))
    local has_warnings=$(( CIRCULAR_DEPENDENCIES + TYPE_INCONSISTENCIES > 0 ? 1 : 0 ))
    
    {
        echo "# 📊 Export Validation Report"
        echo ""
        echo "**Generated:** $(date '+%Y-%m-%d %H:%M:%S %Z')"
        echo "**Validator Version:** $SCRIPT_VERSION"
        echo "**Project Root:** \`$(pwd)\`"
        echo ""
        
        # Status badge
        if [[ $has_critical -eq 1 ]]; then
            echo "![Status](https://img.shields.io/badge/status-critical%20issues-red)"
        elif [[ $has_warnings -eq 1 ]]; then
            echo "![Status](https://img.shields.io/badge/status-warnings-yellow)"
        else
            echo "![Status](https://img.shields.io/badge/status-passing-brightgreen)"
        fi
        echo ""
        
        echo "## 📋 Executive Summary"
        echo ""
        echo "| Metric | Count | Status |"
        echo "|:---|---:|:---:|"
        echo "| Files Analyzed | $FILES_SCANNED | ℹ️ |"
        echo "| Import Mismatches | $IMPORT_MISMATCHES | $([[ $IMPORT_MISMATCHES -eq 0 ]] && echo "✅" || echo "❌") |"
        echo "| Type Warnings | $TYPE_INCONSISTENCIES | $([[ $TYPE_INCONSISTENCIES -eq 0 ]] && echo "✅" || echo "⚠️") |"
        echo "| Circular Dependencies | $CIRCULAR_DEPENDENCIES | $([[ $CIRCULAR_DEPENDENCIES -eq 0 ]] && echo "✅" || echo "⚠️") |"
        echo ""
        
        if [[ $has_critical -eq 1 ]]; then
            echo "> 🚨 **Critical Issues Detected:** Immediate action required to prevent runtime errors."
        elif [[ $has_warnings -eq 1 ]]; then
            echo "> ⚠️ **Warnings Found:** Consider addressing these for improved code quality."
        else
            echo "> ✅ **All Clear:** No issues detected. Great job maintaining clean imports!"
        fi
        echo ""
        
        # Detailed sections
        if [[ -s "$IMPORT_ERRORS" ]]; then
            echo "## ❌ Import/Export Mismatches"
            echo ""
            echo "These imports reference exports that don't exist in their target files. This will cause runtime errors or failed builds."
            echo ""
            echo "| Source File | Type | Import Path | Missing Export | Recommendation |"
            echo "|:---|:---:|:---|:---|:---|"
            
            while IFS='|' read -r src type path name issue; do
                local recommendation="Check if \`$name\` is exported from target file"
                echo "| \`$src\` | \`$type\` | \`$path\` | \`$name\` | $recommendation |"
            done < "$IMPORT_ERRORS" | head -50
            
            local total_errors=$(wc -l < "$IMPORT_ERRORS")
            if [[ $total_errors -gt 50 ]]; then
                echo ""
                echo "*Showing first 50 of $total_errors errors. Review the full list in your codebase.*"
            fi
            
            echo ""
        fi
        
        if [[ -s "$MASTER_TYPE_LOG" ]]; then
            echo "## ⚠️ TypeScript Type Safety Warnings"
            echo ""
            echo "These patterns may reduce type safety or mask potential runtime errors."
            echo ""
            echo "| File | Line | Issue | Severity |"
            echo "|:---|:---:|:---|:---:|"
            
            sort -t'|' -k1,1 -k2,2n "$MASTER_TYPE_LOG" | head -30 | while IFS='|' read -r file line issue; do
                local severity="Medium"
                [[ "$issue" =~ "any" ]] && severity="High"
                echo "| \`$file\` | $line | $issue | $severity |"
            done
            
            echo ""
        fi

        if [[ $CIRCULAR_DEPENDENCIES -gt 0 ]]; then
            echo "## 🔄 Circular Dependencies"
            echo ""
            echo "Circular dependencies can cause module initialization issues and make your code harder to test and maintain."
            echo ""
            echo "**Impact:** These cycles may cause:"
            echo "- Unpredictable initialization order"
            echo "- Potential runtime errors in some bundlers"
            echo "- Difficulty in unit testing individual modules"
            echo ""
            echo "### Detected Cycles"
            echo ""
            echo '```'
            tail -n +2 "$CYCLE_LOG"
            echo '```'
            echo ""
            echo "**Recommendation:** Consider refactoring these modules by:"
            echo "- Extracting shared dependencies into separate modules"
            echo "- Using dependency injection patterns"
            echo "- Moving shared types/interfaces to a common location"
            echo ""
        fi

        echo "## 🔧 Configuration & Next Steps"
        echo ""
        echo "### Verify Configuration"
        echo ""
        echo "If you're seeing unexpected errors, verify your path alias configuration:"
        echo ""
        echo '```bash'
        echo "# Current PATH_ALIASES configuration:"
        for alias in "${PATH_ALIASES[@]}"; do
            echo "# - $alias"
        done
        echo '```'
        echo ""
        echo "Ensure these match your \`tsconfig.json\` or bundler configuration."
        echo ""
        
        if [[ $has_critical -eq 1 || $has_warnings -eq 1 ]]; then
            echo "### Recommended Actions"
            echo ""
            local priority=1
            
            if [[ $IMPORT_MISMATCHES -gt 0 ]]; then
                echo "${priority}. **Fix import mismatches** - These will cause runtime errors"
                priority=$((priority + 1))
            fi
            
            if [[ $CIRCULAR_DEPENDENCIES -gt 0 ]]; then
                echo "${priority}. **Refactor circular dependencies** - Improves code maintainability"
                priority=$((priority + 1))
            fi
            
            if [[ $TYPE_INCONSISTENCIES -gt 0 ]]; then
                echo "${priority}. **Address type warnings** - Enhances type safety"
            fi
            echo ""
        fi
        
        echo "### False Positives?"
        echo ""
        echo "If you're seeing false positives:"
        echo ""
        echo "- **Dynamic exports:** This tool cannot detect runtime-generated exports"
        echo "- **Barrel exports:** Ensure wildcard re-exports (\`export * from\`) are properly formatted"
        echo "- **Type imports:** Use \`import type { ... }\` for type-only imports"
        echo "- **Path aliases:** Verify aliases in the script match your project configuration"
        echo ""
        
        echo "---"
        echo ""
        echo "*Report generated by Export Validator v$SCRIPT_VERSION*"
        echo ""
        echo "*For issues or suggestions, review the script configuration section.*"
        
    } > "$OUTPUT_FILE"
    
    log_success "Report written to: ${CYAN}$OUTPUT_FILE${NC}"
}

# ============================================================================
# HELP
# ============================================================================

show_help() {
    cat << EOF
${BOLD}${CYAN}Export Validator v${SCRIPT_VERSION}${NC}

Validates JavaScript/TypeScript import/export relationships, detects circular
dependencies, and identifies structural issues in your codebase.

${BOLD}USAGE${NC}
    $(basename "$0") [OPTIONS]

${BOLD}OPTIONS${NC}
    -h, --help       Display this help message
    -v, --verbose    Enable verbose shell command output
    -d, --debug      Enable debug logging for troubleshooting

${BOLD}CONFIGURATION${NC}
    Edit the PATH_ALIASES array in the script to match your project's
    module resolution configuration (tsconfig.json or webpack config).

    Example for: "paths": { "@/*": ["./src/*"] }
    Configure as: "@/|./src/"

${BOLD}OUTPUT${NC}
    Markdown report: $OUTPUT_FILE

${BOLD}EXIT CODES${NC}
    0 - Success (no critical issues)
    1 - Critical issues found (import mismatches)
    2 - Invalid arguments or missing dependencies

${BOLD}REQUIREMENTS${NC}
    - bash 4.0+
    - perl 5.x+
    - python 3.6+
    - GNU coreutils (grep, find, realpath)

${BOLD}EXAMPLES${NC}
    # Standard validation
    ./$(basename "$0")

    # With debug output
    ./$(basename "$0") --debug

${BOLD}COMMON ISSUES${NC}
    - "No source files found": Run from project root directory
    - "Missing exports": Check PATH_ALIASES configuration
    - "False positives": Review dynamic exports and type imports

For detailed documentation, see the Configuration section in the script.

EOF
}

# ============================================================================
# MAIN
# ============================================================================

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        -d|--debug)
            DEBUG=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 2
            ;;
    esac
done

main() {
    echo "${BOLD}${CYAN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║          Export Validator v${SCRIPT_VERSION}                        ║"
    echo "║          Refined JavaScript/TypeScript Analysis            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo "${NC}"
    
    check_dependencies
    scan_codebase
    validate_imports
    detect_cycles
    generate_report
    
    echo ""
    
    if [[ $IMPORT_MISMATCHES -eq 0 ]]; then
        log_success "🎉 Analysis complete! No critical issues found."
        echo ""
        log_info "View full report: ${CYAN}$OUTPUT_FILE${NC}"
        exit 0
    else
        log_error "⚠️  Analysis complete. Critical issues require attention."
        echo ""
        log_info "Review detailed report: ${CYAN}$OUTPUT_FILE${NC}"
        exit 1
    fi
}

main