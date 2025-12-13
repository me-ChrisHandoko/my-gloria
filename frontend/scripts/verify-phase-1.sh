#!/bin/bash

# Phase 1 Core Auth Setup - Automated Verification Script
# Run this script to verify all Phase 1 files are in place

echo "🔍 Phase 1: Core Auth Setup - Verification"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verification results
PASSED=0
FAILED=0

# Function to check file existence
check_file() {
  local file=$1
  local description=$2

  if [ -f "$file" ]; then
    echo -e "${GREEN}✅ PASS${NC} - $description"
    echo "   📄 $file"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - $description"
    echo "   📄 $file (NOT FOUND)"
    ((FAILED++))
  fi
  echo ""
}

# Function to check if string exists in file
check_content() {
  local file=$1
  local pattern=$2
  local description=$3

  if [ -f "$file" ]; then
    if grep -q "$pattern" "$file"; then
      echo -e "${GREEN}✅ PASS${NC} - $description"
      ((PASSED++))
    else
      echo -e "${RED}❌ FAIL${NC} - $description"
      echo "   Pattern '$pattern' not found in $file"
      ((FAILED++))
    fi
  else
    echo -e "${RED}❌ FAIL${NC} - $description (file not found)"
    ((FAILED++))
  fi
  echo ""
}

# Check files
echo "📋 Checking Core Files..."
echo ""

check_file "src/proxy.ts" "Proxy configuration (Next.js 16+)"
check_file "src/app/layout.tsx" "Root layout with ClerkProvider"
check_file "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx" "Sign-in page"
check_file "src/app/(auth)/layout.tsx" "Auth layout"
check_file ".env.local" "Environment variables (local)"
check_file ".env.example" "Environment variables (example)"

echo "📋 Checking File Contents..."
echo ""

check_content "src/proxy.ts" "clerkMiddleware" "Proxy uses Clerk v6 API"
check_content "src/proxy.ts" "await auth.protect()" "Proxy uses correct protect() syntax"
check_content "src/app/layout.tsx" "ClerkProvider" "Root layout includes ClerkProvider"
check_content "src/app/(auth)/sign-in/[[...sign-in]]/page.tsx" "SignIn" "Sign-in page uses Clerk component"
check_content ".env.local" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "Clerk publishable key configured"
check_content ".env.local" "CLERK_SECRET_KEY" "Clerk secret key configured"

echo "📋 Checking Security..."
echo ""

check_content ".gitignore" ".env*" "Environment files ignored in git"

echo "=========================================="
echo ""
echo "📊 Verification Results:"
echo "   ${GREEN}Passed: $PASSED${NC}"
echo "   ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Phase 1 Implementation Complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Configure Clerk keys in .env.local"
  echo "2. Run 'npm run dev' to test"
  echo "3. Navigate to /dashboard to verify redirect"
  echo "4. Disable sign-up in Clerk Dashboard"
  echo ""
  echo "📖 See docs/PHASE_1_VERIFICATION.md for detailed verification guide"
  exit 0
else
  echo -e "${RED}❌ Phase 1 Incomplete - $FAILED checks failed${NC}"
  echo ""
  echo "Please review failed checks above and fix issues."
  exit 1
fi
