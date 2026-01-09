#!/usr/bin/env python3
"""
Chanuka Platform Error Extractor v2.0
Pattern-based code quality scanner for TypeScript/React monorepo
"""

import os
import json
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Set
from dataclasses import dataclass
import sys
from collections import defaultdict

@dataclass
class Pattern:
    """Pattern definition for code issues"""
    name: str
    regex: str
    severity: str
    message: str
    compiled: re.Pattern = None

    def __post_init__(self):
        try:
            self.compiled = re.compile(self.regex)
        except re.error as e:
            print(f"Warning: Invalid regex for {self.name}: {e}")
            self.compiled = None

class ChanukaErrorExtractor:
    def __init__(self, root_dir: str, output_file: str = "pattern_errors.json"):
        self.root_dir = Path(root_dir).resolve()
        self.output_file = output_file
        self.errors = []
        self.file_count = 0
        self.scanned_lines = 0

        # File extensions and their handlers
        self.file_extensions = {
            '.ts': self.check_typescript_file,
            '.tsx': self.check_react_file,
            '.js': self.check_javascript_file,
            '.jsx': self.check_react_file,
        }

        # Directories to skip
        self.skip_dirs = {
            'node_modules', '.git', '__pycache__', 'venv', 'env', '.venv',
            'dist', 'build', '.next', 'target', 'coverage', 'test-results',
            'playwright-report', 'drizzle', 'backup', 'tmp', 'temp', '.cache',
            'out', 'public', 'static', '.turbo', '.vercel', '.netlify'
        }

        # Initialize pattern collections
        self.typescript_patterns = self._init_typescript_patterns()
        self.react_patterns = self._init_react_patterns()
        self.common_patterns = self._init_common_patterns()
        self.import_patterns = self._init_import_patterns()

    def _init_typescript_patterns(self) -> List[Pattern]:
        """Initialize TypeScript-specific patterns"""
        return [
            Pattern('any_usage', r':\s*any\b|<any>|as\s+any\b', 'warning',
                   'Usage of "any" type reduces type safety'),
            Pattern('ts_ignore', r'@ts-ignore', 'warning',
                   'TypeScript error suppression found'),
            Pattern('ts_nocheck', r'@ts-nocheck', 'error',
                   'Entire file TypeScript checking disabled'),
            Pattern('ts_expect_error', r'@ts-expect-error(?!\s*:\s*.+)', 'info',
                   'Expected TypeScript error (consider adding comment)'),
            Pattern('non_null_assertion', r'!\s*[;\.\[\(]', 'warning',
                   'Non-null assertion operator (!) used - ensure safety'),
            Pattern('unknown_type', r':\s*unknown\b', 'info',
                   'Unknown type used (safer than any, but consider specifics)'),
            Pattern('type_assertion', r'as\s+\w+', 'info',
                   'Type assertion used - verify correctness'),
        ]

    def _init_react_patterns(self) -> List[Pattern]:
        """Initialize React-specific patterns"""
        return [
            Pattern('missing_key_prop', r'\.map\([^)]*\)\s*=>\s*<\w+[^>]*(?<!key=)[^>]*>', 'warning',
                   'Missing "key" prop in mapped component'),
            Pattern('inline_function', r'(onClick|onChange|onSubmit|onBlur|onFocus)=\{[^}]*=>', 'info',
                   'Inline function in JSX (may cause unnecessary re-renders)'),
            Pattern('direct_state_mutation', r'(state|this\.state)\.\w+\s*=(?!=)', 'error',
                   'Direct state mutation detected - use setState'),
            Pattern('empty_deps', r'useEffect\([^)]+,\s*\[\s*\]\s*\)', 'info',
                   'useEffect with empty dependency array (runs once on mount)'),
            Pattern('missing_deps', r'useEffect\([^)]+\)\s*(?!,)', 'warning',
                   'useEffect without dependency array (runs on every render)'),
            Pattern('useState_initial', r'useState\(\s*\{|\useState\(\s*\[', 'info',
                   'useState with object/array - ensure intentional'),
            Pattern('dangerously_set', r'dangerouslySetInnerHTML', 'warning',
                   'dangerouslySetInnerHTML used - XSS risk'),
        ]

    def _init_common_patterns(self) -> List[Pattern]:
        """Initialize common code quality patterns"""
        return [
            Pattern('TODO', r'//\s*TODO|/\*\s*TODO|#\s*TODO', 'warning', 'TODO comment'),
            Pattern('FIXME', r'//\s*FIXME|/\*\s*FIXME|#\s*FIXME', 'error', 'FIXME comment'),
            Pattern('BUG', r'//\s*BUG|/\*\s*BUG|#\s*BUG', 'critical', 'BUG comment'),
            Pattern('HACK', r'//\s*HACK|/\*\s*HACK|#\s*HACK', 'warning', 'HACK comment'),
            Pattern('XXX', r'//\s*XXX|/\*\s*XXX|#\s*XXX', 'warning', 'XXX comment'),
            Pattern('console.log', r'console\.log\(', 'info', 'Debug console.log'),
            Pattern('console.error', r'console\.error\(', 'info', 'Console.error'),
            Pattern('debugger', r'\bdebugger\b(?!:)', 'warning', 'Debugger statement'),
            Pattern('alert', r'\balert\s*\(', 'warning', 'Alert statement'),
            Pattern('confirm', r'\bconfirm\s*\(', 'warning', 'Confirm dialog'),
            Pattern('eval', r'\beval\s*\(', 'critical', 'eval() used - security risk'),
            Pattern('localStorage', r'localStorage\.(getItem|setItem|removeItem|clear)', 'info',
                   'Direct localStorage usage'),
            Pattern('sessionStorage', r'sessionStorage\.(getItem|setItem|removeItem|clear)', 'info',
                   'Direct sessionStorage usage'),
            Pattern('fetch_no_catch', r'fetch\([^)]+\)(?!\s*\.catch|\s*\.then\([^)]*,[^)]*\))', 'warning',
                   'Fetch without error handling'),
            Pattern('async_no_await', r'async\s+function[^{]*{(?!.*await)', 'warning',
                   'Async function without await'),
            Pattern('empty_catch', r'catch\s*\([^)]*\)\s*{\s*}', 'warning',
                   'Empty catch block - handle errors properly'),
        ]

    def _init_import_patterns(self) -> List[Pattern]:
        """Initialize import/export patterns"""
        return [
            Pattern('wildcard_import', r'import\s+\*\s+as\s+\w+\s+from', 'warning',
                   'Wildcard import (affects tree-shaking)'),
            Pattern('deep_relative', r'from\s+[\'"](\.\./){4,}', 'warning',
                   'Deep relative import (consider path alias)'),
            Pattern('unused_import_likely', r'import\s+{[^}]{80,}}\s+from', 'info',
                   'Large import statement - verify all are used'),
            Pattern('require_usage', r'\brequire\s*\(', 'info',
                   'CommonJS require() in modern codebase'),
        ]

    def scan_codebase(self):
        """Scan the entire codebase for errors."""
        print(f"Scanning: {self.root_dir}")

        # Determine scan directories
        scan_dirs = []
        for possible_dir in ['client/src', 'server', 'shared', 'src']:
            full_path = self.root_dir / possible_dir
            if full_path.exists() and full_path.is_dir():
                scan_dirs.append(full_path)

        if not scan_dirs:
            # Fallback to scanning root if no standard directories found
            print("Warning: No standard directories found, scanning entire root...")
            scan_dirs = [self.root_dir]

        for scan_dir in scan_dirs:
            dir_name = scan_dir.relative_to(self.root_dir)
            print(f"  Scanning {dir_name}...")
            self._scan_directory(scan_dir)

        print(f"\nScan complete: {self.file_count} files, {self.scanned_lines:,} lines")
        print(f"   Found {len(self.errors)} issues")

    def _scan_directory(self, directory: Path):
        """Recursively scan a directory."""
        try:
            for root, dirs, files in os.walk(directory):
                # Filter out skip directories in-place
                dirs[:] = [d for d in dirs if d not in self.skip_dirs]

                for file in files:
                    file_path = Path(root) / file
                    file_ext = file_path.suffix.lower()

                    if file_ext in self.file_extensions:
                        try:
                            self.file_extensions[file_ext](file_path)
                            self.file_count += 1
                        except Exception as e:
                            self.add_error(
                                file_path=str(file_path),
                                error_type="Scanner Error",
                                message=f"Failed to scan: {str(e)}",
                                line_number=0,
                                severity="error"
                            )
        except PermissionError:
            print(f"Warning: Permission denied: {directory}")

    def check_typescript_file(self, file_path: Path):
        """Check TypeScript files for common issues."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            lines = content.split('\n')
            self.scanned_lines += len(lines)

            # Check all pattern types
            self._check_patterns(file_path, lines, self.typescript_patterns)
            self._check_patterns(file_path, lines, self.common_patterns)
            self._check_patterns(file_path, lines, self.import_patterns)

        except Exception as e:
            self.add_error(
                file_path=str(file_path),
                error_type="File Read Error",
                message=str(e),
                line_number=0,
                severity="error"
            )

    def check_react_file(self, file_path: Path):
        """Check React/TSX files for common issues."""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            lines = content.split('\n')
            self.scanned_lines += len(lines)

            # Check all pattern types
            self._check_patterns(file_path, lines, self.react_patterns)
            self._check_patterns(file_path, lines, self.typescript_patterns)
            self._check_patterns(file_path, lines, self.common_patterns)
            self._check_patterns(file_path, lines, self.import_patterns)

        except Exception as e:
            self.add_error(
                file_path=str(file_path),
                error_type="File Read Error",
                message=str(e),
                line_number=0,
                severity="error"
            )

    def check_javascript_file(self, file_path: Path):
        """Check JavaScript files."""
        self.check_typescript_file(file_path)

    def _check_patterns(self, file_path: Path, lines: List[str], patterns: List[Pattern]):
        """Check a set of patterns against file lines."""
        for line_num, line in enumerate(lines, 1):
            # Skip very long lines (likely minified or data)
            if len(line) > 500:
                continue

            for pattern in patterns:
                if pattern.compiled and pattern.compiled.search(line):
                    # Skip if it's in a comment (basic check)
                    stripped = line.strip()
                    if stripped.startswith('//') or stripped.startswith('*'):
                        # Only add if it's a comment-related pattern
                        if pattern.name not in ['TODO', 'FIXME', 'BUG', 'HACK', 'XXX']:
                            continue

                    self.add_error(
                        file_path=str(file_path),
                        error_type=f"{self._get_category(pattern)}{pattern.name}",
                        message=pattern.message,
                        line_number=line_num,
                        severity=pattern.severity,
                        code_snippet=line.strip()[:150]  # Limit snippet length
                    )

    def _get_category(self, pattern: Pattern) -> str:
        """Determine pattern category."""
        if pattern in self.typescript_patterns:
            return "TypeScript - "
        elif pattern in self.react_patterns:
            return "React - "
        elif pattern in self.import_patterns:
            return "Import/Export - "
        else:
            return "Code Quality - "

    def add_error(self, file_path: str, error_type: str, message: str,
                  line_number: int, column: int = 0, severity: str = "error",
                  code_snippet: str = ""):
        """Add an error to the collection."""
        try:
            relative_path = str(Path(file_path).relative_to(self.root_dir))
        except ValueError:
            relative_path = str(file_path)

        # Determine module
        module = "unknown"
        path_parts = relative_path.split(os.sep)
        if path_parts:
            first_dir = path_parts[0]
            if first_dir in ['client', 'server', 'shared', 'src']:
                module = first_dir

        error = {
            "file": str(file_path),
            "relative_path": relative_path,
            "module": module,
            "error_type": error_type,
            "severity": severity,
            "message": message,
            "line": line_number,
            "column": column,
            "timestamp": datetime.now().isoformat(),
            "code_snippet": code_snippet
        }
        self.errors.append(error)

    def generate_statistics(self) -> Dict[str, Any]:
        """Generate statistics about the errors found."""
        stats = {
            "total_errors": len(self.errors),
            "by_severity": defaultdict(int),
            "by_type": defaultdict(int),
            "by_module": defaultdict(int),
            "by_file": defaultdict(int),
            "top_errors": [],
            "critical_files": []
        }

        for error in self.errors:
            stats["by_severity"][error.get("severity", "unknown")] += 1
            stats["by_type"][error.get("error_type", "unknown")] += 1
            stats["by_module"][error.get("module", "unknown")] += 1
            stats["by_file"][error.get("relative_path", "unknown")] += 1

        # Convert defaultdicts to regular dicts
        stats["by_severity"] = dict(stats["by_severity"])
        stats["by_type"] = dict(stats["by_type"])
        stats["by_module"] = dict(stats["by_module"])
        stats["by_file"] = dict(stats["by_file"])

        # Get top error types
        sorted_types = sorted(stats["by_type"].items(), key=lambda x: x[1], reverse=True)
        stats["top_errors"] = [{"type": t, "count": c} for t, c in sorted_types[:15]]

        # Get files with most errors
        sorted_files = sorted(stats["by_file"].items(), key=lambda x: x[1], reverse=True)
        stats["critical_files"] = [{"file": f, "error_count": c} for f, c in sorted_files[:10]]

        return stats

    def save_to_json(self):
        """Save errors to a JSON file."""
        output = {
            "metadata": {
                "project": "Chanuka Platform",
                "scan_date": datetime.now().isoformat(),
                "root_directory": str(self.root_dir),
                "total_errors": len(self.errors),
                "files_scanned": self.file_count,
                "lines_scanned": self.scanned_lines,
                "tool": "pattern-scanner",
                "version": "2.0.0"
            },
            "statistics": self.generate_statistics(),
            "errors": sorted(
                self.errors,
                key=lambda x: (
                    {"critical": 0, "error": 1, "warning": 2, "info": 3}.get(x['severity'], 4),
                    x['file'],
                    x['line']
                )
            )
        }

        with open(self.output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, indent=2, ensure_ascii=False)

        self._print_summary(output['statistics'])

    def _print_summary(self, stats: Dict[str, Any]):
        """Print a summary of the scan results."""
        print(f"\n{'='*60}")
        print("PATTERN ANALYSIS COMPLETE")
        print(f"{'='*60}\n")

        print(f"Results saved to: {self.output_file}")
        print(f"\nStatistics:")
        print(f"  Total Issues: {stats['total_errors']}")

        print(f"\nBy Severity:")
        for severity in ['critical', 'error', 'warning', 'info']:
            count = stats['by_severity'].get(severity, 0)
            if count > 0:
                print(f"  {severity.title()}: {count}")

        if stats['by_module']:
            print(f"\nBy Module:")
            for module, count in sorted(stats['by_module'].items(), key=lambda x: x[1], reverse=True):
                print(f"  • {module}: {count}")

        if stats['top_errors']:
            print(f"\nTop 5 Error Types:")
            for i, error_info in enumerate(stats['top_errors'][:5], 1):
                print(f"  {i}. {error_info['type']}: {error_info['count']}")

        if stats['critical_files']:
            print(f"\nTop 5 Files Needing Attention:")
            for i, file_info in enumerate(stats['critical_files'][:5], 1):
                print(f"  {i}. {file_info['file']} ({file_info['error_count']} issues)")

        print(f"\n{'='*60}\n")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("Chanuka Platform Pattern Error Extractor v2.0")
        print("\nUsage: python3 chanuka_error_extractor.py <project_root> [output_file.json]")
        print("\nExamples:")
        print("  python3 chanuka_error_extractor.py . pattern_errors.json")
        print("  python3 chanuka_error_extractor.py /path/to/project")
        sys.exit(1)

    root_dir = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "pattern_errors.json"

    if not os.path.exists(root_dir):
        print(f"Error: Directory '{root_dir}' does not exist.")
        sys.exit(1)

    try:
        extractor = ChanukaErrorExtractor(root_dir, output_file)
        extractor.scan_codebase()
        extractor.save_to_json()
        sys.exit(0)
    except KeyboardInterrupt:
        print("\n\nScan interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()