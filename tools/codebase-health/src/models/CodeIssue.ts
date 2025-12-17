// Core Data Models for Code Issues
export interface CodeIssue {
  id: string;
  filePath: string;
  line: number;
  column: number;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  createdAt: Date;
}

export interface ImportExportIssue extends CodeIssue {
  type: 'missing_export' | 'incorrect_import' | 'path_mismatch';
  sourceFile: string;
  targetFile: string;
  importedName: string;
  expectedExport?: string;
  suggestedFix?: string;
}

export interface TypeIssue extends CodeIssue {
  type: 'missing_return_type' | 'any_type_usage' | 'non_null_assertion' | 'circular_dependency';
  functionName?: string;
  variableName?: string;
  currentType: string;
  suggestedType?: string;
}

export interface CircularDependency extends CodeIssue {
  cycle: string[];
  depth: number;
  breakingPoints: BreakingPoint[];
}

export interface BreakingPoint {
  filePath: string;
  suggestion: 'extract_types' | 'dependency_injection' | 'lazy_loading' | 'merge_modules';
  effort: 'low' | 'medium' | 'high';
}