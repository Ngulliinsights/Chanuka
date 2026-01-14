#!/usr/bin/env tsx
/**
 * Database Alignment Verification Report
 * 
 * Checks:
 * 1. Total tables created
 * 2. MVP foundation tables present
 * 3. Phase 2 feature tables present
 * 4. Triggers and functions created
 * 5. Indexes created
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyAlignment() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  try {
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    console.log('🔍 DATABASE ALIGNMENT VERIFICATION REPORT');
    console.log('═══════════════════════════════════════════════');

    // 1. Total tables
    console.log('\n1️⃣  TOTAL TABLES');
    const tableCount = await client`
      SELECT COUNT(*) as count FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const totalTables = tableCount[0].count;
    console.log(`   Total: ${totalTables} tables`);

    // 2. List all tables
    console.log('\n2️⃣  TABLE INVENTORY');
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`   Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   ✓ ${t.table_name}`));

    // 3. MVP Foundation tables
    console.log('\n3️⃣  MVP FOUNDATION TABLES (Expected: 9)');
    const mvpTables = ['users', 'sessions', 'bills', 'sponsors', 'comments', 'bill_engagement', 'user_profiles', 'notifications', 'bill_sponsorships'];
    const foundMVP = tables.filter(t => mvpTables.includes(t.table_name));
    console.log(`   Found: ${foundMVP.length}/${mvpTables.length}`);
    mvpTables.forEach(tbl => {
      const found = tables.find(t => t.table_name === tbl);
      console.log(`   ${found ? '✅' : '❌'} ${tbl}`);
    });

    // 4. Phase 2 tables (Arguments, Transparency, Constitutional)
    console.log('\n4️⃣  PHASE 2 FEATURE TABLES');
    const phase2Tables = {
      'Arguments': ['arguments', 'claims', 'evidence', 'argument_relationships', 'legislative_briefs', 'synthesis_jobs'],
      'Transparency': ['financial_interests', 'conflict_detections', 'influence_networks', 'stakeholder_positions', 'political_appointments', 'transparency_verification', 'regulatory_capture_indicators'],
      'Constitutional': ['constitutional_provisions', 'legal_precedents', 'constitutional_analyses', 'constitutional_conflicts', 'hidden_provisions', 'implementation_workarounds', 'legal_risks']
    };

    for (const [category, expected] of Object.entries(phase2Tables)) {
      const found = tables.filter(t => expected.includes(t.table_name));
      console.log(`\n   ${category}:`);
      console.log(`      ${found.length}/${expected.length} tables`);
      expected.forEach(tbl => {
        const exists = tables.find(t => t.table_name === tbl);
        console.log(`      ${exists ? '✅' : '❌'} ${tbl}`);
      });
    }

    // 5. Functions/Procedures
    console.log('\n5️⃣  TRIGGERS & FUNCTIONS');
    const functions = await client`
      SELECT routine_name, routine_type 
      FROM information_schema.routines 
      WHERE routine_schema = 'public'
      ORDER BY routine_name
    `;
    console.log(`   Found ${functions.length} functions/procedures`);
    if (functions.length > 0) {
      functions.slice(0, 10).forEach(f => console.log(`   ✓ ${f.routine_name} (${f.routine_type})`));
      if (functions.length > 10) console.log(`   ... and ${functions.length - 10} more`);
    }

    // 6. Indexes
    console.log('\n6️⃣  INDEXES');
    const indexes = await client`
      SELECT schemaname, tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;
    console.log(`   Found ${indexes.length} indexes`);
    const indexByTable: Record<string, number> = {};
    indexes.forEach(idx => {
      indexByTable[idx.tablename] = (indexByTable[idx.tablename] || 0) + 1;
    });
    Object.entries(indexByTable).slice(0, 10).forEach(([tbl, count]) => {
      console.log(`   ✓ ${tbl}: ${count} indexes`);
    });

    // 7. Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('📊 ALIGNMENT SUMMARY');
    console.log('═══════════════════════════════════════════════');
    console.log(`📈 Total Tables: ${totalTables}`);
    console.log(`✅ MVP Tables: ${foundMVP.length}/${mvpTables.length} (${Math.round(foundMVP.length/mvpTables.length*100)}%)`);
    
    const allPhase2Expected = Object.values(phase2Tables).flat();
    const foundPhase2 = tables.filter(t => allPhase2Expected.includes(t.table_name));
    console.log(`✅ Phase 2 Tables: ${foundPhase2.length}/${allPhase2Expected.length} (${Math.round(foundPhase2.length/allPhase2Expected.length*100)}%)`);
    console.log(`⚙️  Functions: ${functions.length}`);
    console.log(`📑 Indexes: ${indexes.length}`);

    if (foundMVP.length === mvpTables.length && foundPhase2.length >= allPhase2Expected.length - 5) {
      console.log('\n🎉 DATABASE ALIGNMENT STATUS: ✅ READY FOR DEVELOPMENT');
    } else {
      console.log('\n⚠️  DATABASE ALIGNMENT STATUS: 🟡 PARTIAL (Check missing tables above)');
    }

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', (error as Error).message);
    process.exit(1);
  }
}

verifyAlignment().catch(err => {
  console.error('Unhandled:', err);
  process.exit(1);
});
