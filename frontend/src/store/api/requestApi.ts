import { apiSlice } from './apiSlice';

export interface Request {
  id: string;
  requestNumber: string;
  module: string;
  requesterProfileId: string;
  requestType: string;
  details: any;
  status: 'DRAFT' | 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED';
  currentStep: number;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  createdAt: Date;
  updatedAt: Date;
  approvalSteps?: ApprovalStep[];
}

export interface ApprovalStep {
  id: string;
  requestId: string;
  sequence: number;
  approverProfileId: string;
  approverType: string;
  status: 'WAITING' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED' | 'SKIPPED' | 'DELEGATED';
  action?: 'APPROVE' | 'REJECT' | 'RETURN' | 'ESCALATE' | 'DELEGATE';
  notes?: string;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  module?: string;
  requesterProfileId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface RequestListResponse {
  data: Request[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateRequestDto {
  module: string;
  requestType: string;
  details: any;
  attachments?: File[];
}

export interface ApprovalActionDto {
  action: 'APPROVE' | 'REJECT' | 'RETURN' | 'ESCALATE' | 'DELEGATE';
  notes?: string;
  delegateToId?: string;
}

export const requestApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all requests with pagination and filters
    getRequests: builder.query<RequestListResponse, RequestListParams>({
      query: (params) => ({
        url: '/requests',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Request' as const, id })),
              { type: 'Request', id: 'LIST' },
            ]
          : [{ type: 'Request', id: 'LIST' }],
    }),

    // Get my requests
    getMyRequests: builder.query<RequestListResponse, RequestListParams>({
      query: (params) => ({
        url: '/requests/my',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Request' as const, id })),
              { type: 'Request', id: 'MY_LIST' },
            ]
          : [{ type: 'Request', id: 'MY_LIST' }],
    }),

    // Get requests pending my approval
    getPendingApprovals: builder.query<RequestListResponse, RequestListParams>({
      query: (params) => ({
        url: '/requests/pending-approval',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Request' as const, id })),
              { type: 'Request', id: 'PENDING_LIST' },
            ]
          : [{ type: 'Request', id: 'PENDING_LIST' }],
    }),

    // Get single request by ID
    getRequest: builder.query<Request, string>({
      query: (id) => `/requests/${id}`,
      providesTags: (result, error, id) => [{ type: 'Request', id }],
    }),

    // Create new request
    createRequest: builder.mutation<Request, CreateRequestDto>({
      query: (data) => ({
        url: '/requests',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [
        { type: 'Request', id: 'LIST' },
        { type: 'Request', id: 'MY_LIST' },
      ],
    }),

    // Update request (for drafts)
    updateRequest: builder.mutation<Request, { id: string; data: Partial<CreateRequestDto> }>({
      query: ({ id, data }) => ({
        url: `/requests/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Request', id },
        { type: 'Request', id: 'LIST' },
        { type: 'Request', id: 'MY_LIST' },
      ],
    }),

    // Submit request for approval
    submitRequest: builder.mutation<Request, string>({
      query: (id) => ({
        url: `/requests/${id}/submit`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Request', id },
        { type: 'Request', id: 'LIST' },
        { type: 'Request', id: 'MY_LIST' },
        { type: 'Request', id: 'PENDING_LIST' },
      ],
    }),

    // Cancel request
    cancelRequest: builder.mutation<Request, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: `/requests/${id}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Request', id },
        { type: 'Request', id: 'LIST' },
        { type: 'Request', id: 'MY_LIST' },
      ],
    }),

    // Approve/Reject request
    processApproval: builder.mutation<Request, { requestId: string; stepId: string; data: ApprovalActionDto }>({
      query: ({ requestId, stepId, data }) => ({
        url: `/requests/${requestId}/approval/${stepId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { requestId }) => [
        { type: 'Request', id: requestId },
        { type: 'Request', id: 'LIST' },
        { type: 'Request', id: 'PENDING_LIST' },
      ],
    }),

    // Get approval matrix for a module
    getApprovalMatrix: builder.query<any[], string>({
      query: (module) => `/requests/approval-matrix/${module}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetRequestsQuery,
  useGetMyRequestsQuery,
  useGetPendingApprovalsQuery,
  useGetRequestQuery,
  useCreateRequestMutation,
  useUpdateRequestMutation,
  useSubmitRequestMutation,
  useCancelRequestMutation,
  useProcessApprovalMutation,
  useGetApprovalMatrixQuery,
} = requestApi;