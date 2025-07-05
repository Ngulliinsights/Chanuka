// Legislative transparency platform storage exports
export { legislativeStorage } from './legislative-storage';
export type { LegislativeStorage } from './legislative-storage';

// Main storage interface for the application
export interface AppStorage {
  legislative: LegislativeStorage;
}

// Create and export the application storage system
function createAppStorage(): AppStorage {
  return {
    legislative: legislativeStorage,
  };
}

// Export storage singleton
export const storage = createAppStorage();

// Type guard for error handling (utility)
export function isError(err: unknown): err is Error {
  return err instanceof Error;
}
