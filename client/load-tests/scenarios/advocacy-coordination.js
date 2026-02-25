/**
 * Load Test: Advocacy Coordination
 * Tests advocacy campaigns and actions API performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API_BASE_URL } from '../config.js';

// Custom metrics
const advocacyErrors = new Rate('advocacy_errors');
const advocacyDuration = new Trend('advocacy_duration');

export function testAdvocacyCoordination() {
  // Test campaigns endpoint
  const campaignsUrl = `${API_BASE_URL}/advocacy/campaigns`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'advocacy_campaigns' },
  };

  const response = http.get(campaignsUrl, params);
  
  // Record metrics
  advocacyDuration.add(response.timings.duration);
  
  // Checks
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has campaigns': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.campaigns);
      } catch {
        return false;
      }
    },
  });
  
  advocacyErrors.add(!success);
  
  sleep(1);
  
  // Test actions endpoint
  const actionsUrl = `${API_BASE_URL}/advocacy/actions`;
  const actionsResponse = http.get(actionsUrl, params);
  
  check(actionsResponse, {
    'actions status is 200': (r) => r.status === 200,
    'has actions': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.actions);
      } catch {
        return false;
      }
    },
  });
  
  sleep(1);
}
