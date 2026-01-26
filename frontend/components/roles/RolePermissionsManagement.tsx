"use client";

import { useState, useMemo } from "react";
import { Trash2, Search, Shield, Key, Lock, CheckSquare, Square, ChevronsUpDown, ChevronsDownUp } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { AssignPermissionDialog } from "./AssignPermissionDialog";
import {
  useGetRoleWithPermissionsQuery,
  useRevokePermissionFromRoleMutation,
} from "@/lib/store/services/rolesApi";
import { toast } from "sonner";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";

// Helper function to extract error message from RTK Query errors
function getErrorMessage(error: FetchBaseQueryError | SerializedError | undefined): string {
  if (!error) return "Unknown error";

  if ("status" in error) {
    // FetchBaseQueryError
    const data = error.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || `Error ${error.status}`;
  }

  // SerializedError
  return error.message || "Unknown error";
}

interface RolePermissionsManagementProps {
  roleId: string;
  roleName: string;
  hideHeader?: boolean;
}

export default function RolePermissionsManagement({
  roleId,
  roleName,
  hideHeader = false,
}: RolePermissionsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Fetch role with permissions
  const {
    data: roleData,
    isLoading,
    error,
    refetch,
  } = useGetRoleWithPermissionsQuery(roleId);

  // Revoke permission mutation
  const [revokePermission] = useRevokePermissionFromRoleMutation();
  const [isRevoking, setIsRevoking] = useState(false);

  // Get assigned permissions
  const assignedPermissions = useMemo(() => {
    if (!roleData?.permissions) return [];
    return roleData.permissions;
  }, [roleData]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    return assignedPermissions.filter((permission) => {
      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          permission.name.toLowerCase().includes(search) ||
          permission.code.toLowerCase().includes(search) ||
          permission.resource.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Apply resource filter
      if (resourceFilter !== "all" && permission.resource !== resourceFilter) {
        return false;
      }

      return true;
    });
  }, [assignedPermissions, searchTerm, resourceFilter]);

  // Get unique resources (filter out empty values for Select component)
  const uniqueResources = useMemo(() => {
    const resources = new Set(
      assignedPermissions
        .map((p) => p.resource)
        .filter((resource) => resource && resource.trim() !== '')
    );
    return Array.from(resources).sort();
  }, [assignedPermissions]);

  // Group permissions by resource (handle empty resource names)
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof filteredPermissions> = {};
    filteredPermissions.forEach((permission) => {
      // Use "Uncategorized" for empty or undefined resource names
      const resourceKey = permission.resource?.trim() || "Uncategorized";
      if (!groups[resourceKey]) {
        groups[resourceKey] = [];
      }
      groups[resourceKey].push(permission);
    });
    return groups;
  }, [filteredPermissions]);

  // Toggle single permission selection (using assignment_id for revoke)
  const togglePermissionSelection = (assignmentId: string) => {
    setSelectedPermissionIds(prev =>
      prev.includes(assignmentId)
        ? prev.filter(id => id !== assignmentId)
        : [...prev, assignmentId]
    );
  };

  // Select all filtered permissions (using assignment_id for revoke)
  const selectAllFiltered = () => {
    setSelectedPermissionIds(filteredPermissions.map(p => p.assignment_id));
  };

  // Deselect all permissions
  const deselectAll = () => {
    setSelectedPermissionIds([]);
  };

  // Expand all resource groups
  const expandAllGroups = () => {
    setExpandedGroups(Object.keys(groupedPermissions));
  };

  // Collapse all resource groups
  const collapseAllGroups = () => {
    setExpandedGroups([]);
  };

  // Select all permissions in a specific resource group
  const selectAllInResource = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    const resourceAssignmentIds = resourcePermissions.map(p => p.assignment_id);
    setSelectedPermissionIds(prev => {
      const newIds = new Set([...prev, ...resourceAssignmentIds]);
      return Array.from(newIds);
    });
  };

  // Deselect all permissions in a specific resource group
  const deselectAllInResource = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    const resourceAssignmentIds = new Set(resourcePermissions.map(p => p.assignment_id));
    setSelectedPermissionIds(prev => prev.filter(id => !resourceAssignmentIds.has(id)));
  };

  // Check if all permissions in a resource are selected
  const isAllSelectedInResource = (resource: string) => {
    const resourcePermissions = groupedPermissions[resource] || [];
    return resourcePermissions.length > 0 &&
           resourcePermissions.every(p => selectedPermissionIds.includes(p.assignment_id));
  };

  // Open bulk revoke dialog
  const handleBulkRevokeClick = () => {
    if (selectedPermissionIds.length === 0) return;
    setRevokeDialogOpen(true);
  };

  // Handle bulk revoke confirm
  const handleBulkRevokeConfirm = async () => {
    if (selectedPermissionIds.length === 0) return;

    setIsRevoking(true);

    try {
      // Create array of promises for all revokes (using assignment_id)
      const revokePromises = selectedPermissionIds.map(assignmentId =>
        revokePermission({
          roleId,
          permissionAssignmentId: assignmentId,
        }).unwrap()
      );

      // Execute all revokes in parallel
      const results = await Promise.allSettled(revokePromises);

      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      // Show appropriate toast message
      if (failures === 0) {
        toast.success(`${successes} permission(s) berhasil dicabut dari role`);
      } else if (successes === 0) {
        toast.error(`Gagal mencabut semua permissions (${failures} gagal)`);
      } else {
        toast.warning(`${successes} berhasil, ${failures} gagal dicabut`);
      }

      // Reset state and refetch
      setRevokeDialogOpen(false);
      setSelectedPermissionIds([]);
      refetch();
    } catch (err) {
      console.error("Failed to bulk revoke permissions:", err);
      toast.error("Gagal mencabut permissions");
    } finally {
      setIsRevoking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error">
        Gagal memuat data permissions: {getErrorMessage(error)}
      </Alert>
    );
  }

  const assignedPermissionIds = assignedPermissions.map((p) => p.id);

  return (
    <div className="space-y-6">
      {/* Header with Action - Only show if hideHeader is false */}
      {!hideHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Kelola Permissions
                </CardTitle>
                <CardDescription>
                  Assign dan kelola permissions untuk role <strong>{roleName}</strong>
                </CardDescription>
              </div>
              <AssignPermissionDialog
                roleId={roleId}
                roleName={roleName}
                assignedPermissionIds={assignedPermissionIds}
                onSuccess={refetch}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-md bg-muted p-4">
              <Key className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  {assignedPermissions.length} Permission Di-assign
                </p>
                <p className="text-muted-foreground">
                  {uniqueResources.length} Resource Berbeda
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search-assigned">Cari Permission</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-assigned"
                  placeholder="Nama, kode, atau resource..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-filter-assigned">Filter Resource</Label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger id="resource-filter-assigned" className="w-full">
                  <SelectValue placeholder="Semua resource" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Resource</SelectItem>
                  {uniqueResources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Permissions List */}
      {assignedPermissions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Belum Ada Permission</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Role ini belum memiliki permission. Klik tombol &quot;Assign Permission&quot; untuk menambahkan.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredPermissions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Tidak Ada Hasil</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tidak ada permission yang cocok dengan filter Anda
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setResourceFilter("all");
                }}
              >
                Reset Filter
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Permissions by Resource</CardTitle>
                <CardDescription>
                  {Object.keys(groupedPermissions).length} resource groups • {filteredPermissions.length} permissions
                  {selectedPermissionIds.length > 0 && (
                    <span className="text-primary font-medium ml-2">
                      • {selectedPermissionIds.length} dipilih
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {/* Bulk Selection Actions Group */}
                <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAllFiltered}
                    disabled={selectedPermissionIds.length === filteredPermissions.length}
                    className="h-8"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Pilih Semua
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    disabled={selectedPermissionIds.length === 0}
                    className="h-8"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Batal Pilih
                  </Button>
                  <div className="h-6 w-px bg-border mx-1" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBulkRevokeClick}
                    disabled={selectedPermissionIds.length === 0}
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cabut {selectedPermissionIds.length > 0 ? `(${selectedPermissionIds.length})` : ''}
                  </Button>
                </div>

                {/* Expand/Collapse Actions Group */}
                <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAllGroups}
                    disabled={expandedGroups.length === Object.keys(groupedPermissions).length}
                    className="h-8"
                  >
                    <ChevronsUpDown className="mr-2 h-4 w-4" />
                    Expand All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={collapseAllGroups}
                    disabled={expandedGroups.length === 0}
                    className="h-8"
                  >
                    <ChevronsDownUp className="mr-2 h-4 w-4" />
                    Collapse All
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Accordion
              type="multiple"
              value={expandedGroups}
              onValueChange={setExpandedGroups}
              className="w-full"
            >
              {Object.entries(groupedPermissions).map(([resource, permissions]) => (
                <AccordionItem key={resource} value={resource} className="border rounded-lg mb-2">
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                    {/* Checkbox separate from accordion trigger */}
                    <Checkbox
                      checked={isAllSelectedInResource(resource)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllInResource(resource);
                        } else {
                          deselectAllInResource(resource);
                        }
                      }}
                      aria-label={`Select all permissions in ${resource}`}
                    />
                    {/* Accordion trigger as flex-1 clickable area */}
                    <AccordionTrigger className="hover:no-underline flex-1 py-0 cursor-pointer">
                      <div className="text-left flex-1">
                        <p className="font-medium font-mono">{resource}</p>
                        <p className="text-xs text-muted-foreground">
                          {permissions.length} permission{permissions.length > 1 ? "s" : ""}
                          {permissions.filter(p => selectedPermissionIds.includes(p.assignment_id)).length > 0 && (
                            <span className="ml-2 text-primary">
                              • {permissions.filter(p => selectedPermissionIds.includes(p.assignment_id)).length} selected
                            </span>
                          )}
                        </p>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <AccordionContent className="px-4 pb-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                      {permissions.map((permission) => (
                        <div
                          key={permission.id}
                          className={`flex items-start justify-between gap-2 rounded-md border p-2 transition-colors ${
                            selectedPermissionIds.includes(permission.assignment_id)
                              ? "border-primary bg-accent"
                              : "border-border hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Checkbox
                              checked={selectedPermissionIds.includes(permission.assignment_id)}
                              onCheckedChange={() => togglePermissionSelection(permission.assignment_id)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <div className="flex items-center gap-1 flex-wrap">
                                <p className="font-medium text-sm truncate">{permission.name}</p>
                                {permission.is_system_permission && (
                                  <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                    System
                                  </Badge>
                                )}
                              </div>
                              <p className="font-mono text-[10px] text-muted-foreground truncate">
                                {permission.code}
                              </p>
                              <div className="flex flex-wrap gap-0.5">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {permission.action}
                                </Badge>
                                {permission.scope && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    {permission.scope}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => {
                              setSelectedPermissionIds([permission.assignment_id]);
                              setRevokeDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Bulk Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pencabutan Permission</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mencabut{" "}
              <strong>{selectedPermissionIds.length} permission(s)</strong> dari role{" "}
              <strong>{roleName}</strong>?
              <br />
              <br />
              Users dengan role ini tidak akan bisa mengakses fitur yang memerlukan permissions ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedPermissionIds([])}>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkRevokeConfirm}
              disabled={isRevoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRevoking ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Mencabut {selectedPermissionIds.length} permission(s)...</span>
                </>
              ) : (
                `Ya, Cabut ${selectedPermissionIds.length} Permission(s)`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
