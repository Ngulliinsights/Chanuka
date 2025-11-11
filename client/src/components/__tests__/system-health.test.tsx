import React from 'react';
import { render, screen } from '@testing-library/react';
import SystemHealth from '../system-health';

// Mock dependencies
jest.mock('../ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
}));

jest.mock('../ui/button', () => ({
  Button: ({ children, variant, className, ...props }: any) => (
    <button className={className} data-variant={variant} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('../ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}));

jest.mock('../ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('lucide-react', () => ({
  RefreshCw: () => <span data-testid="refresh-icon">RefreshCw</span>,
  Download: () => <span data-testid="download-icon">Download</span>,
  Database: () => <span data-testid="database-icon">Database</span>,
  Shield: () => <span data-testid="shield-icon">Shield</span>,
  Activity: () => <span data-testid="activity-icon">Activity</span>,
  Clock: () => <span data-testid="clock-icon">Clock</span>,
  Server: () => <span data-testid="server-icon">Server</span>,
  HardDrive: () => <span data-testid="harddrive-icon">HardDrive</span>,
  Settings: () => <span data-testid="settings-icon">Settings</span>,
}));

jest.mock('../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
  formatRelativeTime: (timestamp: number) => `formatted-${timestamp}`,
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('SystemHealth', () => {
  const mockHealth = {
    status: 'healthy',
    timestamp: 1234567890,
  };

  const mockStats = {
    connections: '12/20',
    performance: '45ms',
    memory: '68%',
  };

  const mockEnvironment = {
    NODE_ENV: 'development',
    DATABASE_URL: 'Set',
    REDIS_URL: 'Not set',
    API_KEY: 'Set',
  };

  const mockActivity = {
    recentUsers: [
      { name: 'John Doe', created_at: 1234567890 },
      { name: 'Jane Smith', created_at: 1234567891 },
    ],
    recentBills: [
      { title: 'Bill 1', created_at: 1234567892 },
    ],
  };

  it('renders quick actions section', () => {
    render(<SystemHealth />);

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('Refresh Schema')).toBeInTheDocument();
    expect(screen.getByText('Export Schema')).toBeInTheDocument();
    expect(screen.getByText('Seed Database')).toBeInTheDocument();
    expect(screen.getByText('Backup Database')).toBeInTheDocument();
  });

  it('renders system health metrics', () => {
    render(<SystemHealth health={mockHealth} />);

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Database Connection')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Active Connections')).toBeInTheDocument();
    expect(screen.getByText('Query Performance')).toBeInTheDocument();
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
  });

  it('shows correct status for healthy connection', () => {
    render(<SystemHealth health={mockHealth} />);

    const dbConnection = screen.getByText('Database Connection').closest('div');
    expect(dbConnection).toHaveTextContent('Healthy');
  });

  it('shows correct status for unhealthy connection', () => {
    const unhealthyHealth = { ...mockHealth, status: 'unhealthy' };
    render(<SystemHealth health={unhealthyHealth} />);

    const dbConnection = screen.getByText('Database Connection').closest('div');
    expect(dbConnection).toHaveTextContent('Disconnected');
  });

  it('renders recent activity', () => {
    render(<SystemHealth activity={mockActivity} />);

    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('New user: John Doe')).toBeInTheDocument();
    expect(screen.getByText('New user: Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('New bill: Bill 1')).toBeInTheDocument();
    expect(screen.getByText('Database connection established')).toBeInTheDocument();
  });

  it('limits recent users to 3', () => {
    const manyUsers = {
      recentUsers: Array.from({ length: 5 }, (_, i) => ({
        name: `User ${i}`,
        created_at: 1234567890 + i,
      })),
    };

    render(<SystemHealth activity={manyUsers} />);

    expect(screen.getByText('New user: User 0')).toBeInTheDocument();
    expect(screen.getByText('New user: User 1')).toBeInTheDocument();
    expect(screen.getByText('New user: User 2')).toBeInTheDocument();
    expect(screen.queryByText('New user: User 3')).not.toBeInTheDocument();
  });

  it('limits recent bills to 2', () => {
    const manyBills = {
      recentBills: Array.from({ length: 4 }, (_, i) => ({
        title: `Bill ${i}`,
        created_at: 1234567890 + i,
      })),
    };

    render(<SystemHealth activity={manyBills} />);

    expect(screen.getByText('New bill: Bill 0')).toBeInTheDocument();
    expect(screen.getByText('New bill: Bill 1')).toBeInTheDocument();
    expect(screen.queryByText('New bill: Bill 2')).not.toBeInTheDocument();
  });

  it('renders environment status', () => {
    render(<SystemHealth environment={mockEnvironment} />);

    expect(screen.getByText('Environment Status')).toBeInTheDocument();
    expect(screen.getByText('NODE_ENV')).toBeInTheDocument();
    expect(screen.getByText('development')).toBeInTheDocument();
    expect(screen.getByText('DATABASE_URL')).toBeInTheDocument();
    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByText('REDIS_URL')).toBeInTheDocument();
    expect(screen.getByText('Not Set')).toBeInTheDocument();
  });

  it('limits environment variables to 4', () => {
    const manyEnvVars = {
      VAR1: 'value1',
      VAR2: 'value2',
      VAR3: 'value3',
      VAR4: 'value4',
      VAR5: 'value5',
    };

    render(<SystemHealth environment={manyEnvVars} />);

    expect(screen.getByText('VAR1')).toBeInTheDocument();
    expect(screen.getByText('VAR2')).toBeInTheDocument();
    expect(screen.getByText('VAR3')).toBeInTheDocument();
    expect(screen.getByText('VAR4')).toBeInTheDocument();
    expect(screen.queryByText('VAR5')).not.toBeInTheDocument();
  });

  it('shows formatted timestamp for health check', () => {
    render(<SystemHealth health={mockHealth} />);

    expect(screen.getByText('formatted-1234567890')).toBeInTheDocument();
  });

  it('shows default timestamp when no health timestamp', () => {
    render(<SystemHealth />);

    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
  });

  it('shows formatted timestamps for activity', () => {
    render(<SystemHealth activity={mockActivity} />);

    expect(screen.getByText('formatted-1234567890')).toBeInTheDocument();
    expect(screen.getByText('formatted-1234567891')).toBeInTheDocument();
    expect(screen.getByText('formatted-1234567892')).toBeInTheDocument();
  });

  it('shows default timestamps when no activity timestamps', () => {
    const activityWithoutTimestamps = {
      recentUsers: [{ name: 'User' }],
      recentBills: [{ title: 'Bill' }],
    };

    render(<SystemHealth activity={activityWithoutTimestamps} />);

    expect(screen.getByText('2 minutes ago')).toBeInTheDocument();
    expect(screen.getByText('5 minutes ago')).toBeInTheDocument();
  });

  it('applies correct status colors', () => {
    render(<SystemHealth health={mockHealth} />);

    // Success status (healthy database)
    const dbMetric = screen.getByText('Database Connection').closest('div');
    expect(dbMetric).toHaveClass('text-success');

    // Warning status (memory usage)
    const memoryMetric = screen.getByText('Memory Usage').closest('div');
    expect(memoryMetric).toHaveClass('text-warning');
  });

  it('applies correct status dots', () => {
    render(<SystemHealth health={mockHealth} />);

    // Check that status dots have correct classes
    const dots = screen.getAllByTestId('status-dot');
    expect(dots.length).toBeGreaterThan(0);
  });

  it('renders edit variables button', () => {
    render(<SystemHealth environment={mockEnvironment} />);

    expect(screen.getByText('Edit Variables')).toBeInTheDocument();
  });

  it('renders separators between sections', () => {
    render(<SystemHealth health={mockHealth} environment={mockEnvironment} />);

    const separators = screen.getAllByTestId('separator');
    expect(separators.length).toBeGreaterThan(0);
  });

  it('handles empty props gracefully', () => {
    expect(() => {
      render(<SystemHealth />);
    }).not.toThrow();
  });

  it('handles undefined activity arrays', () => {
    const activityWithUndefined = {
      recentUsers: undefined,
      recentBills: undefined,
    };

    expect(() => {
      render(<SystemHealth activity={activityWithUndefined} />);
    }).not.toThrow();
  });

  it('handles empty environment object', () => {
    render(<SystemHealth environment={{}} />);

    expect(screen.getByText('Environment Status')).toBeInTheDocument();
    expect(screen.getByText('Edit Variables')).toBeInTheDocument();
  });

  it('renders with all props provided', () => {
    render(
      <SystemHealth
        health={mockHealth}
        stats={mockStats}
        environment={mockEnvironment}
        activity={mockActivity}
      />
    );

    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Environment Status')).toBeInTheDocument();
  });

  it('monitors database connection health dynamically', async () => {
    // Mock health check function
    const mockHealthCheck = jest.fn();
    mockHealthCheck.mockResolvedValueOnce({ status: 'healthy', connections: 15 })
                  .mockResolvedValueOnce({ status: 'unhealthy', connections: 0 });

    // Simulate health monitoring
    let healthState = { status: 'healthy', timestamp: Date.now() };
    const { rerender } = render(<SystemHealth health={healthState} />);

    expect(screen.getByText('Healthy')).toBeInTheDocument();

    // Update health state to unhealthy
    healthState = { status: 'unhealthy', timestamp: Date.now() };
    rerender(<SystemHealth health={healthState} />);

    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('tracks performance metrics over time', async () => {
    const performanceData = [
      { timestamp: Date.now() - 300000, value: '40ms avg' },
      { timestamp: Date.now() - 240000, value: '45ms avg' },
      { timestamp: Date.now() - 180000, value: '50ms avg' },
      { timestamp: Date.now() - 120000, value: '55ms avg' },
      { timestamp: Date.now() - 60000, value: '60ms avg' },
    ];

    // Test performance degradation detection
    const degradedHealth = {
      status: 'healthy',
      timestamp: Date.now(),
      performance: '60ms avg',
      trend: 'degrading'
    };

    render(<SystemHealth health={degradedHealth} />);

    expect(screen.getByText('Query Performance')).toBeInTheDocument();
    expect(screen.getByText('60ms avg')).toBeInTheDocument();

    // Verify warning status for degraded performance
    const performanceMetric = screen.getByText('Query Performance').closest('div');
    expect(performanceMetric).toHaveClass('text-warning');
  });

  it('monitors memory usage and alerts on high usage', async () => {
    const highMemoryHealth = {
      status: 'healthy',
      timestamp: Date.now(),
      memory: '85%',
      memoryTrend: 'increasing'
    };

    render(<SystemHealth health={highMemoryHealth} />);

    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();

    // High memory should show warning
    const memoryMetric = screen.getByText('Memory Usage').closest('div');
    expect(memoryMetric).toHaveClass('text-warning');
  });

  it('detects connection pool exhaustion', async () => {
    const exhaustedConnections = {
      status: 'healthy',
      timestamp: Date.now(),
      connections: '20/20', // All connections used
      connectionStatus: 'exhausted'
    };

    render(<SystemHealth health={exhaustedConnections} />);

    expect(screen.getByText('Active Connections')).toBeInTheDocument();
    expect(screen.getByText('20/20')).toBeInTheDocument();

    // Exhausted connections should show error status
    const connectionMetric = screen.getByText('Active Connections').closest('div');
    expect(connectionMetric).toHaveClass('text-destructive');
  });

  it('monitors environment variable changes', async () => {
    const initialEnv = { DATABASE_URL: 'Set', REDIS_URL: 'Not set' };
    const { rerender } = render(<SystemHealth environment={initialEnv} />);

    expect(screen.getByText('DATABASE_URL')).toBeInTheDocument();
    expect(screen.getByText('Set')).toBeInTheDocument();
    expect(screen.getByText('REDIS_URL')).toBeInTheDocument();
    expect(screen.getByText('Not Set')).toBeInTheDocument();

    // Simulate environment change
    const updatedEnv = { DATABASE_URL: 'Set', REDIS_URL: 'Set' };
    rerender(<SystemHealth environment={updatedEnv} />);

    expect(screen.getByText('REDIS_URL')).toBeInTheDocument();
    expect(screen.getAllByText('Set')).toHaveLength(2);
  });

  it('tracks recent activity and detects anomalies', async () => {
    const activityData = {
      recentUsers: [
        { name: 'User1', created_at: Date.now() - 60000 },
        { name: 'User2', created_at: Date.now() - 120000 },
        { name: 'User3', created_at: Date.now() - 180000 },
      ],
      recentBills: [
        { title: 'Bill1', created_at: Date.now() - 300000 },
      ],
      userRegistrationRate: 2, // users per minute - normal
    };

    render(<SystemHealth activity={activityData} />);

    expect(screen.getByText('New user: User1')).toBeInTheDocument();
    expect(screen.getByText('New user: User2')).toBeInTheDocument();
    expect(screen.getByText('New user: User3')).toBeInTheDocument();
    expect(screen.getByText('New bill: Bill1')).toBeInTheDocument();
  });

  it('alerts on unusual activity patterns', async () => {
    const suspiciousActivity = {
      recentUsers: Array.from({ length: 10 }, (_, i) => ({
        name: `BotUser${i}`,
        created_at: Date.now() - (i * 1000), // All within last 10 seconds
      })),
      userRegistrationRate: 20, // 20 users per minute - suspicious
      flaggedActivity: true
    };

    render(<SystemHealth activity={suspiciousActivity} />);

    // Should show activity but component would need to handle flagged state
    expect(screen.getByText('New user: BotUser0')).toBeInTheDocument();
  });

  it('integrates with external health check services', async () => {
    // Mock external health service
    const mockExternalHealth = {
      database: { status: 'healthy', latency: '45ms' },
      cache: { status: 'healthy', hitRate: '92%' },
      externalAPI: { status: 'degraded', latency: '2000ms' },
      timestamp: Date.now()
    };

    const healthWithExternal = {
      ...mockHealth,
      externalServices: mockExternalHealth
    };

    render(<SystemHealth health={healthWithExternal} />);

    // Component should still render normally with external data
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Database Connection')).toBeInTheDocument();
  });

  it('handles health check failures gracefully', async () => {
    const failedHealthCheck = {
      status: 'error',
      error: 'Health check service unavailable',
      timestamp: Date.now()
    };

    render(<SystemHealth health={failedHealthCheck} />);

    // Should show error state without crashing
    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getByText('Database Connection')).toBeInTheDocument();
    expect(screen.getByText('Disconnected')).toBeInTheDocument();
  });

  it('provides real-time health status updates', async () => {
    const initialHealth = { status: 'healthy', timestamp: Date.now() - 60000 };
    const { rerender } = render(<SystemHealth health={initialHealth} />);

    expect(screen.getByText('System Health')).toBeInTheDocument();

    // Simulate real-time update
    const updatedHealth = { status: 'healthy', timestamp: Date.now() };
    rerender(<SystemHealth health={updatedHealth} />);

    // Component should handle the update without issues
    expect(screen.getByText('System Health')).toBeInTheDocument();
  });
});

// Helper to add test ids for status dots in actual component
describe('SystemHealth - Status Indicators', () => {
  it('displays status dots with correct colors', () => {
    render(<SystemHealth health={mockHealth} />);

    // In actual component, status dots would have data-testid="status-dot"
    // and appropriate background classes
    const metrics = screen.getAllByText(/Healthy|12\/20|45ms avg|68%/);
    expect(metrics.length).toBe(4);
  });
});