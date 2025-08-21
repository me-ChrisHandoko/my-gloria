'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  Download,
  Maximize2,
  Minimize2,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HierarchySkeleton } from './HierarchySkeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { HierarchyNodeCard } from './HierarchyNodeCard';
import { useGetOrganizationHierarchyQuery } from '@/store/api/organizationApi';
import { HierarchyNode, HierarchyFilterDto } from '@/types/organization';
import { toast } from 'sonner';

interface OrganizationHierarchyTreeProps {
  userId?: string;
  onNodeClick?: (node: HierarchyNode) => void;
  onViewDetails?: (node: HierarchyNode) => void;
}

export function OrganizationHierarchyTree({
  userId,
  onNodeClick,
  onViewDetails,
}: OrganizationHierarchyTreeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [searchDebounced, setSearchDebounced] = useState('');

  // Debounce search input for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filters: HierarchyFilterDto = {
    includeInactive: showInactive,
    ...(filterType !== 'all' && { type: filterType as any }),
  };

  const { data: hierarchy, isLoading, error, refetch } = useGetOrganizationHierarchyQuery(filters);

  const handleExport = useCallback(() => {
    if (!hierarchy) return;
    
    try {
      const exportData = JSON.stringify(hierarchy, null, 2);
      const blob = new Blob([exportData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `organization-hierarchy-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Hierarchy exported successfully');
    } catch (error) {
      console.error('Failed to export hierarchy:', error);
      toast.error('Failed to export hierarchy');
    }
  }, [hierarchy]);

  const handleRefresh = useCallback(() => {
    refetch();
    toast.success('Hierarchy refreshed');
  }, [refetch]);

  const filterNodes = useCallback((node: HierarchyNode): HierarchyNode | null => {
    if (!searchDebounced) return node;

    const nodeMatches = 
      node.name.toLowerCase().includes(searchDebounced.toLowerCase()) ||
      (node.code && node.code.toLowerCase().includes(searchDebounced.toLowerCase()));

    const filteredChildren = node.children
      ?.map(child => filterNodes(child))
      .filter(Boolean) as HierarchyNode[];

    if (nodeMatches || filteredChildren.length > 0) {
      return {
        ...node,
        children: filteredChildren || [],
      };
    }

    return null;
  }, [searchDebounced]);

  const filteredHierarchy = useMemo(
    () => hierarchy ? filterNodes(hierarchy) : null,
    [hierarchy, filterNodes]
  );

  const countNodes = useCallback((node: HierarchyNode): number => {
    if (!node) return 0;
    return 1 + (node.children?.reduce((acc, child) => acc + countNodes(child), 0) || 0);
  }, []);

  const totalNodes = useMemo(
    () => hierarchy ? countNodes(hierarchy) : 0,
    [hierarchy, countNodes]
  );
  const visibleNodes = useMemo(
    () => filteredHierarchy ? countNodes(filteredHierarchy) : 0,
    [filteredHierarchy, countNodes]
  );

  if (error) {
    const is404 = (error as any)?.status === 404;
    const errorMessage = is404 
      ? 'The organizational hierarchy feature is not yet available. Please check back later.'
      : 'Failed to load organizational hierarchy. Please try again later.';
      
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert variant={is404 ? "default" : "destructive"}>
            <AlertTitle>{is404 ? 'Feature Coming Soon' : 'Error'}</AlertTitle>
            <AlertDescription>
              {errorMessage}
            </AlertDescription>
          </Alert>
          {!is404 && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => refetch()} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <HierarchySkeleton />;
  }

  return (
    <Card className="w-full" role="region" aria-label="Organization Structure">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Organization Structure</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {visibleNodes} of {totalNodes} nodes
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse all' : 'Expand all'}
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={!hierarchy}
              title="Export hierarchy"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              title="Refresh hierarchy"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
                aria-label="Search organization hierarchy"
                role="searchbox"
                aria-describedby="search-hint"
              />
              <span id="search-hint" className="sr-only">
                Type to filter the organizational hierarchy by name or code
              </span>
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType} aria-label="Filter by type">
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="school">Schools</SelectItem>
              <SelectItem value="department">Departments</SelectItem>
              <SelectItem value="position">Positions</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showInactive ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            aria-pressed={showInactive}
            aria-label={showInactive ? 'Hide inactive items' : 'Show inactive items'}
          >
            <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
            {showInactive ? 'Hide' : 'Show'} Inactive
          </Button>
        </div>

        {/* Hierarchy Tree */}
        <div className="relative" role="tree" aria-label="Organizational hierarchy tree">
          {filteredHierarchy ? (
            <div className="overflow-x-auto" tabIndex={0} aria-label="Hierarchy tree container">
              <HierarchyNodeCard
                node={filteredHierarchy}
                level={0}
                onNodeClick={onNodeClick}
                onViewDetails={onViewDetails}
                defaultExpanded={isExpanded}
              />
            </div>
          ) : (
            <div className="text-center py-12" role="status" aria-live="polite">
              <p className="text-muted-foreground">
                {searchTerm
                  ? 'No nodes found matching your search criteria.'
                  : 'No organizational hierarchy data available.'}
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t" role="complementary" aria-label="Hierarchy legend">
          <p className="text-sm font-medium mb-2" id="legend-title">Legend:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>School</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Department</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span>Position</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>User</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}