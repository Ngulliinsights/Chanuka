// This file creates a circular dependency with sample-issues.ts

import { validExport } from './sample-issues';

export function helperFunction() {
  return `Helper using: ${validExport}`;
}

// This creates the circular dependency
export function anotherHelper() {
  // This would import from sample-issues.ts, creating a cycle
  return 'helper';
}