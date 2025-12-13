#!/bin/bash

# Test Rate Limiting for /api/v1/public/auth/validate-email endpoint
# Expected: Max 10 requests per minute per IP (with burst of 5)
# This prevents email enumeration attacks

echo "🧪 Testing Rate Limit Protection"
echo "================================"
echo ""
echo "Testing /api/v1/public/auth/validate-email endpoint"
echo "Expected: Max 10 requests/minute, burst 5"
echo ""

API_URL="${API_URL:-http://localhost:8080}"
ENDPOINT="$API_URL/api/v1/public/auth/validate-email"
TEST_EMAIL="test@example.com"

SUCCESS_COUNT=0
RATE_LIMITED_COUNT=0

echo "Sending 15 rapid requests..."
echo ""

for i in {1..15}; do
  RESPONSE=$(curl -s -w "\n%{http_code}" "$ENDPOINT?email=$TEST_EMAIL" 2>/dev/null)
  HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
  BODY=$(echo "$RESPONSE" | head -n -1)

  if [ "$HTTP_CODE" = "429" ]; then
    RATE_LIMITED_COUNT=$((RATE_LIMITED_COUNT + 1))
    echo "[$i] ⛔ HTTP $HTTP_CODE - Rate Limited"
  elif [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "200" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    echo "[$i] ✅ HTTP $HTTP_CODE - Allowed"
  else
    echo "[$i] ⚠️  HTTP $HTTP_CODE - Unexpected"
  fi

  # Small delay to see the pattern
  sleep 0.1
done

echo ""
echo "================================"
echo "📊 Test Results:"
echo "  ✅ Allowed: $SUCCESS_COUNT"
echo "  ⛔ Rate Limited: $RATE_LIMITED_COUNT"
echo ""

if [ $RATE_LIMITED_COUNT -gt 0 ]; then
  echo "✅ SUCCESS: Rate limiting is working!"
  echo "   The endpoint blocked $RATE_LIMITED_COUNT out of 15 requests"
else
  echo "❌ FAILURE: Rate limiting may not be configured correctly"
  echo "   All 15 requests were allowed"
fi

echo ""
echo "🔒 Security Check:"
echo "   Rate limiting protects against:"
echo "   • Email enumeration attacks"
echo "   • Brute force attempts"
echo "   • DoS attacks"
