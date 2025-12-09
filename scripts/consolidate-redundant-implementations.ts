#!/usr/bin/env tsx

/**
 * Redundant Implementations Consolidation Script
 * 
 * Identifies and consolidates duplicate/redundant implementations
 * to reduce code duplication and improve maintainability.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import crypto from 'crypto';

interface RedundantImplementation {
  primary: string;
  duplicates: string[];
  type: 'exact-duplicate' | 'similar-functionality' | 'outdated-version';
  confidence: number;
  reason: string;
  consolidationStrategy: 'remove-duplicates' | 'merge-features' | 'deprecate-old';
}

interface FileSignature {
  path: string;
  contentHash: string;
  functionalHash: string;
  size: number;
  exports: string[];
  imports: string[];
}

class RedundantImplementationConsolidator {
  private clientDir = 'client/src';
  private redundancies: RedundantImplementation[] = [];
  private fileSignatures: Map<string, FileSignature> = new Map();

  async run(): Promise<void> {
    console.log('🔍 Analyzing redundant implementations...\n');

    await this.analyzeFiles();
    await this.identifyRedundancies();
    await this.generateConsolidationPlan();
    await this.applyConsolidations();
  }

  private async analyzeFiles(): Promise<void> {
    console.log('📊 Analyzing file signatures...');

    const files = await glob(`${this.clientDir}/**/*.{ts,tsx}`, {
      ignore: [
        '**/node_modules/**',
        '**/dist/**',
        '**/build/**',
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/cleanup-backup/**'
      ]
    });

    for (const file of files) {
      try {
        const signature = await this.generateFileSignature(file);
        this.fileSignatures.set(file, signature);
      } catch (error) {
        console.warn(`Failed to analyze ${file}:`, error);
      }
    }

    console.log(`✅ Analyzed ${this.fileSignatures.size} files`);
  }

  private async generateFileSignature(filePath: string): Promise<FileSignature> {
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);

    // Generate content hash (exact duplicate detection)
    const contentHash = crypto.createHash('md5').update(content).digest('hex');

    // Generate functional hash (similar functionality detection)
    const functionalContent = this.extractFunctionalContent(content);
    const functionalHash = crypto.createHash('md5').update(functionalContent).digest('hex');

    const exports = this.extractExports(content);
    const imports = this.extractImports(content);

    return {
      path: filePath,
      contentHash,
      functionalHash,
      size: stats.size,
      exports,
      imports
    };
  }

  private extractFunctionalContent(content: string): string {
    // Remove comments, whitespace, and formatting to focus on functionality
    return content
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
      .replace(/\/\/.*$/gm, '') // Remove line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/['"`]/g, '"') // Normalize quotes
      .trim();
  }

  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
    const namedExportRegex = /export\s+\{([^}]+)\}/g;
    const exports: string[] = [];
    let match;

    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    while ((match = namedExportRegex.exec(content)) !== null) {
      const namedExports = match[1].split(',').map(e => e.trim().split(' as ')[0]);
      exports.push(...namedExports);
    }

    return exports;
  }

  private extractImports(content: string): string[] {
    const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"`]([^'"`]+)['"`]/g;
    const imports: string[] = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  private async identifyRedundancies(): Promise<void> {
    console.log('\n🔍 Identifying redundancies...');

    // Group files by content hash (exact duplicates)
    const contentGroups = new Map<string, FileSignature[]>();
    for (const signature of this.fileSignatures.values()) {
      if (!contentGroups.has(signature.contentHash)) {
        contentGroups.set(signature.contentHash, []);
      }
      contentGroups.get(signature.contentHash)!.push(signature);
    }

    // Identify exact duplicates
    for (const [hash, signatures] of contentGroups) {
      if (signatures.length > 1) {
        const primary = this.selectPrimaryFile(signatures);
        const duplicates = signatures.filter(s => s.path !== primary.path).map(s => s.path);

        this.redundancies.push({
          primary: primary.path,
          duplicates,
          type: 'exact-duplicate',
          confidence: 1.0,
          reason: 'Identical file content',
          consolidationStrategy: 'remove-duplicates'
        });
      }
    }

    // Group files by functional hash (similar functionality)
    const functionalGroups = new Map<string, FileSignature[]>();
    for (const signature of this.fileSignatures.values()) {
      if (!functionalGroups.has(signature.functionalHash)) {
        functionalGroups.set(signature.functionalHash, []);
      }
      functionalGroups.get(signature.functionalHash)!.push(signature);
    }

    // Identify similar functionality
    for (const [hash, signatures] of functionalGroups) {
      if (signatures.length > 1) {
        // Skip if already identified as exact duplicates
        const alreadyIdentified = this.redundancies.some(r => 
          signatures.some(s => r.primary === s.path || r.duplicates.includes(s.path))
        );

        if (!alreadyIdentified) {
          const primary = this.selectPrimaryFile(signatures);
          const duplicates = signatures.filter(s => s.path !== primary.path).map(s => s.path);

          this.redundancies.push({
            primary: primary.path,
            duplicates,
            type: 'similar-functionality',
            confidence: 0.8,
            reason: 'Similar functional content',
            consolidationStrategy: 'merge-features'
          });
        }
      }
    }

    // Identify known redundant patterns
    await this.identifyKnownRedundancies();

    console.log(`✅ Identified ${this.redundancies.length} redundant implementations`);
  }

  private async identifyKnownRedundancies(): Promise<void> {
    // Known redundant patterns based on file names and locations
    const knownRedundancies = [
      {
        pattern: /dashboard/i,
        locations: ['components', 'shared/ui', 'features'],
        reason: 'Multiple dashboard implementations'
      },
      {
        pattern: /loading/i,
        locations: ['components', 'shared/ui', 'utils'],
        reason: 'Multiple loading implementations'
      },
      {
        pattern: /auth/i,
        locations: ['components', 'features/users', 'core/auth'],
        reason: 'Multiple auth implementations'
      },
      {
        pattern: /api/i,
        locations: ['utils', 'services', 'core/api'],
        reason: 'Multiple API implementations'
      }
    ];

    for (const redundancy of knownRedundancies) {
      const matchingFiles = Array.from(this.fileSignatures.keys()).filter(file => {
        const fileName = path.basename(file);
        const hasPattern = redundancy.pattern.test(fileName);
        const inMultipleLocations = redundancy.locations.some(loc => file.includes(loc));
        return hasPattern && inMultipleLocations;
      });

      if (matchingFiles.length > 1) {
        // Group by location priority (core > shared > features > components)
        const locationPriority = { 'core': 1, 'shared': 2, 'features': 3, 'components': 4 };
        const sortedFiles = matchingFiles.sort((a, b) => {
          const aPriority = Math.min(...redundancy.locations.map(loc => 
            a.includes(loc) ? locationPriority[loc as keyof typeof locationPriority] || 5 : 5
          ));
          const bPriority = Math.min(...redundancy.locations.map(loc => 
            b.includes(loc) ? locationPriority[loc as keyof typeof locationPriority] || 5 : 5
          ));
          return aPriority - bPriority;
        });

        const primary = sortedFiles[0];
        const duplicates = sortedFiles.slice(1);

        // Check if not already identified
        const alreadyIdentified = this.redundancies.some(r => 
          r.primary === primary || r.duplicates.includes(primary)
        );

        if (!alreadyIdentified && duplicates.length > 0) {
          this.redundancies.push({
            primary,
            duplicates,
            type: 'outdated-version',
            confidence: 0.6,
            reason: redundancy.reason,
            consolidationStrategy: 'deprecate-old'
          });
        }
      }
    }
  }

  private selectPrimaryFile(signatures: FileSignature[]): FileSignature {
    // Priority: core > shared > features > components > utils
    const locationPriority = {
      'core': 1,
      'shared': 2,
      'features': 3,
      'components': 4,
      'utils': 5,
      'pages': 6
    };

    return signatures.sort((a, b) => {
      // First, sort by location priority
      const aPriority = Math.min(...Object.keys(locationPriority).map(loc => 
        a.path.includes(loc) ? locationPriority[loc as keyof typeof locationPriority] : 7
      ));
      const bPriority = Math.min(...Object.keys(locationPriority).map(loc => 
        b.path.includes(loc) ? locationPriority[loc as keyof typeof locationPriority] : 7
      ));

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Then by file size (larger files are likely more complete)
      if (a.size !== b.size) {
        return b.size - a.size;
      }

      // Finally by export count (more exports = more functionality)
      return b.exports.length - a.exports.length;
    })[0];
  }

  private async generateConsolidationPlan(): Promise<void> {
    console.log('\n📋 Generating consolidation plan...\n');

    // Sort by confidence and impact
    this.redundancies.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return b.duplicates.length - a.duplicates.length;
    });

    console.log('🎯 Consolidation Plan:');
    console.log('='.repeat(50));

    this.redundancies.forEach((redundancy, index) => {
      const confidence = Math.round(redundancy.confidence * 100);
      const impact = redundancy.duplicates.length;
      
      console.log(`\n${index + 1}. ${redundancy.type.toUpperCase()} (${confidence}% confidence)`);
      console.log(`   Primary: ${redundancy.primary}`);
      console.log(`   Duplicates (${impact}):`);
      redundancy.duplicates.forEach(dup => {
        console.log(`     - ${dup}`);
      });
      console.log(`   Reason: ${redundancy.reason}`);
      console.log(`   Strategy: ${redundancy.consolidationStrategy}`);
    });

    console.log('\n' + '='.repeat(50));
  }

  private async applyConsolidations(): Promise<void> {
    console.log('\n🔧 Applying safe consolidations...\n');

    let removedCount = 0;
    let skippedCount = 0;

    for (const redundancy of this.redundancies) {
      // Only auto-apply exact duplicates with high confidence
      if (redundancy.type === 'exact-duplicate' && redundancy.confidence >= 0.9) {
        try {
          for (const duplicate of redundancy.duplicates) {
            // Create backup
            await this.backupFile(duplicate);
            
            // Remove duplicate
            await fs.unlink(duplicate);
            console.log(`✅ Removed duplicate: ${duplicate}`);
            removedCount++;
          }
        } catch (error) {
          console.error(`❌ Failed to remove duplicates for ${redundancy.primary}:`, error);
        }
      } else {
        console.log(`⏭️  Skipped (manual review needed): ${redundancy.primary}`);
        skippedCount++;
      }
    }

    console.log(`\n📊 Consolidation Summary:`);
    console.log(`   Removed: ${removedCount}`);
    console.log(`   Skipped (manual review): ${skippedCount}`);

    if (skippedCount > 0) {
      console.log('\n⚠️  Manual review required for:');
      console.log('   - Similar functionality consolidations');
      console.log('   - Outdated version replacements');
      console.log('   - Feature merging opportunities');
    }
  }

  private async backupFile(filePath: string): Promise<void> {
    const backupDir = 'client/src/.cleanup-backup';
    const relativePath = path.relative('client/src', filePath);
    const backupPath = path.join(backupDir, 'redundant', relativePath);
    const backupDirPath = path.dirname(backupPath);

    await fs.mkdir(backupDirPath, { recursive: true });
    await fs.copyFile(filePath, backupPath);
  }
}

// Run the consolidator
const consolidator = new RedundantImplementationConsolidator();
consolidator.run().catch(console.error);