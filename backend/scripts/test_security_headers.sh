#!/bin/bash

# Test Security Headers Implementation
# Verifies that all required security headers are present in API responses

echo "🔒 Testing Security Headers"
echo "============================"
echo ""

API_URL="${API_URL:-http://localhost:8080}"
ENDPOINT="$API_URL/ping"

echo "Testing endpoint: $ENDPOINT"
echo ""

# Fetch headers
HEADERS=$(curl -sI "$ENDPOINT" 2>/dev/null)

if [ $? -ne 0 ]; then
  echo "❌ Failed to connect to server"
  echo "Make sure backend is running: cd backend && go run cmd/api/main.go"
  exit 1
fi

echo "📋 Security Headers Check:"
echo ""

# Check for security headers
check_header() {
  HEADER_NAME=$1
  EXPECTED_VALUE=$2

  if echo "$HEADERS" | grep -qi "^$HEADER_NAME:"; then
    ACTUAL_VALUE=$(echo "$HEADERS" | grep -i "^$HEADER_NAME:" | cut -d: -f2- | tr -d '\r' | xargs)

    if [ -n "$EXPECTED_VALUE" ]; then
      if echo "$ACTUAL_VALUE" | grep -q "$EXPECTED_VALUE"; then
        echo "✅ $HEADER_NAME: Present & Correct"
        echo "   Value: $ACTUAL_VALUE"
      else
        echo "⚠️  $HEADER_NAME: Present but unexpected value"
        echo "   Expected: $EXPECTED_VALUE"
        echo "   Actual: $ACTUAL_VALUE"
      fi
    else
      echo "✅ $HEADER_NAME: Present"
      echo "   Value: $ACTUAL_VALUE"
    fi
  else
    echo "❌ $HEADER_NAME: Missing"
  fi
  echo ""
}

# Test all security headers
check_header "X-Frame-Options" "DENY"
check_header "X-Content-Type-Options" "nosniff"
check_header "Content-Security-Policy" "default-src 'self'"
check_header "Referrer-Policy" "strict-origin-when-cross-origin"
check_header "Permissions-Policy" ""
check_header "Cache-Control" ""

echo "============================"
echo ""
echo "🔍 Additional Checks:"
echo ""

# Check CORS headers
if echo "$HEADERS" | grep -qi "Access-Control-Allow-Origin"; then
  CORS_VALUE=$(echo "$HEADERS" | grep -i "Access-Control-Allow-Origin" | cut -d: -f2- | tr -d '\r' | xargs)
  echo "✅ CORS configured: $CORS_VALUE"
else
  echo "⚠️  CORS headers not found (may be expected for /ping endpoint)"
fi

echo ""
echo "============================"
echo ""
echo "📊 Summary:"
echo ""

# Count headers
TOTAL_HEADERS=$(echo "$check_header" | grep -c "✅")

if echo "$HEADERS" | grep -qi "X-Frame-Options"; then
  echo "✅ Clickjacking Protection: Active (X-Frame-Options)"
else
  echo "❌ Clickjacking Protection: Missing"
fi

if echo "$HEADERS" | grep -qi "Content-Security-Policy"; then
  echo "✅ XSS Protection: Active (CSP)"
else
  echo "❌ XSS Protection: Missing"
fi

if echo "$HEADERS" | grep -qi "X-Content-Type-Options"; then
  echo "✅ MIME-Sniffing Protection: Active"
else
  echo "❌ MIME-Sniffing Protection: Missing"
fi

if echo "$HEADERS" | grep -qi "Strict-Transport-Security"; then
  echo "✅ HTTPS Enforcement: Active (HSTS)"
else
  echo "⚠️  HTTPS Enforcement: Not active (expected in development)"
fi

echo ""
echo "============================"
echo ""
echo "🎯 Security Posture:"
echo ""
echo "These headers protect against:"
echo "  • Clickjacking attacks (iframe embedding)"
echo "  • Cross-Site Scripting (XSS)"
echo "  • MIME-type confusion attacks"
echo "  • Information leakage via referrer"
echo "  • Dangerous browser features"
echo ""
echo "For production, enable HSTS header in SecurityHeadersProduction()"
