#!/usr/bin/env node

/**
 * Migration Script: Remove shared/types directory
 * 
 * This script migrates all imports from shared/types to appropriate locations
 * in shared/core/src and deletes the redundant shared/types directory.
 */

import { readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
import { glob } from 'glob';

const projectRoot = process.cwd();

interface ImportMapping {
  from: string | RegExp;
  to: string;
  description: string;
}

const importMappings: ImportMapping[] = [
  // Error types - use specialized error classes
  {
    from: /from\s+['"]@shared\/types\/errors['"];?/g,
    to: "from '@shared/core/src/observability/error-management/errors/specialized-errors';",
    description: "Error types to specialized error classes"
  },
  {
    from: /from\s+['"]@shared\/types['"].*ValidationError/g,
    to: "from '@shared/core/src/observability/error-management/errors/specialized-errors';",
    description: "ValidationError to specialized class"
  },
  
  // Auth types - use core auth types
  {
    from: /from\s+['"]@shared\/types\/auth['"];?/g,
    to: "from '@shared/core/src/types/auth.types';",
    description: "Auth types to core auth types"
  },
  
  // Common types - use core types
  {
    from: /from\s+['"]@shared\/types\/common['"];?/g,
    to: "from '@shared/core/src/types';",
    description: "Common types to core types"
  },
  
  // Generic shared/types imports - use core types
  {
    from: /from\s+['"]@shared\/types['"];?/g,
    to: "from '@shared/core/src/types';",
    description: "Generic shared/types to core types"
  },
  
  // Relative imports to shared/types
  {
    from: /from\s+['"]\.\.\/\.\.\/\.\.\/shared\/types\/([^'"]+)['"];?/g,
    to: "from '@shared/core/src/types';",
    description: "Relative shared/types imports to core types"
  }
];

const domainSpecificMappings: ImportMapping[] = [
  // Domain-specific types that need special handling
  {
    from: /from\s+['"]@shared\/types\/bill['"];?/g,
    to: "// TODO: Import BillAnalysis from server/features/bills/types/analysis.ts and SponsorshipAnalysis from server/features/sponsors/types/analysis.ts",
    description: "Bill analysis types split to domain modules"
  },
  {
    from: /from\s+['"]@shared\/types\/expert['"];?/g,
    to: "// TODO: Move expert types to server/features/users/types.ts",
    description: "Expert types to domain module"
  },
  {
    from: /from\s+['"]@shared\/types\/legal-analysis['"];?/g,
    to: "// TODO: Move legal analysis types to server/features/analytics/types.ts",
    description: "Legal analysis types to domain module"
  }
];

async function findAllTypeScriptFiles(): Promise<string[]> {
  const patterns = [
    '**/*.ts',
    '**/*.tsx',
    '!node_modules/**',
    '!dist/**',
    '!build/**'
  ];
  
  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: projectRoot });
    files.push(...matches);
  }
  
  return files.filter(file => existsSync(join(projectRoot, file)));
}

function updateFileImports(filePath: string): boolean {
  const fullPath = join(projectRoot, filePath);
  
  if (!existsSync(fullPath)) {
    return false;
  }
  
  let content = readFileSync(fullPath, 'utf-8');
  let hasChanges = false;
  
  // Apply import mappings
  for (const mapping of [...importMappings, ...domainSpecificMappings]) {
    const originalContent = content;
    
    if (typeof mapping.from === 'string') {
      content = content.replace(mapping.from, mapping.to);
    } else {
      content = content.replace(mapping.from, mapping.to);
    }
    
    if (content !== originalContent) {
      hasChanges = true;
      console.log(`  ✅ ${mapping.description} in ${filePath}`);
    }
  }
  
  if (hasChanges) {
    writeFileSync(fullPath, content, 'utf-8');
    return true;
  }
  
  return false;
}

function updateConfigFiles(): void {
  console.log('\n📝 Updating configuration files...');
  
  // Update vitest.config.ts
  const vitestConfigPath = join(projectRoot, 'vitest.config.ts');
  if (existsSync(vitestConfigPath)) {
    let content = readFileSync(vitestConfigPath, 'utf-8');
    content = content.replace(
      /@shared\/types['"]:\s*path\.resolve\(__dirname,\s*['"]\.\/shared\/types['"]\),?/g,
      ''
    );
    writeFileSync(vitestConfigPath, content, 'utf-8');
    console.log('  ✅ Updated vitest.config.ts');
  }
  
  // Update other config files
  const configFiles = [
    'scripts/fix-architectural-issues.ts',
    'scripts/verify-and-fix-project-structure.ts',
    'scripts/update-test-configuration.ts'
  ];
  
  for (const configFile of configFiles) {
    const configPath = join(projectRoot, configFile);
    if (existsSync(configPath)) {
      let content = readFileSync(configPath, 'utf-8');
      content = content.replace(
        /@shared\/types['"]:\s*path\.resolve\(__dirname,\s*['"]\.\/shared\/types['"]\),?/g,
        ''
      );
      content = content.replace(
        /['"]@shared\/types['"]\s*:\s*\[['"]\.\/shared\/types['"]\]/g,
        ''
      );
      writeFileSync(configPath, content, 'utf-8');
      console.log(`  ✅ Updated ${configFile}`);
    }
  }
}

function createDomainTypeFiles(): void { console.log('\n📁 Creating domain-specific type files...');
  
  // Bill analysis types are now split between bills and sponsors features
  console.log('  ✅ BillAnalysis moved to server/features/bills/types/analysis.ts');
  console.log('  ✅ SponsorshipAnalysis moved to server/features/sponsors/types/analysis.ts');
  
  // Create expert types in server/features/users/
  const expertTypesPath = join(projectRoot, 'server/features/users/types.ts');
  const expertTypesContent = `/**
 * Expert Domain Types
 * Migrated from shared/types/expert.ts
 */

export interface Analysis {
  id: string;
  topic: string;
  content: string;
  bill_id: number;
  analysis_type: string;
  confidence?: number;
  created_at: Date;
  updated_at: Date;
 }

export interface Expert {
  id: string;
  name: string;
  email: string;
  expertise: string[];
  qualifications: string[];
  verification_status: 'pending' | 'verified' | 'rejected';
  reputation_score: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ExtendedExpert extends Expert {
  topic: string[];
  specializations: string[];
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  notificationUrl?: string;
}

export interface VerificationTask {
  id: string;
  analysisId: string;
  expertId: string;
  status: VerificationStatus;
  assignedAt: Date;
  completedAt?: Date;
  feedback?: string;
  confidence?: number;
}

export interface ExtendedVerificationTask extends VerificationTask {
  verdict?: VerificationStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration: number;
  complexity: number;
  created_at?: Date;
  processedAt?: string | null;
}

export enum VerificationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPUTED = 'disputed'
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
}

export interface ServiceExpertError extends Error {
  code: string;
  details?: any;
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export interface Stakeholder {
  id: string;
  name: string;
  email: string;
  type: string;
  influence: number;
  notificationPreferences: NotificationChannel[];
}

export class ExpertError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ExpertError';
  }
}
`;
  
  writeFileSync(expertTypesPath, expertTypesContent, 'utf-8');
  console.log('  ✅ Created server/features/users/types.ts');
  
  // Create legal analysis types in server/features/analytics/
  const legalTypesPath = join(projectRoot, 'server/features/analytics/types.ts');
  const legalTypesContent = `/**
 * Legal Analysis Domain Types
 * Migrated from shared/types/legal-analysis.ts
 */

export interface AnalysisResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  confidence?: number;
  timestamp?: Date;
}

export interface LegalAnalysisConfig {
  timeout?: number;
  maxRetries?: number;
  pythonExecutable?: string;
}

export interface ConstitutionalAnalysis {
  isConstitutional: boolean;
  concerns: string[];
  confidence: number;
  reasoning: string;
}

export interface StakeholderAnalysis {
  stakeholders: Array<{
    name: string;
    type: string;
    influence: number;
    position: 'support' | 'oppose' | 'neutral';
  }>;
  majorConcerns: string[];
  publicOpinion: number; // -100 to 100
}
`;
  
  writeFileSync(legalTypesPath, legalTypesContent, 'utf-8');
  console.log('  ✅ Created server/features/analytics/types.ts');
}

async function main(): Promise<void> {
  console.log('🚀 Starting shared/types directory migration...\n');
  
  // Find all TypeScript files
  console.log('📂 Finding TypeScript files...');
  const files = await findAllTypeScriptFiles();
  console.log(`Found ${files.length} TypeScript files\n`);
  
  // Update imports in all files
  console.log('🔄 Updating imports...');
  let updatedFiles = 0;
  
  for (const file of files) {
    if (updateFileImports(file)) {
      updatedFiles++;
    }
  }
  
  console.log(`\n✅ Updated imports in ${updatedFiles} files`);
  
  // Update configuration files
  updateConfigFiles();
  
  // Create domain-specific type files
  createDomainTypeFiles();
  
  // Delete the shared/types directory
  console.log('\n🗑️  Removing shared/types directory...');
  const sharedTypesPath = join(projectRoot, 'shared/types');
  if (existsSync(sharedTypesPath)) {
    rmSync(sharedTypesPath, { recursive: true, force: true });
    console.log('  ✅ Deleted shared/types directory');
  }
  
  console.log('\n🎉 Migration completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Review and test the migrated imports');
  console.log('2. Update any remaining TODO comments for domain-specific types');
  console.log('3. Run TypeScript compilation to verify no import errors');
  console.log('4. Run tests to ensure functionality is preserved');
}

if (require.main === module) {
  main().catch(console.error);
}