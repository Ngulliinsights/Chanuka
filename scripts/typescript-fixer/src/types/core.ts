import { DiagnosticCategory, SourceFile } from 'typescript';

/**
 * Core interface for error fixers that can handle specific TypeScript errors
 */
export interface ErrorFixer {
  /**
   * Determines if this fixer can handle the given error
   */
  canHandle(error: TypeScriptError): boolean;
  
  /**
   * Applies a fix for the given error
   */
  fix(error: TypeScriptError, sourceFile: SourceFile): FixResult;
  
  /**
   * Returns a human-readable description of what this fixer does
   */
  getDescription(): string;
  
  /**
   * Returns the priority of this fixer (higher numbers = higher priority)
   */
  getPriority(): number;
}

/**
 * Represents a TypeScript compilation error
 */
export interface TypeScriptError {
  /** TypeScript error code (e.g., 2304, 6133) */
  code: number;
  
  /** Error message text */
  message: string;
  
  /** File path where the error occurred */
  file: string;
  
  /** Line number (1-based) */
  line: number;
  
  /** Column number (1-based) */
  column: number;
  
  /** Error category (Error, Warning, Suggestion, Message) */
  category: DiagnosticCategory;
  
  /** Character position in the source file */
  start: number;
  
  /** Length of the error span */
  length: number;
  
  /** Additional context about the error */
  context?: {
    /** The text that caused the error */
    errorText?: string;
    
    /** Surrounding context for better understanding */
    surroundingText?: string;
    
    /** Related information or suggestions */
    relatedInfo?: string[];
  };
}

/**
 * Result of applying a fix to a TypeScript error
 */
export interface FixResult {
  /** Whether the fix was successfully applied */
  success: boolean;
  
  /** List of code changes made */
  changes: CodeChange[];
  
  /** Human-readable message describing what was done */
  message: string;
  
  /** Whether the fix requires manual review */
  requiresManualReview?: boolean;
  
  /** Any warnings or notes about the fix */
  warnings?: string[];
  
  /** Error details if the fix failed */
  error?: string;
}

/**
 * Represents a single code change
 */
export interface CodeChange {
  /** Type of change being made */
  type: 'replace' | 'insert' | 'delete';
  
  /** Start position in the source file */
  start: number;
  
  /** End position in the source file */
  end: number;
  
  /** New text to insert/replace with */
  newText: string;
  
  /** Description of what this change does */
  description: string;
  
  /** The original text being changed (for replace/delete) */
  originalText?: string;
}

/**
 * Configuration options for the TypeScript error fixer
 */
export interface Configuration {
  /** List of TypeScript error codes to attempt to fix */
  enabledErrorTypes: number[];
  
  /** Glob patterns for files to exclude from processing */
  excludePatterns: string[];
  
  /** Glob patterns for files to include in processing */
  includePatterns: string[];
  
  /** Whether to create backup files before making changes */
  backupFiles: boolean;
  
  /** Whether to run in preview mode (show changes without applying) */
  previewMode: boolean;
  
  /** Output format for reports */
  outputFormat: 'console' | 'json' | 'markdown';
  
  /** Maximum number of files to process in parallel */
  maxConcurrency: number;
  
  /** Whether to continue processing if some files fail */
  continueOnError: boolean;
  
  /** Project-specific settings for Chanuka codebase */
  chanukaSettings: {
    /** Root directory of the Chanuka project */
    projectRoot: string;
    
    /** Path to TypeScript configuration */
    tsConfigPath: string;
    
    /** Known schema table names */
    schemaTableNames: string[];
    
    /** Known shared/core utility names */
    sharedCoreUtilities: string[];
    
    /** Database connection patterns to recognize */
    databasePatterns: string[];
  };
}

/**
 * Represents the structure and patterns of the Chanuka project
 */
export interface ProjectStructure {
  /** Root path of the project */
  rootPath: string;
  
  /** Path to the main TypeScript configuration */
  tsConfigPath: string;
  
  /** List of all TypeScript source files */
  sourceFiles: string[];
  
  /** Patterns to exclude from processing */
  excludePatterns: string[];
  
  /** TypeScript compiler options */
  compilerOptions: any;
  
  /** Schema information */
  schema: {
    /** Available schema tables and their properties */
    tables: Record<string, string[]>;
    
    /** Import paths for schema modules */
    importPaths: Record<string, string>;
  };
  
  /** Shared utilities information */
  sharedCore: {
    /** Available utilities and their export names */
    utilities: Record<string, string[]>;
    
    /** Import paths for shared utilities */
    importPaths: Record<string, string>;
  };
  
  /** Database patterns and connection information */
  database: {
    /** Connection import patterns */
    connectionPatterns: string[];
    
    /** Service patterns */
    servicePatterns: string[];
    
    /** Detected database service usages */
    detectedUsages: Array<{
      serviceName: string;
      methods: string[];
      importPath: string;
      usageCount: number;
      files: string[];
    }>;
    
    /** Common database-related imports */
    commonImports: Record<string, string>;
  };
}

/**
 * Context information passed to error fixers during processing
 */
export interface ProcessingContext {
  /** Project structure information */
  project: ProjectStructure;
  
  /** Configuration settings */
  config: Configuration;
  
  /** Current source file being processed */
  sourceFile: SourceFile;
  
  /** TypeScript program instance */
  program: any;
  
  /** TypeScript type checker */
  typeChecker: any;
  
  /** Current file path */
  filePath: string;
}

/**
 * Represents a complete fix session
 */
export interface FixSession {
  /** Unique identifier for this session */
  id: string;
  
  /** When the session started */
  startTime: Date;
  
  /** List of files being processed */
  files: string[];
  
  /** Total number of errors found */
  totalErrors: number;
  
  /** Number of errors successfully fixed */
  fixedErrors: number;
  
  /** Number of errors skipped */
  skippedErrors: number;
  
  /** Number of errors that failed to fix */
  failedErrors: number;
  
  /** Location of backup files (if created) */
  backupLocation?: string;
  
  /** Detailed results for each file */
  fileResults: FileResult[];
}

/**
 * Results for processing a single file
 */
export interface FileResult {
  /** File path */
  filePath: string;
  
  /** Whether the file was processed successfully */
  success: boolean;
  
  /** Errors found in this file */
  errors: TypeScriptError[];
  
  /** Fixes applied to this file */
  appliedFixes: FixResult[];
  
  /** Any processing errors */
  processingError?: string;
  
  /** Whether the file was backed up */
  backedUp: boolean;
}