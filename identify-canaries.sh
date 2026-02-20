#!/bin/bash

# Script to identify zero-error files (regression canaries)
# These are files that currently have no TypeScript errors

echo "=== Identifying Zero-Error Files (Regression Canaries) ==="
echo ""

# Function to extract files with errors from a baseline file
extract_error_files() {
    local baseline_file=$1
    grep -E "^(client|server|shared)/" "$baseline_file" 2>/dev/null | \
        sed 's/([0-9]*,[0-9]*):.*$//' | \
        sort -u
}

# Function to find all TypeScript files in a directory
find_all_ts_files() {
    local dir=$1
    find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | sort
}

# Process client package
echo "## Client Package"
echo ""
if [ -f "baseline_tsc_client.txt" ]; then
    error_files=$(mktemp)
    all_files=$(mktemp)
    
    extract_error_files "baseline_tsc_client.txt" > "$error_files"
    find_all_ts_files "client/src" > "$all_files"
    
    error_count=$(wc -l < "$error_files")
    total_count=$(wc -l < "$all_files")
    
    echo "Total TypeScript files: $total_count"
    echo "Files with errors: $error_count"
    
    # Find files with zero errors (canaries)
    canaries=$(comm -23 "$all_files" "$error_files")
    canary_count=$(echo "$canaries" | grep -c "^" || echo 0)
    
    echo "Files with ZERO errors (canaries): $canary_count"
    echo ""
    
    if [ $canary_count -gt 0 ] && [ $canary_count -le 50 ]; then
        echo "### Client Canary Files (first 50):"
        echo "$canaries" | head -50
        echo ""
    elif [ $canary_count -gt 50 ]; then
        echo "### Client Canary Files (showing first 50 of $canary_count):"
        echo "$canaries" | head -50
        echo ""
        echo "(... and $((canary_count - 50)) more)"
        echo ""
    fi
    
    rm "$error_files" "$all_files"
else
    echo "baseline_tsc_client.txt not found"
    echo ""
fi

# Process server package
echo "## Server Package"
echo ""
if [ -f "baseline_tsc_server.txt" ]; then
    error_files=$(mktemp)
    all_files=$(mktemp)
    
    extract_error_files "baseline_tsc_server.txt" > "$error_files"
    find_all_ts_files "server" > "$all_files"
    
    error_count=$(wc -l < "$error_files")
    total_count=$(wc -l < "$all_files")
    
    echo "Total TypeScript files: $total_count"
    echo "Files with errors: $error_count"
    
    # Find files with zero errors (canaries)
    canaries=$(comm -23 "$all_files" "$error_files")
    canary_count=$(echo "$canaries" | grep -c "^" || echo 0)
    
    echo "Files with ZERO errors (canaries): $canary_count"
    echo ""
    
    if [ $canary_count -gt 0 ] && [ $canary_count -le 50 ]; then
        echo "### Server Canary Files (first 50):"
        echo "$canaries" | head -50
        echo ""
    elif [ $canary_count -gt 50 ]; then
        echo "### Server Canary Files (showing first 50 of $canary_count):"
        echo "$canaries" | head -50
        echo ""
        echo "(... and $((canary_count - 50)) more)"
        echo ""
    fi
    
    rm "$error_files" "$all_files"
else
    echo "baseline_tsc_server.txt not found"
    echo ""
fi

# Process shared package
echo "## Shared Package"
echo ""
if [ -f "baseline_tsc_shared.txt" ]; then
    error_files=$(mktemp)
    all_files=$(mktemp)
    
    extract_error_files "baseline_tsc_shared.txt" > "$error_files"
    find_all_ts_files "shared" > "$all_files"
    
    error_count=$(wc -l < "$error_files")
    total_count=$(wc -l < "$all_files")
    
    echo "Total TypeScript files: $total_count"
    echo "Files with errors: $error_count"
    
    # Find files with zero errors (canaries)
    canaries=$(comm -23 "$all_files" "$error_files")
    canary_count=$(echo "$canaries" | grep -c "^" || echo 0)
    
    echo "Files with ZERO errors (canaries): $canary_count"
    echo ""
    
    if [ $canary_count -gt 0 ] && [ $canary_count -le 50 ]; then
        echo "### Shared Canary Files (first 50):"
        echo "$canaries" | head -50
        echo ""
    elif [ $canary_count -gt 50 ]; then
        echo "### Shared Canary Files (showing first 50 of $canary_count):"
        echo "$canaries" | head -50
        echo ""
        echo "(... and $((canary_count - 50)) more)"
        echo ""
    fi
    
    rm "$error_files" "$all_files"
else
    echo "baseline_tsc_shared.txt not found"
    echo ""
fi

echo "=== Summary ==="
echo ""
echo "Regression canaries are files with ZERO TypeScript errors in the baseline."
echo "If these files gain errors during the import resolution audit, it indicates a regression."
echo "Monitor these files carefully throughout the fix process."
