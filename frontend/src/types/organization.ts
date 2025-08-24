// Organization Module Types

// School Types
export interface School {
  id: string;
  code: string;
  name: string;
  lokasi?: string;
  address?: string;
  phone?: string;
  email?: string;
  principal?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  stats?: {
    totalDepartments: number;
    totalPositions: number;
    totalEmployees: number;
  };
}

export interface CreateSchoolDto {
  code: string;
  name: string;
  lokasi?: string;
  address?: string;
  phone?: string;
  email?: string;
  principal?: string;
  isActive?: boolean;
}

export interface UpdateSchoolDto extends Partial<CreateSchoolDto> {
  modifiedBy?: string;
}

export interface SchoolFilterDto {
  isActive?: boolean;
  lokasi?: string;
  search?: string;
}

// Department Types
export interface Department {
  id: string;
  code: string;
  name: string;
  bagianKerja?: string;
  schoolId?: string;
  parentId?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  school?: School;
  parent?: Department;
  children?: Department[];
  employeeCount?: number;
  positionCount?: number;
  childCount?: number;
}

export interface CreateDepartmentDto {
  code: string;
  name: string;
  bagianKerja?: string;
  schoolId?: string;
  parentId?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {
  modifiedBy?: string;
}

export interface MoveDepartmentDto {
  departmentId: string;
  newParentId?: string;
  newSchoolId?: string;
}

export interface DepartmentFilterDto {
  schoolId?: string;
  parentId?: string;
  isActive?: boolean;
  bagianKerja?: string;
  search?: string;
  includeChildren?: boolean;
}

export interface DepartmentTreeDto {
  id: string;
  code: string;
  name: string;
  bagianKerja?: string;
  description?: string;
  level: number;
  children: DepartmentTreeDto[];
  employeeCount: number;
  positionCount: number;
}

// Position Types
export interface Position {
  id: string;
  code: string;
  name: string;
  departmentId?: string;
  schoolId?: string;
  hierarchyLevel: number;
  maxHolders: number;
  isUnique: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  department?: Department;
  school?: School;
  currentHolders?: number;
  availableSlots?: number;
}

export interface CreatePositionDto {
  code: string;
  name: string;
  departmentId?: string;
  schoolId?: string;
  hierarchyLevel: number;
  maxHolders?: number;
  isUnique?: boolean;
  isActive?: boolean;
}

export interface UpdatePositionDto extends Partial<CreatePositionDto> {
  modifiedBy?: string;
}

export interface PositionFilterDto {
  departmentId?: string;
  schoolId?: string;
  hierarchyLevel?: number;
  isActive?: boolean;
  isUnique?: boolean;
  hasAvailableSlots?: boolean;
  search?: string;
}

export interface PositionAvailabilityDto {
  positionId: string;
  positionName: string;
  isAvailable: boolean;
  maxHolders: number;
  currentHolders: number;
  availableSlots: number;
  currentAssignments: Array<{
    userProfileId: string;
    userName: string;
    startDate: Date;
    endDate?: Date;
    isPlt: boolean;
  }>;
}

// Permission Scope Enum
export enum PermissionScopeEnum {
  OWN = 'OWN',
  DEPARTMENT = 'DEPARTMENT',
  SCHOOL = 'SCHOOL',
  ALL = 'ALL',
}

// User Position Types
export interface UserPosition {
  id: string;
  userProfileId: string;
  positionId: string;
  startDate: Date;
  endDate?: Date;
  isPlt: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  modifiedBy?: string;
  position?: Position;
  userProfile?: any; // This would be defined in a user types file
}

export interface CreateUserPositionDto {
  userProfileId: string;
  positionId: string;
  startDate: Date;
  endDate?: Date;
  isPlt?: boolean;
}

// Advanced User Position DTOs
export interface AssignPositionDto {
  userProfileId: string;
  positionId: string;
  startDate: Date;
  endDate?: Date;
  isPlt?: boolean;
  skNumber?: string;
  notes?: string;
  appointedBy?: string;
  permissionScope?: PermissionScopeEnum;
}

export interface TerminatePositionDto {
  userPositionId: string;
  endDate: Date;
  reason?: string;
}

export interface TransferPositionDto {
  userProfileId: string;
  fromPositionId: string;
  toPositionId: string;
  transferDate: Date;
  reason?: string;
  skNumber?: string;
}

export interface UserPositionHistoryDto {
  id: string;
  positionId: string;
  positionName: string;
  departmentName?: string;
  schoolName?: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  isPlt: boolean;
  skNumber?: string;
  appointedBy?: string;
  duration: string;
}

export interface UpdateUserPositionDto extends Partial<CreateUserPositionDto> {
  modifiedBy?: string;
}

export interface UserPositionFilterDto {
  userProfileId?: string;
  positionId?: string;
  departmentId?: string;
  schoolId?: string;
  isPlt?: boolean;
  isActive?: boolean;
  includeHistory?: boolean;
}

// Hierarchy Types
export interface SetHierarchyDto {
  positionId: string;
  reportsToId?: string;
  coordinatorId?: string;
}

export interface HierarchyNodeDto {
  positionId: string;
  positionName: string;
  positionCode: string;
  departmentName?: string;
  hierarchyLevel: number;
  currentHolder?: {
    userProfileId: string;
    name: string;
    nip: string;
    isPlt: boolean;
  };
  reportsTo?: {
    positionId: string;
    positionName: string;
    holderName?: string;
  };
  coordinator?: {
    positionId: string;
    positionName: string;
    holderName?: string;
  };
  directReports: HierarchyNodeDto[];
  totalSubordinates: number;
}

export interface OrgChartDto {
  root: HierarchyNodeDto;
  metadata: {
    totalPositions: number;
    totalEmployees: number;
    hierarchyLevels: number;
    departmentCount: number;
  };
}

export interface ReportingChainDto {
  positionId: string;
  positionName: string;
  reportingChain: Array<{
    level: number;
    positionId: string;
    positionName: string;
    departmentName?: string;
    holderName?: string;
  }>;
  chainLength: number;
}

export interface HierarchyValidationResultDto {
  valid: boolean;
  issues: string[];
  circularReferences?: Array<{
    positionId: string;
    positionName: string;
    conflictWith: string;
  }>;
  orphanedPositions?: Array<{
    positionId: string;
    positionName: string;
    reason: string;
  }>;
}

export interface HierarchyNode {
  id: string;
  type: 'school' | 'department' | 'position' | 'user';
  name: string;
  code?: string;
  level: number;
  parentId?: string;
  children: HierarchyNode[];
  metadata?: {
    isActive?: boolean;
    hierarchyLevel?: number;
    employeeCount?: number;
    [key: string]: any;
  };
}

export interface HierarchyFilterDto {
  schoolId?: string;
  departmentId?: string;
  maxDepth?: number;
  includeInactive?: boolean;
  includeUsers?: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
  timestamp?: string;
  path?: string;
}