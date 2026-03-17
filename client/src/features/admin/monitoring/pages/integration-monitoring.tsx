/**
 * Integration Monitoring Dashboard
 * Monitors system integrations and external API health
 */

import { Card, CardContent, CardHeader, CardTitle } from '@client/lib/design-system';
import { Badge } from '@client/lib/design-system';
import { Alert, AlertDescription } from '@client/lib/design-system';
import { LoadingSpinner } from '@client/lib/design-system';
import { Activity, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface IntegrationStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  responseTime: number;
  uptime: number;
}

const mockIntegrations: IntegrationStatus[] = [
  {
    name: 'Parliament API',
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    responseTime: 120,
    uptime: 99.9
  },
  {
    name: 'Bills Database',
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    responseTime: 85,
    uptime: 99.8
  },
  {
    name: 'User Authentication',
    status: 'degraded',
    lastCheck: new Date().toISOString(),
    responseTime: 450,
    uptime: 98.5
  }
];

function getStatusIcon(status: IntegrationStatus['status']) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'degraded':
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    case 'down':
      return <XCircle className="h-5 w-5 text-red-600" />;
  }
}

function getStatusBadge(status: IntegrationStatus['status']) {
  switch (status) {
    case 'healthy':
      return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
    case 'degraded':
      return <Badge className="bg-yellow-100 text-yellow-800">Degraded</Badge>;
    case 'down':
      return <Badge className="bg-red-100 text-red-800">Down</Badge>;
  }
}

export default function IntegrationMonitoringDashboard() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Activity className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Integration Monitoring</h1>
          <p className="text-gray-600">Monitor system integrations and external API health</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <span className="text-2xl font-bold text-green-600">98.7%</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Overall uptime</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">{mockIntegrations.length}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Services monitored</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-purple-600" />
              <span className="text-2xl font-bold text-purple-600">218ms</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Across all services</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockIntegrations.map((integration) => (
              <div key={integration.name} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(integration.status)}
                  <div>
                    <h3 className="font-medium">{integration.name}</h3>
                    <p className="text-sm text-gray-600">
                      Last checked: {new Date(integration.lastCheck).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right text-sm">
                    <div className="font-medium">{integration.responseTime}ms</div>
                    <div className="text-gray-600">{integration.uptime}% uptime</div>
                  </div>
                  {getStatusBadge(integration.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This is a placeholder monitoring dashboard. In production, this would connect to real monitoring services.
        </AlertDescription>
      </Alert>
    </div>
  );
}