import * as ts from 'typescript';
import { ProjectStructure } from '@shared/types/core';

/**
 * Represents a schema table usage found in code
 */
export interface SchemaTableUsage {
  tableName: string;
  usageType: 'property_access' | 'identifier_reference' | 'type_reference' | 'import_reference';
  propertyName?: string;
  position: {
    start: number;
    end: number;
    line: number;
    column: number;
  };
  context: string;
  isValid: boolean;
  suggestions: string[];
  requiredImport?: {
    importName: string;
    importPath: string;
  };
}

/**
 * Represents the mapping of table usage to required imports
 */
export interface TableImportMapping {
  tableName: string;
  importPath: string;
  importType: 'named' | 'default' | 'namespace';
  relatedTables: string[];
  moduleExports: string[];
}

/**
 * Analyzes schema table references and maps them to required imports
 */
export class SchemaTableAnalyzer {
  private projectStructure: ProjectStructure;
  private tableImportMappings: Map<string, TableImportMapping>;
  private knownSchemaModules: Set<string>;

  constructor(projectStructure: ProjectStructure) {
    this.projectStructure = projectStructure;
    this.tableImportMappings = new Map();
    this.knownSchemaModules = new Set();
    
    this.initializeTableMappings();
  }

  /**
   * Initializes the mapping between tables and their import requirements
   */
  private initializeTableMappings(): void {
    // Create mappings based on Chanuka project structure
    const schemaModuleMappings = {
      'foundation': [
        'users', 'user_profiles', 'sponsors', 'committees', 'committee_members',
        'parliamentary_sessions', 'parliamentary_sittings', 'bills',
        'usersRelations', 'userProfilesRelations', 'sponsorsRelations',
        'committeesRelations', 'committeeMembersRelations', 'parliamentarySessionsRelations',
        'parliamentarySittingsRelations', 'billsRelations'
      ],
      'citizen_participation': [
        'sessions', 'comments', 'comment_votes', 'bill_votes', 'bill_engagement',
        'bill_tracking_preferences', 'notifications', 'alert_preferences',
        'sessionsRelations', 'commentsRelations', 'commentVotesRelations',
        'billVotesRelations', 'billEngagementRelations', 'billTrackingPreferencesRelations',
        'notificationsRelations', 'alertPreferencesRelations'
      ],
      'parliamentary_process': [
        'bill_committee_assignments', 'bill_amendments', 'bill_versions', 'bill_readings',
        'parliamentary_votes', 'bill_cosponsors', 'public_participation_events',
        'public_submissions', 'public_hearings'
      ],
      'constitutional_intelligence': [
        'constitutional_provisions', 'constitutional_analyses', 'legal_precedents',
        'expert_review_queue', 'analysis_audit_trail'
      ],
      'argument_intelligence': [
        'arguments', 'claims', 'evidence', 'argument_relationships',
        'legislative_briefs', 'synthesis_jobs'
      ],
      'advocacy_coordination': [
        'campaigns', 'action_items', 'campaign_participants', 'action_completions',
        'campaign_impact_metrics'
      ],
      'universal_access': [
        'ambassadors', 'communities', 'facilitation_sessions', 'offline_submissions',
        'ussd_sessions', 'localized_content'
      ],
      'integrity_operations': [
        'content_reports', 'moderation_queue', 'expert_profiles', 'user_verification',
        'user_activity_log', 'system_audit_log', 'security_events'
      ],
      'platform_operations': [
        'data_sources', 'sync_jobs', 'external_bill_references', 'analytics_events',
        'bill_impact_metrics', 'county_engagement_stats', 'trending_analysis',
        'user_engagement_summary', 'platform_health_metrics', 'content_performance'
      ],
      'transparency_analysis': [
        'corporate_entities', 'financial_interests', 'lobbying_activities',
        'bill_financial_conflicts', 'cross_sector_ownership', 'regulatory_capture_indicators'
      ],
      'impact_measurement': [
        'participation_cohorts', 'legislative_outcomes', 'attribution_assessments',
        'success_stories'
      ],
      'enum': [
        'kenyanCountyEnum', 'chamberEnum', 'partyEnum', 'billStatusEnum', 'userRoleEnum',
        'verificationStatusEnum', 'moderationStatusEnum', 'commentVoteTypeEnum',
        'billVoteTypeEnum', 'engagementTypeEnum', 'notificationTypeEnum', 'severityEnum'
      ]
    };

    // Create table import mappings
    for (const [moduleName, tables] of Object.entries(schemaModuleMappings)) {
      this.knownSchemaModules.add(moduleName);
      const importPath = `@server/infrastructure/schema/${moduleName}`;
      
      for (const tableName of tables) {
        this.tableImportMappings.set(tableName, {
          tableName,
          importPath,
          importType: 'named',
          relatedTables: tables.filter(t => t !== tableName),
          moduleExports: tables
        });
      }
    }

    // Add project structure mappings
    for (const [tableName, importPath] of Object.entries(this.projectStructure.schema.importPaths)) {
      if (!this.tableImportMappings.has(tableName)) {
        this.tableImportMappings.set(tableName, {
          tableName,
          importPath,
          importType: 'named',
          relatedTables: [],
          moduleExports: this.projectStructure.schema.tables[tableName] || []
        });
      }
    }
  }

  /**
   * Analyzes schema table usage in a TypeScript source file
   */
  analyzeSchemaTableUsage(sourceFile: ts.SourceFile): SchemaTableUsage[] {
    const usages: SchemaTableUsage[] = [];
    const existingImports = this.extractExistingImports(sourceFile);

    const visit = (node: ts.Node) => {
      // Check property access expressions (table.column)
      if (ts.isPropertyAccessExpression(node)) {
        const usage = this.analyzePropertyAccess(node, sourceFile, existingImports);
        if (usage) {
          usages.push(usage);
        }
      }

      // Check identifier references (standalone table names)
      if (ts.isIdentifier(node)) {
        const usage = this.analyzeIdentifierReference(node, sourceFile, existingImports);
        if (usage) {
          usages.push(usage);
        }
      }

      // Check type references (Table type annotations)
      if (ts.isTypeReferenceNode(node)) {
        const usage = this.analyzeTypeReference(node, sourceFile, existingImports);
        if (usage) {
          usages.push(usage);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return usages;
  }

  /**
   * Analyzes property access expressions for table.column patterns
   */
  private analyzePropertyAccess(
    node: ts.PropertyAccessExpression,
    sourceFile: ts.SourceFile,
    existingImports: Set<string>
  ): SchemaTableUsage | null {
    const tableName = this.getIdentifierName(node.expression);
    const propertyName = node.name.text;

    if (!tableName || !this.isKnownSchemaTable(tableName)) {
      return null;
    }

    const mapping = this.tableImportMappings.get(tableName);
    const tableColumns = this.projectStructure.schema.tables[tableName] || [];
    const isValidProperty = tableColumns.includes(propertyName);
    const suggestions = isValidProperty ? [] : this.findSimilarColumns(propertyName, tableColumns);

    return {
      tableName,
      usageType: 'property_access',
      propertyName,
      position: this.getNodePosition(node, sourceFile),
      context: this.getNodeContext(node, sourceFile),
      isValid: isValidProperty,
      suggestions,
      requiredImport: !existingImports.has(tableName) && mapping ? {
        importName: tableName,
        importPath: mapping.importPath
      } : undefined
    };
  }

  /**
   * Analyzes identifier references for standalone table names
   */
  private analyzeIdentifierReference(
    node: ts.Identifier,
    sourceFile: ts.SourceFile,
    existingImports: Set<string>
  ): SchemaTableUsage | null {
    const tableName = node.text;

    if (!this.isKnownSchemaTable(tableName) || this.isInImportDeclaration(node)) {
      return null;
    }

    const mapping = this.tableImportMappings.get(tableName);

    return {
      tableName,
      usageType: 'identifier_reference',
      position: this.getNodePosition(node, sourceFile),
      context: this.getNodeContext(node, sourceFile),
      isValid: true,
      suggestions: [],
      requiredImport: !existingImports.has(tableName) && mapping ? {
        importName: tableName,
        importPath: mapping.importPath
      } : undefined
    };
  }

  /**
   * Analyzes type references for table type annotations
   */
  private analyzeTypeReference(
    node: ts.TypeReferenceNode,
    sourceFile: ts.SourceFile,
    existingImports: Set<string>
  ): SchemaTableUsage | null {
    if (!ts.isIdentifier(node.typeName)) {
      return null;
    }

    const typeName = node.typeName.text;
    
    // Check for common table type patterns (User, NewUser, etc.)
    const baseTableName = this.extractBaseTableName(typeName);
    if (!baseTableName || !this.isKnownSchemaTable(baseTableName)) {
      return null;
    }

    const mapping = this.tableImportMappings.get(baseTableName);

    return {
      tableName: baseTableName,
      usageType: 'type_reference',
      position: this.getNodePosition(node, sourceFile),
      context: this.getNodeContext(node, sourceFile),
      isValid: true,
      suggestions: [],
      requiredImport: !existingImports.has(typeName) && mapping ? {
        importName: typeName,
        importPath: mapping.importPath
      } : undefined
    };
  }

  /**
   * Extracts base table name from type names (e.g., "NewUser" -> "users")
   */
  private extractBaseTableName(typeName: string): string | null {
    // Handle common type patterns
    if (typeName.startsWith('New')) {
      const baseType = typeName.substring(3).toLowerCase();
      // Convert PascalCase to snake_case
      const snakeCase = baseType.replace(/([A-Z])/g, '_$1').toLowerCase();
      return snakeCase + 's'; // Pluralize
    }

    // Handle direct table type references
    const snakeCase = typeName.replace(/([A-Z])/g, '_$1').toLowerCase();
    if (this.isKnownSchemaTable(snakeCase)) {
      return snakeCase;
    }

    // Handle plural forms
    const plural = snakeCase + 's';
    if (this.isKnownSchemaTable(plural)) {
      return plural;
    }

    return null;
  }

  /**
   * Checks if a table name is known in the schema
   */
  private isKnownSchemaTable(tableName: string): boolean {
    return this.tableImportMappings.has(tableName) || 
           Object.keys(this.projectStructure.schema.tables).includes(tableName);
  }

  /**
   * Checks if a node is inside an import declaration
   */
  private isInImportDeclaration(node: ts.Node): boolean {
    let parent = node.parent;
    while (parent) {
      if (ts.isImportDeclaration(parent)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  }

  /**
   * Extracts existing imports from the source file
   */
  private extractExistingImports(sourceFile: ts.SourceFile): Set<string> {
    const imports = new Set<string>();

    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) && node.importClause) {
        // Handle named imports
        if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          for (const element of node.importClause.namedBindings.elements) {
            imports.add(element.name.text);
          }
        }

        // Handle default imports
        if (node.importClause.name) {
          imports.add(node.importClause.name.text);
        }

        // Handle namespace imports
        if (node.importClause.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
          imports.add(node.importClause.namedBindings.name.text);
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return imports;
  }

  /**
   * Finds similar column names using string similarity
   */
  private findSimilarColumns(columnName: string, availableColumns: string[]): string[] {
    return availableColumns
      .filter(col => this.calculateSimilarity(columnName, col) > 0.6)
      .sort((a, b) => this.calculateSimilarity(columnName, b) - this.calculateSimilarity(columnName, a))
      .slice(0, 3);
  }

  /**
   * Calculates string similarity using Levenshtein distance
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const matrix: number[][] = [];
    const len1 = str1.length;
    const len2 = str2.length;

    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;

    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return (maxLen - matrix[len1][len2]) / maxLen;
  }

  /**
   * Gets the identifier name from an expression
   */
  private getIdentifierName(expression: ts.Expression): string | undefined {
    if (ts.isIdentifier(expression)) {
      return expression.text;
    }
    return undefined;
  }

  /**
   * Gets the position information for a node
   */
  private getNodePosition(node: ts.Node, sourceFile: ts.SourceFile): SchemaTableUsage['position'] {
    const start = node.getStart(sourceFile);
    const end = node.getEnd();
    const lineAndChar = sourceFile.getLineAndCharacterOfPosition(start);

    return {
      start,
      end,
      line: lineAndChar.line + 1,
      column: lineAndChar.character + 1
    };
  }

  /**
   * Gets context around a node for better error reporting
   */
  private getNodeContext(node: ts.Node, sourceFile: ts.SourceFile): string {
    const start = Math.max(0, node.getStart(sourceFile) - 50);
    const end = Math.min(sourceFile.text.length, node.getEnd() + 50);
    return sourceFile.text.substring(start, end);
  }

  /**
   * Groups table usages by required import path for efficient import generation
   */
  groupUsagesByImportPath(usages: SchemaTableUsage[]): Map<string, SchemaTableUsage[]> {
    const groups = new Map<string, SchemaTableUsage[]>();

    for (const usage of usages) {
      if (usage.requiredImport) {
        const importPath = usage.requiredImport.importPath;
        if (!groups.has(importPath)) {
          groups.set(importPath, []);
        }
        groups.get(importPath)!.push(usage);
      }
    }

    return groups;
  }

  /**
   * Generates import statements for missing schema table imports
   */
  generateImportStatements(usages: SchemaTableUsage[]): string[] {
    const importGroups = this.groupUsagesByImportPath(usages);
    const importStatements: string[] = [];

    for (const [importPath, groupedUsages] of importGroups) {
      const importNames = new Set<string>();
      
      for (const usage of groupedUsages) {
        if (usage.requiredImport) {
          importNames.add(usage.requiredImport.importName);
        }
      }

      if (importNames.size > 0) {
        const sortedImports = Array.from(importNames).sort();
        const importStatement = `import { ${sortedImports.join(', ')} } from '${importPath}';`;
        importStatements.push(importStatement);
      }
    }

    return importStatements;
  }

  /**
   * Gets table import mapping for a specific table
   */
  getTableImportMapping(tableName: string): TableImportMapping | undefined {
    return this.tableImportMappings.get(tableName);
  }

  /**
   * Gets all known schema modules
   */
  getKnownSchemaModules(): string[] {
    return Array.from(this.knownSchemaModules);
  }
}