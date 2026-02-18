/* eslint-disable */
// k6 load test configuration
// Run with: k6 run tests/load/k6-config.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const apiDuration = new Trend('api_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.05'],    // Less than 5% errors
    errors: ['rate<0.1'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Health check
  const healthRes = http.get(`${BASE_URL}/api/health`);
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
    'health response has status': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.status !== undefined;
      } catch {
        return false;
      }
    },
  });
  errorRate.add(healthRes.status !== 200);
  apiDuration.add(healthRes.timings.duration);

  sleep(1);

  // Metrics endpoint
  const metricsRes = http.get(`${BASE_URL}/api/metrics`);
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
  });
  errorRate.add(metricsRes.status !== 200);
  apiDuration.add(metricsRes.timings.duration);

  sleep(1);

  // API endpoints (add your auth token as needed)
  const headers = {
    'Content-Type': 'application/json',
  };

  if (__ENV.AUTH_TOKEN) {
    headers['Authorization'] = `Bearer ${__ENV.AUTH_TOKEN}`;
  }

  // Cases list
  const casesRes = http.get(`${BASE_URL}/api/cases`, { headers });
  check(casesRes, {
    'cases responds': (r) => r.status < 500,
  });
  errorRate.add(casesRes.status >= 500);
  apiDuration.add(casesRes.timings.duration);

  sleep(0.5);
}

export function handleSummary(data) {
  return {
    'tests/load/results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, opts) {
  const indent = opts.indent || '  ';
  const lines = [];
  lines.push('=== Load Test Results ===');
  lines.push('');

  const metrics = data.metrics;
  if (metrics.http_req_duration) {
    lines.push(`${indent}HTTP Request Duration:`);
    lines.push(`${indent}${indent}avg: ${metrics.http_req_duration.values.avg.toFixed(2)}ms`);
    lines.push(`${indent}${indent}p95: ${metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`);
    lines.push(`${indent}${indent}p99: ${metrics.http_req_duration.values['p(99)'].toFixed(2)}ms`);
  }

  if (metrics.http_reqs) {
    lines.push(`${indent}Total Requests: ${metrics.http_reqs.values.count}`);
    lines.push(`${indent}RPS: ${metrics.http_reqs.values.rate.toFixed(2)}`);
  }

  if (metrics.errors) {
    lines.push(`${indent}Error Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%`);
  }

  return lines.join('\n');
}
