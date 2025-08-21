'use client';

import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Edit,
  Trash,
  Eye,
  Building2,
  Users,
  Briefcase,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGetDepartmentsQuery, useDeleteDepartmentMutation } from '@/store/api/organizationApi';
import { Department, DepartmentFilterDto } from '@/types/organization';

interface DepartmentDataTableProps {
  schoolId?: string;
  onEdit?: (department: Department) => void;
  onView?: (department: Department) => void;
  onAdd?: () => void;
}

export function DepartmentDataTable({ schoolId, onEdit, onView, onAdd }: DepartmentDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [departmentToDelete, setDepartmentToDelete] = React.useState<Department | null>(null);

  const filters: DepartmentFilterDto = React.useMemo(() => {
    const filter: DepartmentFilterDto = {};
    if (schoolId) {
      filter.schoolId = schoolId;
    }
    if (globalFilter) {
      filter.search = globalFilter;
    }
    return filter;
  }, [schoolId, globalFilter]);

  const { data: departments = [], isLoading, error } = useGetDepartmentsQuery(filters);
  const [deleteDepartment] = useDeleteDepartmentMutation();

  const handleDelete = async () => {
    if (!departmentToDelete) return;
    
    try {
      await deleteDepartment(departmentToDelete.id).unwrap();
      toast.success(`Department "${departmentToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setDepartmentToDelete(null);
    } catch (error: any) {
      console.error('Failed to delete department:', error);
        
        // Parse error message for better user experience
        let errorMessage = 'Failed to delete department';
        
        if (error?.data?.message) {
          if (error.data.message.includes('foreign key constraint')) {
            errorMessage = 'Cannot delete this department because it has associated sub-departments or other related data.';
          } else if (error.data.message.includes('not found')) {
            errorMessage = 'Department not found. It may have already been deleted.';
          } else if (error.data.message.includes('Access denied')) {
            errorMessage = 'You do not have permission to delete this department.';
          } else {
            errorMessage = error.data.message;
          }
        } else if (error?.status === 403) {
          errorMessage = 'You do not have permission to delete this department.';
        } else if (error?.status === 404) {
          errorMessage = 'Department not found. It may have already been deleted.';
        }
        
        toast.error(errorMessage);
    }
  };

  const openDeleteDialog = (department: Department) => {
    setDepartmentToDelete(department);
    setDeleteDialogOpen(true);
  };

  const columns: ColumnDef<Department>[] = React.useMemo(
    () => [
      {
        id: 'select',
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'code',
        size: 120,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Code
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => <div className="font-medium">{row.getValue('code')}</div>,
      },
      {
        accessorKey: 'name',
        size: 200,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const department = row.original;
          return (
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-gray-500" />
              <span>{row.getValue('name')}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'school.name',
        header: 'School',
        size: 150,
        cell: ({ row }) => {
          const department = row.original;
          return <div>{department.school?.name || '-'}</div>;
        },
      },
      {
        accessorKey: 'parent.name',
        header: 'Parent Department',
        size: 180,
        cell: ({ row }) => {
          const department = row.original;
          return department.parent ? (
            <Badge variant="outline">{department.parent.name}</Badge>
          ) : (
            <span className="text-muted-foreground">Root</span>
          );
        },
      },
      {
        accessorKey: 'bagianKerja',
        header: 'Bagian Kerja',
        size: 150,
        cell: ({ row }) => <div>{row.getValue('bagianKerja') || '-'}</div>,
      },
      {
        id: 'statistics',
        size: 150,
        header: () => <div className="text-center">Statistics</div>,
        cell: ({ row }) => {
          const department = row.original;
          return (
            <div className="flex items-center justify-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{department.employeeCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Briefcase className="h-3 w-3" />
                <span>{department.positionCount || 0}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Building2 className="h-3 w-3" />
                <span>{department.childCount || 0}</span>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'isActive',
        header: 'Status',
        size: 100,
        cell: ({ row }) => {
          const isActive = row.getValue('isActive') as boolean;
          return (
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        size: 80,
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const department = row.original;

          return (
            <div className="text-right">
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(department.id)}
                >
                  Copy department ID
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onView?.(department)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit?.(department)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit department
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    openDeleteDialog(department);
                  }}
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete department
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onEdit, onView]
  );

  const table = useReactTable({
    data: departments,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Departments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading departments. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Departments Management</CardTitle>
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div className="flex items-center py-4">
            <Input
              placeholder="Search departments..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="max-w-sm"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24 text-center">
                      No departments found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{' '}
              {table.getFilteredRowModel().rows.length} row(s) selected.
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department
              <span className="font-semibold"> "{departmentToDelete?.name}"</span> and all its sub-departments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDepartmentToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}