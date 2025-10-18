import * as dotenv from 'dotenv';
dotenv.config();

import { pool } from './shared/database/pool.js';
import { logger } from '../../shared/core/src/utils/logger';

async function dropAndRecreateSchema() {
  try {
    logger.info('DATABASE_URL:', { component: 'Chanuka' }, process.env.DATABASE_URL);
    logger.info('Testing connection...', { component: 'Chanuka' });
    await pool.query('SELECT 1');
    logger.info('Connection successful.', { component: 'Chanuka' });

    logger.info('Dropping and recreating public schema...', { component: 'Chanuka' });
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    logger.info('Schema dropped and recreated successfully.', { component: 'Chanuka' });
  } catch (error) {
    logger.error('Error:', { component: 'Chanuka' }, error);
    process.exit(1);
  }
}

dropAndRecreateSchema();






