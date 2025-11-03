/**
 * Error Extractor
 * 
 * Extracts TypeScript diagnostics and converts them to our TypeScriptError format
 * with project-specific filtering for Chanuka codebase patterns.
 */

import * as ts from 'typescript';
import * as path from 'path';
import { TypeScriptError, Configuration, ProjectStructure } from '../types/core';

export interface ErrorExtractionResult {
  errors: TypeScriptError[];
  totalDiagnostics: number;
  filteredCount: number;
  categorizedErrors: Map<number, TypeScriptError[]>;
}

export class ErrorExtractor {
  private config: Configuration;
  private projectStructure: ProjectStructure;

  // Chanuka-specific error codes we want to focus on
  private readonly CHANUKA_PRIORITY_ERRORS = new Set([
    2304, // Cannot find name
    2305, // Module has no exported member
    2307, // Cannot find module
    2339, // Property does not exist on type
    2345, // Argument of type is not assignable to parameter of type
    2554, // Expected N arguments, but got M
    2556, // A spread argument must either have a tuple type or be passed to a rest parameter
    2559, // Type has no properties in common with type
    2564, // Property does not exist on type. Did you mean?
    2571, // Object is of type 'unkn