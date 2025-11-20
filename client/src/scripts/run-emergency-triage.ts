#!/usr/bin/env node

/**
 * Emergency Triage Runner
 * 
 * This script runs the application and captures console errors in real-time
 * to identify the worst offending components causing race conditions.
 */

import { emergencyTriage, type TriageReport, type CircuitBreakerConfig } from '@client/utils/emergency-triage';
import { logger } from '@client/utils/logger';
import { fileURLToPath } from 'url';

interface TriageConfig {
  duration: number; // milliseconds
  outputFile?: string;
  circuitBreakers: CircuitBreakerConfig[];
  autoStart: boolean;
}

const DEFAULT_CONFIG: TriageConfig = {
  duration: 60000, // 1 minute
  outputFile: 'emergency-triage-report.json',
  circuitBreakers: [
    {
      component: 'AppLayout',
      enabled: true,
      errorThreshold: 10,
      timeWindow: 5000
    },
    {
      component: 'WebSocketClient',
      enabled: true,
      errorThreshold: 5,
      timeWindow: 3000
    },
    {
      component: 'DesktopSidebar',
      enabled: true,
      errorThreshold: 8,
      timeWindow: 5000
    },
    {
      component: 'MobileNavigation',
      enabled: true,
      errorThreshold: 8,
      timeWindow: 5000
    },
    {
      component: 'RealTimeTracker',
      enabled: true,
      errorThreshold: 5,
      timeWindow: 3000
    }
  ],
  autoStart: true
};

class EmergencyTriageRunner {
  private config: TriageConfig;
  private isRunning = false;
  private report: TriageReport | null = null;

  constructor(config: Partial<TriageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the emergency triage process
   */
  async start(): Promise<TriageReport> {
    if (this.isRunning) {
      throw new Error('Triage already running');
    }

    this.isRunning = true;
    console.log('🚨 Starting Emergency Triage...');
    console.log(`Duration: ${this.config.duration / 1000}s`);
    console.log(`Circuit Breakers: ${this.config.circuitBreakers.length} configured`);

    try {
      // Configure circuit breakers
      for (const breaker of this.config.circuitBreakers) {
        emergencyTriage.configureCircuitBreaker(breaker);
      }

      // Start monitoring
      emergencyTriage.startMonitoring();

      // Wait for specified duration
      await this.waitWithProgress(this.config.duration);

      // Stop monitoring and get report
      this.report = emergencyTriage.stopMonitoring();

      // Save report if output file specified
      if (this.config.outputFile) {
        await this.saveReport(this.report);
      }

      // Display summary
      this.displaySummary(this.report);

      return this.report;

    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Wait with progress indicator
   */
  private async waitWithProgress(duration: number): Promise<void> {
    const startTime = Date.now();
    const interval = 5000; // Update every 5 seconds

    return new Promise((resolve) => {
      const progressTimer = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = duration - elapsed;
        const status = emergencyTriage.getStatus();

        if (remaining <= 0) {
          clearInterval(progressTimer);
          resolve();
          return;
        }

        const progress = Math.round((elapsed / duration) * 100);
        console.log(`⏱️  Progress: ${progress}% | Errors: ${status.errorCount} | Top: [${status.topComponents.join(', ')}]`);
      }, interval);

      // Final timeout
      setTimeout(() => {
        clearInterval(progressTimer);
        resolve();
      }, duration);
    });
  }

  /**
   * Save report to file
   */
  private async saveReport(report: TriageReport): Promise<void> {
    if (typeof window !== 'undefined') {
      // Browser environment - use localStorage or download
      const reportData = this.serializeReport(report);
      localStorage.setItem('emergency-triage-report', reportData);
      
      // Also trigger download
      this.downloadReport(reportData);
      
      console.log('📄 Report saved to localStorage and downloaded');
    } else {
      // Node environment - save to file
      const fs = await import('fs');
      const path = await import('path');
      
      const reportData = this.serializeReport(report);
      const filePath = path.resolve(this.config.outputFile!);
      
      fs.writeFileSync(filePath, reportData, 'utf8');
      console.log(`📄 Report saved to: ${filePath}`);
    }
  }

  /**
   * Serialize report for saving
   */
  private serializeReport(report: TriageReport): string {
    // Convert Maps to objects for JSON serialization
    const serializable = {
      ...report,
      errorsByComponent: Object.fromEntries(report.errorsByComponent),
      errorsByType: Object.fromEntries(report.errorsByType),
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Download report in browser
   */
  private downloadReport(reportData: string): void {
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `emergency-triage-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Display summary of findings
   */
  private displaySummary(report: TriageReport): void {
    console.log('\n🚨 EMERGENCY TRIAGE REPORT 🚨');
    console.log('================================');
    
    console.log(`\n📊 BASELINE METRICS:`);
    console.log(`   Total Errors: ${report.totalErrors}`);
    console.log(`   Duration: ${Math.round(report.baseline.duration / 1000)}s`);
    console.log(`   Error Rate: ${report.baseline.errorRate.toFixed(2)} errors/minute`);
    
    if (report.totalErrors >= 1500) {
      console.log(`   🔥 CRITICAL: Error count exceeds 1500 threshold!`);
    } else if (report.totalErrors >= 100) {
      console.log(`   ⚠️  HIGH: Error count above target of <100`);
    } else {
      console.log(`   ✅ GOOD: Error count within target range`);
    }

    console.log(`\n🔥 TOP 10 OFFENDING COMPONENTS:`);
    report.topOffenders.slice(0, 10).forEach((error, index) => {
      const icon = error.severity === 'critical' ? '🔥' : 
                   error.severity === 'high' ? '⚠️' : 
                   error.severity === 'medium' ? '⚡' : '💡';
      console.log(`   ${index + 1}. ${icon} ${error.component} (${error.errorType}) - ${error.frequency}x`);
      console.log(`      "${error.message.substring(0, 80)}..."`);
    });

    console.log(`\n💥 CRITICAL ISSUES (${report.criticalIssues.length}):`);
    if (report.criticalIssues.length === 0) {
      console.log(`   ✅ No critical issues found`);
    } else {
      report.criticalIssues.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. 🔥 ${error.component}: ${error.message}`);
      });
    }

    console.log(`\n📈 ERROR BREAKDOWN BY TYPE:`);
    const sortedTypes = Array.from(report.errorsByType.entries())
      .sort((a, b) => b[1].length - a[1].length);
    
    sortedTypes.forEach(([type, errors]) => {
      const icon = type === 'infinite-render' ? '🔄' :
                   type === 'race-condition' ? '🏃' :
                   type === 'memory-leak' ? '💧' :
                   type === 'dependency-issue' ? '🔗' :
                   type === 'state-mutation' ? '🔀' :
                   type === 'event-listener-leak' ? '👂' : '❓';
      console.log(`   ${icon} ${type}: ${errors.length} errors`);
    });

    console.log(`\n🏗️  ERROR BREAKDOWN BY COMPONENT:`);
    const sortedComponents = Array.from(report.errorsByComponent.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    sortedComponents.forEach(([component, errors]) => {
      const criticalCount = errors.filter(e => e.severity === 'critical').length;
      const highCount = errors.filter(e => e.severity === 'high').length;
      const icon = criticalCount > 0 ? '🔥' : highCount > 0 ? '⚠️' : '💡';
      console.log(`   ${icon} ${component}: ${errors.length} errors (${criticalCount} critical, ${highCount} high)`);
    });

    console.log(`\n🎯 RECOMMENDED ACTIONS:`);
    
    if (report.criticalIssues.length > 0) {
      console.log(`   1. 🔥 IMMEDIATE: Fix critical issues in ${[...new Set(report.criticalIssues.map(e => e.component))].join(', ')}`);
    }
    
    const infiniteRenders = report.errorsByType.get('infinite-render') || [];
    if (infiniteRenders.length > 0) {
      console.log(`   2. 🔄 HIGH: Fix infinite render loops in ${[...new Set(infiniteRenders.map(e => e.component))].join(', ')}`);
    }
    
    const raceConditions = report.errorsByType.get('race-condition') || [];
    if (raceConditions.length > 0) {
      console.log(`   3. 🏃 HIGH: Fix race conditions in ${[...new Set(raceConditions.map(e => e.component))].join(', ')}`);
    }
    
    const memoryLeaks = report.errorsByType.get('memory-leak') || [];
    if (memoryLeaks.length > 0) {
      console.log(`   4. 💧 MEDIUM: Fix memory leaks in ${[...new Set(memoryLeaks.map(e => e.component))].join(', ')}`);
    }

    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Focus on components with >10 errors first`);
    console.log(`   2. Fix infinite render loops (AppLayout, WebSocket components)`);
    console.log(`   3. Implement circuit breakers for unstable components`);
    console.log(`   4. Add proper cleanup for event listeners and effects`);
    console.log(`   5. Re-run triage after fixes to measure improvement`);

    console.log('\n================================');
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      report: this.report,
      config: this.config
    };
  }
}

// Export for use in other modules
export { EmergencyTriageRunner };

// CLI usage when run directly
if (typeof window === 'undefined' && import.meta.url.endsWith('run-emergency-triage.ts')) {
  const runner = new EmergencyTriageRunner();
  
  runner.start()
    .then((report) => {
      console.log('\n✅ Emergency triage completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Emergency triage failed:', error);
      process.exit(1);
    });
}

// Browser usage
if (typeof window !== 'undefined') {
  // Make available globally for browser console usage
  (window as any).EmergencyTriageRunner = EmergencyTriageRunner;
  (window as any).startEmergencyTriage = () => {
    const runner = new EmergencyTriageRunner();
    return runner.start();
  };
}