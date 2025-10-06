# Design Document

## Overview

This design addresses critical database schema inconsistencies in the Chanuka Platform that are preventing the security monitoring service from functioning properly. The primary issue is a missing `next_check` column in the `compliance_checks` table, along with potential other schema mismatches between the application code expectations and the actual database structure.

## Architecture

### Database Schema Analysis
The security monitoring service expects the `compliance_checks` table to have specific columns including `next_check` for scheduling compliance check intervals. The current schema appears to be missing this column, causing INSERT operations to fail.

### Migration Strategy
- **Incremental Migrations**: Create targeted migration scripts that add missing columns without disrupting existing data
- **Schema Validation**: Implement validation checks to ensure schema consistency before service initialization
- **Rollback Support**: Provide rollback capabilities for all schema changes

### Error Handling
- **Graceful Degradation**: Allow the application to start even if some compliance checks fail
- **Detailed Logging**: Provide comprehensive error messages for schema issues
- **Recovery Mechanisms**: Implement automatic schema repair where possible

## Components and Interfaces

### 1. Schema Validation Service
```typescript
interface SchemaValidationService {
  validateComplianceChecksTable(): Promise<ValidationResult>
  validateAllTables(): Promise<ValidationResult[]>
  repairSchema(): Promise<RepairResult>
}
```

**Responsibilities:**
- Validate database table structures against expected schemas
- Identify missing columns, incorrect types, or constraint issues
- Provide detailed reports on schema inconsistencies

### 2. Migration Service Enhancement
```typescript
interface MigrationService {
  addComplianceCheckColumns(): Promise<MigrationResult>
  validateMigration(): Promise<boolean>
  rollbackMigration(migrationId: string): Promise<RollbackResult>
}
```

**Responsibilities:**
- Execute schema fixes through proper migration scripts
- Ensure data integrity during schema changes
- Provide rollback capabilities for failed migrations

### 3. Compliance Check Table Schema
```sql
CREATE TABLE IF NOT EXISTS compliance_checks (
  id SERIAL PRIMARY KEY,
  check_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL,
  last_check TIMESTAMP,
  next_check TIMESTAMP, -- Missing column causing the error
  result JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Security Monitoring Service Updates
```typescript
interface SecurityMonitoringService {
  initializeWithSchemaValidation(): Promise<void>
  scheduleComplianceCheck(checkType: string, nextCheck: Date): Promise<void>
  runComplianceChecks(): Promise<ComplianceResult[]>
}
```

## Data Models

### ComplianceCheck Model
```typescript
interface ComplianceCheck {
  id: number
  checkType: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  lastCheck?: Date
  nextCheck?: Date  // This field mapping was missing
  result?: any
  createdAt: Date
  updatedAt: Date
}
```

### ValidationResult Model
```typescript
interface ValidationResult {
  tableName: string
  isValid: boolean
  missingColumns: string[]
  incorrectTypes: ColumnTypeIssue[]
  recommendations: string[]
}
```

### MigrationResult Model
```typescript
interface MigrationResult {
  success: boolean
  migrationId: string
  appliedChanges: string[]
  errors?: string[]
  rollbackScript?: string
}
```

## Error Handling

### Schema Validation Errors
- **Missing Column Errors**: Detect and report missing columns with suggested ALTER TABLE statements
- **Type Mismatch Errors**: Identify columns with incorrect data types
- **Constraint Errors**: Report missing or incorrect constraints

### Migration Errors
- **Transaction Rollback**: Ensure all schema changes are wrapped in transactions
- **Data Preservation**: Validate that existing data remains intact after migrations
- **Dependency Checking**: Verify that schema changes don't break existing functionality

### Runtime Error Handling
- **Graceful Fallback**: Allow security monitoring to continue with reduced functionality if some checks fail
- **Error Reporting**: Provide detailed error messages for troubleshooting
- **Automatic Recovery**: Attempt to fix common schema issues automatically

## Testing Strategy

### Schema Validation Testing
- **Unit Tests**: Test schema validation logic with various database states
- **Integration Tests**: Verify schema validation works with actual database connections
- **Edge Case Testing**: Test behavior with corrupted or partially migrated schemas

### Migration Testing
- **Forward Migration Tests**: Verify migrations apply correctly to various starting states
- **Rollback Tests**: Ensure rollback procedures work correctly
- **Data Integrity Tests**: Confirm existing data is preserved during migrations

### Security Monitoring Integration Tests
- **Service Initialization**: Test that security monitoring starts successfully after schema fixes
- **Compliance Check Execution**: Verify all compliance checks run without database errors
- **Scheduling Tests**: Confirm next_check column is properly populated and used

### Performance Testing
- **Migration Performance**: Ensure schema changes complete within acceptable timeframes
- **Query Performance**: Verify schema changes don't negatively impact query performance
- **Concurrent Access**: Test schema validation and migration under concurrent database access

## Implementation Considerations

### Database Compatibility
- **PostgreSQL Focus**: Primary implementation for PostgreSQL database
- **Version Compatibility**: Ensure compatibility with the PostgreSQL version in use
- **Extension Dependencies**: Account for any PostgreSQL extensions being used

### Data Safety
- **Backup Recommendations**: Suggest database backups before running migrations
- **Transaction Safety**: Wrap all schema changes in transactions
- **Validation Steps**: Validate schema changes before and after application

### Monitoring and Observability
- **Migration Logging**: Comprehensive logging of all schema changes
- **Health Checks**: Add database schema health checks to monitoring
- **Alerting**: Alert on schema validation failures or migration issues