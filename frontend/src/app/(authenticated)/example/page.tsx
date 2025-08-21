'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { 
  useGetMyRequestsQuery, 
  useCreateRequestMutation,
  useGetPendingApprovalsQuery 
} from '@/store/api/requestApi';
import { 
  useGetNotificationsQuery, 
  useGetUnreadCountQuery,
  useMarkAsReadMutation 
} from '@/store/api/notificationApi';
import { addNotification } from '@/store/features/notification/notificationSlice';
import { setLoading, openModal } from '@/store/features/ui/uiSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ExamplePage() {
  const dispatch = useAppDispatch();
  
  // Authentication and user data
  const { 
    user, 
    isAuthenticated, 
    isLoading: authLoading, 
    syncUserData, 
    refresh 
  } = useAuth();
  
  // Permissions (removed - feature not implemented yet)
  
  // Redux state
  const notifications = useAppSelector((state) => state.notification.notifications);
  const uiState = useAppSelector((state) => state.ui);
  
  // RTK Query hooks
  const { data: myRequests, isLoading: requestsLoading } = useGetMyRequestsQuery();
  const { data: pendingApprovals } = useGetPendingApprovalsQuery();
  const { data: notificationList } = useGetNotificationsQuery();
  const { data: unreadCount } = useGetUnreadCountQuery();
  const [createRequest] = useCreateRequestMutation();
  const [markAsRead] = useMarkAsReadMutation();
  
  // Example effect
  useEffect(() => {
    console.log('Example page mounted with user:', user);
  }, [user]);
  
  // Example handlers
  const handleTestNotification = () => {
    dispatch(addNotification({
      id: Date.now().toString(),
      type: 'success',
      title: 'Test Notification',
      message: 'This is a test notification from the example page',
    }));
  };
  
  const handleTestLoading = () => {
    dispatch(setLoading(true));
    setTimeout(() => dispatch(setLoading(false)), 2000);
  };
  
  const handleTestModal = () => {
    dispatch(openModal('test-modal'));
  };
  
  const handleSyncUser = async () => {
    await syncUserData();
  };
  
  const handleRefresh = () => {
    refresh();
  };
  
  const handleCreateRequest = async () => {
    try {
      const result = await createRequest({
        type: 'leave',
        data: { reason: 'Test request from example page' }
      }).unwrap();
      console.log('Request created:', result);
    } catch (error) {
      console.error('Failed to create request:', error);
    }
  };
  
  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
          <h1 className="text-3xl font-bold">Example Page</h1>
          <p className="text-muted-foreground">
            This page demonstrates the usage of various hooks and Redux features
          </p>
          
          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
              <CardDescription>Current authentication state and user info</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Loading: {authLoading ? 'Yes' : 'No'}</p>
              <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
              <p>User ID: {user?.id || 'N/A'}</p>
              <p>Email: {user?.email || 'N/A'}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleSyncUser} size="sm">Sync User Data</Button>
                <Button onClick={handleRefresh} size="sm" variant="outline">Refresh</Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Permission Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Permission Examples</CardTitle>
              <CardDescription>Testing permission checks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Can edit posts: {can('posts', 'edit') ? 'Yes' : 'No'}</p>
              <p>Has admin role: {hasRole('admin') ? 'Yes' : 'No'}</p>
              <p>Has any role (admin/user): {hasAnyRole(['admin', 'user']) ? 'Yes' : 'No'}</p>
            </CardContent>
          </Card>
          
          {/* Redux State */}
          <Card>
            <CardHeader>
              <CardTitle>Redux State</CardTitle>
              <CardDescription>Current Redux state values</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>Notifications in store: {notifications.length}</p>
              <p>UI Loading: {uiState.loading ? 'Yes' : 'No'}</p>
              <p>Active Modal: {uiState.activeModal || 'None'}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleTestNotification} size="sm">Add Notification</Button>
                <Button onClick={handleTestLoading} size="sm" variant="outline">Test Loading</Button>
                <Button onClick={handleTestModal} size="sm" variant="outline">Open Modal</Button>
              </div>
            </CardContent>
          </Card>
          
          {/* API Data */}
          <Card>
            <CardHeader>
              <CardTitle>API Data</CardTitle>
              <CardDescription>Data from RTK Query endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>My Requests: {requestsLoading ? 'Loading...' : myRequests?.length || 0}</p>
              <p>Pending Approvals: {pendingApprovals?.length || 0}</p>
              <p>Notifications: {notificationList?.length || 0}</p>
              <p>Unread Count: {unreadCount?.count || 0}</p>
              <div className="flex gap-2 mt-4">
                <Button onClick={handleCreateRequest} size="sm">Create Test Request</Button>
              </div>
            </CardContent>
          </Card>
    </div>
  );
}