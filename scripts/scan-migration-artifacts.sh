#!/bin/bash

set -euo pipefail

# Color codes for better readability
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Exclusion patterns
readonly EXCLUDE_DIRS=(-path ./node_modules -prune -o -path ./.git -prune -o -path ./.nx -prune -o -path ./dist -prune -o -path ./build -prune -o)

print_header() {
    echo -e "${BLUE}===================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}===================================${NC}"
}

print_section() {
    echo -e "\n${GREEN}$1${NC}"
}

count_results() {
    local count=$(echo "$1" | grep -c ^ || echo "0")
    echo -e "${YELLOW}Found: $count item(s)${NC}"
}

print_header "Scanning for Migration Artifacts"

# 1. Backup files
print_section "1. Backup files (.bak, .backup, .orig):"
results=$(find . "${EXCLUDE_DIRS[@]}" -type f \( -name "*.bak" -o -name "*.backup" -o -name "*.orig" \) -print 2>/dev/null || true)
if [[ -n "$results" ]]; then
    echo "$results"
    count_results "$results"
else
    echo "None found"
fi

# 2. Timestamp-versioned files
print_section "2. Timestamp-versioned files (YYYY-MM-DD pattern):"
results=$(find . "${EXCLUDE_DIRS[@]}" -type f -name "*[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]*" -print 2>/dev/null || true)
if [[ -n "$results" ]]; then
    echo "$results"
    count_results "$results"
else
    echo "None found"
fi

# 3. Migration-related scripts
print_section "3. Migration-related scripts:"
if [[ -d "scripts" ]]; then
    results=$(find scripts/ -type f -iname "*migrat*" 2>/dev/null || true)
    if [[ -n "$results" ]]; then
        echo "$results"
        count_results "$results"
    else
        echo "None found"
    fi
else
    echo "scripts/ directory not found"
fi

# 4. Drizzle migration files
print_section "4. Database migration files:"
migration_dirs=("drizzle" "migrations" "db/migrations" "prisma/migrations")
found_any=false
for dir in "${migration_dirs[@]}"; do
    if [[ -d "$dir" ]]; then
        results=$(find "$dir" -type f \( -name "*.sql" -o -name "*.js" -o -name "*.ts" \) 2>/dev/null || true)
        if [[ -n "$results" ]]; then
            echo -e "${YELLOW}In $dir:${NC}"
            echo "$results"
            count_results "$results"
            found_any=true
        fi
    fi
done
[[ "$found_any" == false ]] && echo "None found"

# 5. Deprecated/temporary/old files
print_section "5. Deprecated or temporary files:"
results=$(find . "${EXCLUDE_DIRS[@]}" -type f \( -iname "*deprecated*" -o -iname "*temp*" -o -iname "*old*" -o -iname "*.tmp" \) -print 2>/dev/null || true)
if [[ -n "$results" ]]; then
    echo "$results"
    count_results "$results"
else
    echo "None found"
fi

# 6. Version-numbered files (e.g., file.v1.js, file_v2.txt)
print_section "6. Version-numbered files (v1, v2, etc.):"
results=$(find . "${EXCLUDE_DIRS[@]}" -type f \( -name "*_v[0-9]*" -o -name "*.v[0-9]*" \) -print 2>/dev/null || true)
if [[ -n "$results" ]]; then
    echo "$results"
    count_results "$results"
else
    echo "None found"
fi

# 7. Duplicate files (copy, duplicate pattern)
print_section "7. Duplicate or copy files:"
results=$(find . "${EXCLUDE_DIRS[@]}" -type f \( -iname "*copy*" -o -iname "*duplicate*" -o -iname "*\(1\)*" -o -iname "*\(2\)*" \) -print 2>/dev/null || true)
if [[ -n "$results" ]]; then
    echo "$results"
    count_results "$results"
else
    echo "None found"
fi

# Summary
print_header "Scan Complete"
echo -e "${GREEN}Review the files above to identify migration artifacts that can be safely removed.${NC}"