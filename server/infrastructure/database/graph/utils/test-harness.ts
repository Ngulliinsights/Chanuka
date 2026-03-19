/**
 * Test Harness (REFACTORED)
 * IMPROVEMENTS: Fixed session leaks, proper cleanup, error handling
 */
import neo4j, { Driver } from 'neo4j-driver';
import { withSession } from './session-manager';
import { logger } from '@server/infrastructure/observability';

let testDriver: Driver | null = null;

export async function setupGraphTestEnvironment(): Promise<Driver> {
  const testPassword = process.env.NEO4J_TEST_PASSWORD || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('NEO4J_TEST_PASSWORD required in production');
    }
    return 'neo4j'; // Test environment only
  })();
  
  testDriver = neo4j.driver(
    process.env.NEO4J_TEST_URI || 'bolt://localhost:7687',
    neo4j.auth.basic(
      process.env.NEO4J_TEST_USER || 'neo4j',
      testPassword
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Test cleanup failed');
  }
}

export async function createTestData(driver: Driver, data: { nodes?: any[], relationships?: any[] }): Promise<void> {
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
