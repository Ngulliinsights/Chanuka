#!/usr/bin/env tsx
/**
 * Create Missing MVP Foundation Tables
 * Quick fix to ensure all critical MVP tables exist
 */

import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

async function createMissingTables() {
  const connectionString = process.env.DATABASE_URL;

  try {
    const client = postgres(connectionString, {
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    console.log('🏗️  Creating Missing MVP Foundation Tables');
    console.log('═════════════════════════════════════════\n');

    // Critical MVP tables that must exist
    const sqlStatements = [
      // Bills table
      `CREATE TABLE IF NOT EXISTS bills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_number VARCHAR(50) UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'introduced',
        session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
        introduced_by UUID REFERENCES users(id) ON DELETE SET NULL,
        introduced_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Comments table
      `CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        sentiment VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Bill engagement table
      `CREATE TABLE IF NOT EXISTS bill_engagement (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        engagement_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // User profiles table
      `CREATE TABLE IF NOT EXISTS user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        bio TEXT,
        avatar_url VARCHAR(500),
        location VARCHAR(200),
        phone VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        notification_type VARCHAR(50),
        related_bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Bill sponsorships table
      `CREATE TABLE IF NOT EXISTS bill_sponsorships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
        sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'co-sponsor',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Bill tracking preferences
      `CREATE TABLE IF NOT EXISTS bill_tracking_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        track_all_bills BOOLEAN DEFAULT false,
        track_category_bills BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );`,

      // Create indexes for performance
      `CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);`,
      `CREATE INDEX IF NOT EXISTS idx_bills_session ON bills(session_id);`,
      `CREATE INDEX IF NOT EXISTS idx_comments_bill ON comments(bill_id);`,
      `CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);`,
      `CREATE INDEX IF NOT EXISTS idx_bill_engagement_bill ON bill_engagement(bill_id);`,
      `CREATE INDEX IF NOT EXISTS idx_bill_engagement_user ON bill_engagement(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read) WHERE NOT is_read;`,
      `CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_bill ON bill_sponsorships(bill_id);`,
      `CREATE INDEX IF NOT EXISTS idx_bill_sponsorships_sponsor ON bill_sponsorships(sponsor_id);`,
    ];

    let created = 0;
    for (let i = 0; i < sqlStatements.length; i++) {
      try {
        await client.unsafe(sqlStatements[i]);
        const msg = sqlStatements[i].substring(0, 40);
        console.log(`✅ ${msg}...`);
        created++;
      } catch (err) {
        const errMsg = (err as any).message || '';
        if (!errMsg.includes('already exists')) {
          console.log(`⚠️  ${sqlStatements[i].substring(0, 40)}...`);
          console.log(`   ${errMsg.split('\n')[0]}`);
        } else {
          created++;
        }
      }
    }

    console.log(`\n✅ Created/verified ${created}/${sqlStatements.length} components`);

    // Verify
    const tables = await client`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`\n📊 Total tables now: ${tables.length}`);

    const mvpTables = ['bills', 'comments', 'bill_engagement', 'user_profiles', 'notifications', 'bill_sponsorships'];
    const found = tables.filter(t => mvpTables.includes(t.table_name));
    console.log(`✅ MVP tables: ${found.length}/${mvpTables.length}`);
    found.forEach(t => console.log(`   ✓ ${t.table_name}`));

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

createMissingTables().catch(err => {
  console.error('Unhandled:', err);
  process.exit(1);
});
