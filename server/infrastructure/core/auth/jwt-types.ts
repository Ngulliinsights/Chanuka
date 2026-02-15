/**
 * JWT Type Definitions
 * 
 * Type-safe JWT payload interfaces and utilities for authentication
 */

import * as jwt from 'jsonwebtoken';

/**
 * Standard JWT payload for access tokens
 */
export interface JwtPayload {
  readonly user_id: string;
  readonly email: string;
  readonly iat?: number;
  readonly exp?: number;
}

/**
 * JWT payload for refresh tokens
 */
export interface RefreshTokenPayload extends JwtPayload {
  readonly type: 'refresh';
}

/**
 * Type guard to check if a decoded token is a valid JwtPayload
 */
export function isJwtPayload(decoded: unknown): decoded is JwtPayload {
  return (
    typeof decoded === 'object' &&
    decoded !== null &&
    'user_id' in decoded &&
    'email' in decoded &&
    typeof (decoded as JwtPayload).user_id === 'string' &&
    typeof (decoded as JwtPayload).email === 'string'
  );
}

/**
 * Type guard to check if a decoded token is a valid RefreshTokenPayload
 */
export function isRefreshTokenPayload(decoded: unknown): decoded is RefreshTokenPayload {
  return (
    isJwtPayload(decoded) &&
    'type' in decoded &&
    (decoded as RefreshTokenPayload).type === 'refresh'
  );
}

/**
 * Safely verify and decode a JWT token
 * 
 * @param token - JWT token to verify
 * @param secret - Secret key for verification
 * @returns Decoded payload if valid, null otherwise
 */
export function verifyJwtToken(token: string, secret: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret);
    
    if (isJwtPayload(decoded)) {
      return decoded;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Safely verify and decode a refresh token
 * 
 * @param token - Refresh token to verify
 * @param secret - Secret key for verification
 * @returns Decoded payload if valid, null otherwise
 */
export function verifyRefreshToken(token: string, secret: string): RefreshTokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret);
    
    if (isRefreshTokenPayload(decoded)) {
      return decoded;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}
