'use client';

import { useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { OrganizationHierarchyTree } from '@/components/organization/OrganizationHierarchyTree';
import { HierarchyErrorBoundary } from '@/components/organization/HierarchyErrorBoundary';
import { HierarchyNode } from '@/types/organization';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Building2,
  GraduationCap,
  Users,
  User,
  Briefcase,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

export default function HierarchyPage() {
  const router = useRouter();
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleNodeClick = useCallback((node: HierarchyNode) => {
    // Navigate to the appropriate page based on node type
    switch (node.type) {
      case 'school':
        router.push(`/organization/schools`);
        toast.info(`Navigating to schools page`);
        break;
      case 'department':
        router.push(`/organization/departments`);
        toast.info(`Navigating to departments page`);
        break;
      case 'position':
        router.push(`/organization/positions`);
        toast.info(`Navigating to positions page`);
        break;
      case 'user':
        toast.info(`User profile navigation not yet implemented`);
        break;
      default:
        console.log('Unknown node type:', node.type);
    }
  }, [router]);

  const handleViewDetails = useCallback((node: HierarchyNode) => {
    setSelectedNode(node);
    setDetailsOpen(true);
  }, []);

  const getNodeIcon = useCallback((type: string) => {
    switch (type) {
      case 'school':
        return <GraduationCap className="h-5 w-5" />;
      case 'department':
        return <Building2 className="h-5 w-5" />;
      case 'position':
        return <Briefcase className="h-5 w-5" />;
      case 'user':
        return <User className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  }, []);

  return (
    <div className="container mx-auto flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-3xl font-bold">Organizational Hierarchy</h1>
        <p className="text-muted-foreground">
          Visualize and navigate your organization&apos;s hierarchical structure
        </p>
      </div>

      <HierarchyErrorBoundary>
        <Suspense
          fallback={
            <div className="w-full p-6 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-gray-100 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading hierarchy...</p>
              </div>
            </div>
          }
        >
          <OrganizationHierarchyTree
            onNodeClick={handleNodeClick}
            onViewDetails={handleViewDetails}
          />
        </Suspense>
      </HierarchyErrorBoundary>

      {/* Node Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen} aria-labelledby="details-dialog-title">
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle id="details-dialog-title" className="flex items-center gap-2">
              {selectedNode && getNodeIcon(selectedNode.type)}
              {selectedNode?.name}
            </DialogTitle>
            <DialogDescription>
              View details about this {selectedNode?.type}
            </DialogDescription>
          </DialogHeader>
          
          {selectedNode && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Type</p>
                  <Badge variant="outline" className="mt-1" aria-label={`Node type: ${selectedNode.type}`}>
                    {selectedNode.type}
                  </Badge>
                </div>
                {selectedNode.code && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Code</p>
                    <p className="mt-1">{selectedNode.code}</p>
                  </div>
                )}
              </div>

              <Separator />

              {selectedNode.metadata && (
                <div className="space-y-3">
                  <h4 className="font-medium">Additional Information</h4>
                  
                  {selectedNode.metadata.isActive !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={selectedNode.metadata.isActive ? 'default' : 'secondary'}>
                        {selectedNode.metadata.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  )}

                  {selectedNode.metadata.hierarchyLevel !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Hierarchy Level</span>
                      <span>{selectedNode.metadata.hierarchyLevel}</span>
                    </div>
                  )}

                  {selectedNode.metadata.employeeCount !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Employee Count</span>
                      <span>{selectedNode.metadata.employeeCount}</span>
                    </div>
                  )}

                  {selectedNode.metadata.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{selectedNode.metadata.address}</span>
                    </div>
                  )}

                  {selectedNode.metadata.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedNode.metadata.phone}</span>
                    </div>
                  )}

                  {selectedNode.metadata.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{selectedNode.metadata.email}</span>
                    </div>
                  )}
                </div>
              )}

              {selectedNode.children && selectedNode.children.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Children ({selectedNode.children.length})</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {selectedNode.children.map((child) => (
                        <div
                          key={`${child.type}-${child.id}`}
                          className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
                          {getNodeIcon(child.type)}
                          <span className="text-sm">{child.name}</span>
                          {child.code && (
                            <span className="text-xs text-muted-foreground">
                              ({child.code})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}