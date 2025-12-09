/**
 * Security Settings Component
 * Allows users to configure security preferences
 */

import { 
  Shield, 
  Lock, 
  Eye, 
  Zap,
  AlertTriangle,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';

import { logger } from '@client/utils/logger';

import { getSecuritySystem } from '../../security';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';


interface SecuritySettingsProps {
  className?: string;
}

interface SecurityConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
  };
  csrf: {
    enabled: boolean;
    tokenRefreshInterval: number;
  };
  rateLimiting: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number;
  };
  inputSanitization: {
    enabled: boolean;
    maxLength: number;
    strictMode: boolean;
  };
  vulnerabilityScanning: {
    enabled: boolean;
    scanInterval: number;
    autoFix: boolean;
  };
  monitoring: {
    enabled: boolean;
    alertThreshold: number;
    realTimeAlerts: boolean;
  };
}

export function SecuritySettings({ className = '' }: SecuritySettingsProps) {
  const [config, setConfig] = useState<SecurityConfig>({
    csp: {
      enabled: true,
      reportOnly: false
    },
    csrf: {
      enabled: true,
      tokenRefreshInterval: 30
    },
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 15
    },
    inputSanitization: {
      enabled: true,
      maxLength: 10000,
      strictMode: false
    },
    vulnerabilityScanning: {
      enabled: true,
      scanInterval: 60,
      autoFix: false
    },
    monitoring: {
      enabled: true,
      alertThreshold: 5,
      realTimeAlerts: true
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    loadCurrentConfig();
  }, []);

  const loadCurrentConfig = async () => {
    try {
      // In a real implementation, this would load from backend or local storage
      const savedConfig = localStorage.getItem('security-config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (error) {
      logger.error('Failed to load security configuration', undefined, error);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    setSaveStatus('saving');

    try {
      // Save to local storage (in real implementation, would save to backend)
      localStorage.setItem('security-config', JSON.stringify(config));

      // Apply configuration to security system
      const securitySystem = getSecuritySystem();
      if (securitySystem) {
        // Update CSP settings
        if (config.csp.enabled) {
          // CSP configuration would be applied here
        }

        // Update CSRF settings
        if (config.csrf.enabled) {
          // CSRF configuration would be applied here
        }

        // Update rate limiting settings
        if (config.rateLimiting.enabled) {
          // Rate limiting configuration would be applied here
        }
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      logger.error('Failed to save security configuration', undefined, error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    setConfig({
      csp: {
        enabled: true,
        reportOnly: false
      },
      csrf: {
        enabled: true,
        tokenRefreshInterval: 30
      },
      rateLimiting: {
        enabled: true,
        maxRequests: 100,
        windowMs: 15
      },
      inputSanitization: {
        enabled: true,
        maxLength: 10000,
        strictMode: false
      },
      vulnerabilityScanning: {
        enabled: true,
        scanInterval: 60,
        autoFix: false
      },
      monitoring: {
        enabled: true,
        alertThreshold: 5,
        realTimeAlerts: true
      }
    });
  };

  const updateConfig = (section: keyof SecurityConfig, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
            <p className="text-sm text-gray-500">
              Configure security features and policies
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={resetToDefaults} variant="outline" size="sm">
            Reset to Defaults
          </Button>
          <Button 
            onClick={saveConfig} 
            disabled={isLoading}
            className="relative"
          >
            {isLoading ? 'Saving...' : 'Save Settings'}
            {saveStatus === 'saved' && (
              <CheckCircle className="h-4 w-4 ml-2 text-green-600" />
            )}
          </Button>
        </div>
      </div>

      {/* Save Status Alert */}
      {saveStatus === 'saved' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Security settings saved successfully
          </AlertDescription>
        </Alert>
      )}

      {saveStatus === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Failed to save security settings. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Settings Tabs */}
      <Tabs defaultValue="csp" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="csp">CSP</TabsTrigger>
          <TabsTrigger value="csrf">CSRF</TabsTrigger>
          <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
          <TabsTrigger value="sanitization">Input Sanitization</TabsTrigger>
          <TabsTrigger value="scanning">Vulnerability Scanning</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="csp" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Content Security Policy</span>
              </CardTitle>
              <CardDescription>
                Configure Content Security Policy to prevent XSS attacks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="csp-enabled">Enable CSP</Label>
                  <p className="text-sm text-gray-500">
                    Enable Content Security Policy protection
                  </p>
                </div>
                <Switch
                  id="csp-enabled"
                  checked={config.csp.enabled}
                  onCheckedChange={(checked) => updateConfig('csp', 'enabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="csp-report-only">Report Only Mode</Label>
                  <p className="text-sm text-gray-500">
                    Report violations without blocking (for testing)
                  </p>
                </div>
                <Switch
                  id="csp-report-only"
                  checked={config.csp.reportOnly}
                  onCheckedChange={(checked) => updateConfig('csp', 'reportOnly', checked)}
                  disabled={!config.csp.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csrf" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Lock className="h-5 w-5" />
                <span>CSRF Protection</span>
              </CardTitle>
              <CardDescription>
                Configure Cross-Site Request Forgery protection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="csrf-enabled">Enable CSRF Protection</Label>
                  <p className="text-sm text-gray-500">
                    Protect against cross-site request forgery attacks
                  </p>
                </div>
                <Switch
                  id="csrf-enabled"
                  checked={config.csrf.enabled}
                  onCheckedChange={(checked) => updateConfig('csrf', 'enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="csrf-refresh-interval">Token Refresh Interval (minutes)</Label>
                <Input
                  id="csrf-refresh-interval"
                  type="number"
                  min="5"
                  max="120"
                  value={config.csrf.tokenRefreshInterval}
                  onChange={(e) => updateConfig('csrf', 'tokenRefreshInterval', parseInt(e.target.value))}
                  disabled={!config.csrf.enabled}
                />
                <p className="text-sm text-gray-500">
                  How often to refresh CSRF tokens (5-120 minutes)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rate-limiting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Rate Limiting</span>
              </CardTitle>
              <CardDescription>
                Configure request rate limiting to prevent abuse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rate-limiting-enabled">Enable Rate Limiting</Label>
                  <p className="text-sm text-gray-500">
                    Limit the number of requests per time window
                  </p>
                </div>
                <Switch
                  id="rate-limiting-enabled"
                  checked={config.rateLimiting.enabled}
                  onCheckedChange={(checked) => updateConfig('rateLimiting', 'enabled', checked)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max-requests">Max Requests</Label>
                  <Input
                    id="max-requests"
                    type="number"
                    min="10"
                    max="1000"
                    value={config.rateLimiting.maxRequests}
                    onChange={(e) => updateConfig('rateLimiting', 'maxRequests', parseInt(e.target.value))}
                    disabled={!config.rateLimiting.enabled}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="window-minutes">Window (minutes)</Label>
                  <Input
                    id="window-minutes"
                    type="number"
                    min="1"
                    max="60"
                    value={config.rateLimiting.windowMs}
                    onChange={(e) => updateConfig('rateLimiting', 'windowMs', parseInt(e.target.value))}
                    disabled={!config.rateLimiting.enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sanitization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="h-5 w-5" />
                <span>Input Sanitization</span>
              </CardTitle>
              <CardDescription>
                Configure input sanitization and XSS prevention
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sanitization-enabled">Enable Input Sanitization</Label>
                  <p className="text-sm text-gray-500">
                    Automatically sanitize user input to prevent XSS
                  </p>
                </div>
                <Switch
                  id="sanitization-enabled"
                  checked={config.inputSanitization.enabled}
                  onCheckedChange={(checked) => updateConfig('inputSanitization', 'enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-input-length">Maximum Input Length</Label>
                <Input
                  id="max-input-length"
                  type="number"
                  min="1000"
                  max="100000"
                  value={config.inputSanitization.maxLength}
                  onChange={(e) => updateConfig('inputSanitization', 'maxLength', parseInt(e.target.value))}
                  disabled={!config.inputSanitization.enabled}
                />
                <p className="text-sm text-gray-500">
                  Maximum allowed length for user input (characters)
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="strict-mode">Strict Mode</Label>
                  <p className="text-sm text-gray-500">
                    Use stricter sanitization rules (may break some content)
                  </p>
                </div>
                <Switch
                  id="strict-mode"
                  checked={config.inputSanitization.strictMode}
                  onCheckedChange={(checked) => updateConfig('inputSanitization', 'strictMode', checked)}
                  disabled={!config.inputSanitization.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scanning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Vulnerability Scanning</span>
              </CardTitle>
              <CardDescription>
                Configure automated vulnerability detection
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="scanning-enabled">Enable Vulnerability Scanning</Label>
                  <p className="text-sm text-gray-500">
                    Automatically scan for security vulnerabilities
                  </p>
                </div>
                <Switch
                  id="scanning-enabled"
                  checked={config.vulnerabilityScanning.enabled}
                  onCheckedChange={(checked) => updateConfig('vulnerabilityScanning', 'enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="scan-interval">Scan Interval (minutes)</Label>
                <Select
                  value={config.vulnerabilityScanning.scanInterval.toString()}
                  onValueChange={(value) => updateConfig('vulnerabilityScanning', 'scanInterval', parseInt(value))}
                  disabled={!config.vulnerabilityScanning.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-fix">Auto-fix Vulnerabilities</Label>
                  <p className="text-sm text-gray-500">
                    Automatically attempt to fix detected vulnerabilities
                  </p>
                </div>
                <Switch
                  id="auto-fix"
                  checked={config.vulnerabilityScanning.autoFix}
                  onCheckedChange={(checked) => updateConfig('vulnerabilityScanning', 'autoFix', checked)}
                  disabled={!config.vulnerabilityScanning.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5" />
                <span>Security Monitoring</span>
              </CardTitle>
              <CardDescription>
                Configure security event monitoring and alerting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="monitoring-enabled">Enable Security Monitoring</Label>
                  <p className="text-sm text-gray-500">
                    Monitor and log security events
                  </p>
                </div>
                <Switch
                  id="monitoring-enabled"
                  checked={config.monitoring.enabled}
                  onCheckedChange={(checked) => updateConfig('monitoring', 'enabled', checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alert-threshold">Alert Threshold</Label>
                <Input
                  id="alert-threshold"
                  type="number"
                  min="1"
                  max="50"
                  value={config.monitoring.alertThreshold}
                  onChange={(e) => updateConfig('monitoring', 'alertThreshold', parseInt(e.target.value))}
                  disabled={!config.monitoring.enabled}
                />
                <p className="text-sm text-gray-500">
                  Number of similar events before triggering an alert
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="real-time-alerts">Real-time Alerts</Label>
                  <p className="text-sm text-gray-500">
                    Send immediate alerts for critical security events
                  </p>
                </div>
                <Switch
                  id="real-time-alerts"
                  checked={config.monitoring.realTimeAlerts}
                  onCheckedChange={(checked) => updateConfig('monitoring', 'realTimeAlerts', checked)}
                  disabled={!config.monitoring.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}