/**
 * Core Base Entity Interfaces
 * Foundation for all domain entities with audit fields and soft delete patterns
 */

/**
 * Base interface for all entities with audit fields
 * Provides consistent structure across all domain entities
 */
export interface BaseEntity {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Extended base for entities requiring soft delete
 */
export interface SoftDeletableEntity extends BaseEntity {
  readonly deletedAt?: Date;
  readonly isDeleted: boolean;
}

/**
 * Base for entities with user tracking
 */
export interface UserTrackableEntity extends BaseEntity {
  readonly createdBy: string;
  readonly updatedBy: string;
}

/**
 * Full audit trail entity with soft delete and user tracking
 */
export interface FullAuditEntity extends SoftDeletableEntity, UserTrackableEntity {
  readonly deletedBy?: string;
}