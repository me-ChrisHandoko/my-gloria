#!/bin/bash

# Phase 4 Permission System - Automated Verification Script

echo "🔍 Phase 4: Permission System - Verification"
echo "=============================================="
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

echo "📋 Checking Type Definitions..."
echo ""

check_content "src/types/auth.ts" "interface User" "User interface defined"
check_content "src/types/auth.ts" "interface Employee" "Employee interface defined"
check_content "src/types/auth.ts" "interface Permission" "Permission interface defined"
check_content "src/types/auth.ts" "interface Role" "Role interface defined"
check_content "src/types/auth.ts" "interface Module" "Module interface defined"
check_content "src/types/auth.ts" "interface CurrentUserContext" "CurrentUserContext interface defined"
check_content "src/types/auth.ts" "interface PermissionGateProps" "PermissionGateProps interface defined"
check_content "src/types/auth.ts" "interface RoleGateProps" "RoleGateProps interface defined"
check_content "src/types/auth.ts" "interface ModuleGateProps" "ModuleGateProps interface defined"
check_content "src/types/auth.ts" "enum AuthErrorType" "AuthErrorType enum defined"

echo "📋 Checking Permission Hooks..."
echo ""

check_content "src/hooks/use-permissions.ts" "export function usePermissions" "usePermissions hook exported"
check_content "src/hooks/use-permissions.ts" "hasPermission" "hasPermission function implemented"
check_content "src/hooks/use-permissions.ts" "hasAnyPermission" "hasAnyPermission function implemented"
check_content "src/hooks/use-permissions.ts" "hasAllPermissions" "hasAllPermissions function implemented"
check_content "src/hooks/use-permissions.ts" "checkPermission" "checkPermission function implemented"
check_content "src/hooks/use-permissions.ts" "getPermissionsByResource" "getPermissionsByResource function implemented"
check_content "src/hooks/use-permissions.ts" "getPermissionsByAction" "getPermissionsByAction function implemented"
check_content "src/hooks/use-permissions.ts" "canPerformAction" "canPerformAction function implemented"
check_content "src/hooks/use-permissions.ts" "export function usePermission" "usePermission helper hook exported"
check_content "src/hooks/use-permissions.ts" "export function useMultiplePermissions" "useMultiplePermissions helper hook exported"

echo "📋 Checking Role Hooks..."
echo ""

check_content "src/hooks/use-role-check.ts" "export function useRoleCheck" "useRoleCheck hook exported"
check_content "src/hooks/use-role-check.ts" "hasRole" "hasRole function implemented"
check_content "src/hooks/use-role-check.ts" "hasAnyRole" "hasAnyRole function implemented"
check_content "src/hooks/use-role-check.ts" "hasAllRoles" "hasAllRoles function implemented"
check_content "src/hooks/use-role-check.ts" "checkRole" "checkRole function implemented"
check_content "src/hooks/use-role-check.ts" "getRoleCodes" "getRoleCodes function implemented"
check_content "src/hooks/use-role-check.ts" "getRoleByCode" "getRoleByCode function implemented"
check_content "src/hooks/use-role-check.ts" "isAdminUser" "isAdminUser convenience function implemented"
check_content "src/hooks/use-role-check.ts" "isTeacherUser" "isTeacherUser convenience function implemented"
check_content "src/hooks/use-role-check.ts" "isStudentUser" "isStudentUser convenience function implemented"
check_content "src/hooks/use-role-check.ts" "export function useRole" "useRole helper hook exported"
check_content "src/hooks/use-role-check.ts" "export function useMultipleRoles" "useMultipleRoles helper hook exported"

echo "📋 Checking Module Access Hooks..."
echo ""

check_content "src/hooks/use-module-access.ts" "export function useModuleAccess" "useModuleAccess hook exported"
check_content "src/hooks/use-module-access.ts" "hasAccess" "hasAccess function implemented"
check_content "src/hooks/use-module-access.ts" "hasAnyAccess" "hasAnyAccess function implemented"
check_content "src/hooks/use-module-access.ts" "hasAllAccess" "hasAllAccess function implemented"
check_content "src/hooks/use-module-access.ts" "checkAccess" "checkAccess function implemented"
check_content "src/hooks/use-module-access.ts" "getAccessibleModuleCodes" "getAccessibleModuleCodes function implemented"
check_content "src/hooks/use-module-access.ts" "getModuleByCode" "getModuleByCode function implemented"
check_content "src/hooks/use-module-access.ts" "getChildModules" "getChildModules function implemented"
check_content "src/hooks/use-module-access.ts" "getTopLevelModules" "getTopLevelModules function implemented"
check_content "src/hooks/use-module-access.ts" "getModuleTree" "getModuleTree function implemented"
check_content "src/hooks/use-module-access.ts" "export function useModule" "useModule helper hook exported"
check_content "src/hooks/use-module-access.ts" "export function useMultipleModules" "useMultipleModules helper hook exported"

echo "📋 Checking Permission Gate Components..."
echo ""

check_content "src/components/auth/permission-gate.tsx" "export function PermissionGate" "PermissionGate component exported"
check_content "src/components/auth/permission-gate.tsx" "export function RoleGate" "RoleGate component exported"
check_content "src/components/auth/permission-gate.tsx" "export function ModuleGate" "ModuleGate component exported"
check_content "src/components/auth/permission-gate.tsx" "export function CombinedGate" "CombinedGate component exported"
check_content "src/components/auth/permission-gate.tsx" "useMultiplePermissions" "Uses useMultiplePermissions hook"
check_content "src/components/auth/permission-gate.tsx" "useMultipleRoles" "Uses useMultipleRoles hook"
check_content "src/components/auth/permission-gate.tsx" "useMultipleModules" "Uses useMultipleModules hook"

echo "📋 Checking Integration..."
echo ""

# Check that hooks import from correct locations
if [ -f "src/hooks/use-permissions.ts" ]; then
  if grep -q "useCurrentUser" src/hooks/use-permissions.ts && \
     grep -q "use-current-user" src/hooks/use-permissions.ts; then
    echo -e "${GREEN}✅ PASS${NC} - Permission hook integrates with useCurrentUser"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Permission hook missing useCurrentUser integration"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - use-permissions.ts not found"
  ((FAILED++))
fi
echo ""

if [ -f "src/hooks/use-role-check.ts" ]; then
  if grep -q "useCurrentUser" src/hooks/use-role-check.ts && \
     grep -q "use-current-user" src/hooks/use-role-check.ts; then
    echo -e "${GREEN}✅ PASS${NC} - Role hook integrates with useCurrentUser"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Role hook missing useCurrentUser integration"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - use-role-check.ts not found"
  ((FAILED++))
fi
echo ""

if [ -f "src/hooks/use-module-access.ts" ]; then
  if grep -q "useCurrentUser" src/hooks/use-module-access.ts && \
     grep -q "use-current-user" src/hooks/use-module-access.ts; then
    echo -e "${GREEN}✅ PASS${NC} - Module hook integrates with useCurrentUser"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - Module hook missing useCurrentUser integration"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - use-module-access.ts not found"
  ((FAILED++))
fi
echo ""

# Check component imports
if [ -f "src/components/auth/permission-gate.tsx" ]; then
  if grep -q "import.*@/types/auth" src/components/auth/permission-gate.tsx; then
    echo -e "${GREEN}✅ PASS${NC} - PermissionGate imports types from @/types/auth"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAIL${NC} - PermissionGate missing type imports"
    ((FAILED++))
  fi
else
  echo -e "${RED}❌ FAIL${NC} - permission-gate.tsx not found"
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
  echo -e "${GREEN}✅ Phase 4 Implementation Complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Use permission hooks in components:"
  echo "   - const { hasPermission } = usePermissions();"
  echo "   - if (hasPermission('user:create')) { ... }"
  echo ""
  echo "2. Use declarative gates:"
  echo "   - <PermissionGate permissions=\"user:create\">...</PermissionGate>"
  echo "   - <RoleGate roles=\"ADMIN\">...</RoleGate>"
  echo "   - <ModuleGate modules=\"ACADEMIC\">...</ModuleGate>"
  echo ""
  echo "3. Test permission checking:"
  echo "   - Sign in as different users"
  echo "   - Verify UI visibility based on permissions"
  echo "   - Check role-based access control"
  echo ""
  echo "📖 See docs/PHASE_4_IMPLEMENTATION_SUMMARY.md for detailed guide"
  exit 0
else
  echo -e "${RED}❌ Phase 4 Incomplete - $FAILED checks failed${NC}"
  echo ""
  echo "Please review failed checks above and fix issues."
  exit 1
fi
