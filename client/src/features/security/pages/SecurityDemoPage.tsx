/**
 * Security Demo Page
 * Demonstrates the security system features
 */

import { getSecuritySystem } from '@core/security';
import { Shield, AlertTriangle, CheckCircle, Lock, Eye, Activity } from 'lucide-react';
import React from 'react';
import { useState, useEffect } from 'react';

import { SecurityDashboard } from '@client/features/security/ui/dashboard/SecurityDashboard';
import { SecuritySettings } from '@client/features/security/ui/dashboard/SecuritySettings';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Button } from '@client/lib/design-system';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@client/lib/design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@client/lib/design-system';
import { Textarea } from '@client/lib/design-system';
import { logger } from '@client/lib/utils/logger';

export default function SecurityDemoPage() {
  const [testInput, setTestInput] = useState('');
  const [sanitizedResult, setSanitizedResult] = useState<{
    sanitized?: string;
    error?: string;
    wasModified?: boolean;
    threats?: Array<{ severity: string; type: string; description: string }>;
  } | null>(null);
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [cspNonce, setCspNonce] = useState<string>('');
  const [rateLimitStatus, setRateLimitStatus] = useState<{
    currentRequests?: number;
    maxRequests?: number;
    windowMs?: number;
    blocked?: boolean;
    testResults?: { totalRequests: number; rateLimitedRequests: number };
  } | null>(null);
  const [vulnerabilities, setVulnerabilities] = useState<
    Array<{ severity?: string; type?: string; description?: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSecurityInfo();
  }, []);

  const loadSecurityInfo = async () => {
    try {
      const securitySystem = getSecuritySystem();
      if (!securitySystem) {
        logger.warn('Security system not initialized');
        return;
      }

      // Get CSRF token
      const token = securitySystem.csrf.getToken();
      setCsrfToken(token || 'Not available');

      // Get CSP nonce
      const nonce = securitySystem.csp.getNonce();
      setCspNonce(nonce || 'Not available');

      // Get rate limit status
      const rateLimitInfo = securitySystem.rateLimiter.getRateLimitInfo('demo-page');
      setRateLimitStatus(rateLimitInfo);

      // Get vulnerabilities
      const vulnerabilityReports = securitySystem.vulnerabilityScanner.getVulnerabilities();
      setVulnerabilities(vulnerabilityReports);
    } catch (error) {
      logger.error('Failed to load security info', { component: 'SecurityDemoPage' }, error);
    }
  };

  const testInputSanitization = async () => {
    try {
      const securitySystem = getSecuritySystem();
      if (!securitySystem) {
        setSanitizedResult({ error: 'Security system not available' });
        return;
      }

      const result = await securitySystem.sanitizer.sanitizeHTML(testInput);
      setSanitizedResult(result);
    } catch (error) {
      logger.error('Failed to sanitize input', { component: 'SecurityDemoPage' }, error);
      setSanitizedResult({ error: 'Sanitization failed' });
    }
  };

  const testRateLimit = async () => {
    setIsLoading(true);
    try {
      // Make multiple requests to test rate limiting
      const requests = Array(5)
        .fill(null)
        .map((_, i) =>
          fetch('/api/test-endpoint', {
            method: 'POST',
            body: JSON.stringify({ test: `request-${i}` }),
            headers: { 'Content-Type': 'application/json' },
          }).catch(() => ({ status: 429, statusText: 'Rate Limited' }))
        );

      const responses = await Promise.all(requests);
      const rateLimitedCount = responses.filter(r => r.status === 429).length;

      // Update rate limit status
      const securitySystem = getSecuritySystem();
      if (securitySystem) {
        const rateLimitInfo = securitySystem.rateLimiter.getRateLimitInfo('demo-page');
        setRateLimitStatus({
          ...rateLimitInfo,
          testResults: {
            totalRequests: responses.length,
            rateLimitedRequests: rateLimitedCount,
          },
        });
      }
    } catch (error) {
      logger.error('Rate limit test failed', { component: 'SecurityDemoPage' }, error);
    } finally {
      setIsLoading(false);
    }
  };
  // Vulnerability scan functionality - currently not exposed in UI
  // const runVulnerabilityScan = async () => {
  //   setIsLoading(true);
  //   try {
  //     const securitySystem = getSecuritySystem();
  //     if (securitySystem) {
  //       const newVulnerabilityReports = await securitySystem.vulnerabilityScanner.scan();
  //       setVulnerabilities(newVulnerabilityReports);
  //     }
  //   } catch (error) {
  //     logger.error('Vulnerability scan failed', { component: 'SecurityDemoPage' }, error);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const triggerSecurityEvent = () => {
    // Simulate a security event
    const event = new CustomEvent('security-event', {
      detail: {
        type: 'suspicious_activity',
        severity: 'medium',
        source: 'SecurityDemoPage',
        details: {
          action: 'manual_test',
          timestamp: new Date().toISOString(),
        },
      },
    });
    document.dispatchEvent(event);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Shield className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Security System Demo</h1>
          <p className="text-gray-600">
            Interactive demonstration of the Chanuka security infrastructure
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sanitization">Input Sanitization</TabsTrigger>
          <TabsTrigger value="protection">CSRF & CSP</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CSP Protection</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">Content Security Policy enabled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CSRF Protection</CardTitle>
                <Lock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">Token-based protection</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rate Limiting</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">Request throttling enabled</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vulnerability Scanning</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{vulnerabilities.length}</div>
                <p className="text-xs text-muted-foreground">Issues detected</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Security Status</CardTitle>
              <CardDescription>Current security tokens and configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">CSRF Token</label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                    {csrfToken.substring(0, 20)}...
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">CSP Nonce</label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                    {cspNonce.substring(0, 20)}...
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button onClick={loadSecurityInfo} variant="outline" size="sm">
                  <Activity className="h-4 w-4 mr-2" />
                  Refresh Status
                </Button>
                <Button onClick={triggerSecurityEvent} variant="outline" size="sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Trigger Test Event
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sanitization" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Input Sanitization Test</CardTitle>
              <CardDescription>
                Test the XSS protection and input sanitization system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Test Input (try malicious HTML)</label>
                <Textarea
                  placeholder="Enter HTML content to test (e.g., <script>alert('xss')</script><p>Safe content</p>)"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button onClick={testInputSanitization} disabled={!testInput}>
                <Shield className="h-4 w-4 mr-2" />
                Sanitize Input
              </Button>

              {sanitizedResult && (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Sanitized Output</label>
                    <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded">
                      <pre className="text-sm whitespace-pre-wrap">
                        {sanitizedResult.error || sanitizedResult.sanitized || '(empty)'}
                      </pre>
                    </div>
                  </div>

                  {sanitizedResult.threats && sanitizedResult.threats.length > 0 && (
                    <div>
                      <label className="text-sm font-medium">Threats Detected</label>
                      <div className="mt-1 space-y-2">
                        {sanitizedResult.threats.map((threat, index: number) => (
                          <Alert key={index}>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription className="flex items-center justify-between">
                              <div>
                                <div className="flex items-center space-x-2">
                                  <Badge className={getSeverityColor(threat.severity || '')}>
                                    {threat.severity}
                                  </Badge>
                                  <span className="font-medium">{threat.type}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">{threat.description}</p>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <p>Was Modified: {sanitizedResult.wasModified ? 'Yes' : 'No'}</p>
                    <p>Threats Found: {sanitizedResult.threats?.length || 0}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protection" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CSRF Protection</CardTitle>
                <CardDescription>Cross-Site Request Forgery protection status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Current Token</label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                    {csrfToken}
                  </div>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    CSRF protection is active. All forms and API requests are automatically
                    protected.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Security Policy</CardTitle>
                <CardDescription>
                  CSP configuration and nonce-based script execution
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Current Nonce</label>
                  <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                    {cspNonce}
                  </div>
                </div>
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    CSP is active with nonce-based script execution. Inline scripts are blocked
                    unless they have the correct nonce.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Rate Limiting Test</CardTitle>
              <CardDescription>Test the request rate limiting system</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {rateLimitStatus && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Current Requests</label>
                    <div className="text-lg font-bold">{rateLimitStatus.currentRequests || 0}</div>
                  </div>
                  <div>
                    <label className="font-medium">Max Requests</label>
                    <div className="text-lg font-bold">{rateLimitStatus.maxRequests || 0}</div>
                  </div>
                  <div>
                    <label className="font-medium">Window</label>
                    <div className="text-lg font-bold">
                      {Math.round((rateLimitStatus.windowMs || 0) / 1000)}s
                    </div>
                  </div>
                  <div>
                    <label className="font-medium">Status</label>
                    <div
                      className={`text-lg font-bold ${rateLimitStatus.blocked ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {rateLimitStatus.blocked ? 'Blocked' : 'OK'}
                    </div>
                  </div>
                </div>
              )}

              <Button onClick={testRateLimit} disabled={isLoading}>
                <Activity className="h-4 w-4 mr-2" />
                {isLoading ? 'Testing...' : 'Test Rate Limiting'}
              </Button>

              {rateLimitStatus?.testResults && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Test completed: {rateLimitStatus.testResults.rateLimitedRequests} out of{' '}
                    {rateLimitStatus.testResults.totalRequests} requests were rate limited.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-6">
          <SecurityDashboard showDetails={true} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
