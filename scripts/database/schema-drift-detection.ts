#!/usr/bin/env tsx
/**
 * Schema Drift Detection Script
 * Detects differences between code schema and actual database schema
 */

import * as dotenv from 'dotenv';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from "ws";
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '@shared/core/src/observability/logging';

// Load environment variables
dotenv.config();

// Configure WebSocket for Neon serverless
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

interface SchemaDriftResult {
  table: string;
  driftType: 'missing_table' | 'extra_table' | 'missing_column' | 'extra_column' | 'column_type_mismatch' | 'constraint_mismatch' | 'index_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  codeSchema?: any;
  dbSchema?: any;
}

interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  constraints: ConstraintSchema[];
  indexes: IndexSchema[];
}

interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  isPrimaryKey?: boolean;
}

interface ConstraintSchema {
  name: string;
  type: string;
  columns: string[];
  definition?: string;
}

interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
  definition?: string;
}

class SchemaDriftDetector {
  private pool: Pool;
  private codeSchema: Map<string, TableSchema> = new Map();
  private dbSchema: Map<string, TableSchema> = new Map();
  private driftResults: SchemaDriftResult[] = [];

  constructor(private connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async detectSchemaDrift(): Promise<SchemaDriftResult[]> {
    logger.info('🔍 Starting schema drift detection...', { component: 'SchemaDrift' });

    try {
      // Load code schema from Drizzle files
      await this.loadCodeSchema();

      // Load database schema
      await this.loadDatabaseSchema();

      // Compare schemas
      await this.compareSchemas();

      return this.driftResults;
    } catch (error) {
      logger.error('💥 Schema drift detection failed:', { component: 'SchemaDrift' }, error.message);
      throw error;
    } finally {
      await this.pool.end();
    }
  }

  private async loadCodeSchema(): Promise<void> {
    logger.info('📖 Loading code schema from Drizzle files...', { component: 'SchemaDrift' });

    // Import the main schema file
    const schemaPath = path.join(process.cwd(), 'shared/schema/index.ts');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('Schema file not found at shared/schema/index.ts');
    }

    // For now, we'll use a simplified approach to extract table information
    // In a real implementation, this would parse the Drizzle schema definitions
    await this.extractSchemaFromDrizzle();
  }

  private async extractSchemaFromDrizzle(): Promise<void> {
    // This is a simplified implementation
    // In practice, you'd want to use Drizzle's introspection or parse the schema files

    // Get table names from the schema files
    const schemaDir = path.join(process.cwd(), 'shared/schema');
    const schemaFiles = fs.readdirSync(schemaDir).filter(f => f.endsWith('.ts') && f !== 'index.ts');

    for (const file of schemaFiles) {
      try {
        const content = fs.readFileSync(path.join(schemaDir, file), 'utf8');

        // Extract table definitions (simplified regex approach)
        const tableMatches = content.match(/export const (\w+)\s*=\s*pgTable\s*\(/g);
        if (tableMatches) {
          for (const match of tableMatches) {
            const tableName = match.match(/export const (\w+)/)?.[1];
            if (tableName) {
              // Create a basic table schema entry
              this.codeSchema.set(tableName, {
                name: tableName,
                columns: [],
                constraints: [],
                indexes: []
              });
            }
          }
        }
      } catch (error) {
        logger.warn(`Failed to parse schema file ${file}:`, { component: 'SchemaDrift' }, error.message);
      }
    }

    logger.info(`📋 Loaded ${this.codeSchema.size} tables from code schema`, { component: 'SchemaDrift' });
  }

  private async loadDatabaseSchema(): Promise<void> {
    logger.info('🗄️ Loading database schema...', { component: 'SchemaDrift' });

    // Get all tables
    const tablesResult = await this.pool.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    for (const row of tablesResult.rows) {
      const tableName = row.tablename;
      const tableSchema = await this.getTableSchema(tableName);

      this.dbSchema.set(tableName, tableSchema);
    }

    logger.info(`📋 Loaded ${this.dbSchema.size} tables from database`, { component: 'SchemaDrift' });
  }

  private async getTableSchema(tableName: string): Promise<TableSchema> {
    const schema: TableSchema = {
      name: tableName,
      columns: [],
      constraints: [],
      indexes: []
    };

    // Get columns
    const columnsResult = await this.pool.query(`
      SELECT
        column_name,
        data_type,
        is_nullable,
        column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1 AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `, [tableName]);

    schema.columns = columnsResult.rows.map(row => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable === 'YES',
      defaultValue: row.column_default,
      isPrimaryKey: row.is_primary_key
    }));

    // Get constraints
    const constraintsResult = await this.pool.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        array_agg(ku.column_name ORDER BY ku.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = 'public'
      GROUP BY tc.constraint_name, tc.constraint_type
      ORDER BY tc.constraint_name
    `, [tableName]);

    schema.constraints = constraintsResult.rows.map(row => ({
      name: row.constraint_name,
      type: row.constraint_type,
      columns: row.columns || []
    }));

    // Get indexes
    const indexesResult = await this.pool.query(`
      SELECT
        indexname,
        indexdef,
        CASE WHEN indisunique THEN true ELSE false END as is_unique
      FROM pg_indexes
      WHERE tablename = $1 AND schemaname = 'public'
      ORDER BY indexname
    `, [tableName]);

    schema.indexes = indexesResult.rows.map(row => ({
      name: row.indexname,
      columns: this.extractColumnsFromIndexDef(row.indexdef),
      unique: row.is_unique,
      definition: row.indexdef
    }));

    return schema;
  }

  private extractColumnsFromIndexDef(indexDef: string): string[] {
    // Extract column names from CREATE INDEX statement
    const match = indexDef.match(/\(([^)]+)\)/);
    if (match) {
      return match[1].split(',').map(col => col.trim().replace(/"/g, ''));
    }
    return [];
  }

  private async compareSchemas(): Promise<void> {
    logger.info('⚖️ Comparing code and database schemas...', { component: 'SchemaDrift' });

    // Check for missing tables in database
    for (const [tableName, codeTable] of this.codeSchema) {
      if (!this.dbSchema.has(tableName)) {
        this.driftResults.push({
          table: tableName,
          driftType: 'missing_table',
          severity: 'critical',
          description: `Table '${tableName}' exists in code schema but not in database`,
          codeSchema: codeTable
        });
      }
    }

    // Check for extra tables in database
    for (const [tableName, dbTable] of this.dbSchema) {
      if (!this.codeSchema.has(tableName)) {
        this.driftResults.push({
          table: tableName,
          driftType: 'extra_table',
          severity: 'medium',
          description: `Table '${tableName}' exists in database but not in code schema`,
          dbSchema: dbTable
        });
      }
    }

    // Compare matching tables
    for (const [tableName, codeTable] of this.codeSchema) {
      const dbTable = this.dbSchema.get(tableName);
      if (dbTable) {
        await this.compareTableSchemas(tableName, codeTable, dbTable);
      }
    }

    logger.info(`🔍 Found ${this.driftResults.length} schema drift issues`, { component: 'SchemaDrift' });
  }

  private async compareTableSchemas(tableName: string, codeTable: TableSchema, dbTable: TableSchema): Promise<void> {
    // Compare columns
    const codeColumns = new Map(codeTable.columns.map(col => [col.name, col]));
    const dbColumns = new Map(dbTable.columns.map(col => [col.name, col]));

    // Missing columns in database
    for (const [colName, codeCol] of codeColumns) {
      if (!dbColumns.has(colName)) {
        this.driftResults.push({
          table: tableName,
          driftType: 'missing_column',
          severity: 'high',
          description: `Column '${colName}' exists in code schema but not in database`,
          codeSchema: codeCol
        });
      }
    }

    // Extra columns in database
    for (const [colName, dbCol] of dbColumns) {
      if (!codeColumns.has(colName)) {
        this.driftResults.push({
          table: tableName,
          driftType: 'extra_column',
          severity: 'medium',
          description: `Column '${colName}' exists in database but not in code schema`,
          dbSchema: dbCol
        });
      }
    }

    // Compare column types for matching columns
    for (const [colName, codeCol] of codeColumns) {
      const dbCol = dbColumns.get(colName);
      if (dbCol) {
        if (codeCol.type !== dbCol.type) {
          this.driftResults.push({
            table: tableName,
            driftType: 'column_type_mismatch',
            severity: 'high',
            description: `Column '${colName}' type mismatch: code=${codeCol.type}, db=${dbCol.type}`,
            codeSchema: codeCol,
            dbSchema: dbCol
          });
        }

        if (codeCol.nullable !== dbCol.nullable) {
          this.driftResults.push({
            table: tableName,
            driftType: 'constraint_mismatch',
            severity: 'medium',
            description: `Column '${colName}' nullability mismatch: code=${codeCol.nullable}, db=${dbCol.nullable}`,
            codeSchema: codeCol,
            dbSchema: dbCol
          });
        }
      }
    }

    // Compare constraints (simplified)
    const codeConstraints = new Set(codeTable.constraints.map(c => `${c.type}:${c.columns.join(',')}`));
    const dbConstraints = new Set(dbTable.constraints.map(c => `${c.type}:${c.columns.join(',')}`));

    // Check for missing constraints
    for (const codeConstraint of codeConstraints) {
      if (!dbConstraints.has(codeConstraint)) {
        this.driftResults.push({
          table: tableName,
          driftType: 'constraint_mismatch',
          severity: 'medium',
          description: `Constraint mismatch: ${codeConstraint} missing in database`
        });
      }
    }

    // Compare indexes (simplified)
    const codeIndexes = new Set(codeTable.indexes.map(i => `${i.columns.join(',')}:${i.unique}`));
    const dbIndexes = new Set(dbTable.indexes.map(i => `${i.columns.join(',')}:${i.unique}`));

    // Check for missing indexes
    for (const codeIndex of codeIndexes) {
      if (!dbIndexes.has(codeIndex)) {
        this.driftResults.push({
          table: tableName,
          driftType: 'index_mismatch',
          severity: 'low',
          description: `Index mismatch: ${codeIndex} missing in database`
        });
      }
    }
  }

  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalDrifts: this.driftResults.length,
        critical: this.driftResults.filter(d => d.severity === 'critical').length,
        high: this.driftResults.filter(d => d.severity === 'high').length,
        medium: this.driftResults.filter(d => d.severity === 'medium').length,
        low: this.driftResults.filter(d => d.severity === 'low').length
      },
      drifts: this.driftResults,
      codeTablesCount: this.codeSchema.size,
      dbTablesCount: this.dbSchema.size
    };

    fs.writeFileSync('schema-drift-report.json', JSON.stringify(report, null, 2));
    logger.info('📊 Schema drift report generated: schema-drift-report.json', { component: 'SchemaDrift' });
  }

  getCriticalDrifts(): SchemaDriftResult[] {
    return this.driftResults.filter(d => d.severity === 'critical' || d.severity === 'high');
  }

  hasBlockingDrifts(): boolean {
    return this.driftResults.some(d => d.severity === 'critical');
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set');
  }

  const detector = new SchemaDriftDetector(process.env.DATABASE_URL);

  try {
    await detector.detectSchemaDrift();
    await detector.generateReport();

    const criticalDrifts = detector.getCriticalDrifts();

    if (detector.hasBlockingDrifts()) {
      console.error('🚨 CRITICAL SCHEMA DRIFT DETECTED!');
      console.error('The following issues must be resolved before migration:');
      criticalDrifts.forEach(drift => {
        console.error(`  - ${drift.table}: ${drift.description}`);
      });
      process.exit(1);
    } else if (criticalDrifts.length > 0) {
      console.warn('⚠️ HIGH PRIORITY SCHEMA DRIFT DETECTED!');
      console.warn('Review the following issues:');
      criticalDrifts.forEach(drift => {
        console.warn(`  - ${drift.table}: ${drift.description}`);
      });
      process.exit(0);
    } else {
      console.log('✅ No critical schema drift detected');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Schema drift detection failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('schema-drift-detection')) {
  main().catch((error) => {
    console.error('Schema drift detection error:', error);
    process.exit(1);
  });
}

export { SchemaDriftDetector, SchemaDriftResult };