/**
 * Mobile Test Suite Component
 * Provides comprehensive testing for mobile functionality
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Wifi, 
  WifiOff, 
  Battery, 
  RotateCcw,
  TouchpadIcon,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { MobileTouchUtils } from '../../utils/mobile-touch-handler';
import { useResponsiveLayout } from '../../utils/responsive-layout';
import { useMobileErrorHandler } from '../../utils/mobile-error-handler';
import { logger } from '../../utils/browser-logger';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export function MobileTestSuite() {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<any>({});
  const responsiveState = useResponsiveLayout();
  const { reportError, getStats } = useMobileErrorHandler();
  const testRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    collectDeviceInfo();
  }, []);

  const collectDeviceInfo = () => {
    const info = {
      user_agent: navigator.user_agent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      touch: MobileTouchUtils.isTouchDevice(),
      orientation: screen.orientation?.type || 'unknown',
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt,
      } : null,
      memory: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round((performance as any).memory.jsHeapSizeLimit / 1024 / 1024),
      } : null,
      standalone: window.matchMedia('(display-mode: standalone)').matches,
    };
    setDeviceInfo(info);
  };

  const runTests = async () => {
    setIsRunning(true);
    const results: TestResult[] = [];

    // Test 1: Viewport Configuration
    try {
      const viewportMeta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
      if (viewportMeta && viewportMeta.content.includes('width=device-width')) {
        results.push({
          name: 'Viewport Configuration',
          status: 'pass',
          message: 'Viewport meta tag is properly configured',
          details: viewportMeta.content,
        });
      } else {
        results.push({
          name: 'Viewport Configuration',
          status: 'fail',
          message: 'Viewport meta tag is missing or misconfigured',
        });
      }
    } catch (error) {
      results.push({
        name: 'Viewport Configuration',
        status: 'fail',
        message: 'Error checking viewport configuration',
        details: (error as Error).message,
      });
    }

    // Test 2: Touch Support
    try {
      const touchSupported = MobileTouchUtils.isTouchDevice();
      results.push({
        name: 'Touch Support',
        status: touchSupported ? 'pass' : 'warning',
        message: touchSupported ? 'Touch events are supported' : 'Touch events not detected',
      });
    } catch (error) {
      results.push({
        name: 'Touch Support',
        status: 'fail',
        message: 'Error checking touch support',
        details: (error as Error).message,
      });
    }

    // Test 3: Responsive Breakpoints
    try {
      const { breakpoint, isMobile, isTablet, isDesktop } = responsiveState;
      results.push({
        name: 'Responsive Breakpoints',
        status: 'pass',
        message: `Current breakpoint: ${breakpoint}`,
        details: `Mobile: ${isMobile}, Tablet: ${isTablet}, Desktop: ${isDesktop}`,
      });
    } catch (error) {
      results.push({
        name: 'Responsive Breakpoints',
        status: 'fail',
        message: 'Error checking responsive state',
        details: (error as Error).message,
      });
    }

    // Test 4: Touch Target Sizes
    try {
      const touchTargets = document.querySelectorAll('button, [role="button"], a, input, select, textarea');
      let smallTargets = 0;
      const minSize = 44; // 44px minimum recommended

      touchTargets.forEach((target) => {
        const rect = target.getBoundingClientRect();
        if (rect.width < minSize || rect.height < minSize) {
          smallTargets++;
        }
      });

      if (smallTargets === 0) {
        results.push({
          name: 'Touch Target Sizes',
          status: 'pass',
          message: 'All touch targets meet minimum size requirements',
          details: `Checked ${touchTargets.length} elements`,
        });
      } else {
        results.push({
          name: 'Touch Target Sizes',
          status: 'warning',
          message: `${smallTargets} touch targets are smaller than recommended`,
          details: `${smallTargets}/${touchTargets.length} targets are below 44px`,
        });
      }
    } catch (error) {
      results.push({
        name: 'Touch Target Sizes',
        status: 'fail',
        message: 'Error checking touch target sizes',
        details: (error as Error).message,
      });
    }

    // Test 5: Safe Area Support
    try {
      const style = getComputedStyle(document.documentElement);
      const safeAreaTop = style.getPropertyValue('env(safe-area-inset-top)');
      const hasSafeAreaSupport = safeAreaTop !== '';
      
      results.push({
        name: 'Safe Area Support',
        status: hasSafeAreaSupport ? 'pass' : 'warning',
        message: hasSafeAreaSupport ? 'Safe area insets are supported' : 'Safe area insets not detected',
        details: hasSafeAreaSupport ? `Top inset: ${safeAreaTop}` : 'Device may not have notch/safe areas',
      });
    } catch (error) {
      results.push({
        name: 'Safe Area Support',
        status: 'fail',
        message: 'Error checking safe area support',
        details: (error as Error).message,
      });
    }

    // Test 6: Orientation Handling
    try {
      const orientationSupported = 'orientation' in screen;
      results.push({
        name: 'Orientation Handling',
        status: orientationSupported ? 'pass' : 'warning',
        message: orientationSupported ? 'Screen orientation API is supported' : 'Screen orientation API not available',
        details: orientationSupported ? `Current: ${screen.orientation?.type}` : 'Using fallback detection',
      });
    } catch (error) {
      results.push({
        name: 'Orientation Handling',
        status: 'fail',
        message: 'Error checking orientation support',
        details: (error as Error).message,
      });
    }

    // Test 7: Performance Memory
    try {
      const memInfo = (performance as any).memory;
      if (memInfo) {
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
        const usagePercent = Math.round((usedMB / limitMB) * 100);
        
        results.push({
          name: 'Memory Usage',
          status: usagePercent < 80 ? 'pass' : usagePercent < 90 ? 'warning' : 'fail',
          message: `Memory usage: ${usagePercent}%`,
          details: `${usedMB}MB used of ${limitMB}MB limit`,
        });
      } else {
        results.push({
          name: 'Memory Usage',
          status: 'warning',
          message: 'Memory API not available',
          details: 'Cannot monitor memory usage on this device',
        });
      }
    } catch (error) {
      results.push({
        name: 'Memory Usage',
        status: 'fail',
        message: 'Error checking memory usage',
        details: (error as Error).message,
      });
    }

    // Test 8: Network Connection
    try {
      const connection = (navigator as any).connection;
      if (connection) {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        results.push({
          name: 'Network Connection',
          status: effectiveType === 'slow-2g' ? 'warning' : 'pass',
          message: `Connection: ${effectiveType}`,
          details: `Downlink: ${downlink}Mbps, RTT: ${connection.rtt}ms`,
        });
      } else {
        results.push({
          name: 'Network Connection',
          status: 'warning',
          message: 'Network Information API not available',
        });
      }
    } catch (error) {
      results.push({
        name: 'Network Connection',
        status: 'fail',
        message: 'Error checking network connection',
        details: (error as Error).message,
      });
    }

    // Test 9: PWA Features
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasManifest = document.querySelector('link[rel="manifest"]') !== null;
      
      results.push({
        name: 'PWA Features',
        status: hasServiceWorker && hasManifest ? 'pass' : 'warning',
        message: `PWA support: ${hasServiceWorker && hasManifest ? 'Full' : 'Partial'}`,
        details: `Standalone: ${isStandalone}, SW: ${hasServiceWorker}, Manifest: ${hasManifest}`,
      });
    } catch (error) {
      results.push({
        name: 'PWA Features',
        status: 'fail',
        message: 'Error checking PWA features',
        details: (error as Error).message,
      });
    }

    // Test 10: Error Handling
    try {
      const errorStats = getStats();
      const totalErrors = Object.values(errorStats).reduce((sum, count) => sum + count, 0);
      
      results.push({
        name: 'Error Handling',
        status: totalErrors === 0 ? 'pass' : totalErrors < 5 ? 'warning' : 'fail',
        message: `${totalErrors} errors recorded`,
        details: Object.entries(errorStats).map(([type, count]) => `${type}: ${count}`).join(', '),
      });
    } catch (error) {
      results.push({
        name: 'Error Handling',
        status: 'fail',
        message: 'Error checking error handler',
        details: (error as Error).message,
      });
    }

    setTestResults(results);
    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'fail':
        return <XCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
    }
  };

  const getDeviceIcon = () => {
    if (responsiveState.isMobile) return <Smartphone className="h-5 w-5" />;
    if (responsiveState.isTablet) return <Tablet className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };

  return (
    <div ref={testRef} className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getDeviceIcon()}
            Mobile Functionality Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={runTests} disabled={isRunning}>
              {isRunning ? 'Running Tests...' : 'Run Tests'}
            </Button>
            <Button variant="outline" onClick={collectDeviceInfo}>
              Refresh Device Info
            </Button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results</h3>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{result.name}</span>
                      <Badge className={getStatusColor(result.status)}>
                        {result.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{result.message}</p>
                    {result.details && (
                      <p className="text-xs text-gray-500 mt-1">{result.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Viewport</h4>
              <div className="text-sm space-y-1">
                <p>Width: {deviceInfo.viewport?.width}px</p>
                <p>Height: {deviceInfo.viewport?.height}px</p>
                <p>Pixel Ratio: {deviceInfo.viewport?.devicePixelRatio}</p>
                <p>Orientation: {deviceInfo.orientation}</p>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Capabilities</h4>
              <div className="text-sm space-y-1">
                <p>Touch: {deviceInfo.touch ? 'Yes' : 'No'}</p>
                <p>Standalone: {deviceInfo.standalone ? 'Yes' : 'No'}</p>
                <p>Breakpoint: {responsiveState.breakpoint}</p>
                <p>Device Type: {responsiveState.isMobile ? 'Mobile' : responsiveState.isTablet ? 'Tablet' : 'Desktop'}</p>
              </div>
            </div>

            {deviceInfo.memory && (
              <div>
                <h4 className="font-medium mb-2">Memory</h4>
                <div className="text-sm space-y-1">
                  <p>Used: {deviceInfo.memory.used}MB</p>
                  <p>Total: {deviceInfo.memory.total}MB</p>
                  <p>Limit: {deviceInfo.memory.limit}MB</p>
                </div>
              </div>
            )}

            {deviceInfo.connection && (
              <div>
                <h4 className="font-medium mb-2">Connection</h4>
                <div className="text-sm space-y-1">
                  <p>Type: {deviceInfo.connection.effectiveType}</p>
                  <p>Downlink: {deviceInfo.connection.downlink}Mbps</p>
                  <p>RTT: {deviceInfo.connection.rtt}ms</p>
                </div>
              </div>
            )}
          </div>

          <Separator />

          <div>
            <h4 className="font-medium mb-2">User Agent</h4>
            <p className="text-xs text-gray-600 break-all">{deviceInfo.user_agent}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MobileTestSuite;

