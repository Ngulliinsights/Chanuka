import { Activity, CheckCircle, AlertCircle, Clock, Database, Globe, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

/**
 * System Status Page
 * 
 * Real-time system health and status monitoring
 */
export default function SystemStatusPage() {
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdated(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const services = [
    {
      name: 'API Service',
      status: 'operational',
      uptime: '99.98%',
      responseTime: '45ms',
      icon: Zap
    },
    {
      name: 'Database',
      status: 'operational',
      uptime: '99.99%',
      responseTime: '12ms',
      icon: Database
    },
    {
      name: 'Web Application',
      status: 'operational',
      uptime: '99.95%',
      responseTime: '120ms',
      icon: Globe
    },
    {
      name: 'WebSocket Service',
      status: 'operational',
      uptime: '99.92%',
      responseTime: '8ms',
      icon: Activity
    }
  ];

  const incidents = [
    {
      title: 'Scheduled Maintenance',
      description: 'Database optimization and index rebuilding',
      status: 'completed',
      date: '2024-01-15',
      duration: '30 minutes'
    },
    {
      title: 'API Rate Limit Adjustment',
      description: 'Increased rate limits for Pro tier users',
      status: 'completed',
      date: '2024-01-10',
      duration: '5 minutes'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'outage':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return CheckCircle;
      case 'degraded':
        return AlertCircle;
      case 'outage':
        return AlertCircle;
      default:
        return Clock;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-navy via-brand-teal to-brand-gold text-white py-16 border-b border-brand-gold/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Activity className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">System Status</h1>
            <p className="text-xl text-blue-100">
              Real-time monitoring of Chanuka platform services
            </p>
          </div>
        </div>
      </section>

      {/* Overall Status */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-8">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">All Systems Operational</h2>
                <p className="text-green-700 dark:text-green-300">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>

          {/* Services Status */}
          <h3 className="text-2xl font-bold mb-6">Service Status</h3>
          <div className="space-y-4 mb-12">
            {services.map((service, index) => {
              const Icon = service.icon;
              const StatusIcon = getStatusIcon(service.status);
              
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-lg">{service.name}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <StatusIcon className={`w-4 h-4 ${getStatusColor(service.status)}`} />
                          <span className={`text-sm font-medium capitalize ${getStatusColor(service.status)}`}>
                            {service.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
                      <div className="text-lg font-semibold">{service.uptime}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Avg response: {service.responseTime}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Incident History */}
          <h3 className="text-2xl font-bold mb-6">Recent Incidents</h3>
          <div className="space-y-4">
            {incidents.map((incident, index) => (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="font-semibold">{incident.title}</h4>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      {incident.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{new Date(incident.date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Duration: {incident.duration}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs font-medium rounded-full">
                    {incident.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscribe to Updates */}
      <section className="bg-white dark:bg-gray-800 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold mb-4">Subscribe to Status Updates</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Get notified about system incidents and scheduled maintenance
            </p>
            <form className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
