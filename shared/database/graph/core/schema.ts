/**
 * Core Graph Schema Definitions (REFACTORED)
 * IMPROVEMENTS: Better error handling, logging, validation
 */
import { Driver } from 'neo4j-driver';
import { executeCypherSafely } from '../utils/session-manager';
import { logger } from '@/core/observability';

export async function createConstraints(driver: Driver): Promise<void> {
  const constraints = [
    'CREATE CONSTRAINT unique_person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.id IS UNIQUE',
    'CREATE CONSTRAINT unique_user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE',
    'CREATE CONSTRAINT unique_user_email IF NOT EXISTS FOR (u:User) REQUIRE u.email IS UNIQUE',
    'CREATE CONSTRAINT unique_governor_id IF NOT EXISTS FOR (g:Governor) REQUIRE g.id IS UNIQUE',
    'CREATE CONSTRAINT unique_org_id IF NOT EXISTS FOR (o:Organization) REQUIRE o.id IS UNIQUE',
    'CREATE CONSTRAINT unique_bill_id IF NOT EXISTS FOR (b:Bill) REQUIRE b.id IS UNIQUE',
    'CREATE CONSTRAINT unique_bill_number IF NOT EXISTS FOR (b:Bill) REQUIRE b.bill_number IS UNIQUE',
    'CREATE CONSTRAINT unique_committee_id IF NOT EXISTS FOR (c:Committee) REQUIRE c.id IS UNIQUE',
    'CREATE CONSTRAINT unique_topic_id IF NOT EXISTS FOR (t:Topic) REQUIRE t.id IS UNIQUE',
    'CREATE CONSTRAINT unique_argument_id IF NOT EXISTS FOR (a:Argument) REQUIRE a.id IS UNIQUE',
  ];

  for (const constraint of constraints) {
    try {
      await executeCypherSafely(driver, constraint, {});
      logger.debug('Created constraint', { constraint: constraint.substring(0, 50) });
    } catch (error) {
      logger.warn('Constraint creation skipped (may already exist)', { error: error.message });
    }
  }
  logger.info('Constraints creation completed');
}

export async function createIndexes(driver: Driver): Promise<void> {
  const indexes = [
    'CREATE INDEX person_name_idx IF NOT EXISTS FOR (p:Person) ON (p.name)',
    'CREATE INDEX user_email_idx IF NOT EXISTS FOR (u:User) ON (u.email)',
    'CREATE INDEX bill_status_idx IF NOT EXISTS FOR (b:Bill) ON (b.status)',
    'CREATE INDEX bill_chamber_idx IF NOT EXISTS FOR (b:Bill) ON (b.chamber)',
  ];

  for (const index of indexes) {
    try {
      await executeCypherSafely(driver, index, {});
      logger.debug('Created index', { index: index.substring(0, 50) });
    } catch (error) {
      logger.warn('Index creation skipped (may already exist)', { error: error.message });
    }
  }
  logger.info('Indexes creation completed');
}

export async function initializeGraphSchema(driver: Driver): Promise<void> {
  logger.info('Initializing Neo4j schema...');
  await createConstraints(driver);
  await createIndexes(driver);
  logger.info('Graph schema initialization complete');
}

export async function verifyGraphSchema(driver: Driver): Promise<{ constraints: number; indexes: number; valid: boolean }> {
  try {
    const constraintResult = await executeCypherSafely(driver, 'SHOW CONSTRAINTS YIELD name RETURN count(*) as count', {}, { mode: 'READ' });
    const indexResult = await executeCypherSafely(driver, 'SHOW INDEXES YIELD name RETURN count(*) as count', {}, { mode: 'READ' });

    const constraints = Number(constraintResult.records[0]?.get('count')) || 0;
    const indexes = Number(indexResult.records[0]?.get('count')) || 0;

    return { constraints, indexes, valid: constraints > 0 && indexes > 0 };
  } catch (error) {
    logger.error('Failed to verify schema', { error: error.message });
    return { constraints: 0, indexes: 0, valid: false };
  }
}

export async function getDatabaseStats(driver: Driver): Promise<{ nodes: Record<string, number>; relationships: Record<string, number> }> {
  try {
    const nodeResult = await executeCypherSafely(
      driver,
      'MATCH (n) RETURN head(labels(n)) as label, count(*) as count',
      {},
      { mode: 'READ' }
    );

    const relResult = await executeCypherSafely(
      driver,
      'MATCH ()-[r]->() RETURN type(r) as type, count(*) as count',
      {},
      { mode: 'READ' }
    );

    const nodes: Record<string, number> = {};
    const relationships: Record<string, number> = {};

    nodeResult.records.forEach(r => {
      nodes[r.get('label')] = Number(r.get('count'));
    });

    relResult.records.forEach(r => {
      relationships[r.get('type')] = Number(r.get('count'));
    });

    return { nodes, relationships };
  } catch (error) {
    logger.error('Failed to get database stats', { error: error.message });
    return { nodes: {}, relationships: {} };
  }
}
