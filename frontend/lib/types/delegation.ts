// Delegation type definitions based on backend models

export type DelegationType = 'APPROVAL' | 'PERMISSION' | 'WORKFLOW';

export interface Delegation {
  id: string;
  type: DelegationType;
  delegator_id: string;
  delegate_id: string;
  reason?: string | null;
  effective_from: string;
  effective_until?: string | null;
  is_active: boolean;
  context?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  modified_by?: string | null;
  delegator?: {
    id: string;
    email: string;
    name?: string | null;
  };
  delegate?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface DelegationListResponse {
  id: string;
  type: DelegationType;
  delegator_id: string;
  delegate_id: string;
  reason?: string | null;
  effective_from: string;
  effective_until?: string | null;
  is_active: boolean;
  delegator?: {
    id: string;
    email: string;
    name?: string | null;
  };
  delegate?: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export interface DelegationResponse extends Delegation {
  delegator_info?: {
    id: string;
    email: string;
    name?: string | null;
    positions?: Array<{
      position_name: string;
      department_name?: string | null;
    }>;
  };
  delegate_info?: {
    id: string;
    email: string;
    name?: string | null;
    positions?: Array<{
      position_name: string;
      department_name?: string | null;
    }>;
  };
}

export interface CreateDelegationRequest {
  type: DelegationType;
  delegate_id: string;
  reason?: string | null;
  effective_from: string;
  effective_until?: string | null;
  is_active?: boolean;
  context?: Record<string, any> | null;
}

export interface UpdateDelegationRequest {
  type?: DelegationType;
  delegate_id?: string;
  reason?: string | null;
  effective_from?: string;
  effective_until?: string | null;
  is_active?: boolean;
  context?: Record<string, any> | null;
}

export interface DelegationFilter {
  page?: number;
  page_size?: number;
  search?: string;
  type?: DelegationType;
  delegator_id?: string;
  delegate_id?: string;
  is_active?: boolean;
  effective_date?: string;
  sort_by?: 'effective_from' | 'effective_until' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedDelegationsResponse {
  data: DelegationListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
