import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from './shared/database/pool.js';
import { logger } from '../utils/logger';

async function dropAndRecreateSchema() {
  try {
    logger.info('DATABASE_URL:', { component: 'SimpleTool' }, process.env.DATABASE_URL);
    logger.info('Testing connection...', { component: 'SimpleTool' });
    await pool.query('SELECT 1');
    logger.info('Connection successful.', { component: 'SimpleTool' });

    logger.info('Dropping and recreating public schema...', { component: 'SimpleTool' });
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    logger.info('Schema dropped and recreated successfully.', { component: 'SimpleTool' });
  } catch (error) {
    logger.error('Error:', { component: 'SimpleTool' }, error);
    process.exit(1);
  }
}

dropAndRecreateSchema();






