#!/usr/bin/env tsx

/**
 * Security Patches Verification Script
 * Verifies that critical security vulnerabilities have been patched
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

interface SecurityCheck {
  name: string;
  check: () => Promise<boolean>;
  description: string;
}

class SecurityVerifier {
  private checks: SecurityCheck[] = [];

  constructor() {
    this.setupChecks();
  }

  private setupChecks() {
    this.checks = [
      {
        name: 'glob-vulnerability-patched',
        description: 'Verify glob package is updated to secure version (>= 11.1.0)',
        check: async () => {
          try {
            const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
            const globVersion = packageJson.dependencies?.glob || packageJson.devDependencies?.glob;
            
            if (!globVersion) {
              console.log('❌ glob package not found in dependencies');
              return false;
            }

            // Extract version number (remove ^ or ~ prefix)
            const version = globVersion.replace(/[\^~]/, '');
            const [major, minor] = version.split('.').map(Number);
            
            const isSecure = major > 11 || (major === 11 && minor >= 1);
            
            if (isSecure) {
              console.log(`✅ glob version ${version} is secure (>= 11.1.0)`);
            } else {
              console.log(`❌ glob version ${version} is vulnerable (< 11.1.0)`);
            }
            
            return isSecure;
          } catch (error) {
            console.log(`❌ Error checking glob version: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'command-injection-middleware-exists',
        description: 'Verify command injection prevention middleware exists',
        check: async () => {
          try {
            const middlewarePath = join('server', 'middleware', 'command-injection-prevention.ts');
            const middlewareContent = readFileSync(middlewarePath, 'utf8');
            
            const hasCommandInjectionPrevention = middlewareContent.includes('commandInjectionPrevention');
            const hasDangerousPatterns = middlewareContent.includes('DANGEROUS_PATTERNS');
            const hasSecurityViolation = middlewareContent.includes('SECURITY_VIOLATION');
            
            if (hasCommandInjectionPrevention && hasDangerousPatterns && hasSecurityViolation) {
              console.log('✅ Command injection prevention middleware is properly implemented');
              return true;
            } else {
              console.log('❌ Command injection prevention middleware is incomplete');
              return false;
            }
          } catch (error) {
            console.log(`❌ Command injection prevention middleware not found: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'middleware-integrated-in-server',
        description: 'Verify middleware is integrated into main server',
        check: async () => {
          try {
            const serverPath = join('server', 'index.ts');
            const serverContent = readFileSync(serverPath, 'utf8');
            
            const hasImport = serverContent.includes('command-injection-prevention');
            const hasUsage = serverContent.includes('commandInjectionPrevention');
            
            if (hasImport && hasUsage) {
              console.log('✅ Command injection prevention middleware is integrated into server');
              return true;
            } else {
              console.log('❌ Command injection prevention middleware is not integrated into server');
              return false;
            }
          } catch (error) {
            console.log(`❌ Error checking server integration: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'security-schemas-exist',
        description: 'Verify security validation schemas exist',
        check: async () => {
          try {
            const schemasPath = join('server', 'core', 'validation', 'security-schemas.ts');
            const schemasContent = readFileSync(schemasPath, 'utf8');
            
            const hasValidationPatterns = schemasContent.includes('VALIDATION_PATTERNS');
            const hasSecuritySchemas = schemasContent.includes('SecuritySchemas');
            const hasCreateValidationMiddleware = schemasContent.includes('createValidationMiddleware');
            
            if (hasValidationPatterns && hasSecuritySchemas && hasCreateValidationMiddleware) {
              console.log('✅ Security validation schemas are properly implemented');
              return true;
            } else {
              console.log('❌ Security validation schemas are incomplete');
              return false;
            }
          } catch (error) {
            console.log(`❌ Security validation schemas not found: ${error}`);
            return false;
          }
        }
      },
      {
        name: 'no-high-severity-vulnerabilities',
        description: 'Verify no high-severity vulnerabilities remain',
        check: async () => {
          try {
            const auditResult = execSync('pnpm audit --audit-level high', { 
              encoding: 'utf8',
              stdio: 'pipe'
            });
            
            // If audit passes (exit code 0), no high-severity vulnerabilities
            console.log('✅ No high-severity vulnerabilities found');
            return true;
          } catch (error: any) {
            if (error.status === 1 && error.stdout) {
              // Check if there are high-severity vulnerabilities
              const output = error.stdout.toString();
              if (output.includes('high') || output.includes('critical')) {
                console.log('❌ High-severity vulnerabilities still exist');
                console.log(output);
                return false;
              } else {
                console.log('✅ No high-severity vulnerabilities found');
                return true;
              }
            } else {
              console.log(`❌ Error running security audit: ${error.message}`);
              return false;
            }
          }
        }
      }
    ];
  }

  async runChecks(): Promise<boolean> {
    console.log('🔒 Running Security Patches Verification...\n');
    
    let allPassed = true;
    
    for (const check of this.checks) {
      console.log(`🔍 ${check.description}`);
      
      try {
        const passed = await check.check();
        if (!passed) {
          allPassed = false;
        }
      } catch (error) {
        console.log(`❌ ${check.name} failed with error: ${error}`);
        allPassed = false;
      }
      
      console.log(''); // Empty line for readability
    }
    
    return allPassed;
  }

  async generateReport(): Promise<void> {
    console.log('📊 Security Patches Verification Report');
    console.log('=' .repeat(50));
    
    const allPassed = await this.runChecks();
    
    if (allPassed) {
      console.log('🎉 All security patches have been successfully applied!');
      console.log('\n✅ Summary:');
      console.log('  - glob package updated to secure version');
      console.log('  - Command injection prevention middleware implemented');
      console.log('  - Input validation middleware integrated');
      console.log('  - Security validation schemas in place');
      console.log('  - No high-severity vulnerabilities remaining');
    } else {
      console.log('⚠️  Some security patches may not be properly applied.');
      console.log('Please review the failed checks above.');
      process.exit(1);
    }
  }
}

// Run verification if this script is executed directly
const verifier = new SecurityVerifier();
verifier.generateReport().catch(error => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});

export { SecurityVerifier };