#!/usr/bin/env node

/**
 * Runtime Diagnostics & Leak Detector - Final Edition v4.0
 * 
 * A comprehensive automated analysis tool that identifies runtime performance issues
 * through statistical analysis and behavioral monitoring. This tool detects:
 * 
 * - Memory Leaks: Uses forced GC and linear regression to detect true leaks vs caching
 * - Infinite Render Loops: Monitors React commits and burst patterns to catch runaway renders
 * - Race Conditions: Analyzes async operation timing to find concurrent conflicts
 * - Resource Leaks: Tracks timers, intervals, listeners, and connections lifecycle
 * - Console Spam: Detects excessive logging that often indicates infinite loops
 * 
 * Prerequisites:
 *   npm install playwright chalk
 * 
 * Usage Examples:
 *   node runtime-diagnostics.js
 *   BASE_URL=http://localhost:3000 DURATION=60 node runtime-diagnostics.js
 *   ROUTES="/,/dashboard" THRESHOLD_MEMORY=0.8 DEBUG=true node runtime-diagnostics.js
 * 
 * Key Features:
 * - Statistical regression analysis for accurate leak detection
 * - Forced garbage collection to eliminate false positives
 * - Severity classification with actionable recommendations
 * - Comprehensive markdown reports with progression data
 * - Configurable thresholds for different application types
 */

import fs from 'fs/promises';
import path from 'path';
import { chromium } from 'playwright';
import chalk from 'chalk';

// ============================================================================
// CONFIGURATION SYSTEM
// ============================================================================

/**
 * Configuration is driven by environment variables for flexibility across
 * different deployment scenarios. Each threshold is carefully chosen based on
 * real-world performance characteristics that indicate problems.
 */
const CONFIG = {
  // Target application
  baseUrl: (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, ''),
  
  // Test duration - longer tests catch slower leaks but take more time
  // 30 seconds is a good balance between thoroughness and speed
  monitorDuration: parseInt(process.env.DURATION || '30', 10),
  
  // Routes to test - comma-separated list of paths to monitor
  routes: process.env.ROUTES 
    ? process.env.ROUTES.split(',').map(r => r.trim()) 
    : ['/', '/dashboard', '/profile'],
  
  /**
   * Detection Thresholds
   * 
   * These thresholds are based on empirical testing across many applications.
   * Adjust them based on your application's characteristics:
   * 
   * - memoryGrowth: MB per second of sustained growth (0.5 is aggressive caching, 1+ is a leak)
   * - renderRate: Average renders per second (5 is normal, 10+ indicates problems)
   * - consoleLog: Logs per second (10 is chatty, 20+ often means infinite loops)
   * - renderBurst: Max renders in 1 second window (50+ is definitely a runaway loop)
   */
  thresholds: {
    memoryGrowth: parseFloat(process.env.THRESHOLD_MEMORY || '0.5'),
    renderRate: parseInt(process.env.THRESHOLD_RENDER || '10', 10),
    consoleLog: parseInt(process.env.THRESHOLD_CONSOLE || '20', 10),
    networkRequest: parseInt(process.env.THRESHOLD_NETWORK || '50', 10),
    renderBurst: 50,
    rapidStateUpdate: 10,
    activeTimers: 5,
    activeIntervals: 2,
    eventListeners: 20,
  },
  
  // Sampling intervals - these control how often we check various metrics
  sampling: {
    memoryInterval: 2000, // Take memory snapshot every 2 seconds
    monitorCheckInterval: 1000, // Check render counts every second
    interactionDelay: 500, // Wait between user interactions
    navigationDelay: 1000, // Wait after navigation for page to settle
    gcSettleTime: 500, // Wait for garbage collection to complete
  },
  
  // Output configuration
  output: {
    dir: process.env.OUTPUT_DIR || 'docs',
    reportFile: 'runtime-diagnostics.md',
  },
  
  /**
   * Browser arguments for enhanced diagnostics
   * 
   * --js-flags=--expose-gc: Critical! This exposes window.gc() so we can force
   *   garbage collection before taking measurements. Without this, we can't
   *   distinguish real leaks from objects waiting to be collected.
   * 
   * --enable-precise-memory-info: Provides accurate heap size measurements
   *   instead of rounded values (Chrome limits precision by default)
   * 
   * --no-sandbox: Required in some CI/CD environments
   * 
   * --disable-blink-features=AutomationControlled: Makes automation less detectable
   */
  browserArgs: [
    '--js-flags=--expose-gc',
    '--enable-precise-memory-info',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-blink-features=AutomationControlled',
  ],
  
  // Enable verbose logging for debugging the diagnostic tool itself
  debug: process.env.DEBUG === 'true',
};

// ============================================================================
// DIAGNOSTIC DATA COLLECTION
// ============================================================================

/**
 * Central collector for all diagnostic data. This maintains separation between
 * detection logic and data storage, making it easier to add new issue types
 * or change the reporting format without touching detection code.
 */
class DiagnosticsCollector {
  constructor() {
    // Issue storage organized by type for easy reporting
    this.issues = {
      memoryLeaks: [],
      infiniteRenders: [],
      raceConditions: [],
      resourceLeaks: [],
      concurrencyIssues: [],
    };
    
    // High-level statistics for the executive summary
    this.stats = {
      routesTested: 0,
      issuesFound: 0,
      issuesByType: {},
      startTime: Date.now(),
    };
  }
  
  /**
   * Adds an issue to the collection and updates statistics.
   * The type must match one of the keys in this.issues.
   */
  addIssue(type, issue) {
    if (!this.issues[type]) {
      throw new Error(`Unknown issue type: ${type}`);
    }
    
    this.issues[type].push(issue);
    this.stats.issuesFound++;
    this.stats.issuesByType[type] = (this.stats.issuesByType[type] || 0) + 1;
  }
  
  /**
   * Check if any critical issues were found.
   * Critical issues include high or critical severity memory leaks and render loops.
   */
  hasCriticalIssues() {
    return this.issues.memoryLeaks.some(i => i.severity === 'critical' || i.severity === 'high') ||
           this.issues.infiniteRenders.some(i => i.severity === 'critical' || i.severity === 'high');
  }
  
  get totalDuration() {
    return Date.now() - this.stats.startTime;
  }
}

const collector = new DiagnosticsCollector();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Logging utility with color-coded output for better visibility in terminal.
 * Using chalk for cross-platform color support.
 */
const Logger = {
  log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}]`;
    
    const styles = {
      success: { color: chalk.green, icon: '✓' },
      error: { color: chalk.red, icon: '✗' },
      warning: { color: chalk.yellow, icon: '⚠' },
      debug: { color: chalk.magenta, icon: '🔍' },
      info: { color: chalk.blue, icon: 'ℹ' },
    };
    
    const style = styles[type] || styles.info;
    
    // Skip debug messages unless debug mode is enabled
    if (type === 'debug' && !CONFIG.debug) return;
    
    console.log(style.color(`${prefix} ${style.icon}`), message);
  },
  
  success(msg) { this.log(msg, 'success'); },
  error(msg) { this.log(msg, 'error'); },
  warning(msg) { this.log(msg, 'warning'); },
  debug(msg) { this.log(msg, 'debug'); },
  info(msg) { this.log(msg, 'info'); },
};

/**
 * Formatting utilities for making numbers human-readable.
 * Consistent formatting across all reports improves readability.
 */
const Formatter = {
  bytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
  },
  
  duration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  },
  
  number(num, decimals = 2) {
    return Number(num).toFixed(decimals);
  },
};

// ============================================================================
// STATISTICAL ANALYSIS
// ============================================================================

/**
 * Linear Regression for Memory Leak Detection
 * 
 * This is the mathematical foundation for distinguishing real memory leaks from
 * normal caching behavior. A true memory leak shows consistent linear growth
 * over time, which linear regression can detect.
 * 
 * How it works:
 * 1. We plot memory usage (Y axis) against time (X axis)
 * 2. We calculate the best-fit line through these points
 * 3. The slope tells us the rate of growth (MB per second)
 * 4. R-squared tells us how consistent the growth is (0 = random, 1 = perfect line)
 * 
 * A memory leak will have:
 * - Positive slope (memory increasing over time)
 * - High R-squared (consistent growth, not random fluctuation)
 * 
 * Normal caching will have:
 * - Low or zero slope (memory stabilizes after initial allocation)
 * - Lower R-squared (irregular pattern as cache hits/misses)
 */
class LinearRegression {
  static analyze(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length < 2) {
      throw new Error('Invalid data for regression analysis');
    }
    
    const n = xValues.length;
    
    // Calculate sums needed for regression formula
    const sumX = xValues.reduce((a, b) => a + b, 0);
    const sumY = yValues.reduce((a, b) => a + b, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumX2 = xValues.reduce((sum, x) => sum + x * x, 0);
    
    // Linear regression formula: y = slope * x + intercept
    // This is derived from minimizing the sum of squared errors
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared (coefficient of determination)
    // R-squared measures how well the line fits the data
    // 1.0 = perfect fit, 0.0 = no correlation
    const yMean = sumY / n;
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal === 0 ? 1 : 1 - (ssResidual / ssTotal);
    
    return {
      slope,
      intercept,
      rSquared,
      predict: (x) => slope * x + intercept,
    };
  }
}

// ============================================================================
// MEMORY LEAK DETECTION
// ============================================================================

/**
 * Memory Leak Detector with Forced Garbage Collection
 * 
 * This class implements the most rigorous memory leak detection by:
 * 1. Forcing garbage collection before initial measurement (eliminate noise)
 * 2. Taking periodic snapshots during application use
 * 3. Triggering interactions to create memory pressure
 * 4. Forcing GC again before final measurement (ensure real leak, not pending GC)
 * 5. Using regression analysis to detect consistent growth patterns
 * 
 * This approach eliminates false positives from objects that are eligible for
 * collection but haven't been collected yet, which is the main weakness of
 * simpler memory monitoring approaches.
 */
class MemoryLeakDetector {
  constructor(page, route) {
    this.page = page;
    this.route = route;
    this.snapshots = [];
  }
  
  async detect() {
    Logger.info(`Monitoring memory usage on ${this.route}...`);
    
    // Force initial garbage collection to establish clean baseline
    await this.forceGarbageCollection();
    Logger.debug('Initial GC completed, establishing baseline...');
    
    const startTime = Date.now();
    const duration = CONFIG.monitorDuration * 1000;
    const interval = CONFIG.sampling.memoryInterval;
    
    // Collect memory snapshots over time while simulating usage
    while (Date.now() - startTime < duration) {
      const snapshot = await this.captureMemorySnapshot(Date.now() - startTime);
      if (snapshot) {
        this.snapshots.push(snapshot);
      }
      
      // Halfway through, trigger aggressive interactions to test memory release
      // This is critical: if memory is properly managed, it should not grow
      // significantly during interaction and should return to baseline after GC
      if (this.snapshots.length === Math.floor(duration / interval / 2)) {
        Logger.debug('Triggering aggressive interactions to test memory management...');
        await this.stressTestMemory();
      }
      
      await this.page.waitForTimeout(interval);
    }
    
    // Final garbage collection and measurement to confirm leak
    // This is the key distinction from simpler approaches: we verify that
    // memory is still elevated even after forcing collection
    await this.forceGarbageCollection();
    await this.page.waitForTimeout(CONFIG.sampling.gcSettleTime);
    
    const finalSnapshot = await this.captureMemorySnapshot(duration);
    if (finalSnapshot) {
      this.snapshots.push(finalSnapshot);
    }
    
    return this.analyze();
  }
  
  /**
   * Forces garbage collection if window.gc() is available.
   * This requires the --js-flags=--expose-gc browser flag.
   * 
   * Why this matters: JavaScript's garbage collector runs automatically but
   * unpredictably. Without forcing GC, we might measure memory that's already
   * eligible for collection but hasn't been collected yet, leading to false
   * positives about memory leaks.
   */
  async forceGarbageCollection() {
    try {
      await this.page.evaluate(() => {
        if (typeof window.gc === 'function') {
          window.gc();
          return true;
        }
        return false;
      });
    } catch (error) {
      Logger.debug(`Could not force GC: ${error.message}`);
    }
  }
  
  /**
   * Creates memory pressure through rapid DOM manipulation and interactions.
   * This aggressive approach is borrowed from Script 1 and helps expose leaks
   * that only manifest under heavy usage.
   */
  async stressTestMemory() {
    try {
      // Rapid scrolling creates and destroys scroll event contexts
      for (let i = 0; i < 10; i++) {
        await this.page.evaluate(() => {
          window.scrollTo(0, Math.random() * document.body.scrollHeight);
        });
        await this.page.waitForTimeout(100);
      }
      
      // Click buttons to trigger event handlers and state changes
      const buttons = await this.page.locator('button:visible').all();
      if (buttons.length > 0) {
        for (let i = 0; i < Math.min(3, buttons.length); i++) {
          try {
            await buttons[i].click({ timeout: 500 });
            await this.page.waitForTimeout(200);
          } catch (e) {
            // Some buttons might not be clickable, that's OK
          }
        }
      }
    } catch (error) {
      Logger.debug(`Stress test failed: ${error.message}`);
    }
  }
  
  async captureMemorySnapshot(timestamp) {
    try {
      const metrics = await this.page.evaluate(() => {
        // Chrome's performance.memory provides heap size information
        // This is more accurate than trying to track individual objects
        if (performance.memory) {
          return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          };
        }
        return null;
      });
      
      return metrics ? { timestamp, ...metrics } : null;
    } catch (error) {
      Logger.debug(`Error capturing memory snapshot: ${error.message}`);
      return null;
    }
  }
  
  analyze() {
    if (this.snapshots.length < 6) {
      Logger.warning(`Insufficient memory data for ${this.route} (${this.snapshots.length} snapshots)`);
      return null;
    }
    
    // Convert to seconds and MB for human-readable analysis
    const timeInSeconds = this.snapshots.map(s => s.timestamp / 1000);
    const memoryInMB = this.snapshots.map(s => s.usedJSHeapSize / (1024 * 1024));
    
    // Perform linear regression to detect growth trend
    const regression = LinearRegression.analyze(timeInSeconds, memoryInMB);
    
    const totalGrowth = memoryInMB[memoryInMB.length - 1] - memoryInMB[0];
    const growthRate = regression.slope;
    
    /**
     * Leak Detection Logic:
     * 
     * A true memory leak must satisfy TWO conditions:
     * 1. Growth rate exceeds threshold (indicates memory is increasing)
     * 2. R-squared > 0.7 (indicates growth is consistent, not random)
     * 
     * This dual requirement eliminates false positives from:
     * - Initial caching (high growth but low R-squared)
     * - Random fluctuations (may appear to grow but inconsistent)
     * - One-time allocations (spike then stable = low R-squared)
     */
    const isLeaking = growthRate > CONFIG.thresholds.memoryGrowth && regression.rSquared > 0.7;
    
    const analysis = {
      isLeaking,
      growthRate,
      totalGrowth,
      rSquared: regression.rSquared,
      ...this.categorizeMemoryPattern(growthRate, totalGrowth, isLeaking, regression.rSquared),
    };
    
    if (isLeaking) {
      collector.addIssue('memoryLeaks', {
        route: this.route,
        ...analysis,
        snapshots: this.formatSnapshots(),
      });
      Logger.error(`Memory leak detected on ${this.route}: ${Formatter.number(growthRate)} MB/s (R²=${Formatter.number(regression.rSquared, 3)})`);
    } else {
      Logger.success(`Memory usage stable on ${this.route} (growth: ${Formatter.number(totalGrowth)} MB, R²=${Formatter.number(regression.rSquared, 3)})`);
    }
    
    return analysis;
  }
  
  /**
   * Categorizes memory patterns and provides specific recommendations.
   * The severity level helps teams prioritize fixes.
   */
  categorizeMemoryPattern(growthRate, totalGrowth, isLeaking, rSquared) {
    // Not leaking but significant growth might indicate aggressive caching
    if (!isLeaking) {
      if (totalGrowth > 50 && rSquared < 0.7) {
        return {
          severity: 'low',
          pattern: 'significant but stabilizing',
          recommendation: 'Initial memory growth detected but appears to stabilize. This is often normal for applications that cache data. Monitor over longer periods to ensure it does not continue growing indefinitely. Consider implementing cache size limits if growth continues.',
        };
      }
      return {
        severity: 'none',
        pattern: 'stable',
        recommendation: 'Memory usage is stable and within expected parameters.',
      };
    }
    
    // Categorize leak severity based on growth rate
    // These thresholds are based on real-world impact:
    // - 2+ MB/s: Application becomes unusable in minutes
    // - 1+ MB/s: Application degrades within an hour
    // - 0.5+ MB/s: Problems appear in long-running sessions
    if (growthRate > 2) {
      return {
        severity: 'critical',
        pattern: 'rapid continuous growth',
        recommendation: 'This indicates a severe memory leak that will quickly degrade performance and crash the application. Check for event listeners that are not removed on cleanup, closures capturing large objects unnecessarily, or data structures that grow unbounded. Use Chrome DevTools memory profiler to take heap snapshots at different points and compare them using the "Comparison" view to identify what objects are accumulating. Look for detached DOM nodes (nodes removed from the document but still referenced in JavaScript) and retained event handlers. Common culprits include setInterval without clearInterval, addEventListener without removeEventListener, and React components that subscribe to stores but never unsubscribe.',
      };
    }
    
    if (growthRate > 1) {
      return {
        severity: 'high',
        pattern: 'steady continuous growth',
        recommendation: 'Memory grows steadily over time, which will cause problems in long-running sessions. Look for accumulating DOM nodes, cached data never being cleared, or components that do not properly unmount. Implement cleanup functions in useEffect return statements (React), beforeUnmount hooks (Vue), or ngOnDestroy (Angular). Review any global state or singletons that might be holding references to disposed objects. Use WeakMap instead of Map for caches where entries should be garbage collected when keys are no longer referenced. Implement periodic cache cleanup or limit cache sizes using LRU (Least Recently Used) eviction strategies.',
      };
    }
    
    return {
      severity: 'medium',
      pattern: 'gradual growth',
      recommendation: 'Memory grows slowly but consistently. This might be acceptable depending on your application requirements and expected session length, but should be monitored in production. Consider implementing periodic cleanup routines or limiting cache sizes. Use WeakMap instead of Map where possible to allow garbage collection of unused keys. Profile your application to identify which objects are accumulating and whether they serve a purpose. Sometimes this pattern indicates inefficient data structures where the same data is duplicated rather than shared.',
    };
  }
  
  /**
   * Formats snapshots for the report, including first few, last few, and
   * an ellipsis marker to indicate omitted middle values.
   */
  formatSnapshots() {
    const samples = [
      ...this.snapshots.slice(0, 5),
      ...(this.snapshots.length > 8 ? [{ marker: '...' }] : []),
      ...this.snapshots.slice(-3),
    ];
    
    return samples.map(s => 
      s.marker ? s.marker : {
        time: Formatter.number(s.timestamp / 1000, 1) + 's',
        memory: Formatter.bytes(s.usedJSHeapSize),
      }
    );
  }
}

// ============================================================================
// INFINITE RENDER DETECTION
// ============================================================================

/**
 * Infinite Render Detector with Console Spam Detection
 * 
 * This class detects runaway render loops by monitoring multiple signals:
 * 1. React DevTools commit hooks (when available)
 * 2. Console spam (infinite loops often produce excessive logging)
 * 3. Render burst patterns (50+ renders in 1 second indicates a loop)
 * 
 * The combination of these approaches catches render loops even in non-React
 * applications or when React DevTools isn't available.
 */
class InfiniteRenderDetector {
  constructor(page, route) {
    this.page = page;
    this.route = route;
    this.renderEvents = [];
    this.consoleCount = 0;
  }
  
  async detect() {
    Logger.info(`Monitoring for render loops on ${this.route}...`);
    
    await this.injectMonitoring();
    await this.collectRenderData();
    
    return this.analyze();
  }
  
  /**
   * Injects monitoring code into the page context.
   * This hooks into both React DevTools and console methods to catch loops.
   */
  async injectMonitoring() {
    await this.page.evaluate(() => {
      window.__diagnosticData = {
        renders: [],
        consoleCallCount: 0,
        domMutationCount: 0,
      };
      
      /**
       * Console Hook for Spam Detection
       * 
       * Infinite loops often manifest as console spam before performance
       * degrades visibly. By counting console calls, we get an early warning.
       * This is borrowed from Script 1 and is surprisingly effective.
       */
      ['log', 'warn', 'error', 'info'].forEach(method => {
        const original = console[method];
        console[method] = function(...args) {
          window.__diagnosticData.consoleCallCount++;
          original.apply(console, args);
        };
      });
      
      /**
       * React DevTools Hook
       * 
       * React DevTools exposes a global hook that we can tap into to monitor
       * fiber commits, which represent component renders. This is the most
       * accurate way to track React rendering behavior.
       */
      if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const hook = window.__REACT_DEVTOOLS_GLOBAL_HOOK__;
        const originalOnCommit = hook.onCommitFiberRoot;
        
        hook.onCommitFiberRoot = function(id, root, priorityLevel) {
          window.__diagnosticData.renders.push({
            timestamp: Date.now(),
            rootId: id,
          });
          
          if (originalOnCommit) {
            return originalOnCommit.apply(this, arguments);
          }
        };
      }
      
      /**
       * Fallback DOM Mutation Observer
       * 
       * For non-React apps or when DevTools isn't available, we count DOM
       * mutations as a proxy for rendering. This is less accurate but better
       * than nothing.
       */
      if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        const observer = new MutationObserver((mutations) => {
          window.__diagnosticData.domMutationCount += mutations.length;
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
        });
      }
    });
  }
  
  async collectRenderData() {
    const startTime = Date.now();
    const duration = CONFIG.monitorDuration * 1000;
    const checkInterval = CONFIG.sampling.monitorCheckInterval;
    
    while (Date.now() - startTime < duration) {
      try {
        const data = await this.page.evaluate(() => {
          const result = { ...window.__diagnosticData };
          // Reset render array for next collection to avoid memory growth
          window.__diagnosticData.renders = [];
          return result;
        });
        
        if (data.renders && data.renders.length > 0) {
          this.renderEvents.push(...data.renders);
        }
        
        this.consoleCount = data.consoleCallCount;
      } catch (error) {
        Logger.debug(`Error collecting render data: ${error.message}`);
      }
      
      await this.page.waitForTimeout(checkInterval);
    }
  }
  
  analyze() {
    const duration = CONFIG.monitorDuration;
    const totalRenders = this.renderEvents.length;
    const renderRate = totalRenders / duration;
    const consoleRate = this.consoleCount / duration;
    
    // Detect render bursts by grouping into 1-second windows
    const renderBursts = this.detectRenderBursts();
    const maxBurstSize = Math.max(...renderBursts, 0);
    
    /**
     * Multiple signals for loop detection:
     * 1. High average render rate (sustained high activity)
     * 2. Large render bursts (sudden spikes of 50+ renders)
     * 3. Excessive console logging (often accompanies loops)
     */
    const hasInfiniteLoop = renderRate > CONFIG.thresholds.renderRate || 
                           maxBurstSize > CONFIG.thresholds.renderBurst ||
                           consoleRate > CONFIG.thresholds.consoleLog;
    
    const analysis = {
      hasInfiniteLoop,
      renderRate,
      totalRenders,
      maxBurstSize,
      consoleRate,
      ...this.categorizeRenderPattern(renderRate, maxBurstSize, consoleRate, hasInfiniteLoop),
    };
    
    if (hasInfiniteLoop) {
      collector.addIssue('infiniteRenders', {
        route: this.route,
        ...analysis,
      });
      Logger.error(`Infinite render loop on ${this.route}: ${Formatter.number(renderRate, 1)} renders/s, ${Formatter.number(consoleRate, 1)} logs/s`);
    } else if (renderRate > 5) {
      Logger.warning(`Elevated render rate on ${this.route}: ${Formatter.number(renderRate, 1)} renders/s`);
    } else {
      Logger.success(`Render rate normal on ${this.route}`);
    }
    
    return analysis;
  }
  
  /**
   * Detects render bursts by counting renders in 1-second windows.
   * A burst of 50+ renders in one second almost always indicates a loop.
   */
  detectRenderBursts() {
    const windowSize = 1000; // 1-second windows
    const windows = new Map();
    
    this.renderEvents.forEach(event => {
      const window = Math.floor(event.timestamp / windowSize);
      windows.set(window, (windows.get(window) || 0) + 1);
    });
    
    return Array.from(windows.values());
  }
  
  categorizeRenderPattern(renderRate, maxBurst, consoleRate, hasLoop) {
    if (!hasLoop) {
      return {
        severity: 'none',
        pattern: 'normal',
        recommendation: 'Render frequency is within acceptable parameters.',
      };
    }
    
    // Console spam is a strong signal of infinite loops
    if (consoleRate > CONFIG.thresholds.consoleLog * 2) {
      return {
        severity: 'critical',
        pattern: 'excessive console output with rapid renders',
        recommendation: 'The combination of rapid renders and excessive console output strongly indicates an infinite render loop with logging inside the render path. Check for console.log statements inside component render functions or useEffect hooks without proper dependencies. Remove or throttle logging in hot code paths. Look for state updates that trigger re-renders which then log and trigger more state updates.',
      };
    }
    
    if (maxBurst > 100) {
      return {
        severity: 'critical',
        pattern: 'continuous rapid renders',
        recommendation: 'This indicates a severe infinite render loop that will freeze the UI and potentially crash the browser. Check for state updates inside render functions, useEffect hooks without proper dependency arrays, or derived state calculations that trigger re-renders. Common causes include calling setState directly in the component body, useEffect hooks that update state they depend on, or parent components passing new object references as props on every render. Use React DevTools Profiler to identify which components are rendering repeatedly.',
      };
    }
    
    if (renderRate > 20) {
      return {
        severity: 'high',
        pattern: 'very frequent renders',
        recommendation: 'Components are re-rendering excessively. Review your component hierarchy for unnecessary renders. Use React.memo to prevent child components from re-rendering when props have not changed. Apply useMemo for expensive calculations and useCallback for event handlers passed as props. Check if state updates could be batched using startTransition for non-urgent updates. Ensure objects and arrays passed as props are not recreated on every render (use useMemo for complex objects).',
      };
    }
    
    return {
      severity: 'medium',
      pattern: 'frequent renders',
      recommendation: 'Render rate is higher than optimal. Look for state updates that could be batched, or components subscribing to state they do not actually use. Review props being passed down that might be causing cascading renders. Consider lifting state up or using context more efficiently to prevent intermediate components from re-rendering. Use the React DevTools Profiler to identify which components render most frequently and whether those renders are necessary.',
    };
  }
}

// ============================================================================
// RACE CONDITION DETECTION
// ============================================================================

/**
 * Race Condition Detector
 * 
 * Detects race conditions by monitoring async operation timing. Race conditions
 * occur when multiple async operations access shared state and their order of
 * completion affects correctness.
 */
class RaceConditionDetector {
  constructor(page, route) {
    this.page = page;
    this.route = route;
    this.asyncOperations = [];
  }
  
  async detect() {
    Logger.info(`Monitoring for race conditions on ${this.route}...`);
    
    await this.injectAsyncMonitoring();
    await this.triggerConcurrentOperations();
    await this.collectAsyncData();
    
    return this.analyze();
  }
  
  /**
   * Hooks into fetch to track request timing.
   * We need to know when requests start and when they complete to detect overlaps.
   */
  async injectAsyncMonitoring() {
    await this.page.evaluate(() => {
      window.__asyncMonitor = { operations: [] };
      
      const originalFetch = window.fetch;
      window.fetch = function(...args) {
        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
        const startTime = Date.now();
        
        return originalFetch.apply(this, args).then(
          response => {
            window.__asyncMonitor.operations.push({
              type: 'fetch',
              url,
              status: response.status,
              duration: Date.now() - startTime,
              timestamp: startTime,
            });
            return response;
          },
          error => {
            window.__asyncMonitor.operations.push({
              type: 'fetch',
              url,
              status: 'failed',
              error: error.message,
              duration: Date.now() - startTime,
              timestamp: startTime,
            });
            throw error;
          }
        );
      };
    });
  }
  
  async triggerConcurrentOperations() {
    // Trigger rapid interactions to expose race conditions
    await UserInteractionSimulator.simulate(this.page);
    await this.page.waitForTimeout(CONFIG.sampling.interactionDelay);
  }
  
  async collectAsyncData() {
    try {
      const data = await this.page.evaluate(() => window.__asyncMonitor || {});
      if (data.operations) {
        this.asyncOperations = data.operations;
      }
    } catch (error) {
      Logger.debug(`Error collecting async data: ${error.message}`);
    }
  }
  
  analyze() {
    const patterns = [];
    const suspiciousOperations = [];
    
    // Group operations by URL to find concurrent requests to same endpoint
    const urlGroups = this.groupOperationsByUrl();
    
    let hasRaceConditions = false;
    let failureCount = 0;
    
    /**
     * Race condition detection logic:
     * 1. Find operations to the same URL that overlap in time
     * 2. Detect rapid-fire requests (multiple requests < 100ms apart)
     * 3. Track failures which may be race condition consequences
     */
    urlGroups.forEach((operations, url) => {
      const overlaps = this.findOverlappingOperations(operations);
      
      if (overlaps.length > 0) {
        hasRaceConditions = true;
        patterns.push(`Concurrent requests to ${url} (${overlaps.length} overlaps)`);
        suspiciousOperations.push({
          url,
          count: operations.length,
          overlaps: overlaps.length,
        });
      }
      
      const failures = operations.filter(op => 
        op.status === 'failed' || (typeof op.status === 'number' && op.status >= 400)
      );
      failureCount += failures.length;
    });
    
    const rapidRequests = this.detectRapidRequests();
    if (rapidRequests > 3) {
      hasRaceConditions = true;
      patterns.push(`${rapidRequests} rapid-fire requests detected`);
    }
    
    const severity = this.determineSeverity(hasRaceConditions, failureCount, patterns.length);
    
    const analysis = {
      hasRaceConditions,
      severity,
      patterns,
      suspiciousOperations,
      recommendation: this.getRecommendation(severity),
    };
    
    if (hasRaceConditions) {
      collector.addIssue('raceConditions', {
        route: this.route,
        ...analysis,
      });
      Logger.error(`Potential race conditions detected on ${this.route}`);
    } else {
      Logger.success(`No obvious race conditions on ${this.route}`);
    }
    
    return analysis;
  }
  
  groupOperationsByUrl() {
    const groups = new Map();
    
    this.asyncOperations
      .filter(op => op.type === 'fetch')
      .forEach(op => {
        if (!groups.has(op.url)) {
          groups.set(op.url, []);
        }
        groups.get(op.url).push(op);
      });
    
    return groups;
  }
  
  /**
   * Finds overlapping operations by checking if operation 2 starts
   * before operation 1 completes.
   */
  findOverlappingOperations(operations) {
    const overlaps = [];
    
    for (let i = 0; i < operations.length - 1; i++) {
      const op1 = operations[i];
      const op1End = op1.timestamp + op1.duration;
      
      for (let j = i + 1; j < operations.length; j++) {
        const op2 = operations[j];
        
        if (op2.timestamp < op1End) {
          overlaps.push({ op1, op2 });
        }
      }
    }
    
    return overlaps;
  }
  
  detectRapidRequests() {
    let rapidCount = 0;
    const rapidThreshold = 100; // ms between requests
    
    for (let i = 1; i < this.asyncOperations.length; i++) {
      const timeDiff = this.asyncOperations[i].timestamp - 
                      this.asyncOperations[i - 1].timestamp;
      
      if (timeDiff < rapidThreshold) {
        rapidCount++;
      }
    }
    
    return rapidCount;
  }
  
  determineSeverity(hasRaceConditions, failureCount, patternCount) {
    if (!hasRaceConditions) return 'none';
    if (failureCount > 0 && patternCount > 2) return 'high';
    if (patternCount > 1) return 'medium';
    return 'low';
  }
  
  getRecommendation(severity) {
    const recommendations = {
      none: 'No race conditions detected in concurrent operations.',
      low: 'Potential race conditions detected from concurrent async operations. Ensure operations on shared state are properly synchronized. Consider using async/await with careful ordering, or implement request deduplication for identical concurrent requests. Use AbortController to cancel outdated requests.',
      medium: 'Race conditions detected that may cause inconsistent state. Implement request cancellation for outdated requests using AbortController. Use debouncing for user-triggered actions. Consider implementing a request queue to serialize operations on shared resources. Libraries like React Query and SWR handle request deduplication automatically.',
      high: 'Critical race conditions detected with request failures. Multiple requests to the same endpoints are executing concurrently, leading to conflicts. Implement proper request cancellation, use optimistic locking for data updates, or employ a state management solution that handles concurrent updates safely like React Query or SWR. Consider implementing a request queue with proper error handling and retry logic.',
    };
    
    return recommendations[severity];
  }
}

// ============================================================================
// RESOURCE LEAK DETECTION
// ============================================================================

/**
 * Resource Leak Detector
 * 
 * Tracks lifecycle of timers, intervals, event listeners, and WebSocket
 * connections to ensure they are properly cleaned up when no longer needed.
 */
class ResourceLeakDetector {
  constructor(page, route) {
    this.page = page;
    this.route = route;
  }
  
  async detect() {
    Logger.info(`Monitoring for resource leaks on ${this.route}...`);
    
    await this.injectResourceMonitoring();
    
    // Trigger interactions and navigation to test cleanup
    await UserInteractionSimulator.simulate(this.page);
    await this.page.waitForTimeout(CONFIG.sampling.interactionDelay);
    
    // Navigate away and back to verify cleanup happens on unmount
    await this.testNavigationCleanup();
    
    const resources = await this.collectResourceData();
    
    return this.analyze(resources);
  }
  
  /**
   * Hooks into resource allocation and cleanup functions to track lifecycle.
   * This approach gives us exact counts of what's not being cleaned up.
   */
  async injectResourceMonitoring() {
    await this.page.evaluate(() => {
      window.__resourceMonitor = {
        timers: new Set(),
        intervals: new Set(),
        eventListeners: [],
        webSockets: [],
      };
      
      // Hook setTimeout/clearTimeout
      const originalSetTimeout = window.setTimeout;
      window.setTimeout = function(...args) {
        const id = originalSetTimeout.apply(this, args);
        window.__resourceMonitor.timers.add(id);
        return id;
      };
      
      const originalClearTimeout = window.clearTimeout;
      window.clearTimeout = function(id) {
        window.__resourceMonitor.timers.delete(id);
        return originalClearTimeout.call(this, id);
      };
      
      // Hook setInterval/clearInterval
      const originalSetInterval = window.setInterval;
      window.setInterval = function(...args) {
        const id = originalSetInterval.apply(this, args);
        window.__resourceMonitor.intervals.add(id);
        return id;
      };
      
      const originalClearInterval = window.clearInterval;
      window.clearInterval = function(id) {
        window.__resourceMonitor.intervals.delete(id);
        return originalClearInterval.call(this, id);
      };
      
      // Hook addEventListener/removeEventListener
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        window.__resourceMonitor.eventListeners.push({
          target: this.constructor.name,
          type,
          timestamp: Date.now(),
        });
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      const originalRemoveEventListener = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.removeEventListener = function(type) {
        const index = window.__resourceMonitor.eventListeners.findIndex(
          l => l.type === type && l.target === this.constructor.name
        );
        if (index !== -1) {
          window.__resourceMonitor.eventListeners.splice(index, 1);
        }
        return originalRemoveEventListener.apply(this, arguments);
      };
      
      // Hook WebSocket constructor
      if (window.WebSocket) {
        const OriginalWebSocket = window.WebSocket;
        window.WebSocket = function(...args) {
          const ws = new OriginalWebSocket(...args);
          window.__resourceMonitor.webSockets.push({
            url: args[0],
            timestamp: Date.now(),
          });
          return ws;
        };
      }
    });
  }
  
  /**
   * Tests that resources are cleaned up when navigating away from the route.
   * Proper cleanup should happen in component unmount/destroy lifecycle methods.
   */
  async testNavigationCleanup() {
    try {
      await this.page.goto(CONFIG.baseUrl, { timeout: 5000 });
      await this.page.waitForTimeout(CONFIG.sampling.navigationDelay);
      await this.page.goto(`${CONFIG.baseUrl}${this.route}`, { timeout: 5000 });
      await this.page.waitForTimeout(CONFIG.sampling.navigationDelay);
    } catch (error) {
      Logger.debug(`Navigation test failed: ${error.message}`);
    }
  }
  
  async collectResourceData() {
    try {
      return await this.page.evaluate(() => ({
        timers: window.__resourceMonitor.timers.size,
        intervals: window.__resourceMonitor.intervals.size,
        eventListeners: window.__resourceMonitor.eventListeners.length,
        webSockets: window.__resourceMonitor.webSockets.length,
      }));
    } catch (error) {
      Logger.debug(`Error collecting resource data: ${error.message}`);
      return { timers: 0, intervals: 0, eventListeners: 0, webSockets: 0 };
    }
  }
  
  analyze(resources) {
    const leaks = [];
    const thresholds = CONFIG.thresholds;
    
    // Check each resource type against thresholds
    if (resources.timers > thresholds.activeTimers) {
      leaks.push(`${resources.timers} active timers not cleared`);
    }
    
    if (resources.intervals > thresholds.activeIntervals) {
      leaks.push(`${resources.intervals} active intervals not cleared`);
    }
    
    if (resources.eventListeners > thresholds.eventListeners) {
      leaks.push(`${resources.eventListeners} event listeners not removed`);
    }
    
    if (resources.webSockets > 0) {
      leaks.push(`${resources.webSockets} WebSocket connections not closed`);
    }
    
    const hasLeaks = leaks.length > 0;
    const severity = this.determineSeverity(resources);
    
    const analysis = {
      hasLeaks,
      severity,
      leaks,
      resources,
      recommendation: this.getRecommendation(severity, resources),
    };
    
    if (hasLeaks) {
      collector.addIssue('resourceLeaks', {
        route: this.route,
        ...analysis,
      });
      Logger.error(`Resource leaks detected on ${this.route}`);
    } else {
      Logger.success(`No resource leaks detected on ${this.route}`);
    }
    
    return analysis;
  }
  
  determineSeverity(resources) {
    // WebSockets and intervals are highest priority - they run indefinitely
    if (resources.webSockets > 0 || resources.intervals > CONFIG.thresholds.activeIntervals) {
      return 'high';
    }
    
    // Many timers or listeners indicate medium severity
    if (resources.timers > CONFIG.thresholds.activeTimers * 2 || 
        resources.eventListeners > CONFIG.thresholds.eventListeners * 2) {
      return 'medium';
    }
    
    // Any leaks are at least low severity
    if (resources.timers > CONFIG.thresholds.activeTimers || 
        resources.eventListeners > CONFIG.thresholds.eventListeners) {
      return 'low';
    }
    
    return 'none';
  }
  
  getRecommendation(severity, resources) {
    if (severity === 'none') {
      return 'Resource cleanup appears to be properly implemented.';
    }
    
    const critical = resources.intervals > 0 || resources.webSockets > 0;
    
    if (critical) {
      return 'Critical resource leaks detected. Intervals and WebSocket connections that are not cleaned up will continue consuming resources indefinitely, potentially leading to connection exhaustion and memory issues. Ensure all setInterval calls have corresponding clearInterval calls in cleanup functions. WebSocket connections must be explicitly closed when components unmount or when the connection is no longer needed. In React, return cleanup functions from useEffect hooks that call clearInterval and ws.close(). In vanilla JavaScript, implement proper teardown in your application lifecycle methods. Store interval IDs and WebSocket instances in component state or instance variables so they can be accessed during cleanup.';
    }
    
    return 'Resource leaks detected. Timers and event listeners that are not cleaned up accumulate over time and can degrade performance, especially in single-page applications where users may navigate between routes many times. Ensure all setTimeout calls are cleared if the component unmounts before they fire. Remove event listeners when they are no longer needed, particularly those attached to global objects like window or document. In React, return cleanup functions from useEffect hooks that remove listeners and clear timers. In other frameworks, use the appropriate lifecycle hooks for cleanup such as beforeUnmount in Vue or ngOnDestroy in Angular.';
  }
}

// ============================================================================
// USER INTERACTION SIMULATION
// ============================================================================

/**
 * Simulates realistic user interactions to expose runtime issues that only
 * manifest under actual usage patterns.
 */
class UserInteractionSimulator {
  static async simulate(page) {
    const interactions = [
      () => this.clickButtons(page),
      () => this.fillInputs(page),
      () => this.scrollPage(page),
      () => this.hoverElements(page),
    ];
    
    for (const interaction of interactions) {
      try {
        await interaction();
      } catch (error) {
        Logger.debug(`Interaction failed: ${error.message}`);
      }
    }
  }
  
  static async clickButtons(page) {
    const buttons = await page.locator('button:visible, [role="button"]:visible').all();
    if (buttons.length > 0) {
      const clickCount = Math.min(3, buttons.length);
      for (let i = 0; i < clickCount; i++) {
        try {
          await buttons[i].click({ timeout: 1000 });
          await page.waitForTimeout(CONFIG.sampling.interactionDelay);
        } catch (e) {
          // Button might not be clickable, continue
        }
      }
    }
  }
  
  static async fillInputs(page) {
    const inputs = await page.locator('input:visible, textarea:visible').all();
    if (inputs.length > 0) {
      try {
        await inputs[0].fill('test-data-' + Date.now());
        await page.waitForTimeout(CONFIG.sampling.interactionDelay);
      } catch (e) {
        // Input might be disabled or readonly
      }
    }
  }
  
  static async scrollPage(page) {
    // Scroll to various positions to trigger lazy loading and scroll handlers
    const positions = [0.25, 0.5, 0.75, 1.0];
    for (const pos of positions) {
      await page.evaluate((position) => {
        window.scrollTo(0, document.body.scrollHeight * position);
      }, pos);
      await page.waitForTimeout(200);
    }
  }
  
  static async hoverElements(page) {
    const elements = await page.locator('a:visible, button:visible').all();
    if (elements.length > 0) {
      try {
        await elements[0].hover({ timeout: 1000 });
        await page.waitForTimeout(CONFIG.sampling.interactionDelay);
      } catch (e) {
        // Element might not be hoverable
      }
    }
  }
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

/**
 * Generates comprehensive markdown reports with executive summaries,
 * detailed findings, and actionable recommendations.
 */
class ReportGenerator {
  constructor(collector) {
    this.collector = collector;
  }
  
  async generate() {
    Logger.info('Generating comprehensive diagnostics report...');
    
    const report = this.buildReport();
    
    await fs.mkdir(CONFIG.output.dir, { recursive: true });
    const reportPath = path.join(CONFIG.output.dir, CONFIG.output.reportFile);
    await fs.writeFile(reportPath, report);
    
    Logger.success(`Report saved to: ${reportPath}`);
    
    return reportPath;
  }
  
  buildReport() {
    const sections = [
      this.buildHeader(),
      this.buildExecutiveSummary(),
      this.buildMemoryLeaksSection(),
      this.buildInfiniteRendersSection(),
      this.buildRaceConditionsSection(),
      this.buildResourceLeaksSection(),
      this.buildRecommendationsSection(),
      this.buildFooter(),
    ];
    
    return sections.filter(Boolean).join('\n\n');
  }
  
  buildHeader() {
    return `# Runtime Diagnostics Report

This report identifies runtime issues through automated monitoring and statistical analysis of memory usage patterns, rendering behavior, async operation timing, and resource lifecycle management.

**Generated:** ${new Date().toISOString()}  
**Base URL:** ${CONFIG.baseUrl}  
**Monitor Duration:** ${CONFIG.monitorDuration}s per route  
**Total Duration:** ${Formatter.duration(this.collector.totalDuration)}  
**Tool Version:** v4.0

---`;
  }
  
  buildExecutiveSummary() {
    const stats = this.collector.stats;
    const issues = this.collector.issues;
    
    const criticalCount = this.countBySeverity('critical');
    const highCount = this.countBySeverity('high');
    
    let statusEmoji = '✅';
    let statusText = 'All systems nominal';
    
    if (criticalCount > 0) {
      statusEmoji = '🔴';
      statusText = 'Critical issues require immediate attention';
    } else if (highCount > 0) {
      statusEmoji = '🟠';
      statusText = 'High-priority issues detected';
    } else if (stats.issuesFound > 0) {
      statusEmoji = '🟡';
      statusText = 'Minor issues detected';
    }
    
    return `## ${statusEmoji} Executive Summary

**Status:** ${statusText}

The diagnostics system tested **${stats.routesTested} routes** and identified **${stats.issuesFound}** potential issues.

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| Memory Leaks | ${issues.memoryLeaks.length} | ${this.countBySeverity('critical', issues.memoryLeaks)} | ${this.countBySeverity('high', issues.memoryLeaks)} | ${this.countBySeverity('medium', issues.memoryLeaks)} | ${this.countBySeverity('low', issues.memoryLeaks)} |
| Render Loops | ${issues.infiniteRenders.length} | ${this.countBySeverity('critical', issues.infiniteRenders)} | ${this.countBySeverity('high', issues.infiniteRenders)} | ${this.countBySeverity('medium', issues.infiniteRenders)} | ${this.countBySeverity('low', issues.infiniteRenders)} |
| Race Conditions | ${issues.raceConditions.length} | ${this.countBySeverity('critical', issues.raceConditions)} | ${this.countBySeverity('high', issues.raceConditions)} | ${this.countBySeverity('medium', issues.raceConditions)} | ${this.countBySeverity('low', issues.raceConditions)} |
| Resource Leaks | ${issues.resourceLeaks.length} | ${this.countBySeverity('critical', issues.resourceLeaks)} | ${this.countBySeverity('high', issues.resourceLeaks)} | ${this.countBySeverity('medium', issues.resourceLeaks)} | ${this.countBySeverity('low', issues.resourceLeaks)} |

---`;
  }
  
  countBySeverity(severity, list = null) {
    const allIssues = list || Object.values(this.collector.issues).flat();
    return allIssues.filter(i => i.severity === severity).length;
  }
  
  buildMemoryLeaksSection() {
    const leaks = this.collector.issues.memoryLeaks;
    if (leaks.length === 0) return '';
    
    let section = `## 🧠 Memory Leaks Detected

Memory leaks occur when your application allocates memory but fails to release it when no longer needed. Over time, this causes increasing memory consumption, leading to performance degradation or crashes.

`;
    
    leaks.forEach((leak, index) => {
      const icon = this.getSeverityIcon(leak.severity);
      section += `### ${icon} Route: \`${leak.route}\` (${leak.severity.toUpperCase()})

**Pattern:** ${leak.pattern}  
**Growth Rate:** ${Formatter.number(leak.growthRate)} MB/s  
**Total Growth:** ${Formatter.number(leak.totalGrowth)} MB  
**R² (fit):** ${Formatter.number(leak.rSquared, 3)} (${leak.rSquared > 0.9 ? 'highly consistent' : leak.rSquared > 0.7 ? 'consistent' : 'variable'})

**Memory Progression:**
\`\`\`
${leak.snapshots.map(s => typeof s === 'string' ? s : `${s.time}: ${s.memory}`).join('\n')}
\`\`\`

**Recommendation:** ${leak.recommendation}

---
`;
    });
    
    return section;
  }
  
  buildInfiniteRendersSection() {
    const renders = this.collector.issues.infiniteRenders;
    if (renders.length === 0) return '';
    
    let section = `## 🔄 Infinite Render Loops

Infinite render loops occur when components trigger their own re-renders continuously. This typically happens when state is updated during render, or when effect dependencies are not properly specified.

`;
    
    renders.forEach(issue => {
      const icon = this.getSeverityIcon(issue.severity);
      section += `### ${icon} Route: \`${issue.route}\` (${issue.severity.toUpperCase()})

**Pattern:** ${issue.pattern}  
**Render Rate:** ${Formatter.number(issue.renderRate, 1)} renders/s  
**Total Renders:** ${issue.totalRenders}  
**Max Burst:** ${issue.maxBurstSize} renders in 1s  
**Console Rate:** ${Formatter.number(issue.consoleRate, 1)} logs/s

**Recommendation:** ${issue.recommendation}

---
`;
    });
    
    return section;
  }
  
  buildRaceConditionsSection() {
    const conditions = this.collector.issues.raceConditions;
    if (conditions.length === 0) return '';
    
    let section = `## ⚡ Race Conditions

Race conditions occur when program correctness depends on the timing or sequence of uncontrollable events, such as the order in which async operations complete. These issues may only manifest intermittently.

`;
    
    conditions.forEach(issue => {
      const icon = this.getSeverityIcon(issue.severity);
      section += `### ${icon} Route: \`${issue.route}\` (${issue.severity.toUpperCase()})

**Detected Patterns:**
${issue.patterns.map(p => `- ${p}`).join('\n')}

${issue.suspiciousOperations.length > 0 ? `
**Suspicious Operations:**
${issue.suspiciousOperations.map(op => `- \`${op.url}\`: ${op.count} requests, ${op.overlaps} overlaps`).join('\n')}
` : ''}

**Recommendation:** ${issue.recommendation}

---
`;
    });
    
    return section;
  }
  
  buildResourceLeaksSection() {
    const leaks = this.collector.issues.resourceLeaks;
    if (leaks.length === 0) return '';
    
    let section = `## 🔌 Resource Leaks

Resource leaks occur when system resources such as timers, event listeners, or network connections are allocated but never properly released. These accumulate over time and can exhaust available resources.

`;
    
    leaks.forEach(issue => {
      const icon = this.getSeverityIcon(issue.severity);
      section += `### ${icon} Route: \`${issue.route}\` (${issue.severity.toUpperCase()})

**Resources Not Cleaned:**
${issue.leaks.map(leak => `- ${leak}`).join('\n')}

**Resource Counts:**
- Timers: ${issue.resources.timers}
- Intervals: ${issue.resources.intervals}
- Event Listeners: ${issue.resources.eventListeners}
- WebSockets: ${issue.resources.webSockets}

**Recommendation:** ${issue.recommendation}

---
`;
    });
    
    return section;
  }
  
  buildRecommendationsSection() {
    if (this.collector.stats.issuesFound === 0) {
      return `## ✅ Overall Assessment

No critical issues detected. Your application demonstrates good runtime characteristics with proper resource management, stable memory usage, and appropriate render frequency. Continue monitoring in production to ensure performance remains optimal under real-world usage patterns.

### Best Practices Observed

- Memory management is effective with proper garbage collection
- Component render cycles are optimized
- Async operations are properly coordinated
- Resources are cleaned up appropriately

Consider running this diagnostic tool regularly as part of your CI/CD pipeline to catch regressions early.`;
    }
    
    const criticalCount = this.countBySeverity('critical');
    const highCount = this.countBySeverity('high');
    
    return `## 📋 Overall Recommendations

Based on the detected issues, focus on these key areas for improvement:

### Immediate Actions

${criticalCount > 0 ? `🔴 **${criticalCount} critical issue(s)** require immediate attention. These will significantly impact user experience and may cause application crashes. Address these before deployment.

` : ''}${highCount > 0 ? `🟠 **${highCount} high-priority issue(s)** should be addressed soon. These will degrade performance in production and affect user experience over time.

` : ''}### Code Review Focus

1. **Component Lifecycle:** Review cleanup logic in all component lifecycle methods. Every resource allocation (timers, listeners, subscriptions) must have corresponding cleanup code.

2. **Effect Dependencies:** Audit useEffect dependency arrays (React) or equivalent in other frameworks. Missing dependencies cause stale closures; unnecessary dependencies cause excessive re-renders.

3. **State Updates:** Ensure state updates never occur directly in render functions. All updates should be in event handlers or effect callbacks with proper conditions.

4. **Async Coordination:** Implement request cancellation for outdated async operations. Use AbortController for fetch requests and proper cleanup for promises.

### Testing Strategy

1. **CI/CD Integration:** Run this diagnostic tool in your continuous integration pipeline to catch regressions early.

2. **Extended Sessions:** Run monitoring for 5+ minutes to detect slow memory leaks that may not be apparent in short tests.

3. **Performance Budgets:** Establish budgets for memory growth rate (< 0.3 MB/s) and render frequency (< 5 renders/s average).

4. **Load Testing:** Combine runtime diagnostics with load testing to identify issues that only appear under concurrent user load.

### Production Monitoring

1. **Error Tracking:** Deploy tools like Sentry, LogRocket, or similar to detect issues in production.

2. **Performance API:** Use the browser's Performance API to track Real User Monitoring (RUM) metrics.

3. **Alerts:** Set up alerts for excessive memory growth, high error rates, or slow response times.

4. **Regular Audits:** Re-run this diagnostic tool monthly or after major releases to ensure no regressions.

---`;
  }
  
  buildFooter() {
    return `## 📚 Additional Resources

- [Chrome DevTools Memory Profiler](https://developer.chrome.com/docs/devtools/memory-problems/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Web Performance Best Practices](https://web.dev/vitals/)
- [JavaScript Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)

---

**Diagnostics Tool Version:** v4.0 (Final Edition)  
**Analysis Engine:** Playwright + Statistical Regression  
**Report Generated:** ${new Date().toISOString()}

This automated analysis provides indicators of potential issues but cannot detect all possible runtime problems. Manual code review, performance profiling, and thorough testing remain essential for ensuring application quality.`;
  }
  
  getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🔵',
      none: '✅',
    };
    return icons[severity] || '⚪';
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  // Display banner
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('   Runtime Diagnostics & Leak Detector v4.0 - Final Edition   ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));
  
  Logger.info(`Target: ${chalk.bold(CONFIG.baseUrl)}`);
  Logger.info(`Duration: ${chalk.bold(CONFIG.monitorDuration + 's')} per route`);
  Logger.info(`Routes: ${chalk.bold(CONFIG.routes.join(', '))}`);
  Logger.info(`Thresholds: Memory=${CONFIG.thresholds.memoryGrowth}MB/s, Render=${CONFIG.thresholds.renderRate}Hz\n`);
  
  // Launch browser with diagnostic flags
  const browser = await chromium.launch({
    headless: true,
    args: CONFIG.browserArgs,
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Runtime-Diagnostics/4.0)',
  });
  
  const page = await context.newPage();
  
  try {
    // Test each route
    for (const route of CONFIG.routes) {
      collector.stats.routesTested++;
      
      Logger.info(chalk.bold(`\n${'='.repeat(70)}`));
      Logger.info(chalk.bold(`Testing route: ${route}`));
      Logger.info(chalk.bold(`${'='.repeat(70)}\n`));
      
      try {
        // Navigate to route
        await page.goto(`${CONFIG.baseUrl}${route}`, {
          waitUntil: 'networkidle',
          timeout: 15000,
        });
        
        await page.waitForTimeout(CONFIG.sampling.navigationDelay);
        
        // Run memory and render detection in parallel (non-interfering)
        await Promise.all([
          new MemoryLeakDetector(page, route).detect(),
          new InfiniteRenderDetector(page, route).detect(),
        ]);
        
        // Run sequentially (these modify page state)
        await new RaceConditionDetector(page, route).detect();
        await new ResourceLeakDetector(page, route).detect();
        
      } catch (error) {
        Logger.error(`Error testing ${route}: ${error.message}`);
        if (CONFIG.debug) {
          console.error(error.stack);
        }
      }
    }
    
    // Generate comprehensive report
    const reportGenerator = new ReportGenerator(collector);
    await reportGenerator.generate();
    
    // Print summary
    printSummary();
    
    // Exit with appropriate code
    const exitCode = collector.hasCriticalIssues() ? 2 : (collector.stats.issuesFound > 0 ? 1 : 0);
    process.exit(exitCode);
    
  } finally {
    await browser.close();
  }
}

function printSummary() {
  console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.cyan('║') + chalk.bold('                   Diagnostics Complete                       ') + chalk.cyan('║'));
  console.log(chalk.cyan('╚═══════════════════════════════════════════════════════════════════╝\n'));
  
  const stats = collector.stats;
  const issues = collector.issues;
  
  console.log('  Routes Tested:', chalk.blue(stats.routesTested));
  
  if (stats.issuesFound === 0) {
    console.log('  Issues Found:', chalk.green('0') + ' ✅');
  } else {
    console.log('  Issues Found:', chalk.red(stats.issuesFound));
    
    if (issues.memoryLeaks.length > 0) {
      console.log('    └─ Memory Leaks:', chalk.red(issues.memoryLeaks.length));
    }
    
    if (issues.infiniteRenders.length > 0) {
      console.log('    └─ Render Loops:', chalk.red(issues.infiniteRenders.length));
    }
    
    if (issues.raceConditions.length > 0) {
      console.log('    └─ Race Conditions:', chalk.yellow(issues.raceConditions.length));
    }
    
    if (issues.resourceLeaks.length > 0) {
      console.log('    └─ Resource Leaks:', chalk.yellow(issues.resourceLeaks.length));
    }
  }
  
  console.log('  Duration:', chalk.blue(Formatter.duration(collector.totalDuration)));
  
  if (collector.hasCriticalIssues()) {
    console.log('\n  ' + chalk.red.bold('⚠️  Critical issues detected - review report immediately!'));
  }
  
  console.log('\n');
}

// Run with comprehensive error handling
main().catch(error => {
  Logger.error(`Fatal error: ${error.message}`);
  if (CONFIG.debug) {
    console.error(error.stack);
  }
  process.exit(1);
});