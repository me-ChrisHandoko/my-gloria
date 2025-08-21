export interface UserPosition {
  id: string;
  userProfileId: string;
  positionId: string;
  position?: Position;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  isPlt: boolean;
  appointedBy?: string;
  skNumber?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Position {
  id: string;
  code: string;
  name: string;
  departmentId?: string;
  department?: Department;
  schoolId?: string;
  school?: School;
  hierarchyLevel: number;
  maxHolders: number;
  isUnique: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  bagianKerja?: string;
  schoolId?: string;
  school?: School;
  parentId?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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
}

export interface UserRole {
  id: string;
  userProfileId: string;
  roleId: string;
  role?: Role;
  assignedAt: Date;
  assignedBy?: string;
  validFrom: Date;
  validUntil?: Date;
  isActive: boolean;
}

export interface Role {
  id: string;
  code: string;
  name: string;
  description?: string;
  hierarchyLevel: number;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

export { UserProfile } from './auth';