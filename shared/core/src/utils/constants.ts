// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Authentication constants
export const AUTH_CONSTANTS = {
  TOKEN_EXPIRY: '24h',
  TOKEN_ALGORITHM: 'HS256',
  SALT_ROUNDS: 10,
  MIN_PASSWORD_LENGTH: 8,
  SESSION_COOKIE: 'connect.sid',
  TOKEN_COOKIE: 'auth_token'
};

// Import role hierarchy from auth types
export { ROLE_HIERARCHY } from '../types/auth.types';















































