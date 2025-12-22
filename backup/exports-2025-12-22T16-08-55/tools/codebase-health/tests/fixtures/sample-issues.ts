// Sample file with known issues for testing the analysis engine

// Missing export - this will be imported but not exported
export const validExport = 'This is properly exported';

// Function without return type annotation
export async function fetchData() {
  return Promise.resolve({ data: 'test' });
}

// Using 'any' type
export function processData(input: any): any {
  return input;
}

// Non-null assertion usage
export function getElement(): HTMLElement {
  return document.getElementById('test')!;
}

// Missing named export that will be imported elsewhere
// export const missingExport = 'This should be exported but is commented out';

// Circular dependency setup - this file will import from circular-dep-b.ts
import { helperFunction } from './circular-dep-b';

export function mainFunction() {
  return helperFunction();
}