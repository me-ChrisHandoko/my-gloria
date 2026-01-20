// Organization Structure Types

// ============================================
// SCHOOL
// ============================================

export interface School {
  id: string;
  code: string;
  name: string;
  lokasi?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  principal?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
}

export interface SchoolListResponse {
  id: string;
  code: string;
  name: string;
  lokasi?: string | null;
  is_active: boolean;
}

export interface CreateSchoolRequest {
  code: string;
  name: string;
  lokasi: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  principal?: string | null;
}

export interface UpdateSchoolRequest {
  code?: string;
  name?: string;
  lokasi?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  principal?: string | null;
  is_active?: boolean;
}

export interface SchoolFilter {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
  lokasi?: string;
  sort_by?: 'code' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedSchoolsResponse {
  data: SchoolListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================
// DEPARTMENT
// ============================================

export interface Department {
  id: string;
  code: string;
  name: string;
  school_id?: string | null;
  parent_id?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
  school?: SchoolListResponse;
  parent?: DepartmentListResponse;
}

export interface DepartmentListResponse {
  id: string;
  code: string;
  name: string;
  school_id?: string | null;
  parent_id?: string | null;
  parent_name?: string | null;
  is_active: boolean;
}

export interface DepartmentTreeResponse {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active: boolean;
  children?: DepartmentTreeResponse[];
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  school_id?: string | null;
  parent_id?: string | null;
  description?: string | null;
}

export interface UpdateDepartmentRequest {
  code?: string;
  name?: string;
  school_id?: string | null;
  parent_id?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface DepartmentFilter {
  page?: number;
  page_size?: number;
  search?: string;
  school_id?: string;
  parent_id?: string;
  is_active?: boolean;
  sort_by?: 'code' | 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedDepartmentsResponse {
  data: DepartmentListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================
// POSITION
// ============================================

export interface Position {
  id: string;
  code: string;
  name: string;
  department_id?: string | null;
  school_id?: string | null;
  hierarchy_level: number;
  max_holders: number;
  is_unique: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
  department?: DepartmentListResponse;
  school?: SchoolListResponse;
}

export interface PositionListResponse {
  id: string;
  code: string;
  name: string;
  department_id?: string | null;
  school_id?: string | null;
  hierarchy_level: number;
  is_active: boolean;
}

export interface CreatePositionRequest {
  code: string;
  name: string;
  department_id?: string | null;
  school_id?: string | null;
  hierarchy_level: number;
  max_holders?: number;
  is_unique?: boolean;
}

export interface UpdatePositionRequest {
  code?: string;
  name?: string;
  department_id?: string | null;
  school_id?: string | null;
  hierarchy_level?: number;
  max_holders?: number;
  is_unique?: boolean;
  is_active?: boolean;
}

export interface PositionFilter {
  page?: number;
  page_size?: number;
  search?: string;
  department_id?: string;
  school_id?: string;
  hierarchy_level?: number;
  is_active?: boolean;
  sort_by?: 'code' | 'name' | 'hierarchy_level' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedPositionsResponse {
  data: PositionListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ============================================
// WORKFLOW RULE
// ============================================

// Workflow type constants (matching backend)
export const WORKFLOW_TYPES = {
  KPI: 'KPI',
  CUTI: 'CUTI',
  REIMBURSE: 'REIMBURSE',
  LEMBUR: 'LEMBUR',
  IZIN: 'IZIN',
  WORKORDER: 'WORKORDER',
} as const;

export type WorkflowType = typeof WORKFLOW_TYPES[keyof typeof WORKFLOW_TYPES];

// WorkflowRuleStep represents a single approval step in the workflow chain
export interface WorkflowRuleStep {
  id: string;
  step_order: number;
  approver_position_id: string;
  approver_position?: PositionListResponse;
  approver_position_name?: string;
  step_name?: string | null;
  is_optional: boolean;
}

export interface WorkflowRule {
  id: string;
  workflow_type: WorkflowType;
  position_id: string;
  school_id?: string | null;
  creator_position_id?: string | null;
  description?: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
  position?: PositionListResponse;
  school?: SchoolListResponse;
  creator_position?: PositionListResponse;
  steps?: WorkflowRuleStep[];
  total_steps: number;
}

export interface WorkflowRuleListResponse {
  id: string;
  workflow_type: WorkflowType;
  position_id: string;
  position_name?: string;
  school_id?: string | null;
  school_name?: string | null;
  creator_position_id?: string | null;
  creator_position_name?: string;
  description?: string | null;
  priority: number;
  is_active: boolean;
  total_steps: number;
}

// Request types for creating/updating workflow rule steps
export interface CreateWorkflowRuleStepRequest {
  step_order: number;
  approver_position_id: string;
  step_name?: string | null;
  is_optional?: boolean;
}

export interface UpdateWorkflowRuleStepRequest {
  id?: string;
  step_order: number;
  approver_position_id: string;
  step_name?: string | null;
  is_optional?: boolean;
}

export interface CreateWorkflowRuleRequest {
  workflow_type: WorkflowType;
  position_id: string;
  school_id?: string | null;
  creator_position_id?: string | null;
  description?: string | null;
  priority?: number;
  steps?: CreateWorkflowRuleStepRequest[];
}

export interface UpdateWorkflowRuleRequest {
  workflow_type?: WorkflowType;
  position_id?: string;
  school_id?: string | null;
  creator_position_id?: string | null;
  description?: string | null;
  priority?: number;
  is_active?: boolean;
  steps?: UpdateWorkflowRuleStepRequest[];
}

export interface WorkflowRuleFilter {
  page?: number;
  page_size?: number;
  workflow_type?: WorkflowType;
  position_id?: string;
  school_id?: string;
  is_active?: boolean;
  sort_by?: 'workflow_type' | 'priority' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedWorkflowRulesResponse {
  data: WorkflowRuleListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface WorkflowTypesResponse {
  types: WorkflowType[];
}

export interface WorkflowRuleLookupParams {
  position_id: string;
  workflow_type: WorkflowType;
}

// ============================================
// BULK CREATE WORKFLOW RULES
// ============================================

export interface BulkCreateWorkflowRulesRequest {
  workflow_type: WorkflowType;
  position_id: string;
  school_ids: string[];
  creator_position_id?: string | null;
  description?: string | null;
  priority?: number;
  steps?: CreateWorkflowRuleStepRequest[];
}

export interface BulkCreateWorkflowRulesResult {
  created: number;
  skipped: number;
  errors?: string[];
  rule_ids: string[];
}
