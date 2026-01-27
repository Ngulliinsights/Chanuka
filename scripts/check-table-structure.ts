import { config } from 'dotenv';
config();

import { executeQuery } from '@server/infrastructure/database/pool';
import { logger } from '@shared/core';

async function checkTableStructure() {
  try {
    const result = await executeQuery({
      text: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'security_audit_logs'
        ORDER BY ordinal_position;
      `,
      context: 'check security_audit_logs structure'
    });

    logger.info('Columns in security_audit_logs:', { component: 'Chanuka' });
    result.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default || ''}`);
    });
  } catch (error) {
    logger.error('Error checking table structure:', { component: 'Chanuka' }, error);
  }
}

checkTableStructure();












































