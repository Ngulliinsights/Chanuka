/**
 * Services Index
 * 
 * Central export point for all client services
 */

// API Services
export { requestInterceptors, responseInterceptors, processRequestInterceptors, processResponseInterceptors } from '../core/api/interceptors';

// Navigation Services
export * from './navigation';
export { PageRelationshipService } from './PageRelationshipService';

// Analytics Services
export { UserJourneyTracker } from './UserJourneyTracker';
export * from './analysis';

// WebSocket Services
export { UnifiedWebSocketManager, globalWebSocketPool } from '../core/api/websocket';

// Bills API Services
export { billsApiService } from './billsApiService';
export { billsWebSocketService } from './billsWebSocketService';
export { billsDataCache } from './billsDataCache';
export { billsPaginationService } from './billsPaginationService';

// Community Services
export { communityBackendService } from './community-backend-service';

// User Services (consolidated)
export { userService } from './userService';

// Core API Services (new consolidated services)
export { communityApiService } from '../core/api/community';
export { userApiService } from '../core/api/user';

// Mock Data Services
export { mockDataService } from './mockDataService';