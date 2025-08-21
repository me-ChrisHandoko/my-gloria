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