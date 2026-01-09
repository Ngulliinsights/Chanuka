/**
 * Neo4j Initialization Script
 *
 * Sets up Neo4j database with all required constraints, indexes,
 * and initializes the graph schema for the legislative platform.
 */

import { initializeNeo4jDriver, closeNeo4jDriver } from '../shared/database/graph/driver';
import {
  initializeGraphSchema,
  verifyGraphSchema,
  getDatabaseStats,
} from '../shared/database/graph/schema';

async function main() {
  console.log('========================================');
  console.log('  Neo4j Graph Database Initialization');
  console.log('========================================\n');

  // Get configuration from environment
  const neo4jUri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const neo4jUsername = process.env.NEO4J_USERNAME || 'neo4j';
  const neo4jPassword = process.env.NEO4J_PASSWORD || 'password';

  console.log('Configuration:');
  console.log(`  URI: ${neo4jUri}`);
  console.log(`  Username: ${neo4jUsername}`);
  console.log('');

  try {
    // Initialize driver
    console.log('1. Initializing Neo4j driver...');
    initializeNeo4jDriver({
      uri: neo4jUri,
      username: neo4jUsername,
      password: neo4jPassword,
    });
    console.log('   ✓ Driver initialized\n');

    // Initialize schema
    console.log('2. Initializing graph schema...');
    await initializeGraphSchema();
    console.log('   ✓ Schema initialized\n');

    // Verify schema
    console.log('3. Verifying schema...');
    const schemaStatus = await verifyGraphSchema();
    console.log(`   ✓ Constraints: ${schemaStatus.constraints}`);
    console.log(`   ✓ Indexes: ${schemaStatus.indexes}`);
    console.log(`   ✓ Valid: ${schemaStatus.valid}\n`);

    // Get initial stats
    console.log('4. Initial database statistics:');
    const stats = await getDatabaseStats();
    console.log('   Nodes by type:');
    Object.entries(stats.nodes).forEach(([label, count]) => {
      console.log(`     - ${label}: ${count}`);
    });
    console.log('   Relationships by type:');
    Object.entries(stats.relationships).forEach(([type, count]) => {
      console.log(`     - ${type}: ${count}`);
    });
    console.log('');

    console.log('========================================');
    console.log('  ✓ Graph Database Initialization Complete');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('✗ Initialization failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4jDriver();
  }
}

main();
