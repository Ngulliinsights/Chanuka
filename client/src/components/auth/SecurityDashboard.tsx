/**
 * Security Dashboard Component
 * Account security monitoring and management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Shield, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  MapPin, 
  Monitor, 
  Key,
  Eye,
  EyeOff,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';
import { TwoFactorSetup } from './TwoFactorSetup';
import { SecurityEvent, SuspiciousActivityAlert, SessionInfo } from '../../types/auth';
import { logger } from '../../utils/logger';

interface SecurityDashboardProps {
  className?: string;
}

export function SecurityDashboard({ className = '' }: SecurityDashboardProps) {
  const auth = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<SuspiciousActivityAlert[]>([]);
  const [activeSessions, setActiveSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    if (!auth.user) return;

    setLoading(true);
    try {
      const [events, alerts, sessions] = await Promise.all([
        auth.getSecurityEvents(20),
        auth.getSuspiciousActivity(),
        auth.getActiveSessions(),
      ]);

      setSecurityEvents(events);
      setSuspiciousActivity(alerts);
      setActiveSessions(sessions);
    } catch (error) {
      logger.error('Failed to load security data:', { component: 'SecurityDashboard' }, error);
    } finally {
      setLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const result = await auth.terminateSession(sessionId);
      if (result.success) {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      logger.error('Failed to terminate session:', { component: 'SecurityDashboard' }, error);
    }
  };

  const handleTerminateAllSessions = async () => {
    try {
      const result = await auth.terminateAllSessions();
      if (result.success) {
        // This will log out the current user
        setActiveSessions([]);
      }
    } catch (error) {
      logger.error('Failed to terminate all sessions:', { component: 'SecurityDashboard' }, error);
    }
  };

  const getEventIcon = (eventType: SecurityEvent['event_type']) => {
    switch (eventType) {
      case 'login':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <Monitor className="h-4 w-4 text-gray-600" />;
      case 'password_change':
        return <Key className="h-4 w-4 text-blue-600" />;
      case 'failed_login':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'two_factor_enabled':
      case 'two_factor_disabled':
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'account_locked':
        return <Shield className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getRiskBadge = (riskScore: number) => {
    if (riskScore >= 70) {
      return <Badge variant="destructive">High Risk</Badge>;
    } else if (riskScore >= 40) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800">Medium Risk</Badge>;
    } else {
      return <Badge variant="secondary" className="bg-green-100 text-green-800">Low Risk</Badge>;
    }
  };

  const getAlertSeverityBadge = (severity: SuspiciousActivityAlert['severity']) => {
    const variants = {
      low: 'secondary',
      medium: 'secondary',
      high: 'destructive',
      critical: 'destructive',
    } as const;

    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-orange-100 text-orange-800',
      high: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900',
    };

    return (
      <Badge variant={variants[severity]} className={colors[severity]}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  if (!auth.user) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please log in to view your security dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Security Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium">Two-Factor Auth</p>
                  <p className="text-sm text-gray-600">
                    {auth.user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              {auth.user.two_factor_enabled ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Button
                  size="sm"
                  onClick={() => setShowTwoFactorSetup(true)}
                >
                  Enable
                </Button>
              )}
            </div>

            {/* Account Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Account Status</p>
                  <p className="text-sm text-gray-600">
                    {auth.user.account_locked ? 'Locked' : 'Active'}
                  </p>
                </div>
              </div>
              {auth.user.account_locked ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
            </div>

            {/* Last Login */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-gray-600" />
                <div>
                  <p className="font-medium">Last Login</p>
                  <p className="text-sm text-gray-600">
                    {auth.user.last_login 
                      ? new Date(auth.user.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Details */}
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="alerts">Suspicious Activity</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
        </TabsList>

        {/* Security Events */}
        <TabsContent value="events">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Security Events</CardTitle>
              <Button variant="outline" size="sm" onClick={loadSecurityData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Loading security events...</p>
                </div>
              ) : securityEvents.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No security events found.</p>
              ) : (
                <div className="space-y-3">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      {getEventIcon(event.event_type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium capitalize">
                            {event.event_type.replace('_', ' ')}
                          </p>
                          {getRiskBadge(event.risk_score)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {event.ip_address}
                          </p>
                          <p>
                            <Clock className="h-3 w-3 inline mr-1" />
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {showSensitiveData && event.details && (
                        <div className="text-xs text-gray-500 max-w-xs">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(event.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suspicious Activity */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activity Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {suspiciousActivity.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <p className="text-gray-600">No suspicious activity detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {suspiciousActivity.map((alert) => (
                    <Alert key={alert.id} variant={alert.severity === 'high' || alert.severity === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{alert.alert_type.replace('_', ' ')}</span>
                              {getAlertSeverityBadge(alert.severity)}
                            </div>
                            <p className="text-sm">{alert.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(alert.triggered_at).toLocaleString()}
                            </p>
                          </div>
                          {!alert.resolved && (
                            <Button variant="outline" size="sm">
                              Mark Resolved
                            </Button>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions */}
        <TabsContent value="sessions">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Active Sessions</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSensitiveData(!showSensitiveData)}
                >
                  {showSensitiveData ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleTerminateAllSessions}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  End All Sessions
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center gap-3 p-3 border rounded-lg">
                      <Monitor className="h-5 w-5 text-gray-600" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {session.is_current ? 'Current Session' : 'Other Session'}
                          </p>
                          {session.is_current && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              Current
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {showSensitiveData && (
                            <p>
                              <MapPin className="h-3 w-3 inline mr-1" />
                              {session.ip_address}
                            </p>
                          )}
                          <p>
                            <Clock className="h-3 w-3 inline mr-1" />
                            Last active: {new Date(session.last_activity).toLocaleString()}
                          </p>
                          <p className="text-xs truncate">
                            {session.user_agent}
                          </p>
                        </div>
                      </div>
                      {!session.is_current && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTerminateSession(session.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          End Session
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Two-Factor Setup Modal */}
      <TwoFactorSetup
        isOpen={showTwoFactorSetup}
        onClose={() => setShowTwoFactorSetup(false)}
        onComplete={(backupCodes) => {
          setShowTwoFactorSetup(false);
          // Refresh security data to show updated 2FA status
          loadSecurityData();
        }}
      />
    </div>
  );
}