#!/usr/bin/env tsx
// ============================================================================
// DATABASE RESET AND MIGRATION SCRIPT
// ============================================================================
// Completely drops all existing tables and applies new domain-driven schema

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { config } from '@server/config/index.js';
import { logger } from '@shared/core/index.js';

const { Pool } = pg;

async function resetAndMigrate() {
  let pool: pg.Pool | undefined;
  
  try {
    // Create connection pool
    const poolConfig = config.database.url 
      ? { connectionString: config.database.url, ssl: config.database.ssl ? { rejectUnauthorized: false } : false }
      : {
          host: config.database.host,
          port: config.database.port,
          user: config.database.user,
          password: config.database.password,
          database: config.database.name,
          ssl: config.database.ssl ? { rejectUnauthorized: false } : false
        };

    pool = new Pool(poolConfig);
    const db = drizzle(pool);

    logger.info('🔄 Starting database reset and migration...');

    // Step 1: Drop all existing tables and extensions
    logger.info('🗑️ Dropping all existing tables...');
    
    await pool.query(`
      -- Drop all tables in the public schema
      DO $$ 
      DECLARE
          r RECORD;
      BEGIN
          -- Drop all tables
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
          LOOP
              EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
          
          -- Drop all sequences
          FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public')
          LOOP
              EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
          END LOOP;
          
          -- Drop all functions
          FOR r IN (SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION')
          LOOP
              EXECUTE 'DROP FUNCTION IF EXISTS ' || quote_ident(r.routine_name) || ' CASCADE';
          END LOOP;
          
          -- Drop all types
          FOR r IN (SELECT typname FROM pg_type WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
          LOOP
              EXECUTE 'DROP TYPE IF EXISTS ' || quote_ident(r.typname) || ' CASCADE';
          END LOOP;
      END $$;
    `);

    logger.info('✅ All existing tables dropped successfully');

    // Step 2: Drop and recreate extensions to ensure clean state
    logger.info('🔄 Resetting extensions...');
    
    await pool.query(`
      DROP EXTENSION IF EXISTS pg_trgm CASCADE;
      DROP EXTENSION IF EXISTS btree_gin CASCADE;
      DROP EXTENSION IF EXISTS unaccent CASCADE;
    `);

    logger.info('✅ Extensions reset successfully');

    // Step 3: Run migrations to create new schema
    logger.info('📦 Running migrations...');
    
    await migrate(db, { migrationsFolder: './drizzle' });
    
    logger.info('✅ Migrations completed successfully');

    // Step 4: Apply the PostgreSQL full-text search enhancements
    logger.info('🔍 Applying full-text search enhancements...');
    
    await pool.query(`
      -- Enable required extensions
      CREATE EXTENSION IF NOT EXISTS pg_trgm;
      CREATE EXTENSION IF NOT EXISTS btree_gin;
      CREATE EXTENSION IF NOT EXISTS unaccent;
      
      -- Create GIN indexes for full-text search optimization
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_fulltext_gin" 
      ON "bills" USING gin(to_tsvector('english', title || ' ' || COALESCE(summary, '') || ' ' || COALESCE(full_text, '')));
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_fulltext_gin" 
      ON "sponsors" USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_comments_fulltext_gin" 
      ON "comments" USING gin(to_tsvector('english', content));
      
      -- Create trigram indexes for fuzzy matching
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_title_trgm" 
      ON "bills" USING gin(title gin_trgm_ops);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_bills_summary_trgm" 
      ON "bills" USING gin(summary gin_trgm_ops);
      
      CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_sponsors_name_trgm" 
      ON "sponsors" USING gin(name gin_trgm_ops);
    `);

    // Step 5: Create search support tables
    logger.info('📊 Creating search support tables...');
    
    await pool.query(`
      -- Create table for storing synonyms and related terms for query expansion
      CREATE TABLE IF NOT EXISTS "search_synonyms" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "term" varchar(255) NOT NULL,
          "synonyms" text[] NOT NULL,
          "category" varchar(100), -- e.g., 'legal', 'political', 'general'
          "weight" numeric(3,2) DEFAULT 1.0, -- Relevance weight for the synonym
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
      );
      
      -- Create table for storing common search patterns and their expansions
      CREATE TABLE IF NOT EXISTS "search_expansions" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "original_query" varchar(500) NOT NULL,
          "expanded_query" text NOT NULL,
          "expansion_type" varchar(50) NOT NULL, -- e.g., 'synonym', 'stemming', 'phrase'
          "success_rate" numeric(5,4) DEFAULT 0.0, -- Track effectiveness
          "usage_count" integer DEFAULT 0,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
      );
      
      -- Create table for tracking search performance and analytics
      CREATE TABLE IF NOT EXISTS "search_analytics" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          "query" varchar(500) NOT NULL,
          "search_type" varchar(50) NOT NULL, -- 'fulltext', 'fuzzy', 'simple'
          "results_count" integer NOT NULL,
          "execution_time_ms" integer NOT NULL,
          "user_id" uuid,
          "session_id" varchar(255),
          "clicked_result_id" uuid,
          "clicked_result_position" integer,
          "search_timestamp" timestamp DEFAULT now() NOT NULL,
          "metadata" jsonb DEFAULT '{}'::jsonb
      );
      
      -- Create indexes for search support tables
      CREATE INDEX IF NOT EXISTS "idx_search_synonyms_term" ON "search_synonyms" ("term");
      CREATE INDEX IF NOT EXISTS "idx_search_synonyms_category" ON "search_synonyms" ("category");
      CREATE INDEX IF NOT EXISTS "idx_search_expansions_query" ON "search_expansions" ("original_query");
      CREATE INDEX IF NOT EXISTS "idx_search_expansions_type" ON "search_expansions" ("expansion_type");
      CREATE INDEX IF NOT EXISTS "idx_search_analytics_query" ON "search_analytics" ("query");
      CREATE INDEX IF NOT EXISTS "idx_search_analytics_timestamp" ON "search_analytics" ("search_timestamp");
      CREATE INDEX IF NOT EXISTS "idx_search_analytics_execution_time" ON "search_analytics" ("execution_time_ms");
      CREATE INDEX IF NOT EXISTS "idx_search_analytics_user" ON "search_analytics" ("user_id");
    `);

    // Step 6: Create query expansion and performance functions
    logger.info('⚙️ Creating search functions...');
    
    await pool.query(`
      -- Function to expand query with synonyms
      CREATE OR REPLACE FUNCTION expand_query_with_synonyms(
          p_query text,
          p_category varchar(100) DEFAULT NULL
      ) RETURNS text AS $$
      DECLARE
          expanded_terms text[] := ARRAY[]::text[];
          query_words text[];
          word text;
          synonyms text[];
          synonym text;
          final_query text;
      BEGIN
          -- Split query into words
          query_words := string_to_array(lower(trim(p_query)), ' ');
          
          -- Process each word
          FOREACH word IN ARRAY query_words
          LOOP
              -- Add original word
              expanded_terms := array_append(expanded_terms, word);
              
              -- Find synonyms
              SELECT s.synonyms INTO synonyms
              FROM search_synonyms s
              WHERE s.term = word
              AND (p_category IS NULL OR s.category = p_category)
              ORDER BY s.weight DESC
              LIMIT 1;
              
              -- Add synonyms with OR operator
              IF synonyms IS NOT NULL THEN
                  FOREACH synonym IN ARRAY synonyms
                  LOOP
                      expanded_terms := array_append(expanded_terms, synonym);
                  END LOOP;
              END IF;
          END LOOP;
          
          -- Join terms with OR for each group, AND between groups
          final_query := array_to_string(expanded_terms, ' | ');
          
          RETURN final_query;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to log search performance
      CREATE OR REPLACE FUNCTION log_search_performance(
          p_query varchar(500),
          p_search_type varchar(50),
          p_results_count integer,
          p_execution_time_ms integer,
          p_user_id uuid DEFAULT NULL,
          p_session_id varchar(255) DEFAULT NULL,
          p_metadata jsonb DEFAULT '{}'::jsonb
      ) RETURNS void AS $$
      BEGIN
          INSERT INTO search_analytics (
              query, search_type, results_count, execution_time_ms, 
              user_id, session_id, metadata
          ) VALUES (
              p_query, p_search_type, p_results_count, p_execution_time_ms,
              p_user_id, p_session_id, p_metadata
          );
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to get search performance statistics
      CREATE OR REPLACE FUNCTION get_search_performance_stats(
          p_hours_back integer DEFAULT 24
      ) RETURNS TABLE (
          search_type varchar(50),
          avg_execution_time_ms numeric,
          p95_execution_time_ms numeric,
          total_searches bigint,
          avg_results_count numeric
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              sa.search_type,
              AVG(sa.execution_time_ms)::numeric AS avg_execution_time_ms,
              PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY sa.execution_time_ms)::numeric AS p95_execution_time_ms,
              COUNT(*)::bigint AS total_searches,
              AVG(sa.results_count)::numeric AS avg_results_count
          FROM search_analytics sa
          WHERE sa.search_timestamp >= NOW() - INTERVAL '1 hour' * p_hours_back
          GROUP BY sa.search_type
          ORDER BY total_searches DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Step 7: Insert initial synonym data for Kenyan context
    logger.info('📝 Inserting initial synonym data...');
    
    await pool.query(`
      INSERT INTO "search_synonyms" ("term", "synonyms", "category", "weight") VALUES
      ('bill', ARRAY['legislation', 'act', 'law', 'statute', 'proposal'], 'legal', 1.0),
      ('parliament', ARRAY['national assembly', 'senate', 'legislature', 'bunge'], 'political', 1.0),
      ('county', ARRAY['devolved unit', 'local government', 'region'], 'political', 0.9),
      ('budget', ARRAY['appropriation', 'allocation', 'funding', 'finance'], 'financial', 1.0),
      ('healthcare', ARRAY['health', 'medical', 'hospital', 'clinic', 'treatment'], 'policy', 1.0),
      ('education', ARRAY['learning', 'school', 'university', 'academic', 'student'], 'policy', 1.0),
      ('agriculture', ARRAY['farming', 'crops', 'livestock', 'rural', 'food security'], 'policy', 1.0),
      ('infrastructure', ARRAY['roads', 'transport', 'construction', 'development'], 'policy', 1.0),
      ('corruption', ARRAY['graft', 'fraud', 'embezzlement', 'misappropriation'], 'governance', 1.0),
      ('transparency', ARRAY['accountability', 'openness', 'disclosure', 'public access'], 'governance', 1.0),
      ('constitution', ARRAY['basic law', 'supreme law', 'fundamental law'], 'legal', 1.0),
      ('mca', ARRAY['member of county assembly', 'ward representative'], 'political', 1.0),
      ('mp', ARRAY['member of parliament', 'representative', 'legislator'], 'political', 1.0),
      ('senator', ARRAY['upper house member', 'county representative'], 'political', 1.0),
      ('governor', ARRAY['county executive', 'county leader'], 'political', 1.0)
      ON CONFLICT DO NOTHING;
    `);

    logger.info('✅ Full-text search enhancements applied successfully');

    // Step 8: Verify the schema
    logger.info('🔍 Verifying schema...');
    
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const indexesResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%fulltext%' OR indexname LIKE '%trgm%'
      ORDER BY indexname;
    `);

    logger.info('📊 Schema verification complete:');
    logger.info(`   Tables created: ${tablesResult.rows.length}`);
    logger.info(`   Full-text indexes: ${indexesResult.rows.length}`);
    
    // Log some key tables
    const keyTables = tablesResult.rows
      .map(row => row.table_name)
      .filter(name => ['bills', 'sponsors', 'comments', 'users', 'search_synonyms', 'search_analytics'].includes(name));
    
    logger.info(`   Key tables: ${keyTables.join(', ')}`);

    logger.info('🎉 Database reset and migration completed successfully!');
    
  } catch (error) {
    logger.error('❌ Database reset and migration failed:', error);
    throw error;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  resetAndMigrate()
    .then(() => {
      logger.info('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { resetAndMigrate };