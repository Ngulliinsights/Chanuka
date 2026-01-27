#!/bin/bash
# Bulk type import migration using perl (works better than sed on complex patterns)

cd "c:\Users\Access Granted\Downloads\projects\SimpleTool"

echo "🔄 Migrating type imports..."

# Use find to get all TS/TSX files and apply replacements
find client/src -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 | while IFS= read -r -d '' file; do
  if grep -q "@client/types" "$file"; then
    # Create backup and apply replacements using perl
    perl -i -pe "s|from\s+['\"]@client/types['\"]|from '@client/lib/types'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/dashboard['\"]|from '@client/lib/types/dashboard'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/loading['\"]|from '@client/lib/types/loading'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/navigation['\"]|from '@client/lib/types/navigation'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/mobile['\"]|from '@client/lib/types/mobile'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/user-dashboard['\"]|from '@client/lib/types/user-dashboard'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/onboarding['\"]|from '@client/features/users/types'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/expert['\"]|from '@client/features/users/types'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/community['\"]|from '@client/features/community/types'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/conflict-of-interest['\"]|from '@client/features/analysis/types'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/auth['\"]|from '@client/core/auth'|g" "$file"
    perl -i -pe "s|from\s+['\"]@client/types/realtime['\"]|from '@client/core/realtime/types'|g" "$file"
  fi
done

echo "✅ Migration complete!"
