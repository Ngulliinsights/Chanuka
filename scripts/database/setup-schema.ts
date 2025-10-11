import * as dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import { logger } from '../utils/logger';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

async function setupSchema() {
  logger.info('🔧 Setting up database schema...', { component: 'SimpleTool' });

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create all required tables with IF NOT EXISTS
    logger.info('📋 Creating tables...', { component: 'SimpleTool' });

    // Users table (might already exist)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'citizen',
        verification_status TEXT NOT NULL DEFAULT 'pending',
        preferences JSONB,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // User profiles table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        bio TEXT,
        expertise TEXT[],
        location TEXT,
        organization TEXT,
        verification_documents JSONB,
        reputation_score INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Bills table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        summary TEXT,
        status TEXT NOT NULL DEFAULT 'introduced',
        bill_number TEXT,
        sponsor_id UUID,
        category TEXT,
        tags TEXT[],
        view_count INTEGER DEFAULT 0,
        share_count INTEGER DEFAULT 0,
        complexity_score INTEGER,
        constitutional_concerns JSONB,
        stakeholder_analysis JSONB,
        introduced_date TIMESTAMP WITH TIME ZONE,
        last_action_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Bill comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_comments (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL,
        user_id UUID NOT NULL,
        content TEXT NOT NULL,
        comment_type TEXT NOT NULL DEFAULT 'general',
        is_verified BOOLEAN DEFAULT false,
        parent_comment_id INTEGER,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Bill engagement table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_engagement (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL,
        user_id UUID NOT NULL,
        view_count INTEGER DEFAULT 0,
        comment_count INTEGER DEFAULT 0,
        share_count INTEGER DEFAULT 0,
        engagement_score NUMERIC(10, 2) DEFAULT 0,
        last_engaged TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        related_bill_id INTEGER,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Analysis table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS analysis (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL,
        analysis_type TEXT NOT NULL,
        results JSONB,
        confidence NUMERIC(5, 4),
        model_version TEXT,
        is_approved BOOLEAN DEFAULT false,
        approved_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Sponsors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsors (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        party TEXT,
        constituency TEXT,
        email TEXT,
        phone TEXT,
        bio TEXT,
        photo_url TEXT,
        conflict_level TEXT,
        financial_exposure NUMERIC(12, 2),
        voting_alignment NUMERIC(5, 2),
        transparency_score NUMERIC(5, 2),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Sponsor affiliations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsor_affiliations (
        id SERIAL PRIMARY KEY,
        sponsor_id INTEGER NOT NULL,
        organization TEXT NOT NULL,
        role TEXT,
        type TEXT NOT NULL,
        conflict_type TEXT,
        start_date TIMESTAMP WITH TIME ZONE,
        end_date TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Bill sponsorships table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_sponsorships (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL,
        sponsor_id INTEGER NOT NULL,
        sponsorship_type TEXT NOT NULL,
        sponsorship_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `);

    // Sponsor transparency table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sponsor_transparency (
        id SERIAL PRIMARY KEY,
        sponsor_id INTEGER NOT NULL,
        disclosure_type TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12, 2),
        source TEXT,
        date_reported TIMESTAMP WITH TIME ZONE,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Bill section conflicts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS bill_section_conflicts (
        id SERIAL PRIMARY KEY,
        bill_id INTEGER NOT NULL,
        section_number TEXT NOT NULL,
        section_title TEXT,
        conflict_level TEXT,
        description TEXT NOT NULL,
        affected_sponsors INTEGER[],
        analysis_data JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    logger.info('✅ Database schema setup completed successfully!', { component: 'SimpleTool' });
  } catch (error) {
    logger.error('💥 Schema setup failed:', { component: 'SimpleTool' }, error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

setupSchema()
  .then(() => {
    logger.info('Schema setup process completed', { component: 'SimpleTool' });
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Schema setup process failed:', { component: 'SimpleTool' }, error);
    process.exit(1);
  });






