#!/usr/bin/env python3
"""Fix trailing commas before closing parentheses in SQL"""

import re

with open('server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql', 'r') as f:
    lines = f.readlines()

fixed_lines = []
for i, line in enumerate(lines):
    # Look ahead for closing parenthesis (skip blank lines and comments)
    found_closing = False
    for j in range(i + 1, min(i + 5, len(lines))):
        next_line = lines[j].strip()
        if next_line and not next_line.startswith('--'):
            if next_line == ');':
                found_closing = True
            break
    
    # Remove trailing comma if closing parenthesis is coming
    if found_closing and line.rstrip().endswith(','):
        fixed_lines.append(line.rstrip().rstrip(',') + '\n')
    else:
        fixed_lines.append(line)

with open('server/infrastructure/database/migrations/20260306_mwanga_stack_schema.sql', 'w') as f:
    f.writelines(fixed_lines)

print('✅ Fixed all trailing commas (including those with blank lines)')
