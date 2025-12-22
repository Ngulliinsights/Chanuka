// Sample TypeScript file with known issues for testing
import { NonExistentExport } from './non-existent-file'; // Missing export issue
import { WrongImportName } from './correct-file'; // Incorrect import name
import * as fs from 'fs';

// Missing return type for async function
export async function fetchData(url: string) {
  const response = await fetch(url);
  return response.json();
}

// Usage of 'any' type
export function processData(data: any): void {
  console.log(data.someProperty);
}

// Non-null assertion usage
export function getUserName(user: { name?: string }): string {
  return user.name!; // Non-null assertion
}

// Function without explicit return type
export function calculateSum(a: number, b: number) {
  return a + b;
}

// Circular dependency example (would import from file that imports this)
export { CircularDependency } from './circular-import-file';