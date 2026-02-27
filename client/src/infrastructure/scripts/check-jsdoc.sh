#!/bin/bash

# JSDoc Coverage Checker
# Analyzes infrastructure modules for JSDoc coverage

echo ""
echo "📊 JSDoc Coverage Report"
echo ""
echo "================================================================================"

total_exports=0
total_documented=0

for dir in client/src/infrastructure/*/; do
  module=$(basename "$dir")
  
  # Skip special directories
  if [[ "$module" == "__tests__" || "$module" == "scripts" ]]; then
    continue
  fi
  
  index_file="${dir}index.ts"
  
  if [ ! -f "$index_file" ]; then
    continue
  fi
  
  # Count exports
  exports=$(grep -c "^export " "$index_file" 2>/dev/null || echo "0")
  
  # Count exports with JSDoc (/** comment within 5 lines before export)
  documented=0
  while IFS= read -r line_num; do
    # Check if there's a /** comment within 5 lines before this export
    start=$((line_num - 5))
    if [ $start -lt 1 ]; then start=1; fi
    
    if sed -n "${start},${line_num}p" "$index_file" | grep -q "/\*\*"; then
      documented=$((documented + 1))
    fi
  done < <(grep -n "^export " "$index_file" | cut -d: -f1)
  
  total_exports=$((total_exports + exports))
  total_documented=$((total_documented + documented))
  
  if [ $exports -gt 0 ]; then
    coverage=$((documented * 100 / exports))
    
    if [ $coverage -eq 100 ]; then
      status="✅"
    elif [ $coverage -ge 80 ]; then
      status="⚠️ "
    else
      status="❌"
    fi
    
    printf "%s %-25s %3d/%-3d (%3d%%)\n" "$status" "$module" "$documented" "$exports" "$coverage"
  fi
done

echo "================================================================================"

if [ $total_exports -gt 0 ]; then
  overall_coverage=$((total_documented * 100 / total_exports))
  echo ""
  printf "📈 Overall Coverage: %d/%d (%d%%)\n" "$total_documented" "$total_exports" "$overall_coverage"
  echo ""
  
  if [ $overall_coverage -lt 100 ]; then
    echo "⚠️  Some exports are missing JSDoc comments."
    echo ""
  else
    echo "✅ All public exports are documented!"
    echo ""
  fi
fi
