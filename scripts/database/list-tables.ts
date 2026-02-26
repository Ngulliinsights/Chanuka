#!/usr/bin/env tsx
/**
 * List all tables currently in the database
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '@server/infrastructure/database/pool';
import { sql } from 'drizzle-orm';

async function listTables() {
  try {
    console.log('📋 Querying database for all tables...\n');

    const result = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        tableowner
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename;
    `);

    const tables = result.rows as Array<{ schemaname: string; tablename: string; tableowner: string }>;

    console.log(`Found ${tables.length} tables in the database:\n`);
    console.log('─'.repeat(80));
    
    // Group tables by domain/prefix
    const grouped: Record<string, string[]> = {};
    
    tables.forEach((table) => {
      const name = table.tablename;
      
      // Determine domain
      let domain = 'Other';
      if (name.includes('bill')) domain = 'Bills & Foundation';
      else if (name.includes('user') || name.includes('profile')) domain = 'Users & Auth';
      else if (name.includes('comment') || name.includes('engagement') || name.includes('notification')) domain = 'Citizen Participation';
      else if (name.includes('constitutional') || name.includes('legal') || name.includes('analysis')) domain = 'Constitutional Intelligence';
      else if (name.includes('argument') || name.includes('claim') || name.includes('evidence') || name.includes('brief')) domain = 'Argument Intelligence';
      else if (name.includes('campaign') || name.includes('action') || name.includes('advocacy')) domain = 'Advocacy Coordination';
      else if (name.includes('ambassador') || name.includes('facilitation') || name.includes('offline') || name.includes('ussd')) domain = 'Universal Access';
      else if (name.includes('trojan') || name.includes('hidden_provision') || name.includes('detection')) domain = 'Trojan Bill Detection';
      else if (name.includes('sponsor') || name.includes('committee') || name.includes('parliamentary')) domain = 'Parliamentary Process';
      else if (name.includes('expert') || name.includes('credential') || name.includes('verification')) domain = 'Expert Verification';
      else if (name.includes('transparency') || name.includes('financial') || name.includes('lobbying')) domain = 'Transparency';
      
      if (!grouped[domain]) grouped[domain] = [];
      grouped[domain].push(name);
    });

    // Print grouped tables
    Object.keys(grouped).sort().forEach(domain => {
      console.log(`\n${domain}:`);
      grouped[domain].forEach(table => {
        console.log(`  • ${table}`);
      });
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`\nTotal: ${tables.length} tables`);
    
    // Check for specific tables we're interested in
    console.log('\n' + '─'.repeat(80));
    console.log('\nKey Tables Status:');
    console.log('─'.repeat(80));
    
    const keyTables = [
      'users',
      'bills',
      'comments',
      'arguments',
      'campaigns',
      'ambassadors',
      'trojan_bill_analysis',
      'hidden_provisions',
      'constitutional_analyses',
      'legislative_briefs',
    ];
    
    keyTables.forEach(tableName => {
      const exists = tables.some(t => t.tablename === tableName);
      console.log(`  ${exists ? '✓' : '✗'} ${tableName}`);
    });
    
    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing tables:', error);
    process.exit(1);
  }
}

listTables();
