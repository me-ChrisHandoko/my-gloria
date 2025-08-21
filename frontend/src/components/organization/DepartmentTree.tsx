'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Building2, Users, Briefcase, Plus, Edit, Trash, MoreVertical, Building, Layers, GitBranch, Network, Eye, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
import { useGetDepartmentTreeQuery, useDeleteDepartmentMutation } from '@/store/api/organizationApi';
import { DepartmentTreeDto, Department } from '@/types/organization';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DepartmentTreeProps {
  schoolId?: string;
  onEdit?: (department: Department) => void;
  onAdd?: (parentId?: string) => void;
}

interface TreeNodeProps {
  node: DepartmentTreeDto;
  level: number;
  parentId?: string;
  schoolId?: string;
  onEdit?: (department: Department) => void;
  onAdd?: (parentId?: string) => void;
  onDelete?: (id: string) => void;
  searchTerm?: string;
  isLastChild?: boolean;
  siblingCount?: number;
  expandAll?: boolean;
}

function TreeNode({ node, level, parentId, schoolId, onEdit, onAdd, onDelete, searchTerm, isLastChild = false, siblingCount = 0, expandAll }: TreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const [isHovered, setIsHovered] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  useEffect(() => {
    if (expandAll !== undefined) {
      setIsExpanded(expandAll);
    }
  }, [expandAll]);
  
  const isMatched = searchTerm 
    ? node.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      node.code.toLowerCase().includes(searchTerm.toLowerCase())
    : true;
  
  const hasMatchedChildren = searchTerm && node.children.some(child => 
    child.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    child.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  useEffect(() => {
    if (hasMatchedChildren) {
      setIsExpanded(true);
    }
  }, [hasMatchedChildren]);

  const handleDelete = () => {
    onDelete?.(node.id);
    toast.success(`Department "${node.name}" deleted successfully`);
    setShowDeleteDialog(false);
  };
  
  const getLevelIcon = () => {
    switch(level) {
      case 0:
        return <Building className="h-5 w-5" />;
      case 1:
        return <Layers className="h-5 w-5" />;
      case 2:
        return <GitBranch className="h-5 w-5" />;
      default:
        return <Network className="h-5 w-5" />;
    }
  };
  
  const getLevelColors = () => {
    switch(level) {
      case 0:
        return {
          bg: 'from-blue-50 to-blue-50/30 dark:from-blue-950/30 dark:to-blue-950/10',
          border: 'border-blue-500',
          icon: 'bg-blue-100 dark:bg-blue-900/50',
          iconText: 'text-blue-600 dark:text-blue-400',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        };
      case 1:
        return {
          bg: 'from-emerald-50 to-emerald-50/30 dark:from-emerald-950/30 dark:to-emerald-950/10',
          border: 'border-emerald-500',
          icon: 'bg-emerald-100 dark:bg-emerald-900/50',
          iconText: 'text-emerald-600 dark:text-emerald-400',
          badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
        };
      case 2:
        return {
          bg: 'from-purple-50 to-purple-50/30 dark:from-purple-950/30 dark:to-purple-950/10',
          border: 'border-purple-500',
          icon: 'bg-purple-100 dark:bg-purple-900/50',
          iconText: 'text-purple-600 dark:text-purple-400',
          badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
        };
      default:
        return {
          bg: 'from-amber-50 to-amber-50/30 dark:from-amber-950/30 dark:to-amber-950/10',
          border: 'border-amber-500',
          icon: 'bg-amber-100 dark:bg-amber-900/50',
          iconText: 'text-amber-600 dark:text-amber-400',
          badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
        };
    }
  };
  
  const colors = getLevelColors();
  
  if (searchTerm && !isMatched && !hasMatchedChildren) {
    return null;
  }

  // Calculate proper indentation based on level
  const getIndentation = () => {
    if (level === 0) return '';
    // Each level adds 40px of indentation
    return `pl-10`;
  };
  
  // Calculate connection line offset from left
  const getLineOffset = () => {
    if (level === 0) return 0;
    // 20px offset for connection lines
    return 20;
  };

  return (
    <div className={cn(
      "relative animate-in fade-in slide-in-from-left-2 duration-300",
      level > 0 ? "" : ""
    )}>
      <div className={cn("relative", getIndentation())}>
        {/* Connection lines for non-root nodes */}
        {level > 0 && (
          <>
            {/* Horizontal line from parent to node */}
            <div 
              className={cn(
                "absolute h-px bg-gray-300 dark:bg-gray-600 transition-all duration-300",
                isHovered ? "bg-blue-400 dark:bg-blue-500" : ""
              )}
              style={{ 
                left: `-${getLineOffset()}px`,
                top: '1.5rem',
                width: `${getLineOffset()}px`
              }}
            />
            {/* Vertical line from parent */}
            {!isLastChild && (
              <div 
                className={cn(
                  "absolute w-px bg-gray-300 dark:bg-gray-600",
                )}
                style={{ 
                  left: `-${getLineOffset()}px`,
                  top: '1.5rem',
                  height: 'calc(100% + 0.5rem)'
                }}
              />
            )}
            {/* Curved corner for last child */}
            {isLastChild && (
              <div 
                className={cn(
                  "absolute w-3 h-3 border-l-2 border-b-2 rounded-bl-lg",
                  isHovered ? "border-blue-400 dark:border-blue-500" : "border-gray-300 dark:border-gray-600"
                )}
                style={{ 
                  left: `-${getLineOffset()}px`,
                  top: '1.25rem'
                }}
              />
            )}
          </>
        )}
      
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={cn(
            "flex items-center justify-between rounded-xl p-4 transition-all duration-300 relative overflow-hidden group",
            "bg-gradient-to-r border-l-4 backdrop-blur-sm",
            colors.bg,
            colors.border,
            isHovered ? "shadow-lg scale-[1.01] z-10" : "shadow-sm",
            isMatched && searchTerm ? "ring-2 ring-yellow-400 dark:ring-yellow-500" : ""
          )}
        >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <pattern id={`pattern-${node.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="1" fill="currentColor" />
            </pattern>
            <rect width="100%" height="100%" fill={`url(#pattern-${node.id})`} />
          </svg>
        </div>
        <div className="flex items-center space-x-3 relative z-10">
          {node.children.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      "hover:bg-white/70 dark:hover:bg-gray-700/70",
                      "hover:shadow-md"
                    )}
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    <div className={cn(
                      "transition-transform duration-200",
                      isExpanded ? "rotate-180" : "rotate-0"
                    )}>
                      <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{isExpanded ? 'Collapse' : 'Expand'} sub-departments</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {node.children.length === 0 && <div className="w-11" />}
          
          <div className={cn(
            "p-2.5 rounded-xl shadow-sm transition-all duration-200",
            colors.icon,
            isHovered ? "scale-110 shadow-md" : ""
          )}>
            <div className={colors.iconText}>
              {getLevelIcon()}
            </div>
          </div>
          
          <div className="flex flex-col space-y-1">
            <div className="flex items-center flex-wrap gap-2">
              <span className={cn(
                "font-semibold text-gray-800 dark:text-gray-200 text-base",
                isMatched && searchTerm ? "text-yellow-600 dark:text-yellow-400" : ""
              )}>
                {node.name}
              </span>
              <Badge variant="outline" className={cn("text-xs", colors.badge)}>
                {node.code}
              </Badge>
              {level === 0 && (
                <Badge variant="secondary" className="text-xs">
                  Root
                </Badge>
              )}
            </div>
            {node.bagianKerja && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {node.bagianKerja}
              </span>
            )}
            {node.description && (
              <span className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
                {node.description}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 relative z-10">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                    <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{node.employeeCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{node.employeeCount} employee{node.employeeCount !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/30 dark:to-emerald-900/10 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <Briefcase className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">{node.positionCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{node.positionCount} position{node.positionCount !== 1 ? 's' : ''}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {node.children.length > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className={cn(
                      "flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200",
                      isExpanded 
                        ? "bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800/30 dark:to-gray-800/10 border-gray-300 dark:border-gray-700"
                        : "bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-900/10 border-orange-200 dark:border-orange-800"
                    )}>
                      <Network className={cn(
                        "h-3.5 w-3.5",
                        isExpanded ? "text-gray-600 dark:text-gray-400" : "text-orange-600 dark:text-orange-400"
                      )} />
                      <span className={cn(
                        "text-xs font-semibold",
                        isExpanded ? "text-gray-700 dark:text-gray-300" : "text-orange-700 dark:text-orange-300"
                      )}>
                        {node.children.length} sub
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{node.children.length} sub-department{node.children.length !== 1 ? 's' : ''}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-9 w-9 p-0 transition-all duration-200",
                  "hover:bg-white/70 dark:hover:bg-gray-700/70",
                  "hover:shadow-md"
                )}
              >
                <span className="sr-only">Open menu</span>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onAdd?.(node.id)} className="cursor-pointer">
                <Plus className="mr-2 h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Add Sub-Department</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit?.({
                id: node.id,
                code: node.code,
                name: node.name,
                bagianKerja: node.bagianKerja,
                description: node.description,
                parentId: parentId,
                schoolId: schoolId,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
              } as Department)} className="cursor-pointer">
                <Edit className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Edit Department</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // View details functionality
                  toast.info(`Viewing details for ${node.name}`);
                }} 
                className="cursor-pointer"
              >
                <Eye className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>View Details</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => {
                  e.preventDefault();
                  setShowDeleteDialog(true);
                }} 
                className="text-red-600 dark:text-red-400 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the department
              <span className="font-semibold"> "{node.name}"</span>
              {node.children.length > 0 && (
                <span> and all {node.children.length} sub-department{node.children.length !== 1 ? 's' : ''}</span>
              )}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Department
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isExpanded && node.children.length > 0 && (
        <div className="relative mt-2">
          {/* Vertical line connecting parent to children */}
          {node.children.length > 0 && (
            <div 
              className="absolute w-px bg-gray-300 dark:bg-gray-600"
              style={{ 
                left: level === 0 ? '20px' : '20px',
                top: '-0.5rem',
                height: node.children.length === 1 ? '2rem' : `calc(100% - 1.5rem)`
              }}
            />
          )}
          <div className="space-y-2 ml-10">
            {node.children.map((child, index) => (
              <TreeNode
                key={child.id}
                node={child}
                level={level + 1}
                parentId={node.id}
                schoolId={schoolId}
                onEdit={onEdit}
                onAdd={onAdd}
                onDelete={onDelete}
                searchTerm={searchTerm}
                isLastChild={index === node.children.length - 1}
                siblingCount={node.children.length}
                expandAll={expandAll}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function DepartmentTree({ schoolId, onEdit, onAdd }: DepartmentTreeProps) {
  const { data: departments, isLoading, error, refetch } = useGetDepartmentTreeQuery(schoolId);
  const [deleteDepartment] = useDeleteDepartmentMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandAll, setExpandAll] = useState<boolean | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'tree' | 'compact'>('tree');

  const handleDelete = async (id: string) => {
    try {
      await deleteDepartment(id).unwrap();
    } catch (error: any) {
      console.error('Failed to delete department:', error);
      toast.error(error?.data?.message || 'Failed to delete department');
    }
  };
  
  const handleExpandAll = () => {
    setExpandAll(true);
    setTimeout(() => setExpandAll(undefined), 100);
  };
  
  const handleCollapseAll = () => {
    setExpandAll(false);
    setTimeout(() => setExpandAll(undefined), 100);
  };
  
  const countTotalDepartments = (deps: DepartmentTreeDto[]): number => {
    return deps.reduce((total, dept) => {
      return total + 1 + countTotalDepartments(dept.children);
    }, 0);
  };
  
  const totalDepartments = departments ? countTotalDepartments(departments) : 0;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Department Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
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
          <CardTitle>Department Structure</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">Error loading departments</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="text-xl font-bold">Department Structure</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {totalDepartments} department{totalDepartments !== 1 ? 's' : ''} in total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleExpandAll} variant="outline" size="sm">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Expand all</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleCollapseAll} variant="outline" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Collapse all</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={() => refetch()} variant="outline" size="sm">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Button onClick={() => onAdd?.()} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Department
            </Button>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-6 pb-6">
        {departments && departments.length > 0 ? (
          <div className="space-y-3">
            {departments.map((dept, index) => (
              <TreeNode
                key={dept.id}
                node={dept}
                level={0}
                parentId={undefined}
                schoolId={schoolId}
                onEdit={onEdit}
                onAdd={onAdd}
                onDelete={handleDelete}
                searchTerm={searchTerm}
                isLastChild={index === departments.length - 1}
                siblingCount={departments.length}
                expandAll={expandAll}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-2">
              No departments found
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first department to get started
            </p>
            <Button onClick={() => onAdd?.()} variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Department
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}