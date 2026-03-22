/**
 * Core Graph Schema Definitions
 *
 * Handles Neo4j database schema initialization, validation, and statistics.
 * Implements idempotent constraint/index creation with comprehensive error handling.
 *
 * @module graph-schema
 */

import { Driver, Record as Neo4jRecord } from 'neo4j-driver';

import { logger } from '../../../observability';
import { executeCypherSafely } from '../utils/session-manager';

/**
 * Schema element definition for constraints and indexes
 */
interface SchemaElement {
  readonly query: string;
  readonly description: string;
}

/**
 * Database statistics result
 */
export interface DatabaseStats {
  nodes: Record<string, number>;
  relationships: Record<string, number>;
  totalNodes: number;
  totalRelationships: number;
}

/**
 * Schema verification result
 */
export interface SchemaVerification {
  constraints: number;
  indexes: number;
  valid: boolean;
  expectedConstraints: number;
  expectedIndexes: number;
}

/**
 * Constraint definitions with clear descriptions
 */
const CONSTRAINTS: readonly SchemaElement[] = [
  {
    query: 'CREATE CONSTRAINT unique_person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
    description: 'Person ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
    description: 'User ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
    description: 'User email uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_governor_id IF NOT EXISTS FOR (g:Governor) REQUIRE g.id IS UNIQUE',
    description: 'Governor ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
    description: 'Organization ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_bill_id IF NOT EXISTS FOR (b:Bill) REQUIRE b.id IS UNIQUE',
    description: 'Bill ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_bill_number IF NOT EXISTS FOR (b:Bill) REQUIRE b.bill_number IS UNIQUE',
    description: 'Bill number uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_committee_id IF NOT EXISTS FOR (c:Committee) REQUIRE c.id IS UNIQUE',
    description: 'Committee ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE',
    description: 'Topic ID uniqueness'
  },
  {
    query: 'CREATE CONSTRAINT unique_argument_id IF NOT EXISTS FOR (a:Argument) REQUIRE a.id IS UNIQUE',
    description: 'Argument ID uniqueness'
  }
] as const;

/**
 * Index definitions for query optimization
 */
const INDEXES: readonly SchemaElement[] = [
  {
    query: 'CREATE INDEX person_name_idx IF NOT EXISTS FOR (p:Person) ON (p.name)',
    description: 'Person name lookup'
  },
  {
    query: 'CREATE INDEX user_email_idx IF NOT EXISTS FOR (u:User) ON (u.email)',
    description: 'User email lookup'
  },
  {
    query: 'CREATE INDEX bill_status_idx IF NOT EXISTS FOR (b:Bill) ON (b.status)',
    description: 'Bill status filtering'
  },
  {
    query: 'CREATE INDEX bill_chamber_idx IF NOT EXISTS FOR (b:Bill) ON (b.chamber)',
    description: 'Bill chamber filtering'
  }
] as const;

/**
 * Creates a single schema element (constraint or index)
 *
 * @param driver - Neo4j driver instance
 * @param element - Schema element to create
 * @param type - Type of schema element for logging
 * @returns Promise resolving to success status
 */
async function createSchemaElement(
  driver: Driver,
  element: SchemaElement,
  type: 'constraint' | 'index'
): Promise<boolean> {
  try {
    await executeCypherSafely(driver, element.query, {});
    logger.debug({ description: element.description }, `Created ${type}`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Distinguish between "already exists" and actual errors
    if (errorMessage.toLowerCase().includes('already exists') ||
        errorMessage.toLowerCase().includes('equivalent')) {
      logger.debug({ description: element.description }, `${type} already exists`);
      return true;
    }

    logger.error({
      description: element.description,
      error: errorMessage
    }, `Failed to create ${type}`);
    return false;
  }
}

/**
 * Creates all database constraints idempotently
 *
 * @param driver - Neo4j driver instance
 * @returns Promise resolving to count of successfully created/verified constraints
 */
export async function createConstraints(driver: Driver): Promise<number> {
  logger.info({ component: 'server' }, 'Creating database constraints...');

  let successCount = 0;
  const results = await Promise.allSettled(
    CONSTRAINTS.map(constraint => createSchemaElement(driver, constraint, 'constraint'))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      successCount++;
    } else if (result.status === 'rejected') {
      logger.error({
        description: CONSTRAINTS[index]?.description ?? 'Unknown constraint',
        error: result.reason
      }, 'Constraint creation failed unexpectedly');
    }
  });

  logger.info({
    total: CONSTRAINTS.length,
    successful: successCount,
    failed: CONSTRAINTS.length - successCount
  }, 'Constraints creation completed');

  return successCount;
}

/**
 * Creates all database indexes idempotently
 *
 * @param driver - Neo4j driver instance
 * @returns Promise resolving to count of successfully created/verified indexes
 */
export async function createIndexes(driver: Driver): Promise<number> {
  logger.info({ component: 'server' }, 'Creating database indexes...');

  let successCount = 0;
  const results = await Promise.allSettled(
    INDEXES.map(index => createSchemaElement(driver, index, 'index'))
  );

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      successCount++;
    } else if (result.status === 'rejected') {
      logger.error({
        description: INDEXES[index]?.description ?? 'Unknown index',
        error: result.reason
      }, 'Index creation failed unexpectedly');
    }
  });

  logger.info({
    total: INDEXES.length,
    successful: successCount,
    failed: INDEXES.length - successCount
  }, 'Indexes creation completed');

  return successCount;
}

/**
 * Initializes the complete graph schema (constraints and indexes)
 *
 * @param driver - Neo4j driver instance
 * @throws Error if schema initialization fails critically
 */
export async function initializeGraphSchema(driver: Driver): Promise<void> {
  logger.info({ component: 'server' }, 'Initializing Neo4j graph schema...');

  const startTime = Date.now();

  try {
    const [constraintCount, indexCount] = await Promise.all([
      createConstraints(driver),
      createIndexes(driver)
    ]);

    const duration = Date.now() - startTime;

    logger.info({
      constraints: constraintCount,
      indexes: indexCount,
      durationMs: duration
    }, 'Graph schema initialization complete');

    // Warn if not all elements were created
    if (constraintCount < CONSTRAINTS.length || indexCount < INDEXES.length) {
      logger.warn({
        expectedConstraints: CONSTRAINTS.length,
        actualConstraints: constraintCount,
        expectedIndexes: INDEXES.length,
        actualIndexes: indexCount
      }, 'Schema initialization incomplete');
    }
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime
    }, 'Schema initialization failed');
    throw error;
  }
}

/**
 * Verifies the graph schema is properly configured
 *
 * @param driver - Neo4j driver instance
 * @returns Promise resolving to verification results
 */
export async function verifyGraphSchema(driver: Driver): Promise<SchemaVerification> {
  try {
    logger.debug({ component: 'server' }, 'Verifying graph schema...');

    const [constraintResult, indexResult] = await Promise.all([
      executeCypherSafely(
        driver,
        'SHOW CONSTRAINTS YIELD name RETURN count(*) as count',
        {},
        { mode: 'READ' }
      ),
      executeCypherSafely(
        driver,
        'SHOW INDEXES YIELD name RETURN count(*) as count',
        {},
        { mode: 'READ' }
      )
    ]);

    const constraints = Number(constraintResult.records[0]?.get('count')) || 0;
    const indexes = Number(indexResult.records[0]?.get('count')) || 0;

    const expectedConstraints = CONSTRAINTS.length;
    const expectedIndexes = INDEXES.length;

    // Schema is valid if we have at least the expected number of constraints and indexes
    const valid = constraints >= expectedConstraints && indexes >= expectedIndexes;

    logger.debug({
      constraints,
      indexes,
      expectedConstraints,
      expectedIndexes,
      valid
    }, 'Schema verification complete');

    return {
      constraints,
      indexes,
      valid,
      expectedConstraints,
      expectedIndexes
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Schema verification failed');

    return {
      constraints: 0,
      indexes: 0,
      valid: false,
      expectedConstraints: CONSTRAINTS.length,
      expectedIndexes: INDEXES.length
    };
  }
}

/**
 * Retrieves comprehensive database statistics
 *
 * @param driver - Neo4j driver instance
 * @returns Promise resolving to database statistics
 */
export async function getDatabaseStats(driver: Driver): Promise<DatabaseStats> {
  try {
    logger.debug({ component: 'server' }, 'Retrieving database statistics...');

    const [nodeResult, relResult] = await Promise.all([
      executeCypherSafely(
        driver,
        'MATCH (n) RETURN head(labels(n)) as label, count(*) as count',
        {},
        { mode: 'READ' }
      ),
      executeCypherSafely(
        driver,
        'MATCH ()-[r]->() RETURN type(r) as type, count(*) as count',
        {},
        { mode: 'READ' }
      )
    ]);

    const nodes: Record<string, number> = {};
    const relationships: Record<string, number> = {};
    let totalNodes = 0;
    let totalRelationships = 0;

    nodeResult.records.forEach((record: Neo4jRecord) => {
      const label = record.get('label') as string;
      const count = Number(record.get('count'));

      if (label) {
        nodes[label] = count;
        totalNodes += count;
      }
    });

    relResult.records.forEach((record: Neo4jRecord) => {
      const type = record.get('type') as string;
      const count = Number(record.get('count'));

      if (type) {
        relationships[type] = count;
        totalRelationships += count;
      }
    });

    logger.debug({
      totalNodes,
      totalRelationships,
      nodeLabels: Object.keys(nodes).length,
      relationshipTypes: Object.keys(relationships).length
    }, 'Database statistics retrieved');

    return { nodes, relationships, totalNodes, totalRelationships };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to retrieve database statistics');

    return {
      nodes: {},
      relationships: {},
      totalNodes: 0,
      totalRelationships: 0
    };
  }
}

/**
 * Drops all constraints and indexes (use with caution!)
 *
 * @param driver - Neo4j driver instance
 * @returns Promise resolving when schema is cleared
 */
export async function clearGraphSchema(driver: Driver): Promise<void> {
  logger.warn({ component: 'server' }, 'Clearing graph schema - this will drop all constraints and indexes');

  try {
    // Get all constraints and indexes
    const constraintsResult = await executeCypherSafely(
      driver,
      'SHOW CONSTRAINTS YIELD name RETURN name',
      {},
      { mode: 'READ' }
    );

    const indexesResult = await executeCypherSafely(
      driver,
      'SHOW INDEXES YIELD name WHERE name IS NOT NULL RETURN name',
      {},
      { mode: 'READ' }
    );

    // Drop all constraints
    for (const record of constraintsResult.records) {
      const name = record.get('name') as string;
      await executeCypherSafely(driver, `DROP CONSTRAINT ${name} IF EXISTS`, {});
      logger.debug({ name }, 'Dropped constraint');
    }

    // Drop all indexes
    for (const record of indexesResult.records) {
      const name = record.get('name') as string;
      await executeCypherSafely(driver, `DROP INDEX ${name} IF EXISTS`, {});
      logger.debug({ name }, 'Dropped index');
    }

    logger.info({ component: 'server' }, 'Graph schema cleared successfully');
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error)
    }, 'Failed to clear graph schema');
    throw error;
  }
}
