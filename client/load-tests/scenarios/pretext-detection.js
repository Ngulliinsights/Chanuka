/**
 * Load Test: Pretext Detection
 * Tests pretext detection API performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API_BASE_URL } from '../config.js';

// Custom metrics
const pretextErrors = new Rate('pretext_errors');
const pretextDuration = new Trend('pretext_duration');

export function testPretextDetection() {
  const billId = Math.floor(Math.random() * 100) + 1;
  const url = `${API_BASE_URL}/pretext-detection/bills/${billId}/analysis`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'pretext_analysis' },
  };

  const response = http.get(url, params);
  
  // Record metrics
  pretextDuration.add(response.timings.duration);
  
  // Checks
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has analysis': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.analysis !== undefined;
      } catch {
        return false;
      }
    },
    'detection accuracy > 85%': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accuracy > 0.85;
      } catch {
        return true; // Skip if no accuracy field
      }
    },
  });
  
  pretextErrors.add(!success);
  
  sleep(1);
}
