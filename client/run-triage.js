#!/usr/bin/env node

/**
 * Simple script to run emergency triage and document the top 10 components
 * This script can be run in the browser console or as a Node.js script
 */

console.log('🚨 EMERGENCY TRIAGE - Frontend Race Condition Diagnostics');
console.log('=========================================================');
console.log('');
console.log('INSTRUCTIONS:');
console.log('1. Open your React application in the browser');
console.log('2. Open browser developer tools (F12)');
console.log('3. Copy and paste this entire script into the console');
console.log('4. The triage will run for 60 seconds automatically');
console.log('5. Results will be displayed and saved to localStorage');
console.log('');
console.log('BASELINE TARGET: Reduce 1500+ errors to <100 errors');
console.log('');

// Emergency Triage Implementation (Simplified for Console Use)
const EmergencyTriage = {
  errors: [],
  errorCounts: new Map(),
  isMonitoring: false,
  startTime: 0,
  originalConsoleError: null,
  originalConsoleWarn: null,

  start() {
    if (this.isMonitoring) {
      console.log('⚠️ Triage already running');
      return;
    }

    this.isMonitoring = true;
    this.startTime = Date.now();
    this.errors = [];
    this.errorCounts.clear();

    // Store original console methods
    this.originalConsoleError = console.error.bind(console);
    this.originalConsoleWarn = console.warn.bind(console);

    console.log('🚨 Emergency triage started - monitoring for 60 seconds...');

    // Intercept console.error
    console.error = (...args) => {
      this.captureError('error', args);
      this.originalConsoleError(...args);
    };

    // Intercept console.warn
    console.warn = (...args) => {
      this.captureError('warn', args);
      this.originalConsoleWarn(...args);
    };

    // Auto-stop after 60 seconds
    setTimeout(() => {
      this.stop();
    }, 60000);

    // Progress updates every 10 seconds
    let progressCount = 0;
    const progressInterval = setInterval(() => {
      progressCount += 10;
      if (progressCount >= 60) {
        clearInterval(progressInterval);
        return;
      }
      console.log(`⏱️ Progress: ${progressCount}s | Errors captured: ${this.errors.length}`);
    }, 10000);
  },

  captureError(level, args) {
    const message = args.map(arg => 
      typeof arg === 'string' ? arg : JSON.stringify(arg)
    ).join(' ');

    const error = this.analyzeError(message, level);
    if (error) {
      this.errors.push(error);
      
      const key = `${error.component}-${error.errorType}`;
      this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
      error.frequency = this.errorCounts.get(key);
    }
  },

  analyzeError(message, level) {
    const component = this.extractComponentName(message);
    if (!component) return null;

    const errorType = this.classifyErrorType(message);
    const severity = this.determineSeverity(message, errorType, level);

    return {
      component,
      errorType,
      message,
      timestamp: Date.now(),
      frequency: 1,
      severity,
      level
    };
  },

  extractComponentName(message) {
    // Common React component patterns
    const patterns = [
      /at (\w+) \(/,
      /in (\w+) \(/,
      /(\w+)\.tsx?:/,
      /Warning: (\w+)/,
      /Error in (\w+)/,
      /component="(\w+)"/,
      /\[(\w+)\]/,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Check for known problematic components
    const knownComponents = [
      'AppLayout', 'DesktopSidebar', 'MobileNavigation', 'WebSocketClient',
      'RealTimeTracker', 'PerformanceMonitor', 'NavigationPreferences',
      'BillCard', 'BillDetail', 'AuthPage', 'ErrorBoundary'
    ];

    for (const comp of knownComponents) {
      if (message.includes(comp)) {
        return comp;
      }
    }

    return 'Unknown';
  },

  classifyErrorType(message) {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('maximum update depth') || 
        lowerMessage.includes('too many re-renders') ||
        lowerMessage.includes('infinite loop')) {
      return 'infinite-render';
    }

    if (lowerMessage.includes('race condition') ||
        lowerMessage.includes('state update') ||
        lowerMessage.includes('concurrent')) {
      return 'race-condition';
    }

    if (lowerMessage.includes('memory') ||
        lowerMessage.includes('leak') ||
        lowerMessage.includes('cleanup')) {
      return 'memory-leak';
    }

    if (lowerMessage.includes('dependency') ||
        lowerMessage.includes('useeffect') ||
        lowerMessage.includes('missing dep')) {
      return 'dependency-issue';
    }

    if (lowerMessage.includes('mutation') ||
        lowerMessage.includes('immutable') ||
        lowerMessage.includes('direct assignment')) {
      return 'state-mutation';
    }

    if (lowerMessage.includes('event listener') ||
        lowerMessage.includes('websocket') ||
        lowerMessage.includes('cleanup')) {
      return 'event-listener-leak';
    }

    return 'unknown';
  },

  determineSeverity(message, errorType, level) {
    if (errorType === 'infinite-render' || 
        message.includes('maximum update depth') ||
        message.includes('browser crash')) {
      return 'critical';
    }

    if (level === 'error' && (
        errorType === 'race-condition' ||
        errorType === 'memory-leak' ||
        message.includes('performance')
    )) {
      return 'high';
    }

    if (level === 'warn' || 
        errorType === 'dependency-issue' ||
        errorType === 'state-mutation') {
      return 'medium';
    }

    return 'low';
  },

  stop() {
    if (!this.isMonitoring) {
      console.log('⚠️ Triage not running');
      return;
    }

    this.isMonitoring = false;
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Restore console methods
    console.error = this.originalConsoleError;
    console.warn = this.originalConsoleWarn;

    const report = this.generateReport(duration);
    this.displayResults(report);
    
    // Save to localStorage
    localStorage.setItem('emergency-triage-report', JSON.stringify(report, null, 2));
    
    return report;
  },

  generateReport(duration) {
    const errorsByComponent = new Map();
    const errorsByType = new Map();

    for (const error of this.errors) {
      // By component
      if (!errorsByComponent.has(error.component)) {
        errorsByComponent.set(error.component, []);
      }
      errorsByComponent.get(error.component).push(error);

      // By type
      if (!errorsByType.has(error.errorType)) {
        errorsByType.set(error.errorType, []);
      }
      errorsByType.get(error.errorType).push(error);
    }

    // Top offenders by frequency and severity
    const topOffenders = this.errors
      .sort((a, b) => {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const aScore = a.frequency * severityWeight[a.severity];
        const bScore = b.frequency * severityWeight[b.severity];
        return bScore - aScore;
      })
      .slice(0, 10);

    const criticalIssues = this.errors.filter(error => error.severity === 'critical');

    return {
      totalErrors: this.errors.length,
      errorsByComponent: Object.fromEntries(errorsByComponent),
      errorsByType: Object.fromEntries(errorsByType),
      topOffenders,
      criticalIssues,
      baseline: {
        startTime: this.startTime,
        endTime: Date.now(),
        duration,
        errorRate: (this.errors.length / duration) * 60000 // errors per minute
      }
    };
  },

  displayResults(report) {
    console.log('\n🚨 EMERGENCY TRIAGE RESULTS 🚨');
    console.log('================================');
    
    console.log(`\n📊 BASELINE METRICS:`);
    console.log(`   Total Errors: ${report.totalErrors}`);
    console.log(`   Duration: ${Math.round(report.baseline.duration / 1000)}s`);
    console.log(`   Error Rate: ${report.baseline.errorRate.toFixed(2)} errors/minute`);
    
    if (report.totalErrors >= 1500) {
      console.log(`   🔥 CRITICAL: Error count exceeds 1500 threshold!`);
    } else if (report.totalErrors >= 100) {
      console.log(`   ⚠️ HIGH: Error count above target of <100`);
    } else {
      console.log(`   ✅ GOOD: Error count within target range`);
    }

    console.log(`\n🔥 TOP 10 OFFENDING COMPONENTS:`);
    report.topOffenders.slice(0, 10).forEach((error, index) => {
      const icon = error.severity === 'critical' ? '🔥' : 
                   error.severity === 'high' ? '⚠️' : 
                   error.severity === 'medium' ? '⚡' : '💡';
      console.log(`   ${index + 1}. ${icon} ${error.component} (${error.errorType}) - ${error.frequency}x`);
    });

    console.log(`\n💥 CRITICAL ISSUES (${report.criticalIssues.length}):`);
    if (report.criticalIssues.length === 0) {
      console.log(`   ✅ No critical issues found`);
    } else {
      report.criticalIssues.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. 🔥 ${error.component}: ${error.message.substring(0, 80)}...`);
      });
    }

    console.log(`\n📈 ERROR BREAKDOWN BY TYPE:`);
    Object.entries(report.errorsByType).forEach(([type, errors]) => {
      const icon = type === 'infinite-render' ? '🔄' :
                   type === 'race-condition' ? '🏃' :
                   type === 'memory-leak' ? '💧' :
                   type === 'dependency-issue' ? '🔗' :
                   type === 'state-mutation' ? '🔀' :
                   type === 'event-listener-leak' ? '👂' : '❓';
      console.log(`   ${icon} ${type}: ${errors.length} errors`);
    });

    console.log(`\n🏗️ ERROR BREAKDOWN BY COMPONENT:`);
    const sortedComponents = Object.entries(report.errorsByComponent)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10);
    
    sortedComponents.forEach(([component, errors]) => {
      const criticalCount = errors.filter(e => e.severity === 'critical').length;
      const highCount = errors.filter(e => e.severity === 'high').length;
      const icon = criticalCount > 0 ? '🔥' : highCount > 0 ? '⚠️' : '💡';
      console.log(`   ${icon} ${component}: ${errors.length} errors (${criticalCount} critical, ${highCount} high)`);
    });

    console.log(`\n🎯 RECOMMENDED ACTIONS:`);
    console.log(`   1. Focus on components with >10 errors first`);
    console.log(`   2. Fix infinite render loops (likely AppLayout, WebSocket components)`);
    console.log(`   3. Add proper cleanup for event listeners and effects`);
    console.log(`   4. Implement circuit breakers for unstable components`);
    console.log(`   5. Re-run triage after fixes to measure improvement`);

    console.log(`\n📄 Report saved to localStorage as 'emergency-triage-report'`);
    console.log('================================');
  }
};

// Auto-start if running in browser
if (typeof window !== 'undefined') {
  console.log('🚀 Starting emergency triage in 3 seconds...');
  console.log('💡 Navigate around your app, interact with components to trigger errors');
  
  setTimeout(() => {
    EmergencyTriage.start();
  }, 3000);
  
  // Make available globally
  window.EmergencyTriage = EmergencyTriage;
} else {
  console.log('📋 Copy this script and run it in your browser console');
  console.log('🌐 Make sure your React application is running first');
}