/**
 * API Contract Coverage Verification Script
 * 
 * This script verifies that:
 * 1. All API endpoints have corresponding contracts
 * 2. All contracts have validation schemas
 * 3. All contracts have tests
 * 
 * Task: 14.3 Verify API contract coverage
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface EndpointInfo {
  method: string;
  path: string;
  file: string;
  line: number;
  hasContract: boolean;
  hasValidation: boolean;
  hasTest: boolean;
}

interface ContractInfo {
  name: string;
  file: string;
  hasSchema: boolean;
  hasTest: boolean;
}

interface VerificationResult {
  passed: boolean;
  endpoints: EndpointInfo[];
  contracts: ContractInfo[];
  missingContracts: EndpointInfo[];
  missingValidation: ContractInfo[];
  missingTests: ContractInfo[];
  summary: {
    totalEndpoints: number;
    endpointsWithContracts: number;
    totalContracts: number;
    contractsWithValidation: number;
    contractsWithTests: number;
    coveragePercentage: number;
  };
}

/**
 * Extract API endpoints from server route files
 */
async function extractEndpoints(): Promise<EndpointInfo[]> {
  const endpoints: EndpointInfo[] = [];
  
  // Find all TypeScript files in server directory, excluding examples, tests, and OLD files
  const serverFiles = await glob('server/**/*.ts', {
    ignore: [
      '**/*.test.ts',
      '**/*.spec.ts',
      '**/*node_modules/**',
      '**/dist/**',
      '**/*.OLD.ts',
      '**/examples/**',
      '**/MIGRATION_EXAMPLES.ts',
      '**/middleware/validation-middleware.ts', // Contains example code
      '**/storage/**', // Example storage implementations
    ]
  });
  
  const routePattern = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  
  for (const file of serverFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Extract router.method() calls
    let match;
    while ((match = routePattern.exec(content)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const lineNumber = content.substring(0, match.index).split('\n').length;
      
      endpoints.push({
        method,
        path: routePath,
        file,
        line: lineNumber,
        hasContract: false,
        hasValidation: false,
        hasTest: false,
      });
    }
  }
  
  return endpoints;
}

/**
 * Extract contract definitions from shared/types/api/contracts
 */
async function extractContracts(): Promise<ContractInfo[]> {
  const contracts: ContractInfo[] = [];
  const contractDir = 'shared/types/api/contracts';
  
  if (!fs.existsSync(contractDir)) {
    console.warn(`Contract directory not found: ${contractDir}`);
    return contracts;
  }
  
  const contractFiles = await glob(`${contractDir}/*.contract.ts`);
  
  for (const file of contractFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const baseName = path.basename(file, '.contract.ts');
    
    // Check if corresponding schema file exists
    const schemaFile = path.join(contractDir, `${baseName}.schemas.ts`);
    const hasSchema = fs.existsSync(schemaFile);
    
    // Check if test file exists
    const testPatterns = [
      `**/${baseName}.contract.test.ts`,
      `**/${baseName}.test.ts`,
      `**/*${baseName}*.test.ts`,
    ];
    
    let hasTest = false;
    for (const pattern of testPatterns) {
      const testFiles = await glob(pattern);
      if (testFiles.length > 0) {
        hasTest = true;
        break;
      }
    }
    
    contracts.push({
      name: baseName,
      file,
      hasSchema,
      hasTest,
    });
  }
  
  return contracts;
}

/**
 * Match endpoints with contracts
 */
function matchEndpointsWithContracts(
  endpoints: EndpointInfo[],
  contracts: ContractInfo[]
): void {
  for (const endpoint of endpoints) {
    // Extract resource name from path (e.g., /api/users -> users, /comments -> comments)
    const pathParts = endpoint.path.split('/').filter(p => p && !p.startsWith(':'));
    const resourceName = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
    
    if (!resourceName) {
      continue;
    }
    
    // Extract feature name from file path (e.g., server/features/bills/bills-router.ts -> bills)
    const filePathParts = endpoint.file.split(/[/\\]/);
    const featureIndex = filePathParts.indexOf('features');
    const featureName = featureIndex >= 0 ? filePathParts[featureIndex + 1] : null;
    
    // Check if contract exists for this resource
    const contract = contracts.find(c => {
      // Direct name match
      if (c.name === resourceName) return true;
      
      // Name without hyphens
      if (c.name === resourceName.replace(/-/g, '')) return true;
      
      // Feature name match
      if (featureName && c.name === featureName) return true;
      
      // Plural/singular variations
      if (c.name === resourceName + 's' || c.name + 's' === resourceName) return true;
      
      // Check if file path contains contract name
      if (endpoint.file.toLowerCase().includes(c.name.toLowerCase())) return true;
      
      return false;
    });
    
    if (contract) {
      endpoint.hasContract = true;
      endpoint.hasValidation = contract.hasSchema;
      endpoint.hasTest = contract.hasTest;
    }
  }
}

/**
 * Generate verification report
 */
function generateReport(result: VerificationResult): string {
  const lines: string[] = [];
  
  lines.push('='.repeat(80));
  lines.push('API CONTRACT COVERAGE VERIFICATION REPORT');
  lines.push('='.repeat(80));
  lines.push('');
  
  // Summary
  lines.push('SUMMARY');
  lines.push('-'.repeat(80));
  lines.push(`Total Endpoints: ${result.summary.totalEndpoints}`);
  lines.push(`Endpoints with Contracts: ${result.summary.endpointsWithContracts} (${Math.round(result.summary.coveragePercentage)}%)`);
  lines.push(`Total Contracts: ${result.summary.totalContracts}`);
  lines.push(`Contracts with Validation: ${result.summary.contractsWithValidation}`);
  lines.push(`Contracts with Tests: ${result.summary.contractsWithTests}`);
  lines.push('');
  
  // Missing contracts
  if (result.missingContracts.length > 0) {
    lines.push('ENDPOINTS WITHOUT CONTRACTS');
    lines.push('-'.repeat(80));
    for (const endpoint of result.missingContracts) {
      lines.push(`❌ ${endpoint.method} ${endpoint.path}`);
      lines.push(`   File: ${endpoint.file}:${endpoint.line}`);
    }
    lines.push('');
  }
  
  // Missing validation
  if (result.missingValidation.length > 0) {
    lines.push('CONTRACTS WITHOUT VALIDATION SCHEMAS');
    lines.push('-'.repeat(80));
    for (const contract of result.missingValidation) {
      lines.push(`❌ ${contract.name}`);
      lines.push(`   File: ${contract.file}`);
      lines.push(`   Missing: ${contract.name}.schemas.ts`);
    }
    lines.push('');
  }
  
  // Missing tests
  if (result.missingTests.length > 0) {
    lines.push('CONTRACTS WITHOUT TESTS');
    lines.push('-'.repeat(80));
    for (const contract of result.missingTests) {
      lines.push(`❌ ${contract.name}`);
      lines.push(`   File: ${contract.file}`);
      lines.push(`   Missing: Test file for ${contract.name}`);
    }
    lines.push('');
  }
  
  // Overall status
  lines.push('='.repeat(80));
  if (result.passed) {
    lines.push('✅ VERIFICATION PASSED: All API contracts have complete coverage');
  } else {
    lines.push('❌ VERIFICATION FAILED: Some contracts are missing coverage');
    lines.push('');
    lines.push('Required actions:');
    if (result.missingContracts.length > 0) {
      lines.push(`  - Create contracts for ${result.missingContracts.length} endpoints`);
    }
    if (result.missingValidation.length > 0) {
      lines.push(`  - Add validation schemas for ${result.missingValidation.length} contracts`);
    }
    if (result.missingTests.length > 0) {
      lines.push(`  - Add tests for ${result.missingTests.length} contracts`);
    }
  }
  lines.push('='.repeat(80));
  
  return lines.join('\n');
}

/**
 * Main verification function
 */
async function verifyApiContractCoverage(): Promise<VerificationResult> {
  console.log('Starting API contract coverage verification...\n');
  
  // Extract endpoints and contracts
  const endpoints = await extractEndpoints();
  const contracts = await extractContracts();
  
  console.log(`Found ${endpoints.length} endpoints`);
  console.log(`Found ${contracts.length} contracts\n`);
  
  // Match endpoints with contracts
  matchEndpointsWithContracts(endpoints, contracts);
  
  // Identify missing coverage
  const missingContracts = endpoints.filter(e => !e.hasContract);
  const missingValidation = contracts.filter(c => !c.hasSchema);
  const missingTests = contracts.filter(c => !c.hasTest);
  
  // Calculate summary
  const endpointsWithContracts = endpoints.filter(e => e.hasContract).length;
  const contractsWithValidation = contracts.filter(c => c.hasSchema).length;
  const contractsWithTests = contracts.filter(c => c.hasTest).length;
  const coveragePercentage = endpoints.length > 0 
    ? (endpointsWithContracts / endpoints.length) * 100 
    : 0;
  
  const result: VerificationResult = {
    passed: missingContracts.length === 0 && 
            missingValidation.length === 0 && 
            missingTests.length === 0,
    endpoints,
    contracts,
    missingContracts,
    missingValidation,
    missingTests,
    summary: {
      totalEndpoints: endpoints.length,
      endpointsWithContracts,
      totalContracts: contracts.length,
      contractsWithValidation,
      contractsWithTests,
      coveragePercentage,
    },
  };
  
  return result;
}

/**
 * CLI entry point
 */
async function main() {
  try {
    const result = await verifyApiContractCoverage();
    const report = generateReport(result);
    
    console.log(report);
    
    // Write report to file
    const reportPath = '.kiro/specs/full-stack-integration/API_CONTRACT_COVERAGE_REPORT.md';
    fs.writeFileSync(reportPath, report);
    console.log(`\nReport saved to: ${reportPath}`);
    
    // Exit with appropriate code
    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  }
}

export { verifyApiContractCoverage, VerificationResult };

// Run if called directly
main();
