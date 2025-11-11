// Barrel export for all repositories
export * from './analysis';
export * from './auth';
export * from './bills';
export * from './community';
export * from './error-analytics';

// Re-export commonly used repository instances
export { analysisRepository } from './analysis';
export { authRepository } from './auth';
export { billsRepository } from './bills';
export { communityRepository } from './community';
export { errorAnalyticsRepository } from './error-analytics';