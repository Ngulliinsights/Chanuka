/**
 * Security Dashboard Component
 * Displays security system status and metrics
 */

import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  Eye,
  Lock,
  Zap
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { logger } from '@client/utils/logger';

import { getSecuritySystem } from '../../security';
import { SecurityMetrics, SecurityAlert, SecurityEvent, VulnerabilityReport } from '../../security/types';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';


interface SecurityDashboardProps {
  className?: string;
  showDetails?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SecurityDashboard({ 
  className = '',
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 30000
}: SecurityDashboardProps) {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [vulnerabilities, setVulnerabilities] = useState<VulnerabilityReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const refreshData = async () => {
    try {
      const securitySystem = getSecuritySystem();
      if (!securitySystem) {
        logger.warn('Security system not initialized');
        return;
      }

      // Get metrics
      const currentMetrics = securitySystem.monitor.getMetrics();
      setMetrics(currentMetrics);

      // Get alerts
      const currentAlerts = securitySystem.monitor.getAlerts();
      setAlerts(currentAlerts);

      // Get recent events (last 100)
      const allEvents = securitySystem.monitor.getEvents();
      setEvents(allEvents.slice(-100));

      // Get vulnerabilities
      const currentVulnerabilities = securitySystem.vulnerabilityScanner.getVulnerabilities();
      setVulnerabilities(currentVulnerabilities);

      setLastUpdate(new Date());
      setIsLoading(false);
    } catch (error) {
      logger.error('Failed to refresh security dashboard data', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();

    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <XCircle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const securitySystem = getSecuritySystem();
      if (securitySystem) {
        securitySystem.monitor.acknowledgeAlert(alertId);
        await refreshData();
      }
    } catch (error) {
      logger.error('Failed to acknowledge alert', error);
    }
  };

  const runVulnerabilityScan = async () => {
    try {
      const securitySystem = getSecuritySystem();
      if (securitySystem) {
        await securitySystem.vulnerabilityScanner.scan();
        await refreshData();
      }
    } catch (error) {
      logger.error('Failed to run vulnerability scan', error);
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={runVulnerabilityScan} variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            Scan
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            {getHealthIcon(metrics?.systemHealth || 'unknown')}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHealthColor(metrics?.systemHealth || 'unknown')}`}>
              {metrics?.systemHealth || 'Unknown'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total events recorded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {alerts.filter(a => !a.acknowledged).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unacknowledged alerts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vulnerabilities</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {vulnerabilities.filter(v => !v.fixed).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Unfixed vulnerabilities
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      {showDetails && (
        <Tabs defaultValue="alerts" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Alerts</CardTitle>
                <CardDescription>
                  Active security alerts requiring attention
                </CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No alerts</p>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 10).map((alert) => (
                      <Alert key={alert.id}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <span className="font-medium">{alert.type}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {alert.message}
                            </p>
                            <p className="text-xs text-gray-400">
                              {alert.timestamp.toLocaleString()}
                            </p>
                          </div>
                          {!alert.acknowledged && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
                <CardDescription>
                  Latest security events detected by the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No events</p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {events.slice(-20).reverse().map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center space-x-3">
                          <Badge className={getSeverityColor(event.severity)}>
                            {event.severity}
                          </Badge>
                          <div>
                            <p className="font-medium">{event.type}</p>
                            <p className="text-sm text-gray-600">{event.source}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">
                            {event.timestamp.toLocaleString()}
                          </p>
                          {event.resolved && (
                            <Badge variant="outline" className="text-green-600">
                              Resolved
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vulnerabilities" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Vulnerability Report</CardTitle>
                <CardDescription>
                  Security vulnerabilities detected in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {vulnerabilities.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No vulnerabilities detected</p>
                ) : (
                  <div className="space-y-3">
                    {vulnerabilities.map((vuln) => (
                      <div key={vuln.id} className="border rounded p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(vuln.severity)}>
                              {vuln.severity}
                            </Badge>
                            <span className="font-medium">{vuln.type}</span>
                            {vuln.fixed && (
                              <Badge variant="outline" className="text-green-600">
                                Fixed
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {vuln.timestamp.toLocaleString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{vuln.description}</p>
                        {vuln.recommendations.length > 0 && (
                          <div className="text-xs text-gray-600">
                            <p className="font-medium">Recommendations:</p>
                            <ul className="list-disc list-inside ml-2">
                              {vuln.recommendations.map((rec, index) => (
                                <li key={index}>{rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Events by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.eventsByType && Object.keys(metrics.eventsByType).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(metrics.eventsByType).map(([type, count]) => (
                        <div key={type} className="flex justify-between">
                          <span className="text-sm">{type.replace('_', ' ')}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No event data</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Events by Severity</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.eventsBySeverity && Object.keys(metrics.eventsBySeverity).length > 0 ? (
                    <div className="space-y-2">
                      {Object.entries(metrics.eventsBySeverity).map(([severity, count]) => (
                        <div key={severity} className="flex justify-between">
                          <Badge className={getSeverityColor(severity)}>
                            {severity}
                          </Badge>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No severity data</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}