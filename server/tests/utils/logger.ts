// Minimal no-op logger shim for tests.
// Tests import this from server/tests/**/../utils/logger
export const logger = {
  debug: (_msg: string, _context?: any, _meta?: any) => {},
  info: (_msg: string, _context?: any, _meta?: any) => {},
  warn: (_msg: string, _context?: any, _meta?: any) => {},
  error: (_msg: string, _context?: any, _meta?: any) => {},
  critical: (_msg: string, _context?: any, _meta?: any) => {},
  log: (_obj: any, _msg?: string, ..._args: any[]) => {},
  getLogAggregation: (_window?: number) => ({
    totalLogs: 0,
    logsByLevel: {},
    logsByComponent: {},
    recentLogs: [],
    errorRate: 0,
    performanceMetrics: { averageResponseTime: 0, slowRequests: 0 }
  }),
  queryLogs: (_filters?: any) => [] as any[],
  logPerformance: (_operation: string, _duration: number, _meta?: any) => {},
  logSecurity: (_event: string, _userId?: string, _meta?: any) => {},
  logMetric: (_name: string, _value: number, _meta?: any) => {}
};

export default logger;
