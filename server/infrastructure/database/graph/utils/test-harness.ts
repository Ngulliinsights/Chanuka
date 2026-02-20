/**
 * Test Harness (REFACTORED)
 * IMPROVEMENTS: Fixed session leaks, proper cleanup, error handling
 */
import { Driver, driver as neo4jDriver } from 'neo4j-driver';
import { withSession } from './utils/session-manager';
import { logger } from '@/core/observability';

let testDriver: Driver | null = null;

export async function setupGraphTestEnvironment(): Promise<Driver> {
  testDriver = neo4jDriver.driver(
    process.env.NEO4J_TEST_URI || 'bolt://localhost:7687',
    neo4jDriver.auth.basic(
      process.env.NEO4J_TEST_USER || 'neo4j',
      process.env.NEO4J_TEST_PASSWORD || 'password'
    )
  );
  
  await testDriver.verifyConnectivity();
  logger.info('Test environment setup complete');
  return testDriver;
}

export async function teardownGraphTestEnvironment(): Promise<void> {
  if (!testDriver) return;
  
  try {
    await withSession(testDriver, async (session) => {
      await session.run('MATCH (n) DETACH DELETE n');
    });
    
    await testDriver.close();
    testDriver = null;
    logger.info('Test environment cleaned up');
  } catch (error) {
    logger.error('Test cleanup failed', { error: error.message });
  }
}

export async function createTestData(driver: Driver, data: unknown): Promise<void> {
  await withSession(driver, async (session) => {
    for (const item of data.nodes || []) {
      await session.run(
        `CREATE (n:${item.label} $props)`,
        { props: item.properties }
      );
    }
    
    for (const rel of data.relationships || []) {
      await session.run(
        `MATCH (a {id: $fromId}), (b {id: $toId})
         CREATE (a)-[r:${rel.type}]->(b)`,
        { fromId: rel.from, toId: rel.to }
      );
    }
  });
}

export default {
  setupGraphTestEnvironment,
  teardownGraphTestEnvironment,
  createTestData,
};
