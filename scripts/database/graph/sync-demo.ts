/**
 * Graph Synchronization Test/Demo Script
 *
 * Demonstrates synchronizing data from PostgreSQL to Neo4j,
 * creating relationships, and running basic queries.
 */

import { db } from '../server/infrastructure/database';
import {
  initializeNeo4jDriver,
  closeNeo4jDriver,
  getNeo4jStats,
} from '../shared/database/graph/driver';
import {
  syncPersonToGraph,
  syncBillToGraph,
  syncCommitteeToGraph,
  createSponsorshipRelationship,
  createCommitteeMembershipRelationship,
} from '../shared/database/graph/relationships';

async function syncLegislativeData() {
  console.log('========================================');
  console.log('  Graph Database Synchronization Demo');
  console.log('========================================\n');

  // Initialize Neo4j
  console.log('1. Connecting to Neo4j...');
  initializeNeo4jDriver({
    uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
    username: process.env.NEO4J_USERNAME || 'neo4j',
    password: process.env.NEO4J_PASSWORD || 'password',
  });
  console.log('   ✓ Connected\n');

  try {
    // Fetch sample data from PostgreSQL
    console.log('2. Fetching sample data from PostgreSQL...');

    // Note: These queries would depend on your actual schema
    console.log('   Note: Actual queries depend on your database schema');
    console.log('   This is a template for integration\n');

    // Example: Sync a person
    console.log('3. Syncing sample person to Neo4j...');
    const samplePerson = {
      id: 'person-1',
      name: 'John Doe',
      type: 'mp' as const,
      county: 'Nairobi',
      party: 'Test Party',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const personSynced = await syncPersonToGraph(samplePerson);
    console.log(`   ${personSynced ? '✓' : '✗'} Person synced\n`);

    // Example: Sync a bill
    console.log('4. Syncing sample bill to Neo4j...');
    const sampleBill = {
      id: 'bill-1',
      title: 'Sample Legislation Act, 2025',
      number: 'B001/2025',
      status: 'Second Reading',
      chamber: 'National Assembly',
      sponsor_id: 'person-1',
      introduced_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const billSynced = await syncBillToGraph(sampleBill);
    console.log(`   ${billSynced ? '✓' : '✗'} Bill synced\n`);

    // Example: Create sponsorship relationship
    console.log('5. Creating sponsorship relationship...');
    const sponsorshipCreated = await createSponsorshipRelationship(
      'person-1',
      'bill-1',
      'primary'
    );
    console.log(
      `   ${sponsorshipCreated ? '✓' : '✗'} Sponsorship relationship created\n`
    );

    // Get stats
    console.log('6. Current Neo4j statistics:');
    const stats = await getNeo4jStats();
    console.log(`   Nodes: ${stats.nodeCount}`);
    console.log(`   Relationships: ${stats.relationshipCount}`);
    console.log('');

    console.log('========================================');
    console.log('  ✓ Synchronization Demo Complete');
    console.log('========================================\n');
  } catch (error) {
    console.error('✗ Synchronization failed:', error);
    process.exit(1);
  } finally {
    await closeNeo4jDriver();
  }
}

syncLegislativeData();
