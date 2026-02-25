/**
 * Load Test: Recommendation Engine
 * Tests recommendation API performance under load
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { API_BASE_URL } from '../config.js';

// Custom metrics
const recommendationErrors = new Rate('recommendation_errors');
const recommendationDuration = new Trend('recommendation_duration');

export function testRecommendations() {
  const url = `${API_BASE_URL}/recommendations`;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'recommendations' },
  };

  const response = http.get(url, params);
  
  // Record metrics
  recommendationDuration.add(response.timings.duration);
  
  // Checks
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has recommendations': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.recommendations && body.recommendations.length > 0;
      } catch {
        return false;
      }
    },
  });
  
  recommendationErrors.add(!success);
  
  sleep(1);
}
