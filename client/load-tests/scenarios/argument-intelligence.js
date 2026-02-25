/**
 * Load Test: Argument Intelligence
 * Tests argument clustering and analysis API performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API_BASE_URL } from '../config.js';

// Custom metrics
const argumentErrors = new Rate('argument_errors');
const argumentDuration = new Trend('argument_duration');

export function testArgumentIntelligence() {
  const billId = Math.floor(Math.random() * 100) + 1;
  const url = `${API_BASE_URL}/argument-intelligence/bills/${billId}/clusters`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'argument_intelligence' },
  };

  const response = http.get(url, params);
  
  // Record metrics
  argumentDuration.add(response.timings.duration);
  
  // Checks
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has clusters': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.clusters);
      } catch {
        return false;
      }
    },
    'has sentiment data': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.sentiment !== undefined;
      } catch {
        return false;
      }
    },
    'clustering accuracy > 80%': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accuracy > 0.80;
      } catch {
        return true; // Skip if no accuracy field
      }
    },
  });
  
  argumentErrors.add(!success);
  
  sleep(1);
}
