/**
 * Security Dashboard Component
 * Displays security status and threat monitoring information
 */

import React, { useState } from 'react';
import { useSecurity } from '../../hooks/useSecurity';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  RefreshCw, 
  Eye, 
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

interface SecurityDashboardProps {
  className?: string;
  showDetails?: boolean;
}

export function SecurityDashboard({ className, showDetails = false }: SecurityDashboardProps) {
  const { 
    status, 
    isSecure, 
    threats, 
    latestThreat,
    performScan,
    scanInProgress,
    refreshSecurity,
    clearThreats
  } = useSecurity({
    enableThreatMonitoring: true,
    enablePeriodicScanning: true
  });

  const [showThreats, setShowThreats] = useState(false);

  const getSecurityIcon = () => {
    if (isSecure) {
      return <ShieldCheck className="h-5 w-5 text-green-600" />;
    }
    if (threats.some(t => t.severity === 'critical' || t.severity === 'high')) {
      return <ShieldAlert className="h-5 w-5 text-red-600" />;
    }
    return <Shield className="h-5 w-5 text-yellow-600" />;
  };

  const getSecurityScore = () => {
    return status.vulnerabilityScanning.lastScanScore;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      critical: 'destructive',
      high: 'destructive',
      medium: 'secondary',
      low: 'outline'
    } as const;

    return (
      <Badge variant={variants[severity as keyof typeof variants] || 'outline'}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Security Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getSecurityIcon()}
            Security Status
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSecurity}
              className="h-8 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={performScan}
              disabled={scanInProgress}
              className="h-8 px-2"
            >
              {scanInProgress ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                'Scan'
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-2xl font-bold">
                <span className={getScoreColor(getSecurityScore())}>
                  {getSecurityScore()}/100
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Security Score
              </p>
            </div>
            <div className="w-32">
              <Progress 
                value={getSecurityScore()} 
                className="h-2"
              />
            </div>
          </div>
          
          {latestThreat && (
            <Alert className="mt-3">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Latest threat: {latestThreat.description} 
                <span className="ml-2">
                  {getSeverityBadge(latestThreat.severity)}
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Security Components Status */}
      {showDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CSP Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CSP</CardTitle>
              {status.csp.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.csp.enabled ? 'Active' : 'Disabled'}
              </div>
              <p className="text-xs text-muted-foreground">
                Content Security Policy
              </p>
              {status.csp.enabled && (
                <p className="text-xs text-muted-foreground mt-1">
                  Nonce: {status.csp.currentNonce.substring(0, 8)}...
                </p>
              )}
            </CardContent>
          </Card>

          {/* CSRF Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">CSRF</CardTitle>
              {status.csrf.hasValidToken ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.csrf.hasValidToken ? 'Protected' : 'Vulnerable'}
              </div>
              <p className="text-xs text-muted-foreground">
                Cross-Site Request Forgery
              </p>
              {status.csrf.hasValidToken && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires in: {Math.round(status.csrf.tokenExpiresIn / 60000)}m
                </p>
              )}
            </CardContent>
          </Card>

          {/* Rate Limiting */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rate Limit</CardTitle>
              {status.rateLimit.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.rateLimit.activeKeys}
              </div>
              <p className="text-xs text-muted-foreground">
                Active Rate Limits
              </p>
            </CardContent>
          </Card>

          {/* Vulnerability Scanning */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Scanning</CardTitle>
              {status.vulnerabilityScanning.enabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {status.vulnerabilityScanning.threatsFound}
              </div>
              <p className="text-xs text-muted-foreground">
                Threats Found
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Threats Section */}
      {threats.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Security Threats ({threats.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowThreats(!showThreats)}
                className="h-8 px-2"
              >
                {showThreats ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearThreats}
                className="h-8 px-2"
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          {showThreats && (
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {threats.slice(0, 10).map((threat, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-2 border rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityBadge(threat.severity)}
                        <Badge variant="outline">{threat.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-900 truncate">
                        {threat.description}
                      </p>
                      {threat.location && (
                        <p className="text-xs text-muted-foreground">
                          Location: {threat.location}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimestamp(threat.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {threats.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    ... and {threats.length - 10} more threats
                  </p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Security Recommendations */}
      {!isSecure && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Security Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {!status.csrf.hasValidToken && (
                <Alert>
                  <AlertDescription>
                    CSRF protection is not active. Refresh the page to generate a new token.
                  </AlertDescription>
                </Alert>
              )}
              
              {status.vulnerabilityScanning.lastScanScore < 70 && (
                <Alert>
                  <AlertDescription>
                    Security score is low. Run a security scan to identify issues.
                  </AlertDescription>
                </Alert>
              )}
              
              {threats.some(t => t.severity === 'critical') && (
                <Alert>
                  <AlertDescription>
                    Critical security threats detected. Review and address immediately.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default SecurityDashboard;