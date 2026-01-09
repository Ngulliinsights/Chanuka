// ============================================================================
// SCHEMA VALIDATION - Static AST Analysis (No Runtime Imports)
// ============================================================================
// Validates schema structure without importing modules
// Safe for CI/CD: Does not depend on runtime dependencies
//
// Features:
// - Reads TypeScript files directly
// - Extracts table/enum definitions via regex/parsing
// - Validates relations, audit fields, naming conventions, and consistency
// - Categorizes issues by severity (error vs warning)
// - Exits with non-zero code on validation errors
// - Fast: No compilation or import overhead

/* eslint-disable no-console */

import fs from "fs";
import path from "path";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TableDef {
  name: string;
  varName: string;
  file: string;
  hasAuditFields: boolean;
  hasPrimaryKey: boolean;
  columns: ColumnDef[];
  foreignKeys: ForeignKeyDef[];
  indexes: string[];
}

interface ColumnDef {
  name: string;
  type: string;
  isNullable: boolean;
  hasDefault: boolean;
}

interface ForeignKeyDef {
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

interface EnumDef {
  name: string;
  varName: string;
  file: string;
  values: string[];
}

interface RelationDef {
  name: string;
  baseTable: string;
  file: string;
  relations: string[];
}

interface ValidationIssue {
  severity: "error" | "warning" | "info";
  file: string;
  message: string;
  entity: string;
}

interface ValidationConfig {
  requireAuditFields: boolean;
  requirePrimaryKeys: boolean;
  checkNamingConventions: boolean;
  checkEnumUsage: boolean;
  exemptTables: string[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: ValidationConfig = {
  requireAuditFields: true,
  requirePrimaryKeys: true,
  checkNamingConventions: true,
  checkEnumUsage: true,
  exemptTables: ["oauth_providers", "oauth_tokens", "cache_entries", "temp_data"],
};

// Known standard enums and their expected values
const STANDARD_ENUM_VALUES: Record<string, string[]> = {
  political_party: ["uda", "odm", "jubilee", "wiper", "dap_ke", "ford_kenya", "kanu"],
};

// ============================================================================
// FILE SCANNING & PARSING
// ============================================================================

/**
 * Extracts column definitions from table content
 */
function extractColumns(tableContent: string): ColumnDef[] {
  const columns: ColumnDef[] = [];

  // Match column definitions: columnName: type().method()...
  const columnRegex = /(\w+):\s*([\w.]+)\((.*?)\)([^,}]*)/g;
  let match;

  while ((match = columnRegex.exec(tableContent)) !== null) {
    const name = match[1] ?? "";
    const type = match[2] ?? "";
    const modifiers = match[4] ?? "";
    columns.push({
      name,
      type: type.replace(/^(text|integer|timestamp|uuid|varchar|boolean).*/, "$1"),
      isNullable: !modifiers.includes(".notNull()"),
      hasDefault: modifiers.includes(".default(") || modifiers.includes(".defaultNow()"),
    });
  }

  return columns;
}

/**
 * Extracts foreign key references from table content
 */
function extractForeignKeys(tableContent: string): ForeignKeyDef[] {
  const foreignKeys: ForeignKeyDef[] = [];

  // Match .references(() => tableName.columnName)
  const fkRegex = /(\w+):\s*[\w.]+\([^)]*\)\.references\(\(\)\s*=>\s*(\w+)\.(\w+)/g;
  let match;

  while ((match = fkRegex.exec(tableContent)) !== null) {
    const column = match[1] ?? "";
    const referencedTable = match[2] ?? "";
    const referencedColumn = match[3] ?? "";
    foreignKeys.push({
      column,
      referencedTable,
      referencedColumn,
    });
  }

  return foreignKeys;
}

/**
 * Extracts index definitions from table content
 */
function extractIndexes(content: string): string[] {
  const indexes: string[] = [];
  const indexRegex = /\.index\(["'](\w+)["']/g;
  let match;

  while ((match = indexRegex.exec(content)) !== null) {
    if (match[1]) {
      indexes.push(match[1]);
    }
  }

  return indexes;
}

/**
 * Checks if table has audit fields
 */
function hasAuditFields(columns: ColumnDef[]): boolean {
  return (
    columns.some((c) => c.name === "created_at") &&
    columns.some((c) => c.name === "updated_at")
  );
}

/**
 * Checks if table has primary key
 */
function hasPrimaryKey(tableBody: string, columns: ColumnDef[]): boolean {
  return (
    tableBody.includes("primaryKey(") ||
    columns.some((c) => c.name === "id" && tableBody.includes("primaryKey")) ||
    columns.some((c) => tableBody.includes(`${c.name}: uuid`) && tableBody.includes(".primaryKey()"))
  );
}

/**
 * Scans a directory for schema files and extracts table/enum definitions
 */
// eslint-disable-next-line complexity
function scanSchemaFiles(dir: string): { tables: TableDef[]; enums: EnumDef[] } {
  const tables: TableDef[] = [];
  const enums: EnumDef[] = [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.startsWith("."));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract table definitions
    const tableRegex = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*["'](\w+)["']\s*,\s*\{([\s\S]*?)\}\s*(?:,\s*\([^)]*\)\s*=>\s*\{[\s\S]*?\})?\)/g;
    let match;

    while ((match = tableRegex.exec(content)) !== null) {
      const fullMatch = match[0] ?? "";
      const varName = match[1] ?? "";
      const tableName = match[2] ?? "";
      const tableBody = match[3] ?? "";
      const columns = extractColumns(tableBody);
      const foreignKeys = extractForeignKeys(tableBody);
      const indexes = extractIndexes(fullMatch);

      tables.push({
        name: tableName,
        varName,
        file,
        hasAuditFields: hasAuditFields(columns),
        hasPrimaryKey: hasPrimaryKey(tableBody, columns),
        columns,
        foreignKeys,
        indexes,
      });
    }

    // Extract enum definitions
    const enumRegex = /export\s+const\s+(\w+)\s*=\s*pgEnum\s*\(\s*["'](\w+)["']\s*,\s*\[([\s\S]*?)\]\s*\)/g;

    while ((match = enumRegex.exec(content)) !== null) {
      const varName = match[1] ?? "";
      const enumName = match[2] ?? "";
      const valuesStr = match[3] ?? "";
      const values = valuesStr
        .split(",")
        .map((v) => v.trim().replace(/^['"]|['"]$/g, ""))
        .filter((v) => v.length > 0);

      enums.push({
        name: enumName,
        varName,
        file,
        values,
      });
    }
  }

  return { tables, enums };
}

/**
 * Scans for relation definitions
 */
// eslint-disable-next-line complexity
function findRelations(dir: string): RelationDef[] {
  const relations: RelationDef[] = [];
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.startsWith("."));

  for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, "utf-8");

    // Extract relation exports
    const relRegex = /export\s+const\s+(\w+Relations)\s*=\s*relations\s*\(\s*(\w+)\s*,/g;
    let match;

    while ((match = relRegex.exec(content)) !== null) {
      const varName = match[1] ?? "";
      const baseTable = match[2] ?? "";

      // Extract individual relations within the definition
      const relationTypes: string[] = [];
      const oneRegex = /\.\s*one\s*\(\s*(\w+)/g;
      const manyRegex = /\.\s*many\s*\(\s*(\w+)/g;

      let relMatch;
      while ((relMatch = oneRegex.exec(content)) !== null) {
        if (relMatch[1]) {
          relationTypes.push(`one:${relMatch[1]}`);
        }
      }
      while ((relMatch = manyRegex.exec(content)) !== null) {
        if (relMatch[1]) {
          relationTypes.push(`many:${relMatch[1]}`);
        }
      }

      relations.push({
        name: varName,
        baseTable,
        file,
        relations: relationTypes,
      });
    }
  }

  return relations;
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates table name format
 */
function validateTableName(table: TableDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!/^[a-z][a-z0-9_]*$/.test(table.name)) {
    issues.push({
      severity: "error",
      file: table.file,
      entity: table.name,
      message: `Table name "${table.name}" should be snake_case (lowercase with underscores)`,
    });
  }

  if (!table.name.endsWith("s") && !table.name.includes("_data") && !table.name.includes("_info")) {
    issues.push({
      severity: "warning",
      file: table.file,
      entity: table.name,
      message: `Table name "${table.name}" should typically be plural (e.g., "users", "posts")`,
    });
  }

  return issues;
}

/**
 * Validates column names
 */
function validateColumnNames(table: TableDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const column of table.columns) {
    if (!/^[a-z][a-z0-9_]*$/.test(column.name)) {
      issues.push({
        severity: "error",
        file: table.file,
        entity: `${table.name}.${column.name}`,
        message: `Column name "${column.name}" should be snake_case`,
      });
    }
  }

  return issues;
}

/**
 * Validates enum name and values
 */
function validateEnumName(enumDef: EnumDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!/^[a-z][a-z0-9_]*$/.test(enumDef.name)) {
    issues.push({
      severity: "error",
      file: enumDef.file,
      entity: enumDef.name,
      message: `Enum name "${enumDef.name}" should be snake_case`,
    });
  }

  for (const value of enumDef.values) {
    if (!/^[a-z][a-z0-9_]*$/.test(value)) {
      issues.push({
        severity: "warning",
        file: enumDef.file,
        entity: `${enumDef.name}.${value}`,
        message: `Enum value "${value}" should be snake_case`,
      });
    }
  }

  return issues;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates naming conventions
 */
function validateNamingConventions(
  tables: TableDef[],
  enums: EnumDef[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const table of tables) {
    issues.push(...validateTableName(table));
    issues.push(...validateColumnNames(table));
  }

  for (const enumDef of enums) {
    issues.push(...validateEnumName(enumDef));
  }

  return issues;
}

/**
 * Validates enum values against expected standards
 */
function validateEnumValues(enumDef: EnumDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const enumValues = STANDARD_ENUM_VALUES[enumDef.name];
  if (enumValues) {
    const expectedValues = enumValues;
    const missingValues = expectedValues.filter((v) => !enumDef.values.includes(v));

    if (missingValues.length > 0) {
      issues.push({
        severity: "warning",
        file: enumDef.file,
        entity: enumDef.name,
        message: `Enum "${enumDef.name}" is missing expected values: ${missingValues.join(", ")}`,
      });
    }
  }

  if (enumDef.name === "political_party" && enumDef.values.includes("dap_k")) {
    issues.push({
      severity: "error",
      file: enumDef.file,
      entity: enumDef.name,
      message: `Enum "${enumDef.name}" contains typo "dap_k" - should be "dap_ke"`,
    });
  }

  return issues;
}

/**
 * Validates basic enum structure
 */
function validateEnumStructure(enumDef: EnumDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (enumDef.values.length === 0) {
    issues.push({
      severity: "error",
      file: enumDef.file,
      entity: enumDef.name,
      message: `Enum "${enumDef.name}" has no values`,
    });
    return issues;
  }

  const uniqueValues = new Set(enumDef.values);
  if (uniqueValues.size !== enumDef.values.length) {
    issues.push({
      severity: "error",
      file: enumDef.file,
      entity: enumDef.name,
      message: `Enum "${enumDef.name}" contains duplicate values`,
    });
  }

  const shortValues = enumDef.values.filter((v) => v.length < 3 && !["id", "uk", "us"].includes(v));
  if (shortValues.length > 0) {
    issues.push({
      severity: "info",
      file: enumDef.file,
      entity: enumDef.name,
      message: `Enum "${enumDef.name}" contains short values that may be abbreviations: ${shortValues.join(", ")}`,
    });
  }

  return issues;
}

/**
 * Validates enum consistency and checks for common issues
 */
function validateEnums(enums: EnumDef[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const enumDef of enums) {
    issues.push(...validateEnumStructure(enumDef));
    issues.push(...validateEnumValues(enumDef));
  }

  return issues;
}

/**
 * Checks if a table should skip audit field validation
 */
function shouldSkipAuditCheck(tableName: string): boolean {
  return (
    tableName.includes("cache") ||
    tableName.includes("temp") ||
    tableName.includes("log") ||
    tableName.endsWith("_history")
  );
}

/**
 * Validates table primary keys and audit fields
 */
function validateTableBasics(
  table: TableDef,
  config: ValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const isExempt = config.exemptTables.includes(table.name);

  if (config.requirePrimaryKeys && !table.hasPrimaryKey) {
    issues.push({
      severity: "error",
      file: table.file,
      entity: table.name,
      message: `Table "${table.name}" is missing a primary key`,
    });
  }

  if (table.columns.length === 0) {
    issues.push({
      severity: "error",
      file: table.file,
      entity: table.name,
      message: `Table "${table.name}" has no columns defined`,
    });
  }

  if (
    config.requireAuditFields &&
    !table.hasAuditFields &&
    !isExempt &&
    !shouldSkipAuditCheck(table.name)
  ) {
    issues.push({
      severity: "warning",
      file: table.file,
      entity: table.name,
      message: `Table "${table.name}" is missing audit fields (created_at, updated_at)`,
    });
  }

  return issues;
}

/**
 * Validates foreign key references
 */
function validateForeignKeys(
  table: TableDef,
  tables: TableDef[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const fk of table.foreignKeys) {
    const referencedTable = tables.find((t) => t.varName === fk.referencedTable);

    if (!referencedTable) {
      issues.push({
        severity: "error",
        file: table.file,
        entity: `${table.name}.${fk.column}`,
        message: `Foreign key "${fk.column}" references non-existent table "${fk.referencedTable}"`,
      });
      continue;
    }

    const referencedColumn = referencedTable.columns.find(
      (c) => c.name === fk.referencedColumn
    );

    if (!referencedColumn) {
      issues.push({
        severity: "error",
        file: table.file,
        entity: `${table.name}.${fk.column}`,
        message: `Foreign key "${fk.column}" references non-existent column "${fk.referencedTable}.${fk.referencedColumn}"`,
      });
    }
  }

  return issues;
}

/**
 * Validates indexes on foreign keys
 */
function validateIndexes(table: TableDef): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const fk of table.foreignKeys) {
    const hasIndex = table.indexes.some((idx) => idx.includes(fk.column));

    if (!hasIndex) {
      issues.push({
        severity: "info",
        file: table.file,
        entity: `${table.name}.${fk.column}`,
        message: `Foreign key "${fk.column}" should have an index for performance`,
      });
    }
  }

  return issues;
}

/**
 * Validates table relations
 */
function validateRelations(
  table: TableDef,
  relationMap: Map<string, RelationDef>
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!relationMap.has(table.varName) && table.foreignKeys.length > 0) {
    issues.push({
      severity: "info",
      file: table.file,
      entity: table.name,
      message: `Table "${table.name}" has foreign keys but no relations defined`,
    });
  }

  return issues;
}

/**
 * Validates table structure and completeness
 */
function validateTables(
  tables: TableDef[],
  relations: RelationDef[],
  config: ValidationConfig
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const relationMap = new Map(relations.map((r) => [r.baseTable, r]));

  for (const table of tables) {
    issues.push(...validateTableBasics(table, config));
    issues.push(...validateForeignKeys(table, tables));
    issues.push(...validateIndexes(table));
    issues.push(...validateRelations(table, relationMap));
  }

  return issues;
}

/**
 * Validates that enums are properly used in tables
 */
function validateEnumUsage(tables: TableDef[], enums: EnumDef[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const enumNames = new Set(enums.map((e) => e.name));
  const usedEnums = new Set<string>();

  for (const table of tables) {
    for (const column of table.columns) {
      if (enumNames.has(column.type)) {
        usedEnums.add(column.type);
      }
    }
  }

  for (const enumDef of enums) {
    if (!usedEnums.has(enumDef.name)) {
      issues.push({
        severity: "warning",
        file: enumDef.file,
        entity: enumDef.name,
        message: `Enum "${enumDef.name}" is defined but not used in any table`,
      });
    }
  }

  return issues;
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Categorizes validation issues by severity
 */
function categorizeIssues(issues: ValidationIssue[]): {
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  info: ValidationIssue[];
} {
  return {
    errors: issues.filter((i) => i.severity === "error"),
    warnings: issues.filter((i) => i.severity === "warning"),
    info: issues.filter((i) => i.severity === "info"),
  };
}

/**
 * Prints schema statistics
 */
function printStatistics(
  tables: TableDef[],
  enums: EnumDef[],
  relations: RelationDef[]
) {
  console.log("\n📊 Schema Statistics:");
  console.log(`  Tables: ${tables.length}`);
  console.log(`  Enums: ${enums.length}`);
  console.log(`  Relations: ${relations.length}`);
  console.log(
    `  Total Columns: ${tables.reduce((sum, t) => sum + t.columns.length, 0)}`
  );
  console.log(
    `  Total Foreign Keys: ${tables.reduce((sum, t) => sum + t.foreignKeys.length, 0)}`
  );
}

/**
 * Prints categorized issues
 */
function printIssues(
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
  info: ValidationIssue[]
) {
  console.log(`\n📋 Validation Results:`);
  console.log(`  ❌ Errors: ${errors.length}`);
  console.log(`  ⚠️  Warnings: ${warnings.length}`);
  console.log(`  ℹ️  Info: ${info.length}\n`);

  if (errors.length > 0) {
    console.log("❌ ERRORS:\n");
    errors.forEach((issue) => {
      console.log(`  ${issue.file} [${issue.entity}]`);
      console.log(`    ${issue.message}\n`);
    });
  }

  if (warnings.length > 0) {
    console.log("⚠️  WARNINGS:\n");
    warnings.forEach((issue) => {
      console.log(`  ${issue.file} [${issue.entity}]`);
      console.log(`    ${issue.message}\n`);
    });
  }

  if (info.length > 0 && errors.length === 0 && warnings.length === 0) {
    console.log("ℹ️  INFORMATION:\n");
    info.forEach((issue) => {
      console.log(`  ${issue.file} [${issue.entity}]`);
      console.log(`    ${issue.message}\n`);
    });
  }
}

/**
 * Prints validation results
 */
function printResults(
  tables: TableDef[],
  enums: EnumDef[],
  relations: RelationDef[],
  issues: ValidationIssue[]
) {
  printStatistics(tables, enums, relations);

  const { errors, warnings, info } = categorizeIssues(issues);

  if (errors.length === 0 && warnings.length === 0 && info.length === 0) {
    console.log("\n✅ Schema validation passed - no issues found!\n");
    return;
  }

  printIssues(errors, warnings, info);
}

// ============================================================================
// MAIN VALIDATION
// ============================================================================

function main() {
  console.log("🔍 Starting static schema validation...");

  const schemaDir = path.join(__dirname, "..");
  const config = DEFAULT_CONFIG;

  const { tables, enums } = scanSchemaFiles(schemaDir);
  const relations = findRelations(schemaDir);

  const allIssues: ValidationIssue[] = [
    ...validateTables(tables, relations, config),
    ...validateEnums(enums),
    ...(config.checkNamingConventions ? validateNamingConventions(tables, enums) : []),
    ...(config.checkEnumUsage ? validateEnumUsage(tables, enums) : []),
  ];

  printResults(tables, enums, relations, allIssues);

  const errorCount = allIssues.filter((i) => i.severity === "error").length;
  if (errorCount > 0) {
    console.log(`\n❌ Validation failed with ${errorCount} error(s)\n`);
    process.exitCode = 1;
  } else {
    console.log("✅ Validation complete!\n");
  }
}

main();
