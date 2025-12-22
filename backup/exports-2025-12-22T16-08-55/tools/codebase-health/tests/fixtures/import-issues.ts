// File that imports non-existent exports to test import validation

// This import will fail - missingExport doesn't exist
import { missingExport } from './sample-issues';

// This import will succeed
import { validExport } from './sample-issues';

// This default import will fail - no default export in sample-issues
import SampleIssues from './sample-issues';

export function useImports() {
  console.log(validExport);
  // console.log(missingExport); // This would cause runtime error
  // console.log(SampleIssues); // This would cause runtime error
}