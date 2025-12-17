// File that creates circular dependency
import { fetchData } from './sample-with-issues'; // Creates circular dependency

export interface CircularDependency {
  id: string;
  data: any;
}

export function useCircularDependency(): void {
  fetchData('test-url');
}