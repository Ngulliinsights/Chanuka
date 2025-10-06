#!/bin/bash

# Enhanced project structure generator with 7-level depth limit
OUTPUT_FILE="docs/project-structure.md"
MAX_DEPTH=7

# Create docs directory if it doesn't exist
mkdir -p docs

# Function to generate tree structure
generate_tree() {
    find . -not -path '*/.*' \
           -not -path '*/node_modules*' \
           -not -path '*/dist*' \
           -not -path '*/build*' \
           -not -path '*/.git*' \
           -not -path '*/coverage*' \
           -not -path '*/tmp*' \
           -not -path '*/temp*' \
           -not -path '*/__pycache__*' \
           -not -path '*/vendor*' | \
    sort | while IFS= read -r path; do
        # Clean path and skip root
        clean_path="${path#./}"
        [ "$clean_path" = "." ] || [ -z "$clean_path" ] && continue
        
        # Calculate depth
        depth=$(echo "$clean_path" | tr -cd '/' | wc -c | tr -d ' ')
        
        # Skip if exceeds max depth
        [ "$depth" -gt "$MAX_DEPTH" ] && continue
        
        # Build simple tree prefix
        prefix=""
        for i in $(seq 1 "$depth"); do
            if [ "$i" -eq "$depth" ]; then
                prefix="${prefix}├── "
            else
                prefix="${prefix}│   "
            fi
        done
        
        # Output with appropriate suffix
        if [ -d "$path" ]; then
            printf "%s%s/\n" "$prefix" "$(basename "$clean_path")"
        else
            printf "%s%s\n" "$prefix" "$(basename "$clean_path")"
        fi
    done
}

# Generate structure and save to file
{
    echo "# Project Structure"
    echo ""
    echo "Maximum depth: $MAX_DEPTH levels"
    echo ""
    echo '```'
    echo "."
    generate_tree
    echo '```'
    echo ""
    echo "**Excluded directories:** \`.git\`, \`node_modules\`, \`dist\`, \`build\`, \`coverage\`, \`tmp\`, \`temp\`, \`__pycache__\`, \`vendor\`, and all hidden files/directories"
    echo ""
    echo "Generated on: $(date '+%Y-%m-%d %H:%M:%S')"
} > "$OUTPUT_FILE"

echo "✅ Project structure saved to: $OUTPUT_FILE"
echo "📊 Maximum depth: $MAX_DEPTH levels"
echo "📁 Output includes directory structure with proper tree formatting"