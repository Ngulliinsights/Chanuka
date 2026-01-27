/**
 * Additional edge case patterns for unused variable cleaner testing
 * These represent more complex scenarios found in the Chanuka project
 */

// Edge Case 1: Unused imports with side effects (should warn)
export const unusedImportsWithSideEffects = `
import '@shared/core/src/polyfills'; // Side effect import - should not be removed
import { logger } from '@shared/core'; // Unused but might have side effects
import './styles.css'; // Side effect import

export function simpleFunction() {
  return 'test';
}
`;

// Edge Case 2: Unused parameters in arrow functions
export const unusedArrowFunctionParams = `
const processUsers = (users: User[], filter: (user: User) => boolean, sorter: (a: User, b: User) => number) => {
  // filter and sorter parameters are unused
  return users.map(user => user.name);
};

const handleEvent = (event: Event, context: any, callback: Function) => {
  // event and context are unused
  callback();
};
`;

// Edge Case 3: Unused destructured parameters
export const unusedDestructuredParams = `
export function handleApiRequest({ 
  method, 
  url, 
  headers, 
  body, 
  query 
}: {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
}) {
  // Only using method and url, others are unused
  console.log(\`\${method} \${url}\`);
}
`;

// Edge Case 4: Unused variables in try-catch blocks
export const unusedVariablesInTryCatch = `
import { logger, ApiError } from '@shared/core';

export async function riskyOperation() {
  const startTime = Date.now(); // Unused
  const operationId = Math.random().toString(); // Unused
  
  try {
    const result = await performOperation();
    const endTime = Date.now(); // Unused
    return result;
  } catch (error) {
    const errorId = Math.random().toString(); // Unused
    logger.error('Operation failed', error);
    throw error;
  }
}

async function performOperation() {
  return 'success';
}
`;

// Edge Case 5: Unused imports in type-only contexts
export const unusedTypeOnlyImports = `
import type { User, Bill, Comment } from '@server/infrastructure/schema/types';
import { logger } from '@shared/core';

// Only User type is used, Bill and Comment are unused
export function processUser(user: User): void {
  logger.info('Processing user', user);
}
`;

// Edge Case 6: Unused variables in loops
export const unusedVariablesInLoops = `
export function processItems(items: any[]) {
  const processedCount = 0; // Unused
  const errors = []; // Unused
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemId = item.id; // Unused
    const timestamp = Date.now(); // Unused
    
    console.log('Processing item:', item);
  }
  
  items.forEach((item, index, array) => {
    // index and array are unused
    const processed = processItem(item);
    const metadata = { processed: true }; // Unused
    return processed;
  });
}

function processItem(item: any) {
  return item;
}
`;

// Edge Case 7: Unused imports with namespace imports
export const unusedNamespaceImports = `
import * as CoreUtils from '@shared/core';
import * as SchemaTypes from '@server/infrastructure/schema/types';
import { logger } from '@shared/core';

export function useOnlyLogger() {
  logger.info('Using only logger');
  // CoreUtils and SchemaTypes namespaces are unused
}
`;

// Edge Case 8: Unused variables in async/await patterns
export const unusedVariablesInAsync = `
import { databaseService } from '@server/infrastructure/database';
import { logger, PerformanceMonitor } from '@shared/core';

export async function complexAsyncOperation(user_id: string) {
  const monitor = new PerformanceMonitor(); // Unused
  const startTime = Date.now(); // Unused
  
  try {
    const user = await databaseService.findUser(user_id);
    const permissions = await databaseService.getUserPermissions(user_id); // Unused
    const settings = await databaseService.getUserSettings(user_id); // Unused
    
    logger.info('User found', user);
    return user;
  } catch (error) {
    const errorCode = 'USER_FETCH_ERROR'; // Unused
    const errorTime = Date.now(); // Unused
    throw error;
  }
}
`;

// Edge Case 9: Unused parameters in class methods
export const unusedClassMethodParams = `
import { logger } from '@shared/core';

export class UserService {
  private cache = new Map(); // Unused property
  
  constructor(private config: any, private metrics: any) {
    // metrics parameter is unused
    logger.info('UserService initialized', config);
  }
  
  async getUser(id: string, options: any, context: any) {
    // options and context parameters are unused
    logger.info('Getting user', id);
    return { id, name: 'User' };
  }
  
  private validateUser(user: any, rules: any[], metadata: any) {
    // rules and metadata parameters are unused
    return user.id && user.name;
  }
}
`;

// Edge Case 10: Unused imports with re-exports
export const unusedImportsWithReExports = `
import { 
  logger, 
  ApiSuccess, 
  ApiError, 
  ValidationError 
} from '@shared/core';

// Re-exporting some but not all
export { ApiSuccess, ApiError } from '@shared/core';

export function simpleFunction() {
  // logger and ValidationError are unused but imported
  return 'test';
}
`;

// Edge Case 11: Unused variables in conditional blocks
export const unusedVariablesInConditionals = `
import { logger } from '@shared/core';

export function conditionalProcessing(condition: boolean, data: any) {
  const timestamp = Date.now(); // Unused
  
  if (condition) {
    const processedData = processData(data); // Unused
    const metadata = { processed: true }; // Unused
    logger.info('Condition met');
  } else {
    const fallbackData = getDefaultData(); // Unused
    const reason = 'condition_not_met'; // Unused
    logger.info('Using fallback');
  }
}

function processData(data: any) {
  return data;
}

function getDefaultData() {
  return {};
}
`;

// Edge Case 12: Unused parameters with default values
export const unusedParamsWithDefaults = `
export function processRequest(
  data: any,
  options: any = {},
  timeout: number = 5000,
  retries: number = 3,
  callback?: Function
) {
  // options, timeout, retries, and callback are unused
  console.log('Processing:', data);
  return data;
}
`;