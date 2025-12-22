/**
 * Configuration Module for WebSocket Service
 * 
 * This module provides both immutable base configuration and dynamic runtime
 * configuration management for the WebSocket service. It supports progressive
 * degradation and real-time configuration adjustments based on system conditions.
 */

// Base configuration exports
export {
  BASE_CONFIG,
  isValidBaseConfig,
  getBaseConfig,
} from './base-config';

// Runtime configuration exports
export {
  RuntimeConfig,
  isValidRuntimeConfig,
  createRuntimeConfig,
  getDefaultRuntimeConfig,
} from './runtime-config';

// Re-export configuration types for convenience
export type {
  BaseConfigType,
  RuntimeConfigType,
  DegradationLevel,
} from '../types';