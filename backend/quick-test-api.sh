#!/bin/bash

# Quick API Test Script using CLERK_JWT from .env
# Usage: ./quick-test-api.sh

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Quick API Authentication Test${NC}"
echo "========================================"

# Check if JWT exists
if [ -z "$CLERK_JWT" ]; then
    echo -e "${RED}❌ CLERK_JWT not found in .env file${NC}"
    echo -e "${YELLOW}Please add your JWT token to .env:${NC}"
    echo "CLERK_JWT=your_jwt_token_here"
    exit 1
fi

# Check JWT format
JWT_PARTS=$(echo "$CLERK_JWT" | tr '.' '\n' | wc -l)
if [ "$JWT_PARTS" -ne 3 ]; then
    echo -e "${RED}❌ Invalid JWT format (expected 3 parts, got $JWT_PARTS)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JWT token found in .env${NC}"
echo "Token length: ${#CLERK_JWT} characters"
echo ""

# Test /auth/me endpoint
echo -e "${BLUE}Testing GET /api/auth/me...${NC}"
echo "----------------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer $CLERK_JWT" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ SUCCESS! Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}❌ FAILED! Status: $HTTP_CODE${NC}"
    echo "Response:"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    
    if [ "$HTTP_CODE" = "401" ]; then
        echo ""
        echo -e "${YELLOW}💡 Token may have expired. Get a new one from Clerk.${NC}"
        echo -e "${YELLOW}   Use: node get-token-direct.js${NC}"
    fi
fi

echo ""
echo "========================================"
echo -e "${BLUE}To update your token:${NC}"
echo "1. Get new token from Clerk"
echo "2. Update CLERK_JWT in .env"
echo "3. Run this script again"