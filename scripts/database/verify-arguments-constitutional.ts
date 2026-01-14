#!/usr/bin/env tsx
/**
 * Verify Argument & Constitutional Tables Created
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function verify() {
  const connectionString = process.env.DATABASE_URL;

  try {
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    console.log('✅ ARGUMENT & CONSTITUTIONAL IMPLEMENTATION STATUS\n');

    // Check all tables
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`Total tables: ${tables.length}\n`);

    // Check argument tables
    const argumentTables = [
      'arguments', 'claims', 'evidence', 'argument_relationships', 
      'legislative_briefs', 'synthesis_jobs'
    ];

    console.log('📊 ARGUMENT INTELLIGENCE TABLES:');
    argumentTables.forEach(tbl => {
      const exists = tables.find(t => t.table_name === tbl);
      console.log(`   ${exists ? '✅' : '❌'} ${tbl}`);
    });

    // Check constitutional tables
    const constitutionalTables = [
      'constitutional_provisions', 'legal_precedents', 'constitutional_analyses',
      'constitutional_conflicts', 'hidden_provisions', 'implementation_workarounds',
      'legal_risks'
    ];

    console.log('\n⚖️  CONSTITUTIONAL INTELLIGENCE TABLES:');
    constitutionalTables.forEach(tbl => {
      const exists = tables.find(t => t.table_name === tbl);
      console.log(`   ${exists ? '✅' : '❌'} ${tbl}`);
    });

    // Check views
    const views = await client`
      SELECT table_name FROM information_schema.views 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;

    console.log(`\n📋 VIEWS CREATED: ${views.length}`);
    if (views.length > 0) {
      views.forEach(v => console.log(`   ✓ ${v.table_name}`));
    }

    // Check functions/triggers
    const functions = await client`
      SELECT routine_name FROM information_schema.routines 
      WHERE routine_schema = 'public' AND routine_name LIKE 'update_%'
      ORDER BY routine_name
    `;

    console.log(`\n⚙️  TRIGGERS/FUNCTIONS: ${functions.length}`);
    if (functions.length > 0) {
      functions.forEach(f => console.log(`   ✓ ${f.routine_name}`));
    }

    await client.end();

  } catch (error) {
    console.error('Error:', (error as Error).message);
  }
}

verify().catch(err => console.error('Fatal:', err));
