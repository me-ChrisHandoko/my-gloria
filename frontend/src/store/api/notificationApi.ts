import { apiSlice } from './apiSlice';

export interface BackendNotification {
  id: string;
  userProfileId: string;
  type: 'APPROVAL_REQUEST' | 'APPROVAL_RESULT' | 'WORK_ORDER_UPDATE' | 'KPI_REMINDER' | 'TRAINING_INVITATION' | 'SYSTEM_ALERT' | 'GENERAL' | 'DELEGATION';
  title: string;
  message: string;
  data?: any;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
}

export interface NotificationListParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: string;
  priority?: string;
}

export interface NotificationListResponse {
  data: BackendNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadCount: number;
}

export const notificationApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get all notifications
    getNotifications: builder.query<NotificationListResponse, NotificationListParams>({
      query: (params) => ({
        url: '/notifications',
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Notification' as const, id })),
              { type: 'Notification', id: 'LIST' },
            ]
          : [{ type: 'Notification', id: 'LIST' }],
    }),

    // Get unread count
    getUnreadCount: builder.query<{ count: number }, void>({
      query: () => '/notifications/unread-count',
      providesTags: [{ type: 'Notification', id: 'UNREAD_COUNT' }],
    }),

    // Mark notification as read
    markAsRead: builder.mutation<BackendNotification, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    // Mark all notifications as read
    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    // Delete notification
    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),

    // Subscribe to real-time notifications (WebSocket)
    subscribeToNotifications: builder.query<void, void>({
      query: () => '/notifications/subscribe',
      async onCacheEntryAdded(
        arg,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        // WebSocket connection for real-time notifications
        let ws: WebSocket | null = null;

        try {
          await cacheDataLoaded;

          // Create WebSocket connection
          const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
          ws = new WebSocket(`${wsUrl}/notifications`);

          ws.onmessage = (event) => {
            const notification = JSON.parse(event.data);
            // Trigger refetch of notifications list
            updateCachedData(() => {
              // This will trigger a refetch
            });
          };
        } catch {
          // no-op in case cacheEntryRemoved resolves before cacheDataLoaded
        }

        // Clean up when cache entry is removed
        await cacheEntryRemoved;
        ws?.close();
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useSubscribeToNotificationsQuery,
} = notificationApi;