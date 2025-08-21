# Organizational Structure System Design

## System Overview

This design implements a flexible hierarchical organizational structure for school management, supporting multiple schools, departments, positions with role-based access control, and dynamic position hierarchies.

## Core Models

### 1. School Model
```typescript
interface School {
  id: string;
  name: string;
  code: string; // Unique identifier (e.g., "SCH001")
  type: SchoolType; // PRIMARY, SECONDARY, HIGHER_ED
  status: SchoolStatus; // ACTIVE, INACTIVE, SUSPENDED
  
  // Contact Information
  address: Address;
  phone: string;
  email: string;
  website?: string;
  
  // Administrative
  establishedDate: Date;
  accreditationNumber?: string;
  principalId?: string; // Reference to User
  
  // Metadata
  settings: SchoolSettings;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date; // Soft delete
}

interface SchoolSettings {
  academicYearStart: number; // Month (1-12)
  academicYearEnd: number;
  timezone: string;
  locale: string;
  features: string[]; // Enabled features
}
```

### 2. Department Model
```typescript
interface Department {
  id: string;
  schoolId: string;
  parentDepartmentId?: string; // For nested departments
  
  name: string;
  code: string; // Unique within school (e.g., "MATH", "ADMIN")
  type: DepartmentType; // ACADEMIC, ADMINISTRATIVE, SUPPORT
  
  description?: string;
  budget?: number;
  headOfDepartmentId?: string; // Reference to User
  
  // Hierarchy
  level: number; // 0 for root, increments for nested
  path: string; // Materialized path (e.g., "/root/parent/current")
  
  status: DepartmentStatus; // ACTIVE, INACTIVE, MERGED
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

enum DepartmentType {
  ACADEMIC = 'ACADEMIC',
  ADMINISTRATIVE = 'ADMINISTRATIVE',
  SUPPORT = 'SUPPORT',
  FACILITY = 'FACILITY'
}
```

### 3. Position Model
```typescript
interface Position {
  id: string;
  schoolId: string;
  departmentId: string;
  
  title: string;
  code: string; // Unique identifier (e.g., "PRIN", "TCH001")
  category: PositionCategory; // MANAGEMENT, TEACHING, SUPPORT, ADMINISTRATIVE
  
  // Role and Permissions
  roleId: string; // Reference to Role for permissions
  permissions: Permission[]; // Additional position-specific permissions
  
  // Position Details
  description?: string;
  requirements?: string[];
  responsibilities?: string[];
  
  // Constraints
  maxOccupants?: number; // Max users in this position
  minQualifications?: Qualification[];
  reportingToPositionId?: string; // Direct supervisor position
  
  // Compensation
  salaryGrade?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  
  status: PositionStatus; // ACTIVE, VACANT, FROZEN, DISCONTINUED
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface Permission {
  resource: string;
  actions: string[]; // ['read', 'write', 'delete', 'approve']
  scope?: 'own' | 'department' | 'school' | 'system';
  conditions?: Record<string, any>;
}
```

### 4. UserPosition Model
```typescript
interface UserPosition {
  id: string;
  userId: string;
  positionId: string;
  departmentId: string; // Denormalized for quick queries
  schoolId: string; // Denormalized
  
  // Assignment Details
  startDate: Date;
  endDate?: Date; // Null for permanent positions
  
  type: AssignmentType; // PERMANENT, TEMPORARY, ACTING, PROBATION
  isPrimary: boolean; // Primary position for the user
  
  // Work Details
  workload: number; // Percentage (0-100)
  schedule?: WorkSchedule;
  location?: string;
  
  // Administrative
  appointedBy?: string; // User ID who made the appointment
  appointmentReason?: string;
  notes?: string;
  
  status: UserPositionStatus; // ACTIVE, ON_LEAVE, SUSPENDED, TERMINATED
  createdAt: Date;
  updatedAt: Date;
}

interface WorkSchedule {
  type: 'FULL_TIME' | 'PART_TIME' | 'FLEXIBLE';
  hoursPerWeek?: number;
  workDays?: string[]; // ['MON', 'TUE', 'WED', ...]
  shifts?: Shift[];
}
```

### 5. PositionHierarchy Model
```typescript
interface PositionHierarchy {
  id: string;
  schoolId: string;
  
  parentPositionId: string;
  childPositionId: string;
  
  // Hierarchy Type
  relationshipType: HierarchyType; // DIRECT_REPORT, FUNCTIONAL, DOTTED_LINE
  
  // Authority Levels
  authorityLevel: number; // 1-10, higher = more authority
  approvalAuthority: boolean; // Can approve child's requests
  
  // Delegation
  delegatedPermissions?: Permission[];
  delegationStartDate?: Date;
  delegationEndDate?: Date;
  
  // Metadata
  effectiveDate: Date;
  expiryDate?: Date;
  notes?: string;
  
  status: HierarchyStatus; // ACTIVE, PENDING, EXPIRED
  createdAt: Date;
  updatedAt: Date;
}

enum HierarchyType {
  DIRECT_REPORT = 'DIRECT_REPORT', // Direct managerial relationship
  FUNCTIONAL = 'FUNCTIONAL', // Functional/project-based reporting
  DOTTED_LINE = 'DOTTED_LINE', // Secondary reporting relationship
  ADVISORY = 'ADVISORY' // Consultative relationship
}
```

## Database Schema

### PostgreSQL Schema Definition
```sql
-- Schools table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  
  -- Address as JSONB for flexibility
  address JSONB,
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  
  established_date DATE,
  accreditation_number VARCHAR(100),
  principal_id UUID REFERENCES users(id),
  
  settings JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Indexes
  INDEX idx_schools_code ON schools(code),
  INDEX idx_schools_status ON schools(status) WHERE deleted_at IS NULL
);

-- Departments table
CREATE TABLE departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_department_id UUID REFERENCES departments(id),
  
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  budget DECIMAL(15, 2),
  head_of_department_id UUID REFERENCES users(id),
  
  level INTEGER DEFAULT 0,
  path TEXT NOT NULL,
  
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(school_id, code),
  CHECK (parent_department_id != id),
  
  -- Indexes
  INDEX idx_departments_school ON departments(school_id),
  INDEX idx_departments_parent ON departments(parent_department_id),
  INDEX idx_departments_path ON departments(path),
  INDEX idx_departments_status ON departments(status) WHERE deleted_at IS NULL
);

-- Positions table
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  
  title VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  category VARCHAR(50) NOT NULL,
  
  role_id UUID REFERENCES roles(id),
  permissions JSONB DEFAULT '[]',
  
  description TEXT,
  requirements JSONB DEFAULT '[]',
  responsibilities JSONB DEFAULT '[]',
  
  max_occupants INTEGER,
  min_qualifications JSONB DEFAULT '[]',
  reporting_to_position_id UUID REFERENCES positions(id),
  
  salary_grade VARCHAR(50),
  salary_range JSONB,
  
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(school_id, code),
  CHECK (reporting_to_position_id != id),
  
  -- Indexes
  INDEX idx_positions_school ON positions(school_id),
  INDEX idx_positions_department ON positions(department_id),
  INDEX idx_positions_category ON positions(category),
  INDEX idx_positions_reporting ON positions(reporting_to_position_id)
);

-- User Positions table
CREATE TABLE user_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id),
  school_id UUID NOT NULL REFERENCES schools(id),
  
  start_date DATE NOT NULL,
  end_date DATE,
  
  type VARCHAR(50) NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  
  workload INTEGER CHECK (workload >= 0 AND workload <= 100),
  schedule JSONB,
  location VARCHAR(255),
  
  appointed_by UUID REFERENCES users(id),
  appointment_reason TEXT,
  notes TEXT,
  
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CHECK (end_date IS NULL OR end_date > start_date),
  
  -- Indexes
  INDEX idx_user_positions_user ON user_positions(user_id),
  INDEX idx_user_positions_position ON user_positions(position_id),
  INDEX idx_user_positions_school ON user_positions(school_id),
  INDEX idx_user_positions_department ON user_positions(department_id),
  INDEX idx_user_positions_dates ON user_positions(start_date, end_date),
  INDEX idx_user_positions_primary ON user_positions(user_id, is_primary) WHERE is_primary = true
);

-- Position Hierarchy table
CREATE TABLE position_hierarchies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  
  parent_position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  child_position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  
  relationship_type VARCHAR(50) NOT NULL,
  authority_level INTEGER CHECK (authority_level >= 1 AND authority_level <= 10),
  approval_authority BOOLEAN DEFAULT false,
  
  delegated_permissions JSONB DEFAULT '[]',
  delegation_start_date DATE,
  delegation_end_date DATE,
  
  effective_date DATE NOT NULL,
  expiry_date DATE,
  notes TEXT,
  
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(parent_position_id, child_position_id, relationship_type),
  CHECK (parent_position_id != child_position_id),
  CHECK (expiry_date IS NULL OR expiry_date > effective_date),
  
  -- Indexes
  INDEX idx_hierarchies_school ON position_hierarchies(school_id),
  INDEX idx_hierarchies_parent ON position_hierarchies(parent_position_id),
  INDEX idx_hierarchies_child ON position_hierarchies(child_position_id),
  INDEX idx_hierarchies_dates ON position_hierarchies(effective_date, expiry_date)
);

-- Audit trail for organizational changes
CREATE TABLE org_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- 'school', 'department', 'position', etc.
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN'
  
  changes JSONB, -- Before/after values
  performed_by UUID REFERENCES users(id),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  
  reason TEXT,
  metadata JSONB,
  
  -- Indexes
  INDEX idx_audit_entity ON org_audit_log(entity_type, entity_id),
  INDEX idx_audit_user ON org_audit_log(performed_by),
  INDEX idx_audit_timestamp ON org_audit_log(performed_at DESC)
);
```

## API Design

### RESTful Endpoints

#### School Management
```yaml
Schools:
  GET /api/v1/schools:
    description: List all schools
    query: { status?, type?, page?, limit? }
    response: { schools: School[], pagination: Pagination }
    
  GET /api/v1/schools/:id:
    description: Get school details
    response: School
    
  POST /api/v1/schools:
    description: Create new school
    body: CreateSchoolDto
    response: School
    
  PUT /api/v1/schools/:id:
    description: Update school
    body: UpdateSchoolDto
    response: School
    
  DELETE /api/v1/schools/:id:
    description: Soft delete school
    response: { success: boolean }
```

#### Department Management
```yaml
Departments:
  GET /api/v1/schools/:schoolId/departments:
    description: List departments in school
    query: { type?, parentId?, includeNested? }
    response: { departments: Department[], hierarchy: DepartmentTree }
    
  GET /api/v1/departments/:id:
    description: Get department details
    response: Department & { subordinates: Department[], positions: Position[] }
    
  POST /api/v1/schools/:schoolId/departments:
    description: Create department
    body: CreateDepartmentDto
    response: Department
    
  PUT /api/v1/departments/:id:
    description: Update department
    body: UpdateDepartmentDto
    response: Department
    
  POST /api/v1/departments/:id/reassign:
    description: Reassign department to new parent
    body: { newParentId: string }
    response: Department
```

#### Position Management
```yaml
Positions:
  GET /api/v1/departments/:departmentId/positions:
    description: List positions in department
    query: { category?, status?, includeVacant? }
    response: { positions: Position[], vacancies: VacancySummary }
    
  GET /api/v1/positions/:id:
    description: Get position details
    response: Position & { 
      currentOccupants: User[], 
      hierarchy: PositionHierarchy[],
      permissions: Permission[] 
    }
    
  POST /api/v1/departments/:departmentId/positions:
    description: Create position
    body: CreatePositionDto
    response: Position
    
  PUT /api/v1/positions/:id:
    description: Update position
    body: UpdatePositionDto
    response: Position
    
  GET /api/v1/positions/:id/hierarchy:
    description: Get position hierarchy tree
    response: { 
      ancestors: Position[], 
      subordinates: Position[], 
      peers: Position[] 
    }
```

#### User Position Assignment
```yaml
UserPositions:
  GET /api/v1/users/:userId/positions:
    description: Get user's positions
    query: { includeHistory?, status? }
    response: { 
      current: UserPosition[], 
      history?: UserPosition[] 
    }
    
  POST /api/v1/positions/:positionId/assign:
    description: Assign user to position
    body: {
      userId: string,
      startDate: Date,
      endDate?: Date,
      type: AssignmentType,
      workload: number
    }
    response: UserPosition
    
  PUT /api/v1/user-positions/:id:
    description: Update user position assignment
    body: UpdateUserPositionDto
    response: UserPosition
    
  POST /api/v1/user-positions/:id/terminate:
    description: Terminate position assignment
    body: { 
      endDate: Date, 
      reason: string 
    }
    response: UserPosition
    
  POST /api/v1/positions/bulk-assign:
    description: Bulk assign users to positions
    body: BulkAssignmentDto[]
    response: { 
      successful: UserPosition[], 
      failed: FailedAssignment[] 
    }
```

#### Hierarchy Management
```yaml
Hierarchies:
  GET /api/v1/schools/:schoolId/hierarchy:
    description: Get complete organizational hierarchy
    response: OrganizationalChart
    
  POST /api/v1/hierarchies:
    description: Create hierarchy relationship
    body: CreateHierarchyDto
    response: PositionHierarchy
    
  PUT /api/v1/hierarchies/:id:
    description: Update hierarchy relationship
    body: UpdateHierarchyDto
    response: PositionHierarchy
    
  DELETE /api/v1/hierarchies/:id:
    description: Remove hierarchy relationship
    response: { success: boolean }
    
  GET /api/v1/positions/:id/reporting-chain:
    description: Get complete reporting chain
    response: {
      upward: Position[], // All supervisors up to top
      downward: Position[] // All subordinates
    }
```

## Service Layer Architecture

### Core Services

```typescript
// School Service
class SchoolService {
  async createSchool(data: CreateSchoolDto): Promise<School>
  async updateSchool(id: string, data: UpdateSchoolDto): Promise<School>
  async deleteSchool(id: string): Promise<void>
  async getSchoolById(id: string): Promise<School>
  async listSchools(filters: SchoolFilters): Promise<PaginatedResult<School>>
  async getSchoolStatistics(id: string): Promise<SchoolStatistics>
}

// Department Service
class DepartmentService {
  async createDepartment(schoolId: string, data: CreateDepartmentDto): Promise<Department>
  async updateDepartment(id: string, data: UpdateDepartmentDto): Promise<Department>
  async deleteDepartment(id: string): Promise<void>
  async getDepartmentById(id: string): Promise<Department>
  async getDepartmentHierarchy(schoolId: string): Promise<DepartmentTree>
  async reassignDepartment(id: string, newParentId: string): Promise<Department>
  async mergeDepartments(sourceId: string, targetId: string): Promise<Department>
}

// Position Service
class PositionService {
  async createPosition(departmentId: string, data: CreatePositionDto): Promise<Position>
  async updatePosition(id: string, data: UpdatePositionDto): Promise<Position>
  async deletePosition(id: string): Promise<void>
  async getPositionById(id: string): Promise<Position>
  async listPositions(filters: PositionFilters): Promise<PaginatedResult<Position>>
  async getPositionHierarchy(positionId: string): Promise<HierarchyTree>
  async checkPositionVacancy(positionId: string): Promise<VacancyStatus>
}

// User Position Service
class UserPositionService {
  async assignUserToPosition(data: AssignPositionDto): Promise<UserPosition>
  async updateAssignment(id: string, data: UpdateAssignmentDto): Promise<UserPosition>
  async terminateAssignment(id: string, data: TerminationDto): Promise<void>
  async getUserPositions(userId: string): Promise<UserPosition[]>
  async getPositionOccupants(positionId: string): Promise<User[]>
  async transferUser(userId: string, fromPositionId: string, toPositionId: string): Promise<UserPosition>
  async bulkAssign(assignments: BulkAssignmentDto[]): Promise<BulkAssignmentResult>
}

// Hierarchy Service
class HierarchyService {
  async createHierarchy(data: CreateHierarchyDto): Promise<PositionHierarchy>
  async updateHierarchy(id: string, data: UpdateHierarchyDto): Promise<PositionHierarchy>
  async deleteHierarchy(id: string): Promise<void>
  async getOrganizationalChart(schoolId: string): Promise<OrganizationalChart>
  async getReportingChain(positionId: string): Promise<ReportingChain>
  async validateHierarchy(parentId: string, childId: string): Promise<ValidationResult>
  async detectCycles(schoolId: string): Promise<Cycle[]>
}

// Authorization Service
class OrganizationAuthService {
  async getUserPermissions(userId: string): Promise<Permission[]>
  async checkPermission(userId: string, resource: string, action: string): Promise<boolean>
  async getEffectivePermissions(userPositionId: string): Promise<Permission[]>
  async getDelegatedPermissions(positionId: string): Promise<Permission[]>
  async canManageSubordinate(managerId: string, subordinateId: string): Promise<boolean>
}
```

## Authorization System

### Permission Model
```typescript
interface PermissionSystem {
  // Resource-based permissions
  resources: {
    'school': ['read', 'write', 'delete', 'manage'],
    'department': ['read', 'write', 'delete', 'manage', 'reassign'],
    'position': ['read', 'write', 'delete', 'assign', 'unassign'],
    'user': ['read', 'write', 'delete', 'manage'],
    'hierarchy': ['read', 'write', 'delete', 'manage']
  };
  
  // Scope levels
  scopes: {
    'own': 'Only own resources',
    'department': 'Department-level resources',
    'school': 'School-level resources',
    'system': 'System-wide resources'
  };
  
  // Role templates
  roles: {
    'SUPER_ADMIN': { scope: 'system', permissions: ['*'] },
    'SCHOOL_ADMIN': { scope: 'school', permissions: ['*'] },
    'DEPARTMENT_HEAD': { scope: 'department', permissions: ['read', 'write', 'manage'] },
    'TEACHER': { scope: 'own', permissions: ['read', 'write'] },
    'STAFF': { scope: 'own', permissions: ['read'] }
  };
}

// Permission checking algorithm
class PermissionChecker {
  async checkAccess(context: AccessContext): Promise<boolean> {
    // 1. Get user's positions
    const positions = await getUserPositions(context.userId);
    
    // 2. Collect all permissions from positions
    const permissions = await collectPermissions(positions);
    
    // 3. Check hierarchy-based permissions
    const hierarchicalPermissions = await getHierarchicalPermissions(
      positions,
      context.targetResource
    );
    
    // 4. Apply scope rules
    const scopedPermissions = applyScopeRules(
      permissions.concat(hierarchicalPermissions),
      context
    );
    
    // 5. Evaluate final permission
    return evaluatePermission(scopedPermissions, context.action);
  }
}
```

## Business Logic & Validation Rules

### Position Assignment Rules
```typescript
class PositionAssignmentRules {
  // Rule 1: Check maximum occupants
  async validateMaxOccupants(positionId: string): Promise<boolean> {
    const position = await getPosition(positionId);
    const currentOccupants = await getPositionOccupants(positionId);
    return !position.maxOccupants || currentOccupants.length < position.maxOccupants;
  }
  
  // Rule 2: Check user qualifications
  async validateQualifications(userId: string, positionId: string): Promise<boolean> {
    const position = await getPosition(positionId);
    const userQualifications = await getUserQualifications(userId);
    return position.minQualifications.every(req => 
      userQualifications.some(qual => qual.meets(req))
    );
  }
  
  // Rule 3: Prevent circular hierarchy
  async validateNoCircularHierarchy(userId: string, positionId: string): Promise<boolean> {
    const userCurrentPositions = await getUserPositions(userId);
    const newPositionSubordinates = await getSubordinatePositions(positionId);
    
    return !userCurrentPositions.some(userPos => 
      newPositionSubordinates.includes(userPos.positionId)
    );
  }
  
  // Rule 4: Workload validation
  async validateWorkload(userId: string, newWorkload: number): Promise<boolean> {
    const currentWorkload = await getUserTotalWorkload(userId);
    return (currentWorkload + newWorkload) <= 100;
  }
  
  // Rule 5: Date conflict check
  async validateNoDateConflict(
    userId: string, 
    positionId: string, 
    startDate: Date, 
    endDate?: Date
  ): Promise<boolean> {
    const existingAssignments = await getUserPositionHistory(userId);
    return !existingAssignments.some(assignment => 
      assignment.positionId === positionId &&
      dateRangesOverlap(
        { start: startDate, end: endDate },
        { start: assignment.startDate, end: assignment.endDate }
      )
    );
  }
}
```

### Hierarchy Validation Rules
```typescript
class HierarchyValidationRules {
  // Rule 1: Prevent self-reporting
  validateNoSelfReporting(parentId: string, childId: string): boolean {
    return parentId !== childId;
  }
  
  // Rule 2: Prevent duplicate relationships
  async validateNoDuplicateRelationship(
    parentId: string, 
    childId: string, 
    type: HierarchyType
  ): Promise<boolean> {
    const existing = await getHierarchyRelationship(parentId, childId, type);
    return !existing;
  }
  
  // Rule 3: Validate authority levels
  async validateAuthorityLevels(
    parentPositionId: string, 
    childPositionId: string
  ): Promise<boolean> {
    const parentPosition = await getPosition(parentPositionId);
    const childPosition = await getPosition(childPositionId);
    
    // Parent should have higher or equal category level
    const categoryLevels = {
      'MANAGEMENT': 4,
      'ADMINISTRATIVE': 3,
      'TEACHING': 2,
      'SUPPORT': 1
    };
    
    return categoryLevels[parentPosition.category] >= categoryLevels[childPosition.category];
  }
  
  // Rule 4: Detect and prevent cycles
  async validateNoCycles(
    parentId: string, 
    childId: string
  ): Promise<boolean> {
    const ancestors = await getAncestorPositions(parentId);
    return !ancestors.includes(childId);
  }
}
```

## Performance Optimization

### Database Optimization
```sql
-- Materialized view for org chart
CREATE MATERIALIZED VIEW org_chart_cache AS
WITH RECURSIVE hierarchy AS (
  -- Base case: top-level positions
  SELECT 
    p.id,
    p.title,
    p.department_id,
    p.reporting_to_position_id,
    1 as level,
    ARRAY[p.id] as path,
    p.id::text as path_string
  FROM positions p
  WHERE p.reporting_to_position_id IS NULL
    AND p.deleted_at IS NULL
  
  UNION ALL
  
  -- Recursive case
  SELECT 
    p.id,
    p.title,
    p.department_id,
    p.reporting_to_position_id,
    h.level + 1,
    h.path || p.id,
    h.path_string || '/' || p.id::text
  FROM positions p
  JOIN hierarchy h ON p.reporting_to_position_id = h.id
  WHERE p.deleted_at IS NULL
)
SELECT * FROM hierarchy;

-- Index for faster queries
CREATE INDEX idx_org_chart_level ON org_chart_cache(level);
CREATE INDEX idx_org_chart_path ON org_chart_cache(path_string);

-- Refresh strategy
CREATE OR REPLACE FUNCTION refresh_org_chart()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY org_chart_cache;
END;
$$ LANGUAGE plpgsql;

-- Trigger on position changes
CREATE OR REPLACE FUNCTION trigger_refresh_org_chart()
RETURNS trigger AS $$
BEGIN
  PERFORM refresh_org_chart();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER refresh_org_chart_trigger
AFTER INSERT OR UPDATE OR DELETE ON positions
FOR EACH STATEMENT
EXECUTE FUNCTION trigger_refresh_org_chart();
```

### Caching Strategy
```typescript
class OrganizationCacheService {
  private redis: RedisClient;
  
  // Cache keys
  private readonly CACHE_KEYS = {
    SCHOOL_HIERARCHY: (schoolId: string) => `hierarchy:school:${schoolId}`,
    DEPARTMENT_TREE: (schoolId: string) => `departments:tree:${schoolId}`,
    USER_PERMISSIONS: (userId: string) => `permissions:user:${userId}`,
    POSITION_OCCUPANTS: (positionId: string) => `occupants:position:${positionId}`,
    REPORTING_CHAIN: (positionId: string) => `reporting:position:${positionId}`
  };
  
  // Cache TTL (in seconds)
  private readonly TTL = {
    HIERARCHY: 3600, // 1 hour
    PERMISSIONS: 300, // 5 minutes
    OCCUPANTS: 1800 // 30 minutes
  };
  
  async getOrSet<T>(
    key: string, 
    factory: () => Promise<T>, 
    ttl: number
  ): Promise<T> {
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }
    
    const value = await factory();
    await this.redis.setex(key, ttl, JSON.stringify(value));
    return value;
  }
  
  async invalidateUserCaches(userId: string): Promise<void> {
    const keys = [
      this.CACHE_KEYS.USER_PERMISSIONS(userId),
      // Find and invalidate related position caches
    ];
    await this.redis.del(...keys);
  }
  
  async invalidateSchoolCaches(schoolId: string): Promise<void> {
    const pattern = `*:school:${schoolId}*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
```

## Migration Strategy

### Phase 1: Initial Setup
```typescript
// 1. Create base tables
await createSchoolsTable();
await createDepartmentsTable();
await createPositionsTable();
await createUserPositionsTable();
await createPositionHierarchiesTable();

// 2. Migrate existing data
await migrateExistingSchools();
await migrateExistingDepartments();
await createDefaultPositions();
```

### Phase 2: Data Migration
```typescript
class DataMigrationService {
  async migrateFromLegacySystem(): Promise<MigrationResult> {
    const batch = 1000;
    let offset = 0;
    let migrated = 0;
    const errors = [];
    
    while (true) {
      const legacyData = await fetchLegacyData(offset, batch);
      if (legacyData.length === 0) break;
      
      for (const record of legacyData) {
        try {
          await this.migrateRecord(record);
          migrated++;
        } catch (error) {
          errors.push({ record, error });
        }
      }
      
      offset += batch;
    }
    
    return { migrated, errors };
  }
  
  private async migrateRecord(legacy: LegacyRecord): Promise<void> {
    // Transform legacy data to new structure
    const school = await this.createOrFindSchool(legacy);
    const department = await this.createOrFindDepartment(legacy, school.id);
    const position = await this.createOrFindPosition(legacy, department.id);
    
    if (legacy.userId) {
      await this.assignUserToPosition({
        userId: legacy.userId,
        positionId: position.id,
        startDate: legacy.startDate || new Date(),
        type: 'PERMANENT',
        isPrimary: true
      });
    }
  }
}
```

### Phase 3: Validation & Cleanup
```typescript
class PostMigrationValidation {
  async validateMigration(): Promise<ValidationReport> {
    const checks = [
      this.checkDataIntegrity(),
      this.checkHierarchyConsistency(),
      this.checkPermissionConsistency(),
      this.checkNoOrphans(),
      this.checkNoDuplicates()
    ];
    
    const results = await Promise.all(checks);
    return {
      passed: results.every(r => r.passed),
      details: results
    };
  }
  
  async fixInconsistencies(): Promise<void> {
    // Fix orphaned positions
    await this.assignOrphanedPositionsToDefaultDepartment();
    
    // Fix circular hierarchies
    await this.breakCircularHierarchies();
    
    // Fix invalid workloads
    await this.normalizeWorkloads();
    
    // Rebuild caches
    await this.rebuildAllCaches();
  }
}
```

## Security Considerations

### Access Control
```typescript
class OrganizationAccessControl {
  // Row-level security policies
  async applyRowLevelSecurity(query: Query, userId: string): Promise<Query> {
    const userContext = await this.getUserContext(userId);
    
    if (userContext.isSuperAdmin) {
      return query; // No restrictions
    }
    
    if (userContext.isSchoolAdmin) {
      query.where('school_id', 'IN', userContext.schoolIds);
    } else if (userContext.isDepartmentHead) {
      query.where('department_id', 'IN', userContext.departmentIds);
    } else {
      // Regular users can only see their own data and public info
      query.where(function() {
        this.where('public', true)
          .orWhere('user_id', userId);
      });
    }
    
    return query;
  }
  
  // Field-level security
  sanitizeResponse(data: any, userPermissions: Permission[]): any {
    const sensitiveFields = ['salary_range', 'personal_notes', 'performance_data'];
    
    if (!userPermissions.includes('view_sensitive_data')) {
      sensitiveFields.forEach(field => {
        delete data[field];
      });
    }
    
    return data;
  }
}
```

### Audit Logging
```typescript
class OrganizationAuditService {
  async logChange(
    entityType: string,
    entityId: string,
    action: string,
    userId: string,
    changes?: any
  ): Promise<void> {
    await this.auditRepository.create({
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      performed_by: userId,
      performed_at: new Date(),
      changes: changes,
      metadata: {
        ip_address: this.getClientIp(),
        user_agent: this.getUserAgent(),
        session_id: this.getSessionId()
      }
    });
  }
  
  async getAuditTrail(
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    return this.auditRepository.find({
      where: { entity_type: entityType, entity_id: entityId },
      order: { performed_at: 'DESC' }
    });
  }
}
```

## Implementation Examples

### Example: Creating a School Structure
```typescript
async function setupSchoolStructure() {
  // 1. Create school
  const school = await schoolService.createSchool({
    name: 'Springfield High School',
    code: 'SHS001',
    type: 'SECONDARY',
    address: {
      street: '123 Education St',
      city: 'Springfield',
      state: 'IL',
      zip: '62701'
    }
  });
  
  // 2. Create departments
  const adminDept = await departmentService.createDepartment(school.id, {
    name: 'Administration',
    code: 'ADMIN',
    type: 'ADMINISTRATIVE'
  });
  
  const academicDept = await departmentService.createDepartment(school.id, {
    name: 'Academics',
    code: 'ACAD',
    type: 'ACADEMIC'
  });
  
  const mathDept = await departmentService.createDepartment(school.id, {
    name: 'Mathematics',
    code: 'MATH',
    type: 'ACADEMIC',
    parentDepartmentId: academicDept.id
  });
  
  // 3. Create positions
  const principal = await positionService.createPosition(adminDept.id, {
    title: 'Principal',
    code: 'PRIN',
    category: 'MANAGEMENT',
    maxOccupants: 1
  });
  
  const vicePrincipal = await positionService.createPosition(adminDept.id, {
    title: 'Vice Principal',
    code: 'VP',
    category: 'MANAGEMENT',
    maxOccupants: 2,
    reportingToPositionId: principal.id
  });
  
  const mathTeacher = await positionService.createPosition(mathDept.id, {
    title: 'Mathematics Teacher',
    code: 'MATH_TCH',
    category: 'TEACHING',
    reportingToPositionId: vicePrincipal.id
  });
  
  // 4. Setup hierarchy
  await hierarchyService.createHierarchy({
    schoolId: school.id,
    parentPositionId: principal.id,
    childPositionId: vicePrincipal.id,
    relationshipType: 'DIRECT_REPORT',
    authorityLevel: 8,
    approvalAuthority: true
  });
  
  // 5. Assign users
  await userPositionService.assignUserToPosition({
    userId: 'user-001',
    positionId: principal.id,
    startDate: new Date(),
    type: 'PERMANENT',
    isPrimary: true,
    workload: 100
  });
  
  return {
    school,
    departments: { adminDept, academicDept, mathDept },
    positions: { principal, vicePrincipal, mathTeacher }
  };
}
```

### Example: Complex Query - Get User's Effective Permissions
```typescript
async function getUserEffectivePermissions(userId: string): Promise<Permission[]> {
  // 1. Get all active user positions
  const userPositions = await db.query(`
    SELECT 
      up.*,
      p.permissions as position_permissions,
      p.role_id,
      r.permissions as role_permissions
    FROM user_positions up
    JOIN positions p ON up.position_id = p.id
    LEFT JOIN roles r ON p.role_id = r.id
    WHERE up.user_id = $1 
      AND up.status = 'ACTIVE'
      AND (up.end_date IS NULL OR up.end_date > NOW())
  `, [userId]);
  
  // 2. Get hierarchical permissions (delegated from superiors)
  const delegatedPermissions = await db.query(`
    SELECT 
      ph.delegated_permissions
    FROM position_hierarchies ph
    JOIN user_positions up ON up.position_id = ph.child_position_id
    WHERE up.user_id = $1
      AND ph.status = 'ACTIVE'
      AND ph.delegation_start_date <= NOW()
      AND (ph.delegation_end_date IS NULL OR ph.delegation_end_date > NOW())
  `, [userId]);
  
  // 3. Merge and deduplicate permissions
  const allPermissions = [];
  
  for (const position of userPositions) {
    // Add role permissions
    if (position.role_permissions) {
      allPermissions.push(...position.role_permissions);
    }
    
    // Add position-specific permissions
    if (position.position_permissions) {
      allPermissions.push(...position.position_permissions);
    }
  }
  
  // Add delegated permissions
  for (const delegation of delegatedPermissions) {
    if (delegation.delegated_permissions) {
      allPermissions.push(...delegation.delegated_permissions);
    }
  }
  
  // 4. Deduplicate and resolve conflicts
  return resolvePermissionConflicts(allPermissions);
}

function resolvePermissionConflicts(permissions: Permission[]): Permission[] {
  const permissionMap = new Map<string, Permission>();
  
  for (const perm of permissions) {
    const key = `${perm.resource}:${perm.actions.join(',')}`;
    const existing = permissionMap.get(key);
    
    if (!existing || hasHigherScope(perm.scope, existing.scope)) {
      permissionMap.set(key, perm);
    }
  }
  
  return Array.from(permissionMap.values());
}
```

## Testing Strategy

### Unit Tests
```typescript
describe('PositionService', () => {
  describe('assignUserToPosition', () => {
    it('should assign user to vacant position', async () => {
      const result = await positionService.assignUserToPosition({
        userId: 'user-001',
        positionId: 'pos-001',
        startDate: new Date(),
        type: 'PERMANENT'
      });
      
      expect(result).toBeDefined();
      expect(result.userId).toBe('user-001');
      expect(result.status).toBe('ACTIVE');
    });
    
    it('should reject assignment when position is full', async () => {
      // Setup: Fill position to max capacity
      const position = await createPosition({ maxOccupants: 1 });
      await assignUser(position.id, 'user-001');
      
      // Test: Try to assign another user
      await expect(
        positionService.assignUserToPosition({
          userId: 'user-002',
          positionId: position.id,
          startDate: new Date()
        })
      ).rejects.toThrow('Position has reached maximum occupancy');
    });
    
    it('should prevent circular hierarchy', async () => {
      // Setup: Create hierarchy A -> B
      const posA = await createPosition({ title: 'Manager' });
      const posB = await createPosition({ 
        title: 'Subordinate',
        reportingToPositionId: posA.id 
      });
      
      // Assign users
      await assignUser(posA.id, 'user-001');
      await assignUser(posB.id, 'user-002');
      
      // Test: Try to make B superior to A
      await expect(
        hierarchyService.createHierarchy({
          parentPositionId: posB.id,
          childPositionId: posA.id,
          relationshipType: 'DIRECT_REPORT'
        })
      ).rejects.toThrow('Circular hierarchy detected');
    });
  });
});
```

## Monitoring & Analytics

### Key Metrics
```typescript
interface OrganizationalMetrics {
  // Structure metrics
  totalSchools: number;
  totalDepartments: number;
  totalPositions: number;
  vacancyRate: number; // Percentage of vacant positions
  
  // Assignment metrics
  averageWorkload: number;
  positionsPerUser: number;
  temporaryAssignmentRatio: number;
  
  // Hierarchy metrics
  averageReportingDepth: number;
  largestTeamSize: number;
  orphanedPositions: number; // Positions with no reporting relationship
  
  // Performance metrics
  assignmentProcessingTime: number; // Average time to process assignment
  hierarchyQueryTime: number; // Average time to fetch hierarchy
  cacheHitRate: number;
}

class OrganizationAnalytics {
  async generateDashboard(schoolId: string): Promise<Dashboard> {
    const [
      structureMetrics,
      assignmentMetrics,
      hierarchyMetrics,
      performanceMetrics
    ] = await Promise.all([
      this.getStructureMetrics(schoolId),
      this.getAssignmentMetrics(schoolId),
      this.getHierarchyMetrics(schoolId),
      this.getPerformanceMetrics(schoolId)
    ]);
    
    return {
      structure: structureMetrics,
      assignments: assignmentMetrics,
      hierarchy: hierarchyMetrics,
      performance: performanceMetrics,
      recommendations: this.generateRecommendations({
        structureMetrics,
        assignmentMetrics,
        hierarchyMetrics
      })
    };
  }
}
```

## Conclusion

This organizational structure design provides a robust, scalable foundation for managing complex school hierarchies with features including:

- **Flexible hierarchy management** with multiple relationship types
- **Comprehensive permission system** with role-based and position-based access control
- **Efficient querying** through materialized views and caching
- **Complete audit trail** for compliance and accountability
- **Scalable architecture** supporting multiple schools and complex organizational structures

The system is designed to handle real-world scenarios including temporary assignments, position transfers, department reorganizations, and complex reporting relationships while maintaining data integrity and performance.