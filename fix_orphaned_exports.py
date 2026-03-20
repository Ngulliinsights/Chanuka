#!/usr/bin/env python3
"""Fix orphaned export statements in TypeScript files."""

import os
import re
import subprocess
from pathlib import Path

def run_git(args, capture_output=True):
    """Run a git command."""
    cmd = ['git'] + args
    result = subprocess.run(cmd, capture_output=capture_output, text=True)
    return result.stdout, result.stderr, result.returncode

def get_file_from_commit(file_path, commit):
    """Get file content from a specific git commit."""
    stdout, stderr, code = run_git(['show', f'{commit}:{file_path}'])
    if code != 0:
        return None
    return stdout

def find_orphaned_exports(base_path='client/src'):
    """Find all files with orphaned export statements."""
    pattern = re.compile(r'\nexport\s*$', re.MULTILINE)
    results = []
    
    for root, dirs, files in os.walk(base_path):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    if pattern.search(content):
                        results.append(file_path)
                except Exception as e:
                    print(f"Error reading {file_path}: {e}")
    
    return results

def get_correct_export(file_path):
    """Get the correct export statement from git history."""
    # Get git log for this file
    stdout, stderr, code = run_git(['log', '--all', '--oneline', '--', file_path])
    if code != 0 or not stdout.strip():
        return None
    
    commits = [line.split()[0] for line in stdout.strip().split('\n')]
    
    # Check commits in order until we find one with a proper export
    for i, commit in enumerate(commits):
        content = get_file_from_commit(file_path, commit)
        if content is None:
            continue
        
        # Look for export statement (not just orphaned)
        export_match = re.search(r'^export .+$', content, re.MULTILINE)
        if export_match:
            # Make sure it's not just orphaned
            export_line = export_match.group(0)
            if export_line.strip() != 'export':
                return export_line
    
    return None

def fix_orphaned_export(file_path, correct_export):
    """Fix the orphaned export in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Replace orphaned export with correct one
        new_content = re.sub(r'\nexport\s*$', f'\n{correct_export}', content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        return True
    except Exception as e:
        print(f"Error fixing {file_path}: {e}")
        return False

def main():
    os.chdir('c:\\Users\\Access Granted\\Downloads\\projects\\SimpleTool')
    
    print("Finding orphaned exports...")
    orphaned_files = find_orphaned_exports()
    print(f"Found {len(orphaned_files)} files with orphaned exports")
    
    fixed = 0
    skipped = 0
    
    for file_path in orphaned_files[:10]:  # Fix first 10
        print(f"\nProcessing: {file_path}")
        
        correct_export = get_correct_export(file_path)
        if correct_export is None:
            print(f"  [SKIP] Could not find correct export in history")
            skipped += 1
            continue
        
        print(f"  [FOUND] {correct_export}")
        
        if fix_orphaned_export(file_path, correct_export):
            print(f"  [FIXED]")
            fixed += 1
        else:
            print(f"  [ERROR] Failed to fix")
            skipped += 1
    
    print(f"\n\nSummary:")
    print(f"  Fixed: {fixed}")
    print(f"  Skipped: {skipped}")
    print(f"  Total: {len(orphaned_files)}")

if __name__ == '__main__':
    main()
