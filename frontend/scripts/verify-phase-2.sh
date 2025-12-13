#!/bin/bash

# Phase 2 Redux Integration - Automated Verification Script
# Run this script to verify all Phase 2 files are in place

echo "🔍 Phase 2: Redux Integration - Verification"
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

# Check core Redux files
echo "📋 Checking Redux Store Files..."
echo ""

check_file "src/store/index.ts" "Redux store configuration"
check_file "src/store/hooks.ts" "Typed Redux hooks"
check_file "src/providers/redux-provider.tsx" "ReduxProvider client component"
check_file "src/store/api/apiSlice.ts" "RTK Query API slice"
check_file "src/store/slices/authSlice.ts" "Auth slice with selectors"

echo "📋 Checking Hook Files..."
echo ""

check_file "src/hooks/use-auth-query.ts" "useAuthQuery wrapper hook"
check_file "src/hooks/use-current-user.ts" "useCurrentUser primary hook"

echo "📋 Checking File Contents..."
echo ""

check_content "src/store/index.ts" "configureStore" "Store uses configureStore"
check_content "src/store/index.ts" "apiSlice.reducer" "Store includes apiSlice"
check_content "src/store/index.ts" "authReducer" "Store includes authSlice"
check_content "src/store/index.ts" "setupListeners" "Store enables RTK Query listeners"

check_content "src/store/hooks.ts" "useAppDispatch" "Typed dispatch hook exported"
check_content "src/store/hooks.ts" "useAppSelector" "Typed selector hook exported"

check_content "src/providers/redux-provider.tsx" "'use client'" "ReduxProvider is client component"
check_content "src/providers/redux-provider.tsx" "Provider" "Uses react-redux Provider"

check_content "src/store/api/apiSlice.ts" "createApi" "API slice uses RTK Query createApi"
check_content "src/store/api/apiSlice.ts" "extraOptions" "Uses extraOptions for token injection"
check_content "src/store/api/apiSlice.ts" "getCurrentUser" "Has getCurrentUser endpoint"
check_content "src/store/api/apiSlice.ts" "getMyPermissions" "Has permissions endpoint"

check_content "src/store/slices/authSlice.ts" "createSlice" "Auth slice uses createSlice"
check_content "src/store/slices/authSlice.ts" "selectError" "Includes selectError selector"
check_content "src/store/slices/authSlice.ts" "selectPermissions" "Includes permission selectors"

check_content "src/hooks/use-auth-query.ts" "useAuth" "useAuthQuery uses Clerk useAuth"
check_content "src/hooks/use-auth-query.ts" "getToken" "Fetches Clerk token"
check_content "src/hooks/use-auth-query.ts" "extraOptions" "Injects token via extraOptions"

check_content "src/app/layout.tsx" "ReduxProvider" "Root layout includes ReduxProvider"

echo "📋 Checking Provider Hierarchy..."
echo ""

# Check that ReduxProvider comes after ClerkProvider and before ThemeProvider
if [ -f "src/app/layout.tsx" ]; then
  # Extract the provider structure
  if grep -q "ClerkProvider" "src/app/layout.tsx" && \
     grep -q "ReduxProvider" "src/app/layout.tsx" && \
     grep -q "ThemeProvider" "src/app/layout.tsx"; then

    # Verify order: ClerkProvider should come before ReduxProvider
    clerk_line=$(grep -n "ClerkProvider" src/app/layout.tsx | head -1 | cut -d: -f1)
    redux_line=$(grep -n "ReduxProvider" src/app/layout.tsx | head -1 | cut -d: -f1)
    theme_line=$(grep -n "ThemeProvider" src/app/layout.tsx | head -1 | cut -d: -f1)

    if [ "$clerk_line" -lt "$redux_line" ] && [ "$redux_line" -lt "$theme_line" ]; then
      echo -e "${GREEN}✅ PASS${NC} - Provider hierarchy correct (Clerk → Redux → Theme)"
      ((PASSED++))
    else
      echo -e "${RED}❌ FAIL${NC} - Provider hierarchy incorrect"
      echo "   Expected: ClerkProvider → ReduxProvider → ThemeProvider"
      ((FAILED++))
    fi
  else
    echo -e "${RED}❌ FAIL${NC} - Not all providers found in layout"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - layout.tsx not found"
  ((FAILED++))
fi
echo ""

echo "=========================================="
echo ""
echo "📊 Verification Results:"
echo "   ${GREEN}Passed: $PASSED${NC}"
echo "   ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Phase 2 Implementation Complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Run 'npm run dev' to test Redux integration"
  echo "2. Check Redux DevTools to verify store setup"
  echo "3. Test useCurrentUser hook in a component"
  echo "4. Proceed to Phase 3: User Context Integration"
  echo ""
  echo "📖 See docs/PHASE_2_VERIFICATION.md for detailed guide"
  exit 0
else
  echo -e "${RED}❌ Phase 2 Incomplete - $FAILED checks failed${NC}"
  echo ""
  echo "Please review failed checks above and fix issues."
  exit 1
fi
