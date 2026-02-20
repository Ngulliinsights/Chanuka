/**
 * WebSocket Consolidation Validation Script
 *
 * Validates that the WebSocket consolidation migration was successful
 * and all components are properly integrated.
 */

import * as fs from 'fs';
import * as path from 'path';

class WebSocketConsolidationValidator {
  private errors: string[] = [];
  private warnings: string[] = [];

  async validate(): Promise<void> {
    console.log('🔍 Validating WebSocket consolidation...\n');

    // Check core structure
    await this.validateCoreStructure();

    // Check file existence
    await this.validateFileExistence();

    // Check imports
    await this.validateImports();

    // Check exports
    await this.validateExports();

    // Check type consistency
    await this.validateTypes();

    // Generate report
    this.generateReport();
  }

  private async validateCoreStructure(): Promise<void> {
    console.log('📁 Validating core realtime structure...');

    const requiredDirectories = [
      'client/src/core/realtime',
      'client/src/core/realtime/websocket',
      'client/src/core/realtime/services',
      'client/src/core/realtime/hooks',
      'client/src/core/realtime/utils',
    ];

    for (const dir of requiredDirectories) {
      if (!fs.existsSync(dir)) {
        this.errors.push(`Missing required directory: ${dir}`);
      } else {
        console.log(`  ✅ ${dir}`);
      }
    }
  }

  private async validateFileExistence(): Promise<void> {
    console.log('\n📄 Validating required files...');

    const requiredFiles = [
      'client/src/core/realtime/index.ts',
      'client/src/core/realtime/types.ts',
      'client/src/core/realtime/config.ts',
      'client/src/core/realtime/websocket/manager.ts',
      'client/src/core/realtime/services/realtime-service.ts',
      'client/src/core/realtime/services/bill-tracking.ts',
      'client/src/core/realtime/services/community.ts',
      'client/src/core/realtime/services/notifications.ts',
      'client/src/core/realtime/hooks/use-websocket.ts',
      'client/src/core/realtime/hooks/use-bill-tracking.ts',
      'client/src/core/realtime/hooks/use-community-realtime.ts',
      'client/src/core/realtime/utils/event-emitter.ts',
      'client/src/core/realtime/README.md',
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.errors.push(`Missing required file: ${file}`);
      } else {
        console.log(`  ✅ ${file}`);
      }
    }
  }

  private async validateImports(): Promise<void> {
    console.log('\n🔗 Validating imports...');

    const filesToCheck = [
      'client/src/core/realtime/index.ts',
      'client/src/core/realtime/services/realtime-service.ts',
      'client/src/core/realtime/hooks/use-websocket.ts',
    ];

    for (const file of filesToCheck) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf-8');

        // Check for proper imports
        if (file.includes('realtime-service.ts')) {
          if (!content.includes("from '../websocket/manager'")) {
            this.warnings.push(`${file}: Missing WebSocket manager import`);
          }
          if (!content.includes("from '../types'")) {
            this.warnings.push(`${file}: Missing types import`);
          }
        }

        // Check for legacy imports that should be updated
        const legacyImports = [
          '@client/lib/services/webSocketService',
          '@client/lib/services/CommunityWebSocketManager',
          '@client/lib/hooks/use-websocket',
          '@client/lib/utils/realtime-optimizer',
        ];

        for (const legacyImport of legacyImports) {
          if (content.includes(legacyImport)) {
            this.warnings.push(`${file}: Contains legacy import: ${legacyImport}`);
          }
        }

        console.log(`  ✅ ${file}`);
      }
    }
  }

  private async validateExports(): Promise<void> {
    console.log('\n📤 Validating exports...');

    const indexFile = 'client/src/core/realtime/index.ts';

    if (fs.existsSync(indexFile)) {
      const content = fs.readFileSync(indexFile, 'utf-8');

      const requiredExports = [
        'UnifiedWebSocketManager',
        'RealTimeService',
        'realTimeService',
        'BillTrackingService',
        'CommunityService',
        'NotificationService',
        'useWebSocket',
        'useBillTracking',
        'useCommunityRealTime',
      ];

      for (const exportName of requiredExports) {
        if (!content.includes(exportName)) {
          this.errors.push(`Missing export in index.ts: ${exportName}`);
        } else {
          console.log(`  ✅ ${exportName}`);
        }
      }
    } else {
      this.errors.push('Missing main index.ts file');
    }
  }

  private async validateTypes(): Promise<void> {
    console.log('\n🏷️  Validating types...');

    const typesFile = 'client/src/core/realtime/types.ts';

    if (fs.existsSync(typesFile)) {
      const content = fs.readFileSync(typesFile, 'utf-8');

      const requiredTypes = [
        'ConnectionState',
        'WebSocketConfig',
        'WebSocketMessage',
        'BillUpdate',
        'CommunityUpdate',
        'WebSocketNotification',
        'RealTimeHandlers',
        'WebSocketHookReturn',
        'BillTrackingHookReturn',
        'CommunityRealTimeHookReturn',
      ];

      for (const typeName of requiredTypes) {
        if (!content.includes(typeName)) {
          this.errors.push(`Missing type definition: ${typeName}`);
        } else {
          console.log(`  ✅ ${typeName}`);
        }
      }
    } else {
      this.errors.push('Missing types.ts file');
    }
  }

  private generateReport(): void {
    console.log('\n📊 Validation Report');
    console.log('='.repeat(50));

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('🎉 All validations passed! WebSocket consolidation is complete.');
      console.log('\n✅ Summary:');
      console.log('  - Core structure: ✅ Valid');
      console.log('  - Required files: ✅ Present');
      console.log('  - Imports: ✅ Clean');
      console.log('  - Exports: ✅ Complete');
      console.log('  - Types: ✅ Defined');
    } else {
      if (this.errors.length > 0) {
        console.log('❌ Errors found:');
        this.errors.forEach(error => console.log(`  - ${error}`));
      }

      if (this.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        this.warnings.forEach(warning => console.log(`  - ${warning}`));
      }

      console.log('\n📋 Next Steps:');
      if (this.errors.length > 0) {
        console.log('  1. Fix the errors listed above');
        console.log('  2. Run the migration script if files are missing');
        console.log('  3. Re-run this validation script');
      }
      if (this.warnings.length > 0) {
        console.log('  1. Review and update legacy imports');
        console.log('  2. Test the consolidated functionality');
        console.log('  3. Remove deprecated files when ready');
      }
    }

    console.log('\n🚀 Usage Examples:');
    console.log('  // Import the consolidated real-time service');
    console.log("  import { realTimeService, useWebSocket } from '@client/core/realtime';");
    console.log('');
    console.log('  // Initialize the service');
    console.log('  await realTimeService.initialize(token);');
    console.log('');
    console.log('  // Use hooks in components');
    console.log('  const { isConnected } = useWebSocket();');
    console.log('  const { subscribeToBill } = useBillTracking();');
  }
}

// CLI interface
async function main() {
  const validator = new WebSocketConsolidationValidator();

  try {
    await validator.validate();
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { WebSocketConsolidationValidator };
