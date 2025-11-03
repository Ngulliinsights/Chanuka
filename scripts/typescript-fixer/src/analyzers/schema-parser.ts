import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a parsed schema table with its properties and metadata
 */
export interface SchemaTable {
  name: string;
  tableName: string;
  columns: SchemaColumn[];
  relations: SchemaRelation[];
  indexes: SchemaIndex[];
  enums: SchemaEnum[];
}

/**
 * Represents a column in a schema table
 */
export interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
}

/**
 * Represents a relation between tables
 */
export interface SchemaRelation {
  name: string;
  type: 'one' | 'many';
  targetTable: string;
  foreignKey: string;
}

/**
 * Represents an index definition
 */
export interface SchemaIndex {
  name: string;
  columns: string[];
  unique: boolean;
}

/**
 * Represents an enum definition
 */
export interface SchemaEnum {
  name: string;
  values: string[];
}

/**
 * Parses Drizzle ORM schema files to extract table structures and relationships
 */
export class SchemaDefinitionParser {
  /**
   * Parses a schema file and extracts table definitions
   */
  parseSchemaFile(filePath: string): SchemaTable[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.ts');
    
    return this.parseSchemaContent(content, fileName);
  }

  /**
   * Parses schema content and extracts table definitions
   */
  parseSchemaContent(content: string, fileName: string): SchemaTable[] {
    const tables: SchemaTable[] = [];
    
    // Find all table definitions
    const tableMatches = this.findTableDefinitions(content);
    
    for (const tableMatch of tableMatches) {
      const table = this.parseTableDefinition(tableMatch, fileName);
      if (table) {
        tables.push(table);
      }
    }
    
    return tables;
  }

  /**
   * Finds all table definitions in the content
   */
  private findTableDefinitions(content: string): string[] {
    const tableDefinitions: string[] = [];
    
    // Match Drizzle table definitions
    const tableRegex = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/gs;
    
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      tableDefinitions.push(match[0]);
    }
    
    return tableDefinitions;
  }

  /**
   * Parses a single table definition
   */
  private parseTableDefinition(tableDefinition: string, fileName: string): SchemaTable | null {
    // Extract table name and table string
    const tableMatch = tableDefinition.match(/export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)\s*\(\s*['"`]([^'"`]+)['"`]/);
    
    if (!tableMatch) {
      return null;
    }
    
    const [, constName, tableName] = tableMatch;
    
    // Extract columns
    const columns = this.parseColumns(tableDefinition);
    
    // Extract relations (if any)
    const relations = this.parseRelations(tableDefinition);
    
    // Extract indexes (if any)
    const indexes = this.parseIndexes(tableDefinition);
    
    // Extract enums (if any)
    const enums = this.parseEnums(tableDefinition);
    
    return {
      name: constName,
      tableName,
      columns,
      relations,
      indexes,
      enums,
    };
  }

  /**
   * Parses column definitions from a table
   */
  private parseColumns(tableDefinition: string): SchemaColumn[] {
    const columns: SchemaColumn[] = [];
    
    // Use a more comprehensive regex that handles multiline definitions
    // This regex looks for patterns like: columnName: columnType('param').method().method(),
    const columnRegex = /(\w+):\s*(\w+)\s*\([^)]*\)(?:\s*\.[^,\n}]+)*(?:\s*,|\s*$|\s*\n|\s*})/gm;
    
    let match;
    while ((match = columnRegex.exec(tableDefinition)) !== null) {
      const [fullMatch, columnName, columnType] = match;
      
      const column: SchemaColumn = {
        name: columnName,
        type: columnType,
        nullable: !fullMatch.includes('.notNull()'),
        primaryKey: fullMatch.includes('.primaryKey()'),
        unique: fullMatch.includes('.unique()'),
      };
      
      // Extract default value if present
      const defaultMatch = fullMatch.match(/\.default(?:Now)?\(([^)]*)\)/);
      if (defaultMatch) {
        column.defaultValue = defaultMatch[1] || 'NOW()';
      }
      
      columns.push(column);
    }
    
    return columns;
  }

  /**
   * Parses relation definitions
   */
  private parseRelations(content: string): SchemaRelation[] {
    const relations: SchemaRelation[] = [];
    
    // Look for relations definitions
    const relationRegex = /(\w+):\s*(?:one|many)\s*\(\s*(\w+)\s*,\s*\{[^}]*references:\s*\(\)\s*=>\s*(\w+)\.(\w+)[^}]*\}/g;
    
    let match;
    while ((match = relationRegex.exec(content)) !== null) {
      const [, relationName, targetTable, , foreignKey] = match;
      
      relations.push({
        name: relationName,
        type: content.includes(`${relationName}: one(`) ? 'one' : 'many',
        targetTable,
        foreignKey,
      });
    }
    
    return relations;
  }

  /**
   * Parses index definitions
   */
  private parseIndexes(content: string): SchemaIndex[] {
    const indexes: SchemaIndex[] = [];
    
    // Look for index definitions
    const indexRegex = /export\s+const\s+(\w+Index)\s*=\s*(?:index|uniqueIndex)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.on\s*\(\s*([^)]+)\s*\)/g;
    
    let match;
    while ((match = indexRegex.exec(content)) !== null) {
      const [, indexName, , columnsStr] = match;
      
      const columns = columnsStr.split(',').map(col => col.trim().replace(/^\w+\./, ''));
      
      indexes.push({
        name: indexName,
        columns,
        unique: content.includes('uniqueIndex'),
      });
    }
    
    return indexes;
  }

  /**
   * Parses enum definitions
   */
  private parseEnums(content: string): SchemaEnum[] {
    const enums: SchemaEnum[] = [];
    
    // Look for enum definitions
    const enumRegex = /export\s+const\s+(\w+)\s*=\s*pgEnum\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*\[([^\]]+)\]/g;
    
    let match;
    while ((match = enumRegex.exec(content)) !== null) {
      const [, enumName, , valuesStr] = match;
      
      const values = valuesStr.split(',').map(val => val.trim().replace(/['"]/g, ''));
      
      enums.push({
        name: enumName,
        values,
      });
    }
    
    return enums;
  }

  /**
   * Extracts all exportable items from a schema file
   */
  extractExportableItems(content: string): string[] {
    const items: string[] = [];
    
    // Extract table constants
    const tableRegex = /export\s+const\s+(\w+)\s*=\s*(?:pgTable|mysqlTable|sqliteTable)/g;
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      items.push(match[1]);
    }
    
    // Extract enum constants
    const enumRegex = /export\s+const\s+(\w+)\s*=\s*pgEnum/g;
    while ((match = enumRegex.exec(content)) !== null) {
      items.push(match[1]);
    }
    
    // Extract type definitions
    const typeRegex = /export\s+type\s+(\w+)/g;
    while ((match = typeRegex.exec(content)) !== null) {
      items.push(match[1]);
    }
    
    // Extract interface definitions
    const interfaceRegex = /export\s+interface\s+(\w+)/g;
    while ((match = interfaceRegex.exec(content)) !== null) {
      items.push(match[1]);
    }
    
    // Extract relation definitions
    const relationRegex = /export\s+const\s+(\w+Relations?)\s*=/g;
    while ((match = relationRegex.exec(content)) !== null) {
      items.push(match[1]);
    }
    
    // Extract index definitions
    const indexRegex = /export\s+const\s+(\w+Index)\s*=/g;
    while ((match = indexRegex.exec(content)) !== null) {
      items.push(match[1]);
    }
    
    return [...new Set(items)];
  }
}