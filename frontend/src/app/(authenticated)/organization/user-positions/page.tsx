'use client';

import { useState, useMemo, useCallback } from 'react';
import { useGetUserPositionsQuery } from '@/store/api/organizationApi';
import { useGetUsersQuery } from '@/store/api/userApi';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VirtualTable, createColumn } from '@/components/ui/virtual-table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Plus, 
  History, 
  UserPlus, 
  Calendar,
  Building2,
  Briefcase,
  ChevronRight,
  Users,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AssignPositionDialog } from '@/components/organization/AssignPositionDialog';
import { UserPositionHistoryDialog } from '@/components/organization/UserPositionHistoryDialog';
import { UserPositionFilterDto } from '@/types/organization';

// Constants for select values
const SELECT_VALUES = {
  ALL: 'all',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REGULAR: 'regular',
  PLT: 'plt',
} as const;

const DEBOUNCE_DELAY = 300; // milliseconds

export default function UserPositionsPage() {
  const [search, setSearch] = useState('');
  const [showActive, setShowActive] = useState<boolean | undefined>(true);
  const [showPlt, setShowPlt] = useState<boolean | undefined>(undefined);
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(undefined);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedUserForHistory, setSelectedUserForHistory] = useState<string | null>(null);
  
  // Debounce search input
  const debouncedSearch = useDebounce(search, DEBOUNCE_DELAY);

  // Build filters - only include defined values to prevent "undefined" string parameters
  const filters: UserPositionFilterDto = {
    ...(showActive !== undefined && { isActive: showActive }),
    ...(showPlt !== undefined && { isPlt: showPlt }),
    ...(selectedUserId && { userProfileId: selectedUserId }),
  };

  const { data: userPositions, isLoading, error, refetch } = useGetUserPositionsQuery(filters);
  const { data: users } = useGetUsersQuery();

  // Filter user positions based on debounced search
  const filteredPositions = useMemo(() => {
    if (!userPositions) return [];
    if (!debouncedSearch) return userPositions;
    
    const searchLower = debouncedSearch.toLowerCase();
    
    return userPositions.filter(position => {
      const userName = position.userProfile?.name?.toLowerCase() || '';
      const positionName = position.position?.name?.toLowerCase() || '';
      const departmentName = position.position?.department?.name?.toLowerCase() || '';
      const schoolName = position.position?.school?.name?.toLowerCase() || '';
      
      return userName.includes(searchLower) || 
             positionName.includes(searchLower) ||
             departmentName.includes(searchLower) ||
             schoolName.includes(searchLower);
    });
  }, [userPositions, debouncedSearch]);

  const handleViewHistory = (userProfileId: string) => {
    setSelectedUserForHistory(userProfileId);
    setHistoryDialogOpen(true);
  };

  // Virtual table columns configuration
  const tableColumns = useMemo(() => [
    createColumn('userProfile', 'Employee', {
      width: 200,
      render: (assignment) => (
        <div className="font-medium">
          {assignment.userProfile?.name || 'Unknown User'}
        </div>
      ),
    }),
    createColumn('position', 'Position', {
      width: 250,
      render: (assignment) => (
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          {assignment.position?.name || 'Unknown Position'}
        </div>
      ),
    }),
    createColumn('department', 'Department', {
      width: 200,
      render: (assignment) => assignment.position?.department?.name || '-',
    }),
    createColumn('school', 'School', {
      width: 200,
      render: (assignment) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {assignment.position?.school?.name || '-'}
        </div>
      ),
    }),
    createColumn('startDate', 'Start Date', {
      width: 120,
      render: (assignment) => format(new Date(assignment.startDate), 'dd MMM yyyy'),
    }),
    createColumn('endDate', 'End Date', {
      width: 120,
      render: (assignment) => 
        assignment.endDate 
          ? format(new Date(assignment.endDate), 'dd MMM yyyy')
          : '-',
    }),
    createColumn('type', 'Type', {
      width: 80,
      render: (assignment) => 
        assignment.isPlt ? <Badge variant="secondary">PLT</Badge> : null,
    }),
    createColumn('status', 'Status', {
      width: 100,
      render: (assignment) => (
        <Badge variant={assignment.isActive ? 'default' : 'secondary'}>
          {assignment.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    }),
    createColumn('actions', 'Actions', {
      width: 120,
      render: (assignment) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleViewHistory(assignment.userProfileId)}
        >
          <History className="h-4 w-4 mr-1" />
          History
        </Button>
      ),
    }),
  ], []);

  // Use virtual scrolling for large datasets (>50 items)
  const shouldUseVirtualScrolling = filteredPositions && filteredPositions.length > 50;

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">!</span>
                </div>
                <div>
                  <h3 className="font-semibold text-red-900">Unable to load user positions</h3>
                  <p className="text-sm text-muted-foreground">
                    There was a problem connecting to the server. This might be a temporary issue.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => refetch()} variant="default">
                  Try Again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Page
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">User Position Management</h1>
        <p className="text-muted-foreground">
          Manage employee position assignments, transfers, and history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignments
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userPositions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active position holders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              PLT Positions
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userPositions?.filter(p => p.isPlt).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Acting assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recent Changes
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userPositions?.filter(p => {
                const date = new Date(p.startDate);
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                return date > thirtyDaysAgo;
              }).length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setAssignDialogOpen(true)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assign Position
            </CardTitle>
            <Plus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">New</div>
            <p className="text-xs text-muted-foreground">
              Click to assign
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name, position..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-filter">User</Label>
              <Select value={selectedUserId || SELECT_VALUES.ALL} onValueChange={(value) => setSelectedUserId(value === SELECT_VALUES.ALL ? undefined : value)}>
                <SelectTrigger id="user-filter">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_VALUES.ALL}>All users</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Status</Label>
              <Select 
                value={showActive === undefined ? SELECT_VALUES.ALL : showActive ? SELECT_VALUES.ACTIVE : SELECT_VALUES.INACTIVE} 
                onValueChange={(value) => setShowActive(value === SELECT_VALUES.ALL ? undefined : value === SELECT_VALUES.ACTIVE)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_VALUES.ALL}>All statuses</SelectItem>
                  <SelectItem value={SELECT_VALUES.ACTIVE}>Active only</SelectItem>
                  <SelectItem value={SELECT_VALUES.INACTIVE}>Inactive only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plt-filter">Assignment Type</Label>
              <Select 
                value={showPlt === undefined ? SELECT_VALUES.ALL : showPlt ? SELECT_VALUES.PLT : SELECT_VALUES.REGULAR} 
                onValueChange={(value) => setShowPlt(value === SELECT_VALUES.ALL ? undefined : value === SELECT_VALUES.PLT)}
              >
                <SelectTrigger id="plt-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_VALUES.ALL}>All types</SelectItem>
                  <SelectItem value={SELECT_VALUES.REGULAR}>Regular only</SelectItem>
                  <SelectItem value={SELECT_VALUES.PLT}>PLT only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={() => setAssignDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Assign Position
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* User Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Position Assignments</CardTitle>
          <CardDescription>
            Current and historical position assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredPositions && filteredPositions.length > 0 ? (
            shouldUseVirtualScrolling ? (
              <VirtualTable
                data={filteredPositions}
                columns={tableColumns}
                height={500}
                itemHeight={52}
                onRowClick={(assignment) => handleViewHistory(assignment.userProfileId)}
                rowClassName={(assignment) => 
                  `hover:bg-muted/50 ${!assignment.isActive ? 'opacity-60' : ''}`
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.userProfile?.name || 'Unknown User'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground" />
                          {assignment.position?.name || 'Unknown Position'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {assignment.position?.department?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {assignment.position?.school?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(assignment.startDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell>
                        {assignment.endDate 
                          ? format(new Date(assignment.endDate), 'dd MMM yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {assignment.isPlt && (
                          <Badge variant="secondary">PLT</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={assignment.isActive ? 'default' : 'secondary'}>
                          {assignment.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(assignment.userProfileId)}
                        >
                          <History className="h-4 w-4 mr-1" />
                          History
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No position assignments found</p>
              <p className="text-sm mt-2">Try adjusting your filters or assign a new position</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AssignPositionDialog 
        open={assignDialogOpen} 
        onOpenChange={setAssignDialogOpen}
      />

      {selectedUserForHistory && (
        <UserPositionHistoryDialog
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
          userProfileId={selectedUserForHistory}
        />
      )}
    </div>
  );
}