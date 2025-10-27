/**
 * Unified Utilities - Main Entry Point
 */

export * from './api';
export * from './logging';
export * from './performance';
export * from './database';
export * from './validation';

export const USE_UNIFIED_UTILITIES = process.env.USE_UNIFIED_UTILITIES === 'true';
export const UTILITIES_VERSION = '1.0.0';
