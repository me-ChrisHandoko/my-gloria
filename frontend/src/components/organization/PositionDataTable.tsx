"use client";

import * as React from "react";
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
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Plus,
  Edit,
  Trash,
  Eye,
  Building2,
  GraduationCap,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useGetPositionsQuery,
  useDeletePositionMutation,
  useGetPositionAvailabilityQuery,
} from "@/store/api/organizationApi";
import { Position, PositionFilterDto } from "@/types/organization";

interface PositionDataTableProps {
  onEdit?: (position: Position) => void;
  onView?: (position: Position) => void;
  onAdd?: () => void;
  departmentId?: string;
  schoolId?: string;
}

export function PositionDataTable({
  onEdit,
  onView,
  onAdd,
  departmentId,
  schoolId,
}: PositionDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [positionToDelete, setPositionToDelete] =
    React.useState<Position | null>(null);
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null);

  const filters = React.useMemo(() => {
    const filter: PositionFilterDto = {};
    if (departmentId) {
      filter.departmentId = departmentId;
    }
    if (schoolId) {
      filter.schoolId = schoolId;
    }
    if (globalFilter) {
      filter.search = globalFilter;
    }
    return filter;
  }, [departmentId, schoolId, globalFilter]);

  const {
    data: positions = [],
    isLoading,
    error,
  } = useGetPositionsQuery(filters);
  const [deletePosition] = useDeletePositionMutation();

  const handleDelete = async () => {
    if (!positionToDelete) return;

    try {
      await deletePosition(positionToDelete.id).unwrap();
      toast.success(`Position "${positionToDelete.name}" deleted successfully`);
      setDeleteDialogOpen(false);
      setPositionToDelete(null);
    } catch (error: any) {
      console.error("Failed to delete position:", error);

      let errorMessage = "Failed to delete position";

      if (error?.data?.message) {
        if (error.data.message.includes("foreign key constraint")) {
          errorMessage =
            "Cannot delete this position because it has assigned users or other related data.";
        } else if (error.data.message.includes("not found")) {
          errorMessage =
            "Position not found. It may have already been deleted.";
        } else if (error.data.message.includes("Access denied")) {
          errorMessage = "You do not have permission to delete this position.";
        } else {
          errorMessage = error.data.message;
        }
      } else if (error?.status === 403) {
        errorMessage = "You do not have permission to delete this position.";
      } else if (error?.status === 404) {
        errorMessage = "Position not found. It may have already been deleted.";
      }

      toast.error(errorMessage);
    }
  };

  const openDeleteDialog = (position: Position) => {
    setPositionToDelete(position);
    // Close dropdown menu first, then open dialog after a brief delay for smooth transition
    setOpenDropdownId(null);
    setTimeout(() => {
      setDeleteDialogOpen(true);
    }, 150); // Small delay for dropdown close animation
  };

  const columns: ColumnDef<Position>[] = React.useMemo(
    () => [
      {
        id: "select",
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
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
        accessorKey: "code",
        size: 120,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Code
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("code")}</div>
        ),
      },
      {
        accessorKey: "name",
        size: 200,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Name
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
      },
      {
        accessorKey: "department.name",
        header: "Department",
        size: 180,
        cell: ({ row }) => {
          const department = row.original.department;
          return department ? (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {department.name}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "school.name",
        header: "School",
        size: 150,
        cell: ({ row }) => {
          const school = row.original.school;
          return school ? (
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              {school.name}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "hierarchyLevel",
        size: 100,
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Level
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const level = row.getValue("hierarchyLevel") as number;
          return <Badge variant="outline">Level {level}</Badge>;
        },
      },
      {
        accessorKey: "maxHolders",
        header: "Max Holders",
        size: 120,
        cell: ({ row }) => {
          const maxHolders = row.getValue("maxHolders") as number;
          const isUnique = row.original.isUnique;
          return (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {isUnique ? (
                <Badge variant="secondary">Unique</Badge>
              ) : (
                <span>{maxHolders}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "isActive",
        header: "Status",
        size: 100,
        cell: ({ row }) => {
          const isActive = row.getValue("isActive");
          return (
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Active" : "Inactive"}
            </Badge>
          );
        },
      },
      {
        id: "actions",
        size: 80,
        enableHiding: false,
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const position = row.original;

          return (
            <div className="text-right">
              <DropdownMenu
                open={openDropdownId === position.id}
                onOpenChange={(open) => setOpenDropdownId(open ? position.id : null)}
              >
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => onView?.(position)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(position)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit position
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      openDeleteDialog(position);
                    }}
                    className="text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Delete position
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onEdit, onView, openDropdownId]
  );

  const table = useReactTable({
    data: positions,
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
  });

  if (error) {
    console.error('Position loading error:', error);
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-red-500 font-semibold mb-2">
              Failed to load positions
            </div>
            {error && 'data' in error && (error as any).data?.message && (
              <div className="text-sm text-muted-foreground">
                {(error as any).data.message}
              </div>
            )}
            <div className="text-sm text-muted-foreground mt-2">
              If you're a new user, please contact your administrator to set up your profile.
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Positions</CardTitle>
          {onAdd && (
            <Button onClick={onAdd} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Position
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div className="flex items-center py-4">
            <Input
              placeholder="Search positions..."
              value={globalFilter}
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
                        onCheckedChange={(value) =>
                          column.toggleVisibility(!!value)
                        }
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
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-24">
                      <div className="flex flex-col gap-2">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No positions found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-end space-x-2 py-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {table.getFilteredSelectedRowModel().rows.length} of{" "}
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
              This action cannot be undone. This will permanently delete the
              position
              <span className="font-semibold">
                {" "}
                "{positionToDelete?.name}"
              </span>{" "}
              and all its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPositionToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Position
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
