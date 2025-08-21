'use client';

import { useState, memo, useCallback, KeyboardEvent } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  GraduationCap,
  Users,
  User,
  Briefcase,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HierarchyNode } from '@/types/organization';
import { cn } from '@/lib/utils';

interface HierarchyNodeCardProps {
  node: HierarchyNode;
  level: number;
  onNodeClick?: (node: HierarchyNode) => void;
  onViewDetails?: (node: HierarchyNode) => void;
  defaultExpanded?: boolean;
}

export const HierarchyNodeCard = memo(function HierarchyNodeCard({
  node,
  level,
  onNodeClick,
  onViewDetails,
  defaultExpanded = false,
}: HierarchyNodeCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const getNodeIcon = () => {
    switch (node.type) {
      case 'school':
        return <GraduationCap className="h-4 w-4" />;
      case 'department':
        return <Building2 className="h-4 w-4" />;
      case 'position':
        return <Briefcase className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getNodeColor = () => {
    switch (node.type) {
      case 'school':
        return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950';
      case 'department':
        return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950';
      case 'position':
        return 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-950';
      case 'user':
        return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950';
      default:
        return 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-950';
    }
  };

  const getNodeBadgeVariant = () => {
    if (!node.metadata?.isActive) return 'secondary';
    switch (node.type) {
      case 'school':
        return 'default';
      case 'department':
        return 'outline';
      case 'position':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleToggle = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleNodeClick = useCallback(() => {
    onNodeClick?.(node);
  }, [onNodeClick, node]);

  const handleViewDetails = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onViewDetails?.(node);
  }, [onViewDetails, node]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNodeClick();
    } else if (e.key === 'ArrowRight' && hasChildren) {
      e.preventDefault();
      setIsExpanded(true);
    } else if (e.key === 'ArrowLeft' && hasChildren) {
      e.preventDefault();
      setIsExpanded(false);
    }
  }, [handleNodeClick, hasChildren]);

  return (
    <div className="relative">
      {/* Connection line for non-root nodes */}
      {level > 0 && (
        <div className="absolute left-0 top-0 h-full w-px bg-gray-200 dark:bg-gray-700 -ml-4" />
      )}
      
      <div
        className={cn(
          'group relative flex items-center gap-2 rounded-lg p-3 transition-all hover:bg-gray-50 dark:hover:bg-gray-800 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500',
          level > 0 && 'ml-8'
        )}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={level + 1}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Expand/Collapse button */}
        {hasChildren && (
          <button
            onClick={handleToggle}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            tabIndex={-1}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-6" />}

        {/* Node content */}
        <div
          onClick={handleNodeClick}
          className={cn(
            'flex-1 flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors',
            getNodeColor()
          )}
        >
          {/* Icon */}
          <div className="flex-shrink-0">
            {getNodeIcon()}
          </div>

          {/* Name and details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate" title={node.name}>{node.name}</span>
              {node.code && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({node.code})
                </span>
              )}
            </div>
            
            {/* Metadata */}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getNodeBadgeVariant()} className="text-xs">
                {node.type}
              </Badge>
              
              {node.metadata?.hierarchyLevel !== undefined && (
                <Badge variant="outline" className="text-xs">
                  Level {node.metadata.hierarchyLevel}
                </Badge>
              )}
              
              {node.metadata?.employeeCount !== undefined && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {node.metadata.employeeCount} employees
                </span>
              )}
              
              {node.metadata?.isActive === false && (
                <Badge variant="secondary" className="text-xs">
                  Inactive
                </Badge>
              )}
            </div>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>
                View Details
              </DropdownMenuItem>
              {node.type === 'department' && (
                <DropdownMenuItem onClick={() => console.log('Navigate to department', node.id)}>
                  Go to Department
                </DropdownMenuItem>
              )}
              {node.type === 'school' && (
                <DropdownMenuItem onClick={() => console.log('Navigate to school', node.id)}>
                  Go to School
                </DropdownMenuItem>
              )}
              {node.type === 'position' && (
                <DropdownMenuItem onClick={() => console.log('Navigate to position', node.id)}>
                  Go to Position
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Child count indicator */}
        {hasChildren && !isExpanded && (
          <Badge variant="secondary" className="text-xs ml-2">
            {node.children.length}
          </Badge>
        )}
      </div>

      {/* Render children */}
      {hasChildren && isExpanded && (
        <div className="mt-1" role="group">
          {node.children.map((child) => (
            <HierarchyNodeCard
              key={`${child.type}-${child.id}`}
              node={child}
              level={level + 1}
              onNodeClick={onNodeClick}
              onViewDetails={onViewDetails}
              defaultExpanded={defaultExpanded}
            />
          ))}
        </div>
      )}
    </div>
  );
});