#!/usr/bin/env python3
"""
Fix MWANGA Stack Migration SQL
- Convert inline INDEX to CREATE INDEX statements
- Change INTEGER foreign keys to UUID
"""

import re

# Read the migration file
with open('server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql', 'r') as f:
    content = f.read()

# Step 1: Change INTEGER to UUID for foreign keys
content = content.replace('user_id INTEGER REFERENCES users(id)', 'user_id UUID REFERENCES users(id)')
content = content.replace('bill_id INTEGER REFERENCES bills(id)', 'bill_id UUID REFERENCES bills(id)')

# Step 2: Extract and remove inline INDEX declarations
indexes = []
lines = content.split('\n')
fixed_lines = []
current_table = None
skip_next_comma = False

i = 0
while i < len(lines):
    line = lines[i]
    
    # Track current table
    match = re.match(r'CREATE TABLE IF NOT EXISTS (\w+)', line)
    if match:
        current_table = match.group(1)
    
    # Skip index comment lines
    if line.strip().startswith('-- Indexes'):
        i += 1
        continue
    
    # Check for inline INDEX
    if line.strip().startswith('INDEX idx_'):
        match = re.match(r'\s*INDEX (idx_\w+) \(([^)]+)\),?', line)
        if match and current_table:
            index_name = match.group(1)
            columns = match.group(2)
            indexes.append(f'CREATE INDEX IF NOT EXISTS {index_name} ON {current_table} ({columns});')
            skip_next_comma = True
        i += 1
        continue
    
    # Remove trailing comma before closing parenthesis if we just removed indexes
    if skip_next_comma and line.strip() == ');':
        # Remove trailing comma from last added line
        if fixed_lines and fixed_lines[-1].strip() and not fixed_lines[-1].strip().startswith('--'):
            fixed_lines[-1] = fixed_lines[-1].rstrip().rstrip(',')
        skip_next_comma = False
        current_table = None
    
    fixed_lines.append(line)
    i += 1

# Step 3: Insert indexes before triggers section
trigger_marker = '-- Trigger to update updated_at timestamps'
final_lines = []
for line in fixed_lines:
    if trigger_marker in line:
        # Insert indexes before triggers
        final_lines.append('')
        final_lines.append('-- ============================================================================')
        final_lines.append('-- Indexes (created separately for PostgreSQL compatibility)')
        final_lines.append('-- ============================================================================')
        final_lines.append('')
        final_lines.extend(indexes)
        final_lines.append('')
        final_lines.append('-- ============================================================================')
    final_lines.append(line)

# Write fixed migration
with open('server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql', 'w') as f:
    f.write('\n'.join(final_lines))

print(f'✅ Fixed migration: {len(indexes)} indexes extracted')
print('✅ Changed INTEGER foreign keys to UUID')
