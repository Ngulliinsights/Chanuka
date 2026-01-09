// ============================================================================
// SYNC TRIGGERS - PostgreSQL Triggers for Graph Synchronization (PHASE 2)
// ============================================================================
// Automatically tracks changes to PostgreSQL entities for Neo4j synchronization
// Uses trigger functions to insert/update graph_sync_status records on data changes
// Enables near real-time sync of PostgreSQL → Neo4j

import { sql } from "drizzle-orm";

// ============================================================================
// TRIGGER FUNCTION DEFINITIONS
// ============================================================================
// These functions are executed by PostgreSQL triggers on INSERT/UPDATE/DELETE

/**
 * TRIGGER FUNCTION: on_entity_change()
 *
 * Triggered on INSERT/UPDATE of tracked entities.
 * Records entity change in graph_sync_status table for processing.
 * Sets sync_status='pending' to queue for sync.
 *
 * Usage: Applied to users, sponsors, bills, governors, arguments, claims, etc.
 */
export const onEntityChangeTriggerFunction = sql`
CREATE OR REPLACE FUNCTION public.on_entity_change()
RETURNS TRIGGER AS $$
DECLARE
  entity_type_val VARCHAR(50);
  entity_id_val UUID;
BEGIN
  -- Determine entity type from TG_TABLE_NAME
  entity_type_val := CASE TG_TABLE_NAME
    WHEN 'users' THEN 'User'
    WHEN 'sponsors' THEN 'Person'
    WHEN 'governors' THEN 'Governor'
    WHEN 'bills' THEN 'Bill'
    WHEN 'committees' THEN 'Committee'
    WHEN 'arguments' THEN 'Argument'
    WHEN 'claims' THEN 'Claim'
    WHEN 'parliamentary_sessions' THEN 'ParliamentarySession'
    WHEN 'parliamentary_sittings' THEN 'ParliamentarySitting'
    ELSE NULL
  END;

  -- Get entity ID from NEW record
  IF TG_OP = 'DELETE' THEN
    entity_id_val := OLD.id;
  ELSE
    entity_id_val := NEW.id;
  END IF;

  -- Skip if entity type not recognized
  IF entity_type_val IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Insert or update sync status record
  INSERT INTO graph_sync_status (entity_type, entity_id, sync_status, sync_attempts, created_at, updated_at)
  VALUES (entity_type_val, entity_id_val, 'pending', 0, NOW(), NOW())
  ON CONFLICT (entity_type, entity_id) DO UPDATE
  SET
    sync_status = 'pending',
    sync_attempts = 0,
    updated_at = NOW();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
`;

/**
 * TRIGGER FUNCTION: on_array_field_change()
 *
 * Triggered on UPDATE of array fields in bills/arguments/claims.
 * Detects array field changes (co_sponsors, tags, related_bills, etc.)
 * Queues array field sync for processing.
 *
 * Compares OLD.field != NEW.field to detect changes
 * Usage: Applied to bills.co_sponsors, bills.tags, arguments.supporting_arguments, etc.
 */
export const onArrayFieldChangeTriggerFunction = sql`
CREATE OR REPLACE FUNCTION public.on_array_field_change()
RETURNS TRIGGER AS $$
DECLARE
  entity_type_val VARCHAR(50);
  changed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Only process on UPDATE
  IF TG_OP != 'UPDATE' THEN
    RETURN NEW;
  END IF;

  -- Detect which array fields changed
  IF (OLD.co_sponsors IS DISTINCT FROM NEW.co_sponsors) THEN
    changed_fields := array_append(changed_fields, 'co_sponsors');
  END IF;

  IF (OLD.tags IS DISTINCT FROM NEW.tags) THEN
    changed_fields := array_append(changed_fields, 'tags');
  END IF;

  IF (OLD.related_bills IS DISTINCT FROM NEW.related_bills) THEN
    changed_fields := array_append(changed_fields, 'related_bills');
  END IF;

  IF (OLD.supporting_arguments IS DISTINCT FROM NEW.supporting_arguments) THEN
    changed_fields := array_append(changed_fields, 'supporting_arguments');
  END IF;

  IF (OLD.contradicting_arguments IS DISTINCT FROM NEW.contradicting_arguments) THEN
    changed_fields := array_append(changed_fields, 'contradicting_arguments');
  END IF;

  IF (OLD.bills_discussed IS DISTINCT FROM NEW.bills_discussed) THEN
    changed_fields := array_append(changed_fields, 'bills_discussed');
  END IF;

  -- If array fields changed, queue for array field sync
  IF array_length(changed_fields, 1) > 0 THEN
    INSERT INTO graph_sync_status (
      entity_type,
      entity_id,
      sync_status,
      sync_attempts,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'pending',
      0,
      jsonb_build_object('changed_arrays', changed_fields, 'trigger', 'array_field_change'),
      NOW(),
      NOW()
    )
    ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET
      sync_status = 'pending',
      sync_attempts = 0,
      metadata = jsonb_build_object('changed_arrays', changed_fields, 'trigger', 'array_field_change'),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

/**
 * TRIGGER FUNCTION: on_entity_delete()
 *
 * Triggered on DELETE of tracked entities.
 * Marks entity as 'deleted' in graph_sync_status for orphan cleanup.
 * Neo4j sync will remove the node after verification.
 *
 * Preserves deletion metadata for audit trail.
 * Usage: Applied to users, sponsors, bills, etc. (on DELETE)
 */
export const onEntityDeleteTriggerFunction = sql`
CREATE OR REPLACE FUNCTION public.on_entity_delete()
RETURNS TRIGGER AS $$
DECLARE
  entity_type_val VARCHAR(50);
BEGIN
  -- Determine entity type
  entity_type_val := CASE OLD.table_name
    WHEN 'users' THEN 'User'
    WHEN 'sponsors' THEN 'Person'
    WHEN 'governors' THEN 'Governor'
    WHEN 'bills' THEN 'Bill'
    WHEN 'committees' THEN 'Committee'
    WHEN 'arguments' THEN 'Argument'
    WHEN 'claims' THEN 'Claim'
    WHEN 'parliamentary_sessions' THEN 'ParliamentarySession'
    WHEN 'parliamentary_sittings' THEN 'ParliamentarySitting'
    ELSE NULL
  END;

  IF entity_type_val IS NOT NULL THEN
    -- Record deletion for Neo4j orphan cleanup
    INSERT INTO graph_sync_status (
      entity_type,
      entity_id,
      sync_status,
      metadata,
      created_at,
      updated_at
    ) VALUES (
      entity_type_val,
      OLD.id,
      'deleted',
      jsonb_build_object('deleted_at', NOW(), 'postgres_deleted', true),
      NOW(),
      NOW()
    )
    ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET
      sync_status = 'deleted',
      metadata = jsonb_build_object('deleted_at', NOW(), 'postgres_deleted', true),
      updated_at = NOW();
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
`;

// ============================================================================
// TRIGGER DEFINITIONS - Applied to Tables
// ============================================================================

/**
 * Trigger on users table
 * Fires on INSERT, UPDATE → calls on_entity_change()
 */
export const triggerOnUsersInsertUpdate = sql`
CREATE TRIGGER users_sync_trigger
AFTER INSERT OR UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnUsersDelete = sql`
CREATE TRIGGER users_delete_trigger
AFTER DELETE ON users
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on sponsors table (MPs)
 */
export const triggerOnSponsorsInsertUpdate = sql`
CREATE TRIGGER sponsors_sync_trigger
AFTER INSERT OR UPDATE ON sponsors
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnSponsorsDelete = sql`
CREATE TRIGGER sponsors_delete_trigger
AFTER DELETE ON sponsors
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on governors table
 */
export const triggerOnGovernorsInsertUpdate = sql`
CREATE TRIGGER governors_sync_trigger
AFTER INSERT OR UPDATE ON governors
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnGovernorsDelete = sql`
CREATE TRIGGER governors_delete_trigger
AFTER DELETE ON governors
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on bills table
 * Includes array field change detection
 */
export const triggerOnBillsInsertUpdate = sql`
CREATE TRIGGER bills_sync_trigger
AFTER INSERT OR UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnBillsArrayFieldChange = sql`
CREATE TRIGGER bills_array_field_trigger
AFTER UPDATE ON bills
FOR EACH ROW
EXECUTE FUNCTION on_array_field_change();
`;

export const triggerOnBillsDelete = sql`
CREATE TRIGGER bills_delete_trigger
AFTER DELETE ON bills
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on committees table
 */
export const triggerOnCommitteesInsertUpdate = sql`
CREATE TRIGGER committees_sync_trigger
AFTER INSERT OR UPDATE ON committees
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnCommitteesDelete = sql`
CREATE TRIGGER committees_delete_trigger
AFTER DELETE ON committees
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on arguments table
 * Includes array field change detection for supporting/contradicting arguments
 */
export const triggerOnArgumentsInsertUpdate = sql`
CREATE TRIGGER arguments_sync_trigger
AFTER INSERT OR UPDATE ON arguments
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnArgumentsArrayFieldChange = sql`
CREATE TRIGGER arguments_array_field_trigger
AFTER UPDATE ON arguments
FOR EACH ROW
EXECUTE FUNCTION on_array_field_change();
`;

export const triggerOnArgumentsDelete = sql`
CREATE TRIGGER arguments_delete_trigger
AFTER DELETE ON arguments
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on claims table
 * Includes array field change detection for supporting/contradicting arguments
 */
export const triggerOnClaimsInsertUpdate = sql`
CREATE TRIGGER claims_sync_trigger
AFTER INSERT OR UPDATE ON claims
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnClaimsArrayFieldChange = sql`
CREATE TRIGGER claims_array_field_trigger
AFTER UPDATE ON claims
FOR EACH ROW
EXECUTE FUNCTION on_array_field_change();
`;

export const triggerOnClaimsDelete = sql`
CREATE TRIGGER claims_delete_trigger
AFTER DELETE ON claims
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on parliamentary_sessions table
 */
export const triggerOnParliamentarySessionsInsertUpdate = sql`
CREATE TRIGGER parliamentary_sessions_sync_trigger
AFTER INSERT OR UPDATE ON parliamentary_sessions
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnParliamentarySessionsDelete = sql`
CREATE TRIGGER parliamentary_sessions_delete_trigger
AFTER DELETE ON parliamentary_sessions
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

/**
 * Trigger on parliamentary_sittings table
 * Includes array field change detection for bills_discussed
 */
export const triggerOnParliamentarySittingsInsertUpdate = sql`
CREATE TRIGGER parliamentary_sittings_sync_trigger
AFTER INSERT OR UPDATE ON parliamentary_sittings
FOR EACH ROW
EXECUTE FUNCTION on_entity_change();
`;

export const triggerOnParliamentarySittingsArrayFieldChange = sql`
CREATE TRIGGER parliamentary_sittings_array_field_trigger
AFTER UPDATE ON parliamentary_sittings
FOR EACH ROW
EXECUTE FUNCTION on_array_field_change();
`;

export const triggerOnParliamentarySittingsDelete = sql`
CREATE TRIGGER parliamentary_sittings_delete_trigger
AFTER DELETE ON parliamentary_sittings
FOR EACH ROW
EXECUTE FUNCTION on_entity_delete();
`;

// ============================================================================
// TRIGGER INITIALIZATION
// ============================================================================

/**
 * Initialize all sync triggers
 * Call this during application startup or schema migration
 */
export const initializeSyncTriggers = async (db: any) => {
  const triggersList = [
    // Trigger functions
    onEntityChangeTriggerFunction,
    onArrayFieldChangeTriggerFunction,
    onEntityDeleteTriggerFunction,

    // Users triggers
    triggerOnUsersInsertUpdate,
    triggerOnUsersDelete,

    // Sponsors triggers
    triggerOnSponsorsInsertUpdate,
    triggerOnSponsorsDelete,

    // Governors triggers
    triggerOnGovernorsInsertUpdate,
    triggerOnGovernorsDelete,

    // Bills triggers
    triggerOnBillsInsertUpdate,
    triggerOnBillsArrayFieldChange,
    triggerOnBillsDelete,

    // Committees triggers
    triggerOnCommitteesInsertUpdate,
    triggerOnCommitteesDelete,

    // Arguments triggers
    triggerOnArgumentsInsertUpdate,
    triggerOnArgumentsArrayFieldChange,
    triggerOnArgumentsDelete,

    // Claims triggers
    triggerOnClaimsInsertUpdate,
    triggerOnClaimsArrayFieldChange,
    triggerOnClaimsDelete,

    // Parliamentary sessions triggers
    triggerOnParliamentarySessionsInsertUpdate,
    triggerOnParliamentarySessionsDelete,

    // Parliamentary sittings triggers
    triggerOnParliamentarySittingsInsertUpdate,
    triggerOnParliamentarySittingsArrayFieldChange,
    triggerOnParliamentarySittingsDelete,
  ];

  for (const trigger of triggersList) {
    try {
      await db.execute(trigger);
    } catch (error: any) {
      // Ignore "already exists" errors, log others
      if (!error.message?.includes('already exists')) {
        console.error(`Error initializing trigger: ${error.message}`);
      }
    }
  }

  console.log(`✅ Initialized ${triggersList.length} sync triggers`);
};

/**
 * Drop all sync triggers (for cleanup/testing)
 */
export const dropSyncTriggers = async (db: any) => {
  const triggers = [
    'users_sync_trigger', 'users_delete_trigger',
    'sponsors_sync_trigger', 'sponsors_delete_trigger',
    'governors_sync_trigger', 'governors_delete_trigger',
    'bills_sync_trigger', 'bills_array_field_trigger', 'bills_delete_trigger',
    'committees_sync_trigger', 'committees_delete_trigger',
    'arguments_sync_trigger', 'arguments_array_field_trigger', 'arguments_delete_trigger',
    'claims_sync_trigger', 'claims_array_field_trigger', 'claims_delete_trigger',
    'parliamentary_sessions_sync_trigger', 'parliamentary_sessions_delete_trigger',
    'parliamentary_sittings_sync_trigger', 'parliamentary_sittings_array_field_trigger', 'parliamentary_sittings_delete_trigger',
  ];

  for (const trigger of triggers) {
    try {
      await db.execute(sql`DROP TRIGGER IF EXISTS ${sql.identifier(trigger)} ON ${sql.raw('users, sponsors, governors, bills, committees, arguments, claims, parliamentary_sessions, parliamentary_sittings')}`);
    } catch (error) {
      // Silently ignore errors
    }
  }

  console.log(`✅ Dropped ${triggers.length} sync triggers`);
};
