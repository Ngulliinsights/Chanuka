# Schema Validation Service

The Schema Validation Service is a comprehensive database schema validation and repair system designed to ensure database integrity and prevent runtime errors caused by schema mismatches.

## Overview

This service addresses the critical issue where the security monitoring service fails due to missing database columns, specifically the `next_check` column in the `compliance_checks` table. It provides automated detection, reporting, and repair of schema issues.

## Key Features

### 1. Comprehensive Schema Validation
- **Table Structure Validation**: Verifies that all required tables exist
- **Column Validation**: Checks for missing columns and incorrect data types
- **Security Monitoring Focus**: Special validation for security-related tables
- **Detailed Error Reporting**: Provides specific remediation suggestions

### 2. Automated Schema Repair
- **Missing Column Addition**: Automatically adds missing columns with proper types
- **Safe Operations**: Uses `ADD COLUMN IF NOT EXISTS` to prevent conflicts
- **Transaction Safety**: All operations are wrapped in transactions
- **Rollback Support**: Provides rollback capabilities for failed operations

### 3. Health Monitoring
- **Startup Validation**: Can be integrated into application startup process
- **Continuous Monitoring**: Supports periodic schema health checks
- **Critical Issue Detection**: Identifies issues that prevent core functionality
- **Alerting Integration**: Can trigger alerts for critical schema problems

## Core Components

### SchemaValidationService Class

The main service class that provides all validation and repair functionality.

#### Key Methods

```typescript
// Validate the critical compliance_checks table
async validateComplianceChecksTable(): Promise<ValidationResult>

// Validate all security monitoring related tables
async validateAllTables(): Promise<ValidationResult[]>

// Generate comprehensive validation report
async generateValidationReport(): Promise<SchemaValidationReport>

// Attempt automatic schema repair
async repairSchema(): Promise<RepairResult>
```

### Data Models

#### ValidationResult
```typescript
interface ValidationResult {
  tableName: string;
  isValid: boolean;
  missingColumns: string[];
  incorrectTypes: ColumnTypeIssue[];
  recommendations: string[];
}
```

#### SchemaValidationReport
```typescript
interface SchemaValidationReport {
  overallStatus: 'valid' | 'invalid' | 'warning';
  validatedTables: number;
  invalidTables: number;
  totalIssues: number;
  criticalIssues: number;
  results: ValidationResult[];
  recommendations: string[];
  timestamp: Date;
}
```

#### RepairResult
```typescript
interface RepairResult {
  success: boolean;
  repairedTables: string[];
  errors: string[];
  warnings: string[];
}
```

## Usage Examples

### Basic Validation

```typescript
import { schemaValidationService } from './schema-validation-service.js';

// Validate compliance checks table
const result = await schemaValidationService.validateComplianceChecksTable();

if (!result.isValid) {
  console.log('Issues found:', result.missingColumns);
  console.log('Recommendations:', result.recommendations);
}
```

### Comprehensive Health Check

```typescript
// Generate full validation report
const report = await schemaValidationService.generateValidationReport();

console.log(`Overall Status: ${report.overallStatus}`);
console.log(`Critical Issues: ${report.criticalIssues}`);

if (report.criticalIssues > 0) {
  // Attempt automatic repair
  const repairResult = await schemaValidationService.repairSchema();
  
  if (repairResult.success) {
    console.log('Schema repaired successfully');
  } else {
    console.log('Manual intervention required');
  }
}
```

### Integration with Security Monitoring

```typescript
import { validateSchemaBeforeSecurityInit } from './schema-validation-demo.js';

// Call before initializing security monitoring service
try {
  await validateSchemaBeforeSecurityInit();
  // Proceed with security monitoring initialization
  await securityMonitoringService.initialize();
} catch (error) {
  console.error('Schema validation failed:', error);
  // Handle gracefully or exit
}
```

## Validated Tables

The service validates the following security monitoring tables:

### 1. compliance_checks
**Critical columns:**
- `id` (SERIAL PRIMARY KEY)
- `check_name` (TEXT NOT NULL)
- `check_type` (TEXT NOT NULL)
- `status` (TEXT NOT NULL)
- `last_checked` (TIMESTAMP)
- `next_check` (TIMESTAMP) - **Missing column causing failures**
- `findings` (JSONB)
- `remediation` (TEXT)
- `priority` (TEXT)
- `automated` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### 2. security_audit_logs
**Critical columns:**
- `timestamp` (TIMESTAMP) - **Often missing**
- `event_type` (TEXT)
- `user_id` (UUID)
- `ip_address` (TEXT)
- `severity` (TEXT)

### 3. threat_intelligence
**Critical columns:**
- `ip_address` (TEXT) - **Often missing**
- `threat_type` (TEXT)
- `severity` (TEXT)
- `first_seen` (TIMESTAMP)
- `last_seen` (TIMESTAMP)

### 4. security_alerts
**Standard columns:**
- `alert_type` (TEXT)
- `severity` (TEXT)
- `title` (TEXT)
- `message` (TEXT)
- `status` (TEXT)

### 5. security_config
**Standard columns:**
- `config_key` (TEXT)
- `config_value` (JSONB)
- `description` (TEXT)

## Error Handling

The service implements comprehensive error handling:

### Database Connection Errors
- Gracefully handles database connection failures
- Provides meaningful error messages
- Continues operation where possible
- Logs errors for debugging

### Schema Validation Errors
- Identifies specific missing columns
- Reports incorrect data types
- Provides SQL remediation commands
- Categorizes issues by severity

### Repair Operation Errors
- Safely handles repair failures
- Provides rollback information
- Reports partial success scenarios
- Maintains data integrity

## Integration Points

### Application Startup
```typescript
// Add to application initialization
async function initializeApplication() {
  // Validate schema before starting services
  const isHealthy = await quickSchemaHealthCheck();
  
  if (!isHealthy) {
    console.warn('Schema issues detected - attempting repair');
    await schemaValidationService.repairSchema();
  }
  
  // Continue with normal startup
  await securityMonitoringService.initialize();
}
```

### Health Check Endpoint
```typescript
// Add to health check API
app.get('/health/schema', async (req, res) => {
  try {
    const report = await schemaValidationService.generateValidationReport();
    res.json({
      status: report.overallStatus,
      issues: report.totalIssues,
      critical: report.criticalIssues,
      timestamp: report.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: 'Schema validation failed' });
  }
});
```

### Monitoring Integration
```typescript
// Periodic schema health monitoring
setInterval(async () => {
  const report = await schemaValidationService.generateValidationReport();
  
  if (report.criticalIssues > 0) {
    // Send alert to monitoring system
    await alertingService.sendAlert({
      type: 'schema_critical_issues',
      message: `${report.criticalIssues} critical schema issues detected`,
      severity: 'high'
    });
  }
}, 60 * 60 * 1000); // Check every hour
```

## Best Practices

### 1. Startup Validation
Always validate schema during application startup to catch issues early.

### 2. Graceful Degradation
Design your application to handle schema issues gracefully without crashing.

### 3. Monitoring Integration
Integrate schema validation into your monitoring and alerting systems.

### 4. Regular Health Checks
Perform periodic schema validation to catch drift or corruption.

### 5. Backup Before Repair
Always backup your database before running automatic schema repairs.

### 6. Test Repairs
Test schema repairs in development/staging before applying to production.

## Troubleshooting

### Common Issues

#### 1. "next_check column missing"
**Cause:** The compliance_checks table is missing the next_check column
**Solution:** Run `await schemaValidationService.repairSchema()`
**Manual Fix:** `ALTER TABLE compliance_checks ADD COLUMN next_check TIMESTAMP;`

#### 2. "timestamp column missing"
**Cause:** The security_audit_logs table is missing the timestamp column
**Solution:** Run automatic repair or manually add the column
**Manual Fix:** `ALTER TABLE security_audit_logs ADD COLUMN timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP;`

#### 3. "ip_address column missing"
**Cause:** The threat_intelligence table is missing the ip_address column
**Solution:** Run automatic repair or manually add the column
**Manual Fix:** `ALTER TABLE threat_intelligence ADD COLUMN ip_address TEXT NOT NULL DEFAULT '';`

### Debugging

Enable detailed logging by setting environment variables:
```bash
SCHEMA_VALIDATION_DEBUG=true
SCHEMA_VALIDATION_VERBOSE=true
```

### Manual Validation

You can manually run validation using the demo script:
```bash
npx tsx server/services/schema-validation-demo.ts
```

## Security Considerations

### 1. Database Permissions
Ensure the application has appropriate permissions to:
- Read table structure (information_schema access)
- Alter table structure (ALTER TABLE permissions)
- Create columns (DDL permissions)

### 2. Data Integrity
All repair operations use safe SQL commands that preserve existing data.

### 3. Transaction Safety
Schema modifications are wrapped in transactions where possible.

### 4. Audit Logging
All schema changes are logged for audit purposes.

## Performance Considerations

### 1. Validation Frequency
- Startup validation: Always recommended
- Periodic validation: Every 1-6 hours depending on criticality
- On-demand validation: When issues are suspected

### 2. Database Impact
- Schema validation queries are lightweight
- Repair operations may briefly lock tables
- Consider maintenance windows for major repairs

### 3. Caching
The service can cache validation results to reduce database load.

## Future Enhancements

### 1. Migration Integration
- Integration with database migration systems
- Automatic migration generation
- Version tracking

### 2. Advanced Validation
- Foreign key constraint validation
- Index validation
- Performance optimization suggestions

### 3. Reporting
- Historical schema health tracking
- Trend analysis
- Automated reporting

### 4. Multi-Database Support
- Support for multiple database types
- Database-specific optimizations
- Cross-database schema comparison
