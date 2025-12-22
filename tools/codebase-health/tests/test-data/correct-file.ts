// Sample file with correct exports for testing import resolution
export interface CorrectInterface {
  id: string;
  name: string;
}

export class CorrectClass {
  constructor(public id: string) {}
}

// This should be imported as 'CorrectExportName' not 'WrongImportName'
export const CorrectExportName = 'test-value';

export default function defaultExport(): string {
  return 'default';
}
export const WrongImportName = {};
