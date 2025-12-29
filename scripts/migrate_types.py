#!/usr/bin/env python3
import os
import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
CLIENT_SRC = PROJECT_ROOT / 'client' / 'src'

# Define import mappings
REPLACEMENTS = {
    r"from\s+['\"]@client/types['\"]": "from '@client/shared/types'",
    r"from\s+['\"]@client/types/dashboard['\"]": "from '@client/shared/types/dashboard'",
    r"from\s+['\"]@client/types/loading['\"]": "from '@client/shared/types/loading'",
    r"from\s+['\"]@client/types/navigation['\"]": "from '@client/shared/types/navigation'",
    r"from\s+['\"]@client/types/mobile['\"]": "from '@client/shared/types/mobile'",
    r"from\s+['\"]@client/types/user-dashboard['\"]": "from '@client/shared/types/user-dashboard'",
    r"from\s+['\"]@client/types/onboarding['\"]": "from '@client/features/users/types'",
    r"from\s+['\"]@client/types/expert['\"]": "from '@client/features/users/types'",
    r"from\s+['\"]@client/types/community['\"]": "from '@client/features/community/types'",
    r"from\s+['\"]@client/types/conflict-of-interest['\"]": "from '@client/features/analysis/types'",
    r"from\s+['\"]@client/types/auth['\"]": "from '@client/core/auth'",
    r"from\s+['\"]@client/types/realtime['\"]": "from '@client/core/realtime/types'",
}

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original = content
        for pattern, replacement in REPLACEMENTS.items():
            content = re.sub(pattern, replacement, content)

        if content != original:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, 1
        return False, 0
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return False, 0

def main():
    print("🔄 Starting type import migration...\n")

    ts_files = list(CLIENT_SRC.rglob('*.ts')) + list(CLIENT_SRC.rglob('*.tsx'))
    print(f"📁 Found {len(ts_files)} TypeScript files\n")

    updated = 0
    total_changes = 0

    for filepath in ts_files:
        if '@client/types' in open(filepath, 'r', encoding='utf-8', errors='ignore').read():
            changed, count = process_file(filepath)
            if changed:
                updated += 1
                total_changes += count
                relpath = filepath.relative_to(CLIENT_SRC)
                print(f"✓ {relpath}")

    print(f"\n✅ Complete!\n")
    print(f"📊 Files updated: {updated}")
    print(f"📊 Total changes: {total_changes}")

if __name__ == '__main__':
    main()
