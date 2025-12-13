#!/bin/bash

# Phase 3 User Context Integration - Automated Verification Script

echo "🔍 Phase 3: User Context Integration - Verification"
echo "=================================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verification results
PASSED=0
FAILED=0

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

echo "📋 Checking nav-user.tsx Integration..."
echo ""

check_content "src/components/nav-user.tsx" "useCurrentUser" "nav-user uses useCurrentUser hook"
check_content "src/components/nav-user.tsx" "useClerk" "nav-user imports Clerk hooks"
check_content "src/components/nav-user.tsx" "handleSignOut" "Sign-out handler implemented"
check_content "src/components/nav-user.tsx" "clearAuth" "Clears Redux auth state on sign-out"
check_content "src/components/nav-user.tsx" "resetApiState" "Clears RTK Query cache on sign-out"
check_content "src/components/nav-user.tsx" "user.display_name" "Uses real user display_name"
check_content "src/components/nav-user.tsx" "isLoading" "Handles loading state"
check_content "src/components/nav-user.tsx" "isError" "Handles error state"
check_content "src/components/nav-user.tsx" "initials" "Generates user initials for avatar"

echo "📋 Checking app-sidebar.tsx Integration..."
echo ""

check_content "src/components/app-sidebar.tsx" "<NavUser />" "NavUser called without props"

# Check that mock user data was removed
if [ -f "src/components/app-sidebar.tsx" ]; then
  if ! grep -q 'user: {' src/components/app-sidebar.tsx; then
    echo -e "${GREEN}✅ PASS${NC} - Mock user data removed from app-sidebar"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Mock user data still present"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - app-sidebar.tsx not found"
  ((FAILED++))
fi
echo ""

echo "📋 Checking Sign-Out Implementation..."
echo ""

# Verify complete sign-out flow
if [ -f "src/components/nav-user.tsx" ]; then
  # Check all sign-out steps are present
  has_clear_auth=$(grep -c "clearAuth()" src/components/nav-user.tsx)
  has_reset_api=$(grep -c "resetApiState()" src/components/nav-user.tsx)
  has_clerk_signout=$(grep -c "signOut()" src/components/nav-user.tsx)
  has_redirect=$(grep -c "router.push('/sign-in')" src/components/nav-user.tsx)

  if [ "$has_clear_auth" -gt 0 ] && [ "$has_reset_api" -gt 0 ] && \
     [ "$has_clerk_signout" -gt 0 ] && [ "$has_redirect" -gt 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} - Complete sign-out flow implemented"
    echo "   - Redux auth state cleared"
    echo "   - RTK Query cache cleared"
    echo "   - Clerk session ended"
    echo "   - Redirects to sign-in"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Incomplete sign-out flow"
    [ "$has_clear_auth" -eq 0 ] && echo "   Missing: clearAuth()"
    [ "$has_reset_api" -eq 0 ] && echo "   Missing: resetApiState()"
    [ "$has_clerk_signout" -eq 0 ] && echo "   Missing: signOut()"
    [ "$has_redirect" -eq 0 ] && echo "   Missing: router.push()"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - nav-user.tsx not found"
  ((FAILED++))
fi
echo ""

echo "📋 Checking User Data Flow..."
echo ""

check_content "src/hooks/use-current-user.ts" "useAuthQuery" "useCurrentUser uses token injection"
check_content "src/hooks/use-current-user.ts" "useGetCurrentUserQuery" "Calls getCurrentUser endpoint"

echo "=================================================="
echo ""
echo "📊 Verification Results:"
echo "   ${GREEN}Passed: $PASSED${NC}"
echo "   ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Phase 3 Implementation Complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Configure Clerk keys in .env.local (if not done)"
  echo "2. Run 'npm run dev' to test user context"
  echo "3. Sign in to see real user data in sidebar"
  echo "4. Test sign-out functionality"
  echo "5. Verify token is sent to backend (Network tab)"
  echo ""
  echo "📖 See docs/PHASE_3_VERIFICATION.md for detailed guide"
  exit 0
else
  echo -e "${RED}❌ Phase 3 Incomplete - $FAILED checks failed${NC}"
  echo ""
  echo "Please review failed checks above and fix issues."
  exit 1
fi
