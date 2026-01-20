// Workflow type definitions based on backend models

export interface Workflow {
  id: string;
  request_id: string;
  workflow_type: string;
  status: string;
  initiator_id?: string | null;
  temporal_workflow_id?: string | null;
  temporal_run_id?: string | null;
  metadata?: Record<string, any> | null;
  started_at: string;
  completed_at?: string | null;
  created_at: string;
}

export interface WorkflowListResponse {
  id: string;
  request_id: string;
  workflow_type: string;
  status: string;
  initiator_id?: string | null;
  started_at: string;
  completed_at?: string | null;
}

export interface BulkOperationProgress {
  id: string;
  operation_type: string;
  status: string;
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  progress_percent: number;
  error_details?: Record<string, any> | null;
  rollback_data?: Record<string, any> | null;
  started_at: string;
  completed_at?: string | null;
  initiated_by: string;
  metadata?: Record<string, any> | null;
}

export interface BulkOperationProgressResponse extends BulkOperationProgress {}

export interface WorkflowFilter {
  page?: number;
  page_size?: number;
  workflow_type?: string;
  status?: string;
  initiator_id?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'started_at' | 'completed_at' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface BulkOperationFilter {
  page?: number;
  page_size?: number;
  operation_type?: string;
  status?: string;
  initiated_by?: string;
  start_date?: string;
  end_date?: string;
  sort_by?: 'started_at' | 'completed_at';
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedWorkflowsResponse {
  data: WorkflowListResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginatedBulkOperationsResponse {
  data: BulkOperationProgressResponse[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
