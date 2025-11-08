# Emergency Triage Guide - Frontend Race Condition Diagnostics

## Overview

This guide provides instructions for using the Emergency Triage Tool to identify and fix the 1500+ console errors causing infinite renders and race conditions in the React frontend.

## Quick Start

### Method 1: Browser-Based Triage (Recommended)

1. **Open the triage tool:**
   ```bash
   # Navigate to the client directory
   cd client
   
   # Open the emergency triage HTML file in your browser
   open emergency-triage.html
   # OR on Windows: start emergency-triage.html
   # OR on Linux: xdg-open emergency-triage.html
   ```

2. **Run the application in another tab:**
   ```bash
   # Start the development server
   npm run dev
   # OR
   pnpm dev
   ```

3. **Start monitoring:**
   - Click "Start Monitoring" in the triage tool
   - Switch to your application tab and use it normally
   - Navigate between pages, interact with components
   - Let it run for 60 seconds (automatic stop)

4. **Review results:**
   - The tool will automatically stop and show results
   - Export the report for detailed analysis

### Method 2: Programmatic Usage

```typescript
import { emergencyTriage, startEmergencyTriage, stopEmergencyTriage } from './src/utils/emergency-triage';

// Start monitoring
startEmergencyTriage();

// Wait 60 seconds or until you want to stop
setTimeout(() => {
  const report = stopEmergencyTriage();
  console.log('Triage Report:', report);
}, 60000);
```

## Expected Top 10 Offending Components

Based on the code analysis, these components are likely to be the worst offenders:

### 1. **AppLayout** 🔥 CRITICAL
- **Issues:** Complex useEffect dependency chains, infinite render loops
- **Location:** `client/src/components/layout/app-layout.tsx`
- **Problems:**
  - `performanceFunctionsRef` causing circular dependencies
  - `isMobile` state update loops
  - Performance observer cleanup issues

### 2. **WebSocketClient** 🔥 CRITICAL  
- **Issues:** Event listener leaks, race conditions in connection management
- **Location:** `client/src/services/websocket-client.ts`
- **Problems:**
  - Connection state race conditions
  - Event listener cleanup on unmount
  - Reconnection backoff issues

### 3. **DesktopSidebar** ⚠️ HIGH
- **Issues:** Navigation state synchronization issues
- **Location:** `client/src/components/navigation/`
- **Problems:**
  - State updates during navigation
  - Responsive breakpoint handling

### 4. **MobileNavigation** ⚠️ HIGH
- **Issues:** Transition state management, responsive updates
- **Location:** `client/src/components/layout/mobile-navigation.tsx`
- **Problems:**
  - Transition state race conditions
  - Mobile/desktop switching

### 5. **RealTimeTracker** ⚠️ HIGH
- **Issues:** WebSocket event handling, subscription management
- **Location:** Likely in `client/src/components/` or `client/src/services/`
- **Problems:**
  - WebSocket subscription cleanup
  - Real-time data update loops

### 6. **NavigationPreferences** ⚡ MEDIUM
- **Issues:** localStorage sync loops, preference state management
- **Location:** Navigation-related components
- **Problems:**
  - Deep equality comparison loops
  - localStorage synchronization

### 7. **PerformanceMonitor** ⚡ MEDIUM
- **Issues:** Observer cleanup, circular references
- **Location:** `client/src/utils/performance-monitor.ts`
- **Problems:**
  - Performance observer disconnection
  - Memory usage tracking

### 8. **BillCard** ⚡ MEDIUM
- **Issues:** State updates during rendering, prop changes
- **Location:** `client/src/features/bills/`
- **Problems:**
  - Bill data updates
  - User interaction handling

### 9. **ErrorBoundary** 💡 LOW
- **Issues:** Error state management, recovery loops
- **Location:** `client/src/components/error-handling/ErrorBoundary.tsx`
- **Problems:**
  - Error recovery state
  - Fallback component rendering

### 10. **AuthPage** 💡 LOW
- **Issues:** Authentication state updates, form handling
- **Location:** `client/src/pages/`
- **Problems:**
  - Login state management
  - Form validation loops

## Circuit Breaker Configuration

The tool automatically configures circuit breakers for the most problematic components:

```typescript
const circuitBreakers = [
  { component: 'AppLayout', errorThreshold: 10, timeWindow: 5000 },
  { component: 'WebSocketClient', errorThreshold: 5, timeWindow: 3000 },
  { component: 'DesktopSidebar', errorThreshold: 8, timeWindow: 5000 },
  { component: 'MobileNavigation', errorThreshold: 8, timeWindow: 5000 },
  { component: 'RealTimeTracker', errorThreshold: 5, timeWindow: 3000 }
];
```

## Understanding the Results

### Error Types

- **🔄 infinite-render:** Components rendering >50 times per second
- **🏃 race-condition:** Concurrent state updates causing conflicts  
- **💧 memory-leak:** Components not cleaning up resources
- **🔗 dependency-issue:** Missing or incorrect useEffect dependencies
- **🔀 state-mutation:** Direct state mutations instead of immutable updates
- **👂 event-listener-leak:** Event listeners not removed on unmount

### Severity Levels

- **🔥 Critical:** Blocks application, causes crashes (>1500 errors)
- **⚠️ High:** Degrades performance significantly (>100 errors)
- **⚡ Medium:** Impacts user experience (10-100 errors)
- **💡 Low:** Code quality issues (<10 errors)

### Success Metrics

- **Target:** Reduce from 1500+ errors to <100 errors
- **Critical Goal:** Eliminate infinite render loops
- **Performance Goal:** <2 second page load times
- **Stability Goal:** No browser crashes or freezes

## Troubleshooting

### Tool Not Capturing Errors

1. **Check console permissions:**
   - Ensure the browser allows console access
   - Try running in incognito/private mode

2. **Verify application is running:**
   - Make sure the React app is running in development mode
   - Check that source maps are enabled

3. **Browser compatibility:**
   - Use Chrome or Firefox for best results
   - Ensure JavaScript is enabled

### No Errors Detected

1. **Interact with the application:**
   - Navigate between pages
   - Use forms and interactive elements
   - Trigger WebSocket connections

2. **Check error levels:**
   - Some errors might be warnings, not errors
   - Lower the monitoring threshold if needed

### High False Positive Rate

1. **Filter development-only errors:**
   - Some errors are development-mode only
   - Focus on errors that occur in production builds

2. **Adjust circuit breaker thresholds:**
   - Increase thresholds for less critical components
   - Focus on components with >10 errors

## Next Steps After Triage

1. **Prioritize fixes by severity:**
   - Fix critical issues first (infinite renders)
   - Address high-priority race conditions
   - Clean up medium-priority issues

2. **Focus on high-frequency components:**
   - Start with components having >10 errors
   - Fix the most common error patterns first

3. **Implement preventive measures:**
   - Add ESLint rules for useEffect dependencies
   - Create component templates with best practices
   - Set up continuous monitoring

4. **Re-run triage after fixes:**
   - Measure improvement after each fix
   - Ensure error count decreases toward <100 target

## Emergency Circuit Breaker Usage

If a component is causing critical issues, you can manually trigger its circuit breaker:

```typescript
// In browser console
window.dispatchEvent(new CustomEvent('circuit-breaker-triggered', {
  detail: { component: 'AppLayout' }
}));
```

This will disable the problematic component temporarily while you implement fixes.

## Report Analysis

The generated report includes:

- **Total error count** and rate per minute
- **Top offending components** ranked by frequency and severity
- **Critical issues** requiring immediate attention
- **Error breakdown by type** and component
- **Recommended actions** prioritized by impact

Use this data to create a systematic fix plan and track progress toward the <100 error target.