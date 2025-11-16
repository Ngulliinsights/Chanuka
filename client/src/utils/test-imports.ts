/**
 * Test file to check if all utility imports work correctly
 */

// Test logger import
try {
  const { logger: _logger } = require('./logger');
  console.log('Logger import: OK');
} catch (error) {
  console.error('Logger import failed:', error);
}

// Test tokenManager import
try {
  const { tokenManager: _tokenManager } = require('./tokenManager');
  console.log('TokenManager import: OK');
} catch (error) {
  console.error('TokenManager import failed:', error);
}

// Test sessionManager import
try {
  const { sessionManager: _sessionManager } = require('./sessionManager');
  console.log('SessionManager import: OK');
} catch (error) {
  console.error('SessionManager import failed:', error);
}

// Test rbac import
try {
  const { rbacManager: _rbacManager } = require('./rbac');
  console.log('RBAC import: OK');
} catch (error) {
  console.error('RBAC import failed:', error);
}

export {};