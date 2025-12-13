#!/bin/bash

# Phase 5 Error Handling & Polish - Automated Verification Script

echo "🔍 Phase 5: Error Handling & Polish - Verification"
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

echo "📋 Checking Error Boundary..."
echo ""

check_content "src/components/auth/auth-error-boundary.tsx" "export class AuthErrorBoundary" "AuthErrorBoundary component defined"
check_content "src/components/auth/auth-error-boundary.tsx" "componentDidCatch" "Error catching implemented"
check_content "src/components/auth/auth-error-boundary.tsx" "DefaultAuthErrorFallback" "Default fallback UI implemented"
check_content "src/components/auth/auth-error-boundary.tsx" "AuthErrorType" "Error type handling implemented"
check_content "src/components/auth/auth-error-boundary.tsx" "useAuthErrorBoundary" "Error boundary hook exported"

echo "📋 Checking Error Handler..."
echo ""

check_content "src/lib/auth-error-handler.ts" "export class AuthErrorHandler" "AuthErrorHandler class defined"
check_content "src/lib/auth-error-handler.ts" "handleError" "Error handling method implemented"
check_content "src/lib/auth-error-handler.ts" "handle401Error" "401 error handling implemented"
check_content "src/lib/auth-error-handler.ts" "maxRetries" "Retry logic implemented"
check_content "src/lib/auth-error-handler.ts" "exponentialBackoff" "Exponential backoff implemented"
check_content "src/lib/auth-error-handler.ts" "refreshToken" "Token refresh implemented"
check_content "src/lib/auth-error-handler.ts" "refreshQueue" "Refresh queue implemented"
check_content "src/lib/auth-error-handler.ts" "getAuthErrorHandler" "Global handler factory exported"

echo "📋 Checking Loading States..."
echo ""

check_content "src/components/auth/auth-loading-states.tsx" "export function LoadingSpinner" "LoadingSpinner component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function AuthLoadingScreen" "AuthLoadingScreen component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function PermissionLoadingState" "PermissionLoadingState component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function UserDataSkeleton" "UserDataSkeleton component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function LoadingOverlay" "LoadingOverlay component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function AuthenticatingScreen" "AuthenticatingScreen component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function VerifyingPermissionsScreen" "VerifyingPermissionsScreen component defined"
check_content "src/components/auth/auth-loading-states.tsx" "export function ButtonLoading" "ButtonLoading component defined"

echo "📋 Checking Token Refresh Queue..."
echo ""

check_content "src/lib/token-refresh-queue.ts" "export class TokenRefreshQueue" "TokenRefreshQueue class defined"
check_content "src/lib/token-refresh-queue.ts" "refreshToken" "Token refresh method implemented"
check_content "src/lib/token-refresh-queue.ts" "refreshQueue" "Request queue implemented"
check_content "src/lib/token-refresh-queue.ts" "isRefreshing" "Refresh state tracking implemented"
check_content "src/lib/token-refresh-queue.ts" "getTokenRefreshQueue" "Global queue factory exported"
check_content "src/lib/token-refresh-queue.ts" "createClerkTokenRefreshQueue" "Clerk integration helper exported"

echo "📋 Checking Toast Messages..."
echo ""

check_content "src/lib/auth-toast-messages.ts" "export const authEventMessages" "Auth event messages defined"
check_content "src/lib/auth-toast-messages.ts" "export function getAuthErrorMessage" "Auth error message function exported"
check_content "src/lib/auth-toast-messages.ts" "export function getPermissionCheckMessage" "Permission check message function exported"
check_content "src/lib/auth-toast-messages.ts" "export function getRoleCheckMessage" "Role check message function exported"
check_content "src/lib/auth-toast-messages.ts" "export function getModuleAccessMessage" "Module access message function exported"
check_content "src/lib/auth-toast-messages.ts" "export const networkErrorMessages" "Network error messages defined"
check_content "src/lib/auth-toast-messages.ts" "export const authSuccessMessages" "Success messages defined"
check_content "src/lib/auth-toast-messages.ts" "export function getErrorMessage" "Generic error message function exported"

echo "📋 Checking Integration..."
echo ""

# Check error boundary imports
if [ -f "src/components/auth/auth-error-boundary.tsx" ]; then
  if grep -q "@/types/auth" src/components/auth/auth-error-boundary.tsx; then
    echo -e "${GREEN}✅ PASS${NC} - Error boundary imports auth types"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Error boundary missing type imports"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - auth-error-boundary.tsx not found"
  ((FAILED++))
fi
echo ""

# Check error handler imports
if [ -f "src/lib/auth-error-handler.ts" ]; then
  if grep -q "@/types/auth" src/lib/auth-error-handler.ts; then
    echo -e "${GREEN}✅ PASS${NC} - Error handler imports auth types"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Error handler missing type imports"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - auth-error-handler.ts not found"
  ((FAILED++))
fi
echo ""

# Check toast messages imports
if [ -f "src/lib/auth-toast-messages.ts" ]; then
  if grep -q "@/types/auth" src/lib/auth-toast-messages.ts; then
    echo -e "${GREEN}✅ PASS${NC} - Toast messages import auth types"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Toast messages missing type imports"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - auth-toast-messages.ts not found"
  ((FAILED++))
fi
echo ""

echo "================================================"
echo ""
echo "📊 Verification Results:"
echo "   ${GREEN}Passed: $PASSED${NC}"
echo "   ${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ Phase 5 Implementation Complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Wrap your app with AuthErrorBoundary:"
  echo "   <AuthErrorBoundary>"
  echo "     <YourApp />"
  echo "   </AuthErrorBoundary>"
  echo ""
  echo "2. Configure error handler:"
  echo "   import { configureAuthErrorHandler } from '@/lib/auth-error-handler';"
  echo "   configureAuthErrorHandler({ maxRetries: 3 });"
  echo ""
  echo "3. Use loading states in components:"
  echo "   import { AuthLoadingScreen, LoadingSpinner } from '@/components/auth/auth-loading-states';"
  echo ""
  echo "4. Use toast messages for errors:"
  echo "   import { getAuthErrorMessage } from '@/lib/auth-toast-messages';"
  echo ""
  echo "📖 See docs/PHASE_5_IMPLEMENTATION_SUMMARY.md for detailed guide"
  exit 0
else
  echo -e "${RED}❌ Phase 5 Incomplete - $FAILED checks failed${NC}"
  echo ""
  echo "Please review failed checks above and fix issues."
  exit 1
fi
