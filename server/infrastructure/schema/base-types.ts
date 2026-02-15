// ============================================================================
// BASE TYPES - Shared across all schema domains
// ============================================================================
// Centralized definitions for common entity patterns
// Reduces duplication and ensures consistency across domains

import { sql } from "drizzle-orm";
import {
  timestamp,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";

// ============================================================================
// AUDIT FIELD HELPERS - DRY definitions for common audit patterns
// ============================================================================

/**
 * Standard audit fields for timestamped entities
 * Use in table definitions: { ...auditFields() }
 */
export const auditFields = () => ({
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Soft-delete pattern: allows logical deletion without removing data
 */
export const softDeleteField = () => ({
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * Complete audit trail: timestamps + soft delete + who made the change
 */
export const fullAuditFields = () => ({
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  created_by: varchar("created_by", { length: 36 }).notNull(), // user ID or system
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_by: varchar("updated_by", { length: 36 }).notNull(),
  deleted_at: timestamp("deleted_at", { withTimezone: true }),
  deleted_by: varchar("deleted_by", { length: 36 }),
});

// ============================================================================
// PRIMARY KEY HELPERS - DRY UUID primary keys
// ============================================================================

/**
 * Standard UUID primary key with auto-generation
 */
export const primaryKeyUuid = () =>
  uuid("id").primaryKey().default(sql`gen_random_uuid()`);

/**
 * UUID foreign key reference pattern
 */
export const foreignKeyUuid = (columnName: string) =>
  uuid(columnName).notNull();

// ============================================================================
// COMMON METADATA FIELDS
// ============================================================================

/**
 * JSONB metadata field for extensible data
 * Default empty object, not null
 */
export const metadataField = () =>
  jsonb("metadata").notNull().default(sql`'{}'::jsonb`);

/**
 * Standard description/notes field
 */
export const descriptionField = () =>
  text("description");

/**
 * Standard status field for state machines
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const statusField = (enumType: any, defaultValue: string) => {
  const enumNameOrStatus = enumType.name ?? "status";
  return enumType(enumNameOrStatus).notNull().default(defaultValue);
};

/**
 * Flag/boolean field with audit metadata
 */
export const auditedFlagField = () => ({
  is_active: boolean("is_active").notNull().default(true),
  is_verified: boolean("is_verified").notNull().default(false),
  is_approved: boolean("is_approved").notNull().default(false),
});

// ============================================================================
// COMMON INDEXED FIELD PATTERNS
// ============================================================================

/**
 * Email field with constraints (RFC 5321 max length)
 */
export const emailField = () =>
  varchar("email", { length: 320 }).notNull();

/**
 * Standard name/title field
 */
export const nameField = (maxLength = 100) =>
  varchar("name", { length: maxLength }).notNull();

/**
 * Display name for UI rendering
 */
export const displayNameField = (maxLength = 150) =>
  varchar("display_name", { length: maxLength });

/**
 * Generic code/slug field (kebab-case identifiers)
 */
export const codeField = (maxLength = 50) =>
  varchar("code", { length: maxLength }).notNull();

// ============================================================================
// TYPE DEFINITIONS - TypeScript interfaces for entities
// ============================================================================

/**
 * Soft-deletable entity
 */
export interface SoftDeletable extends BaseEntity {
  deleted_at: Date | null;
}

/**
 * Versioned entity (for tracking changes)
 */
export interface VersionedEntity extends BaseEntity {
  version: number;
  change_hash: string; // Hash of what changed
}

/**
 * Metadata-bearing entity
 */
export interface MetadataEntity extends BaseEntity {
  metadata: Record<string, unknown>;
}

/**
 * Searchable entity with full-text index fields
 * cspell:ignore tsvector
 */
export interface SearchableEntity extends BaseEntity {
  title: string;
  body: string;
  search_vector?: Record<string, unknown>; // PostgreSQL tsvector
}

// ============================================================================
// CONSTRAINT HELPERS - Common validation patterns
// ============================================================================

/**
 * Email validation regex (simplified)
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone number pattern (international E.164 format)
 */
export const PHONE_PATTERN = /^\+?[1-9]\d{1,14}$/;

/**
 * URL slug pattern (kebab-case, alphanumeric + dash)
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * UUID v4 pattern
 */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ============================================================================
// EXPORT SUMMARY
// ============================================================================

export const BaseTypeHelpers = {
  // Audit fields
  auditFields,
  softDeleteField,
  fullAuditFields,

  // Primary keys
  primaryKeyUuid,
  foreignKeyUuid,

  // Common fields
  metadataField,
  descriptionField,
  statusField,
  auditedFlagField,
  emailField,
  nameField,
  displayNameField,
  codeField,

  // Patterns
  EMAIL_PATTERN,
  PHONE_PATTERN,
  SLUG_PATTERN,
  UUID_PATTERN,
};

// ============================================================================
// VERSION
// ============================================================================
export const BASE_TYPES_VERSION = "1.0.0";
export const BASE_TYPES_CHANGELOG = {
  "1.0.0": "Initial centralized base types module - DRY audit fields, PKs, common patterns",
} as const;
SE_TYPES_CHANGELOG = {
  "1.0.0": "Initial centralized base types module - DRY audit fields, PKs, common patterns",
} as const;
=====
export const BASE_TYPES_VERSION = "1.0.0";
export const BASE_TYPES_CHANGELOG = {
  "1.0.0": "Initial centralized base types module - DRY audit fields, PKs, common patterns",
} as const;
