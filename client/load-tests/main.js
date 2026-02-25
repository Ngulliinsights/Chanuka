/**
 * Main Load Test Script
 * Orchestrates all load test scenarios
 */

import { options } from './config.js';
import { testRecommendations } from './scenarios/recommendations.js';
import { testPretextDetection } from './scenarios/pretext-detection.js';
import { testConstitutionalIntelligence } from './scenarios/constitutional-intelligence.js';
import { testArgumentIntelligence } from './scenarios/argument-intelligence.js';
import { testAdvocacyCoordination } from './scenarios/advocacy-coordination.js';

export { options };

/**
 * Main test function
 * Randomly selects and executes different scenarios
 */
export default function () {
  const scenarios = [
    testRecommendations,
    testPretextDetection,
    testConstitutionalIntelligence,
    testArgumentIntelligence,
    testAdvocacyCoordination,
  ];
  
  // Randomly select a scenario (weighted distribution)
  const rand = Math.random();
  
  if (rand < 0.3) {
    // 30% - Recommendations (most frequent)
    testRecommendations();
  } else if (rand < 0.5) {
    // 20% - Pretext Detection
    testPretextDetection();
  } else if (rand < 0.7) {
    // 20% - Constitutional Intelligence
    testConstitutionalIntelligence();
  } else if (rand < 0.9) {
    // 20% - Argument Intelligence
    testArgumentIntelligence();
  } else {
    // 10% - Advocacy Coordination
    testAdvocacyCoordination();
  }
}

/**
 * Setup function - runs once per VU
 */
export function setup() {
  console.log('🚀 Starting load tests...');
  console.log(`Base URL: ${__ENV.BASE_URL || 'http://localhost:3000'}`);
  console.log(`API Base URL: ${__ENV.API_BASE_URL || 'http://localhost:5000/api'}`);
}

/**
 * Teardown function - runs once after all VUs finish
 */
export function teardown(data) {
  console.log('✅ Load tests complete');
}

/**
 * Handle summary - custom summary output
 */
export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    'load-test-summary.html': generateHTMLSummary(data),
    stdout: generateConsoleSummary(data),
  };
}

function generateConsoleSummary(data) {
  const { metrics } = data;
  
  return `
╔════════════════════════════════════════════════════════════════╗
║                    LOAD TEST SUMMARY                           ║
╠════════════════════════════════════════════════════════════════╣
║ HTTP Requests:                                                 ║
║   Total: ${metrics.http_reqs?.values?.count || 0}                                                  ║
║   Failed: ${metrics.http_req_failed?.values?.rate || 0}%                                              ║
║   Duration (p95): ${metrics.http_req_duration?.values?.['p(95)'] || 0}ms                                    ║
║   Duration (p99): ${metrics.http_req_duration?.values?.['p(99)'] || 0}ms                                    ║
╠════════════════════════════════════════════════════════════════╣
║ Feature-Specific Metrics:                                     ║
║   Recommendations (p95): ${metrics.recommendation_duration?.values?.['p(95)'] || 'N/A'}ms                      ║
║   Pretext Detection (p95): ${metrics.pretext_duration?.values?.['p(95)'] || 'N/A'}ms                    ║
║   Constitutional (p95): ${metrics.constitutional_duration?.values?.['p(95)'] || 'N/A'}ms                       ║
║   Arguments (p95): ${metrics.argument_duration?.values?.['p(95)'] || 'N/A'}ms                             ║
║   Advocacy (p95): ${metrics.advocacy_duration?.values?.['p(95)'] || 'N/A'}ms                              ║
╠════════════════════════════════════════════════════════════════╣
║ Checks:                                                        ║
║   Passed: ${metrics.checks?.values?.rate || 0}%                                              ║
╚════════════════════════════════════════════════════════════════╝
`;
}

function generateHTMLSummary(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Load Test Results</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .pass { color: green; font-weight: bold; }
    .fail { color: red; font-weight: bold; }
  </style>
</head>
<body>
  <h1>Load Test Results</h1>
  <h2>Summary</h2>
  <pre>${generateConsoleSummary(data)}</pre>
  <h2>Detailed Metrics</h2>
  <pre>${JSON.stringify(data.metrics, null, 2)}</pre>
</body>
</html>
`;
}
