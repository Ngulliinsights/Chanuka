/**
 * Load Test: Constitutional Intelligence
 * Tests constitutional analysis API performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API_BASE_URL } from '../config.js';

// Custom metrics
const constitutionalErrors = new Rate('constitutional_errors');
const constitutionalDuration = new Trend('constitutional_duration');

export function testConstitutionalIntelligence() {
  const billId = Math.floor(Math.random() * 100) + 1;
  const url = `${API_BASE_URL}/constitutional-intelligence/bills/${billId}/analysis`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'constitutional_analysis' },
  };

  const response = http.get(url, params);
  
  // Record metrics
  constitutionalDuration.add(response.timings.duration);
  
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
    'has rights impact': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.analysis.rightsImpact !== undefined;
      } catch {
        return false;
      }
    },
    'has precedents': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.analysis.precedents);
      } catch {
        return false;
      }
    },
  });
  
  constitutionalErrors.add(!success);
  
  sleep(1);
}
