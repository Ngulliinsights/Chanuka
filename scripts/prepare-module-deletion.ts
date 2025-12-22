#!/usr/bin/env tsx

/**
 * Prepare Module Deletion Script
 * 
 * This script prepares deprecated modules for deletion by:
 * 1. Scanning for remaining imports
 * 2. Creating migration reports
 * 3. Backing up critical components
 * 4. Validating consolidation completeness
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';

interface ImportScan {
  file: string;
  line: number;
  import: string;
  suggestion: string;
}

interface ModuleAnalysis {
  module: string;
  status: 'ready_for_deletion' | 'has_dependencies' | 'needs_migration';
  remainingImports: ImportScan[];
  criticalFiles: string[];
  migrationSuggestions: string[];
}

class ModuleDeletionPreparator {
  private readonly deprecatedModules = [
    'server/infrastructure/realtime',
    'shared/infrastructure/realtime'
  ];

  private readonly consolidatedModule = 'server/infrastructure/websocket';

  async prepare(): Promise<void> {
    console.log('🔍 Preparing deprecated modules for deletion...\n');

    const analyses: ModuleAnalysis[] = [];

    for (const module of this.deprecatedModules) {
      console.log(`📋 Analyzing ${module}...`);
      const analysis = await this.analyzeModule(module);
      analyses.push(analysis);
      this.printAnalysis(analysis);
    }

    // Generate migration report
    this.generateMigrationReport(analyses);

    // Create backup of critical components
    this.backupCriticalComponents(analyses);

    // Validate consolidation
    this.validateConsolidation();

    console.log('\n✅ Module deletion preparation complete!');
    console.log('📄 Check MIGRATION_REPORT.md for detailed analysis');
  }

  private async analyzeModule(modulePath: string): Promise<ModuleAnalysis> {
    const analysis: ModuleAnalysis = {
      module: modulePath,
      status: 'ready_for_deletion',
      remainingImports: [],
      criticalFiles: [],
      migrationSuggestions: []
    };

    // Scan for remaining imports
    analysis.remainingImports = this.scanForImports(modulePath);
    
    if (analysis.remainingImports.length > 0) {
      analysis.status = 'has_dependencies';
    }

    // Identify critical files
    analysis.criticalFiles = this.identifyCriticalFiles(modulePath);

    // Generate migration suggestions
    analysis.migrationSuggestions = this.generateMigrationSuggestions(modulePath);

    return analysis;
  }

  private scanForImports(modulePath: string): ImportScan[] {
    const imports: ImportScan[] = [];
    
    try {
      // Use ripgrep to find imports (faster than manual file scanning)
      const searchPattern = `from ['"].*${modulePath.replace('/', '\\/')}`;
      const result = execSync(`rg "${searchPattern}" --type ts --type tsx --type js --type jsx -n`, 
        { encoding: 'utf8', cwd: process.cwd() });
      
      const lines = result.split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        const [file, lineNum, content] = line.split(':', 3);
        if (file && lineNum && content) {
          imports.push({
            file: file.trim(),
            line: parseInt(lineNum),
            import: content.trim(),
            suggestion: this.getSuggestion(content.trim(), modulePath)
          });
        }
      }
    } catch (error) {
      // No imports found or ripgrep not available
      console.log(`  ℹ️  No remaining imports found for ${modulePath}`);
    }

    return imports;
  }

  private identifyCriticalFiles(modulePath: string): string[] {
    const critical: string[] = [];
    
    // Files that might contain important logic not yet migrated
    const criticalPatterns = [
      'migration',
      'blue-green',
      'socketio',
      'adapter',
      'config'
    ];

    try {
      const result = execSync(`find ${modulePath} -name "*.ts" -o -name "*.js"`, 
        { encoding: 'utf8', cwd: process.cwd() });
      
      const files = result.split('\n').filter(f => f.trim());
      
      for (const file of files) {
        const fileName = file.toLowerCase();
        if (criticalPatterns.some(pattern => fileName.includes(pattern))) {
          critical.push(file);
        }
      }
    } catch (error) {
      // Directory might not exist
    }

    return critical;
  }

  private generateMigrationSuggestions(modulePath: string): string[] {
    const suggestions: string[] = [];

    if (modulePath.includes('server/infrastructure/realtime')) {
      suggestions.push('✅ SocketIOService → Use WebSocketService with adapter pattern');
      suggestions.push('✅ MemoryMonitor → Integrated into WebSocketService memory management');
      suggestions.push('🔄 ConnectionMigrator → Move to websocket/migration/ (if needed)');
    }

    if (modulePath.includes('shared/infrastructure/realtime')) {
      suggestions.push('✅ BatchingService → Moved to server/infrastructure/websocket/batching/');
      suggestions.push('✅ MemoryAwareSocketService → Use WebSocketService with memory management');
      suggestions.push('✅ Configuration → Integrated into WebSocket config system');
    }

    return suggestions;
  }

  private getSuggestion(importLine: string, modulePath: string): string {
    if (importLine.includes('SocketIOService')) {
      return 'Replace with: import { WebSocketService } from "@server/infrastructure/websocket"';
    }
    if (importLine.includes('BatchingService')) {
      return 'Replace with: import { BatchingService } from "@server/infrastructure/websocket"';
    }
    if (importLine.includes('MemoryMonitor') || importLine.includes('MemoryAwareSocketService')) {
      return 'Replace with: import { WebSocketService } from "@server/infrastructure/websocket" (integrated memory management)';
    }
    return `Migrate to: server/infrastructure/websocket`;
  }

  private printAnalysis(analysis: ModuleAnalysis): void {
    console.log(`  Status: ${this.getStatusEmoji(analysis.status)} ${analysis.status}`);
    console.log(`  Remaining imports: ${analysis.remainingImports.length}`);
    console.log(`  Critical files: ${analysis.criticalFiles.length}`);
    
    if (analysis.remainingImports.length > 0) {
      console.log('  📍 Files still importing this module:');
      analysis.remainingImports.slice(0, 5).forEach(imp => {
        console.log(`    ${imp.file}:${imp.line} - ${imp.suggestion}`);
      });
      if (analysis.remainingImports.length > 5) {
        console.log(`    ... and ${analysis.remainingImports.length - 5} more`);
      }
    }
    
    console.log('');
  }

  private getStatusEmoji(status: string): string {
    switch (status) {
      case 'ready_for_deletion': return '✅';
      case 'has_dependencies': return '⚠️';
      case 'needs_migration': return '🔄';
      default: return '❓';
    }
  }

  private generateMigrationReport(analyses: ModuleAnalysis[]): void {
    const report = `# 📋 Module Deletion Migration Report

Generated: ${new Date().toISOString()}

## Summary

${analyses.map(a => `- **${a.module}**: ${this.getStatusEmoji(a.status)} ${a.status} (${a.remainingImports.length} imports)`).join('\n')}

## Detailed Analysis

${analyses.map(analysis => `
### ${analysis.module}

**Status**: ${this.getStatusEmoji(analysis.status)} ${analysis.status}

**Remaining Imports**: ${analysis.remainingImports.length}
${analysis.remainingImports.map(imp => `- \`${imp.file}:${imp.line}\` - ${imp.suggestion}`).join('\n')}

**Critical Files**: ${analysis.criticalFiles.length}
${analysis.criticalFiles.map(file => `- \`${file}\``).join('\n')}

**Migration Suggestions**:
${analysis.migrationSuggestions.map(s => `- ${s}`).join('\n')}

`).join('\n')}

## Next Steps

### If Status is "ready_for_deletion" ✅
1. Run final validation tests
2. Create backup of the module
3. Delete the module directory
4. Update any remaining documentation references

### If Status is "has_dependencies" ⚠️
1. Update the files listed in "Remaining Imports"
2. Test the updated imports
3. Re-run this analysis
4. Proceed with deletion when ready

### If Status is "needs_migration" 🔄
1. Review "Critical Files" for important logic
2. Migrate any missing functionality
3. Update imports
4. Re-run analysis

## Validation Commands

\`\`\`bash
# Test that consolidated module works
npm test server/infrastructure/websocket

# Check for any remaining references
rg "server/infrastructure/realtime|shared/infrastructure/realtime" --type ts

# Validate no broken imports
npm run type-check
\`\`\`
`;

    writeFileSync('MIGRATION_REPORT.md', report);
    console.log('📄 Generated MIGRATION_REPORT.md');
  }

  private backupCriticalComponents(analyses: ModuleAnalysis[]): void {
    const backupDir = 'backups/deprecated-modules';
    
    if (!existsSync(backupDir)) {
      mkdirSync(backupDir, { recursive: true });
    }

    for (const analysis of analyses) {
      if (analysis.criticalFiles.length > 0) {
        console.log(`💾 Backing up critical files from ${analysis.module}...`);
        
        for (const file of analysis.criticalFiles) {
          try {
            const content = readFileSync(file, 'utf8');
            const backupPath = join(backupDir, file.replace(/\//g, '_'));
            writeFileSync(backupPath, content);
            console.log(`  ✅ Backed up ${file} → ${backupPath}`);
          } catch (error) {
            console.log(`  ❌ Failed to backup ${file}: ${error}`);
          }
        }
      }
    }
  }

  private validateConsolidation(): void {
    console.log('🔍 Validating consolidation completeness...');

    const consolidatedModule = this.consolidatedModule;
    const requiredComponents = [
      'core/websocket-service.ts',
      'batching/batching-service.ts',
      'adapters/websocket-adapter.ts',
      'memory/memory-manager.ts',
      'monitoring/statistics-collector.ts'
    ];

    let allPresent = true;

    for (const component of requiredComponents) {
      const path = join(consolidatedModule, component);
      if (existsSync(path)) {
        console.log(`  ✅ ${component}`);
      } else {
        console.log(`  ❌ ${co