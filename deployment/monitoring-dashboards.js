/**
 * Monitoring Dashboards Configuration for Chanuka Client
 * Comprehensive monitoring for system health, user experience, and business metrics
 */

const DASHBOARD_CONFIGS = {
  // System Health Dashboard
  systemHealth: {
    name: 'Chanuka Client - System Health',
    description: 'Core system metrics and infrastructure health',
    widgets: [
      {
        id: 'error-rate',
        type: 'timeseries',
        title: 'Error Rate',
        query: 'avg:chanuka.client.error_rate{env:production}',
        visualization: {
          type: 'line',
          yAxis: { min: 0, max: 10 },
          thresholds: [
            { value: 1, color: 'yellow', label: 'Warning' },
            { value: 5, color: 'red', label: 'Critical' },
          ],
        },
        alerts: [
          {
            name: 'High Error Rate',
            condition: 'avg(last_5m) > 5',
            severity: 'critical',
          },
        ],
      },
      {
        id: 'response-time',
        type: 'timeseries',
        title: 'API Response Time',
        query: 'avg:chanuka.client.api.response_time{env:production}',
        visualization: {
          type: 'line',
          yAxis: { min: 0, max: 2000 },
          thresholds: [
            { value: 500, color: 'yellow', label: 'Slow' },
            { value: 1000, color: 'red', label: 'Very Slow' },
          ],
        },
      },
      {
        id: 'availability',
        type: 'query_value',
        title: 'Uptime',
        query: 'avg:chanuka.client.uptime{env:production}',
        visualization: {
          type: 'number',
          format: 'percentage',
          precision: 2,
        },
      },
      {
        id: 'active-users',
        type: 'timeseries',
        title: 'Active Users',
        query: 'sum:chanuka.client.active_users{env:production}',
        visualization: {
          type: 'area',
          yAxis: { min: 0 },
        },
      },
      {
        id: 'memory-usage',
        type: 'timeseries',
        title: 'Memory Usage',
        query: 'avg:chanuka.client.memory.used{env:production}',
        visualization: {
          type: 'line',
          yAxis: { min: 0, max: 200 },
          unit: 'MB',
        },
      },
      {
        id: 'cdn-cache-hit-rate',
        type: 'query_value',
        title: 'CDN Cache Hit Rate',
        query: 'avg:chanuka.client.cdn.cache_hit_rate{env:production}',
        visualization: {
          type: 'number',
          format: 'percentage',
        },
      },
    ],
    layout: {
      type: 'grid',
      columns: 3,
      rows: 2,
    },
  },

  // User Experience Dashboard
  userExperience: {
    name: 'Chanuka Client - User Experience',
    description: 'Core Web Vitals and user experience metrics',
    widgets: [
      {
        id: 'core-web-vitals',
        type: 'group',
        title: 'Core Web Vitals',
        widgets: [
          {
            id: 'lcp',
            type: 'query_value',
            title: 'Largest Contentful Paint (LCP)',
            query: 'avg:chanuka.client.performance.lcp{env:production}',
            visualization: {
              type: 'number',
              unit: 'ms',
              thresholds: [
                { value: 2500, color: 'green' },
                { value: 4000, color: 'yellow' },
                { value: 4000, color: 'red', operator: '>' },
              ],
            },
          },
          {
            id: 'fid',
            type: 'query_value',
            title: 'First Input Delay (FID)',
            query: 'avg:chanuka.client.performance.fid{env:production}',
            visualization: {
              type: 'number',
              unit: 'ms',
              thresholds: [
                { value: 100, color: 'green' },
                { value: 300, color: 'yellow' },
                { value: 300, color: 'red', operator: '>' },
              ],
            },
          },
          {
            id: 'cls',
            type: 'query_value',
            title: 'Cumulative Layout Shift (CLS)',
            query: 'avg:chanuka.client.performance.cls{env:production}',
            visualization: {
              type: 'number',
              precision: 3,
              thresholds: [
                { value: 0.1, color: 'green' },
                { value: 0.25, color: 'yellow' },
                { value: 0.25, color: 'red', operator: '>' },
              ],
            },
          },
        ],
      },
      {
        id: 'page-load-times',
        type: 'timeseries',
        title: 'Page Load Times by Route',
        query: 'avg:chanuka.client.page.load_time{env:production} by {route}',
        visualization: {
          type: 'line',
          yAxis: { min: 0, max: 5000 },
          unit: 'ms',
        },
      },
      {
        id: 'user-satisfaction',
        type: 'timeseries',
        title: 'User Satisfaction Score',
        query: 'avg:chanuka.client.user.satisfaction{env:production}',
        visualization: {
          type: 'area',
          yAxis: { min: 0, max: 100 },
          unit: '%',
        },
      },
      {
        id: 'bounce-rate',
        type: 'query_value',
        title: 'Bounce Rate',
        query: 'avg:chanuka.client.user.bounce_rate{env:production}',
        visualization: {
          type: 'number',
          format: 'percentage',
          thresholds: [
            { value: 40, color: 'green' },
            { value: 60, color: 'yellow' },
            { value: 60, color: 'red', operator: '>' },
          ],
        },
      },
      {
        id: 'session-duration',
        type: 'timeseries',
        title: 'Average Session Duration',
        query: 'avg:chanuka.client.user.session_duration{env:production}',
        visualization: {
          type: 'line',
          yAxis: { min: 0 },
          unit: 'minutes',
        },
      },
      {
        id: 'device-performance',
        type: 'heatmap',
        title: 'Performance by Device Type',
        query: 'avg:chanuka.client.performance.score{env:production} by {device_type}',
        visualization: {
          type: 'heatmap',
          colorScale: ['red', 'yellow', 'green'],
        },
      },
    ],
  },

  // Business Metrics Dashboard
  businessMetrics: {
    name: 'Chanuka Client - Business Metrics',
    description: 'Civic engagement and business KPIs',
    widgets: [
      {
        id: 'daily-active-users',
        type: 'timeseries',
        title: 'Daily Active Users',
        query: 'sum:chanuka.client.users.daily_active{env:production}',
        visualization: {
          type: 'bars',
          yAxis: { min: 0 },
        },
      },
      {
        id: 'bill-engagement',
        type: 'group',
        title: 'Bill Engagement Metrics',
        widgets: [
          {
            id: 'bills-viewed',
            type: 'query_value',
            title: 'Bills Viewed Today',
            query: 'sum:chanuka.client.bills.views{env:production}',
            visualization: { type: 'number' },
          },
          {
            id: 'bills-saved',
            type: 'query_value',
            title: 'Bills Saved Today',
            query: 'sum:chanuka.client.bills.saves{env:production}',
            visualization: { type: 'number' },
          },
          {
            id: 'comments-posted',
            type: 'query_value',
            title: 'Comments Posted Today',
            query: 'sum:chanuka.client.comments.posted{env:production}',
            visualization: { type: 'number' },
          },
        ],
      },
      {
        id: 'user-journey-funnel',
        type: 'funnel',
        title: 'User Engagement Funnel',
        steps: [
          { name: 'Page Visit', query: 'sum:chanuka.client.page.visits{env:production}' },
          { name: 'Bill View', query: 'sum:chanuka.client.bills.views{env:production}' },
          { name: 'User Registration', query: 'sum:chanuka.client.users.registrations{env:production}' },
          { name: 'Bill Save', query: 'sum:chanuka.client.bills.saves{env:production}' },
          { name: 'Comment Posted', query: 'sum:chanuka.client.comments.posted{env:production}' },
        ],
      },
      {
        id: 'geographic-distribution',
        type: 'geomap',
        title: 'User Geographic Distribution',
        query: 'sum:chanuka.client.users.active{env:production} by {country}',
        visualization: {
          type: 'choropleth',
          colorScale: ['lightblue', 'darkblue'],
        },
      },
      {
        id: 'feature-adoption',
        type: 'timeseries',
        title: 'Feature Adoption Rates',
        query: 'avg:chanuka.client.features.adoption_rate{env:production} by {feature}',
        visualization: {
          type: 'line',
          yAxis: { min: 0, max: 100 },
          unit: '%',
        },
      },
      {
        id: 'conversion-rates',
        type: 'query_table',
        title: 'Conversion Rates by Source',
        query: 'avg:chanuka.client.conversion.rate{env:production} by {source}',
        visualization: {
          type: 'table',
          columns: ['Source', 'Conversion Rate', 'Total Users'],
        },
      },
    ],
  },

  // Real-time Operations Dashboard
  realTimeOps: {
    name: 'Chanuka Client - Real-time Operations',
    description: 'Live monitoring and incident response',
    widgets: [
      {
        id: 'live-user-count',
        type: 'query_value',
        title: 'Live Users',
        query: 'sum:chanuka.client.users.live{env:production}',
        visualization: {
          type: 'number',
          autoRefresh: 10, // seconds
        },
      },
      {
        id: 'error-stream',
        type: 'log_stream',
        title: 'Recent Errors',
        query: 'source:chanuka-client status:error',
        visualization: {
          type: 'list',
          maxItems: 20,
          autoRefresh: 30,
        },
      },
      {
        id: 'performance-alerts',
        type: 'alert_list',
        title: 'Active Performance Alerts',
        query: 'tag:chanuka-client tag:performance',
        visualization: {
          type: 'list',
          groupBy: 'severity',
        },
      },
      {
        id: 'deployment-timeline',
        type: 'event_timeline',
        title: 'Recent Deployments',
        query: 'tags:deployment,chanuka-client',
        visualization: {
          type: 'timeline',
          timeRange: '24h',
        },
      },
      {
        id: 'api-health-matrix',
        type: 'service_map',
        title: 'API Health Matrix',
        query: 'service:chanuka-client-api',
        visualization: {
          type: 'matrix',
          colorBy: 'health',
        },
      },
      {
        id: 'websocket-connections',
        type: 'timeseries',
        title: 'WebSocket Connections',
        query: 'sum:chanuka.client.websocket.connections{env:production}',
        visualization: {
          type: 'area',
          yAxis: { min: 0 },
          autoRefresh: 15,
        },
      },
    ],
  },
};

// Dashboard creation and management functions
class DashboardManager {
  constructor(apiKey, appKey, baseUrl = 'https://api.datadoghq.com') {
    this.apiKey = apiKey;
    this.appKey = appKey;
    this.baseUrl = baseUrl;
  }

  async createDashboard(config) {
    const response = await fetch(`${this.baseUrl}/api/v1/dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.apiKey,
        'DD-APPLICATION-KEY': this.appKey,
      },
      body: JSON.stringify({
        title: config.name,
        description: config.description,
        widgets: config.widgets,
        layout_type: config.layout?.type || 'ordered',
        is_read_only: false,
        notify_list: [],
        template_variables: [
          {
            name: 'env',
            default: 'production',
            prefix: 'env',
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create dashboard: ${response.statusText}`);
    }

    return response.json();
  }

  async updateDashboard(dashboardId, config) {
    const response = await fetch(`${this.baseUrl}/api/v1/dashboard/${dashboardId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': this.apiKey,
        'DD-APPLICATION-KEY': this.appKey,
      },
      body: JSON.stringify({
        title: config.name,
        description: config.description,
        widgets: config.widgets,
        layout_type: config.layout?.type || 'ordered',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update dashboard: ${response.statusText}`);
    }

    return response.json();
  }

  async createAllDashboards() {
    const results = {};
    
    for (const [key, config] of Object.entries(DASHBOARD_CONFIGS)) {
      try {
        console.log(`Creating dashboard: ${config.name}`);
        const result = await this.createDashboard(config);
        results[key] = result;
        console.log(`✅ Created dashboard: ${config.name} (ID: ${result.id})`);
      } catch (error) {
        console.error(`❌ Failed to create dashboard ${config.name}:`, error);
        results[key] = { error: error.message };
      }
    }
    
    return results;
  }

  async setupAlerts() {
    const alerts = [
      {
        name: 'Chanuka Client - High Error Rate',
        query: 'avg(last_5m):avg:chanuka.client.error_rate{env:production} > 5',
        message: `
          @slack-chanuka-alerts
          High error rate detected in Chanuka Client.
          
          Current rate: {{value}}%
          Threshold: 5%
          
          Dashboard: https://app.datadoghq.com/dashboard/chanuka-client-system-health
        `,
        tags: ['chanuka-client', 'error-rate', 'critical'],
        options: {
          thresholds: {
            critical: 5,
            warning: 2,
          },
          notify_no_data: true,
          no_data_timeframe: 10,
          renotify_interval: 60,
        },
      },
      {
        name: 'Chanuka Client - Poor Core Web Vitals',
        query: 'avg(last_10m):avg:chanuka.client.performance.lcp{env:production} > 4000',
        message: `
          @slack-chanuka-performance
          Poor Core Web Vitals detected.
          
          LCP: {{value}}ms (threshold: 4000ms)
          
          Performance Dashboard: https://app.datadoghq.com/dashboard/chanuka-client-user-experience
        `,
        tags: ['chanuka-client', 'performance', 'core-web-vitals'],
        options: {
          thresholds: {
            critical: 4000,
            warning: 2500,
          },
        },
      },
      {
        name: 'Chanuka Client - Low User Engagement',
        query: 'avg(last_1h):avg:chanuka.client.user.engagement_score{env:production} < 60',
        message: `
          @slack-chanuka-business
          User engagement score has dropped below threshold.
          
          Current score: {{value}}
          Threshold: 60
          
          Business Dashboard: https://app.datadoghq.com/dashboard/chanuka-client-business-metrics
        `,
        tags: ['chanuka-client', 'engagement', 'business'],
        options: {
          thresholds: {
            critical: 50,
            warning: 60,
          },
        },
      },
    ];

    const results = [];
    
    for (const alert of alerts) {
      try {
        const response = await fetch(`${this.baseUrl}/api/v1/monitor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'DD-API-KEY': this.apiKey,
            'DD-APPLICATION-KEY': this.appKey,
          },
          body: JSON.stringify({
            type: 'metric alert',
            ...alert,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to create alert: ${response.statusText}`);
        }

        const result = await response.json();
        results.push(result);
        console.log(`✅ Created alert: ${alert.name}`);
      } catch (error) {
        console.error(`❌ Failed to create alert ${alert.name}:`, error);
        results.push({ error: error.message, alert: alert.name });
      }
    }
    
    return results;
  }
}

// Deployment script
const deployMonitoring = async () => {
  const apiKey = process.env.DATADOG_API_KEY;
  const appKey = process.env.DATADOG_APP_KEY;
  
  if (!apiKey || !appKey) {
    console.error('❌ Missing Datadog API credentials');
    process.exit(1);
  }
  
  const manager = new DashboardManager(apiKey, appKey);
  
  try {
    console.log('🚀 Setting up monitoring dashboards...');
    
    // Create dashboards
    const dashboards = await manager.createAllDashboards();
    console.log('📊 Dashboards created:', Object.keys(dashboards));
    
    // Setup alerts
    const alerts = await manager.setupAlerts();
    console.log('🚨 Alerts created:', alerts.length);
    
    // Save dashboard IDs for future reference
    const dashboardIds = {};
    for (const [key, result] of Object.entries(dashboards)) {
      if (result.id) {
        dashboardIds[key] = result.id;
      }
    }
    
    console.log('✅ Monitoring setup complete!');
    console.log('Dashboard IDs:', dashboardIds);
    
  } catch (error) {
    console.error('❌ Monitoring setup failed:', error);
    process.exit(1);
  }
};

// Export for use in deployment scripts
module.exports = {
  DASHBOARD_CONFIGS,
  DashboardManager,
  deployMonitoring,
};

// Run if called directly
if (require.main === module) {
  deployMonitoring();
}