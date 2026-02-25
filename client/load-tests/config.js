/**
 * k6 Load Testing Configuration
 * Defines test scenarios and thresholds
 */

export const options = {
  // Test stages - ramp up, sustain, ramp down
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],

  // Performance thresholds
  thresholds: {
    // HTTP request duration
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    
    // HTTP request failed rate
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    
    // Checks passed rate
    checks: ['rate>0.95'], // 95% of checks should pass
    
    // Specific feature thresholds
    'http_req_duration{name:recommendations}': ['p(95)<200'], // Recommendations < 200ms
    'http_req_duration{name:pretext_analysis}': ['p(95)<500'], // Pretext < 500ms
    'http_req_duration{name:constitutional_analysis}': ['p(95)<500'], // Constitutional < 500ms
    'http_req_duration{name:argument_intelligence}': ['p(95)<500'], // Arguments < 500ms
  },

  // Test scenarios
  scenarios: {
    // Baseline load test
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },

    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '30s', target: 500 }, // Spike
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '20m', // Start after baseline
    },

    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '5m', target: 300 },
        { duration: '5m', target: 400 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      startTime: '25m', // Start after spike
    },

    // Soak test (long duration)
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '1h',
      startTime: '45m', // Start after stress
    },
  },

  // Summary export
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  
  // Output results
  ext: {
    loadimpact: {
      projectID: process.env.K6_PROJECT_ID,
      name: 'Chanuka Platform Load Test',
    },
  },
};

// Base URL configuration
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5000/api';

// Test data
export const TEST_USER = {
  email: __ENV.TEST_USER_EMAIL || 'loadtest@example.com',
  password: __ENV.TEST_USER_PASSWORD || 'loadtest123',
};
