#!/bin/bash
# Load test runner script
# Prerequisites: k6 installed (https://k6.io/docs/get-started/installation/)
# Usage: ./scripts/run-load-test.sh [base_url] [auth_token]

BASE_URL="${1:-http://localhost:3000}"
AUTH_TOKEN="${2:-}"

echo "=== Unbind Load Test ==="
echo "Target: $BASE_URL"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
  echo "Error: k6 is not installed."
  echo "Install it from: https://k6.io/docs/get-started/installation/"
  exit 1
fi

# Check if the target is reachable
echo "Checking target availability..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health" 2>/dev/null)
if [ "$HTTP_CODE" = "000" ]; then
  echo "Error: Cannot reach $BASE_URL"
  echo "Make sure the application is running."
  exit 1
fi
echo "Target reachable (HTTP $HTTP_CODE)"
echo ""

# Run the load test
echo "Starting load test..."
k6 run \
  -e BASE_URL="$BASE_URL" \
  -e AUTH_TOKEN="$AUTH_TOKEN" \
  tests/load/k6-config.js

echo ""
echo "Results saved to tests/load/results.json"
