"use client";

import { useState, useMemo } from "react";
import { Plus, Search, CheckSquare, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useGetPermissionsQuery } from "@/lib/store/services/permissionsApi";
import { useAssignPermissionToRoleMutation } from "@/lib/store/services/rolesApi";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { toast } from "sonner";

interface AssignPermissionDialogProps {
  roleId: string;
  roleName: string;
  assignedPermissionIds?: string[];
  onSuccess?: () => void;
}

export function AssignPermissionDialog({
  roleId,
  roleName,
  assignedPermissionIds = [],
  onSuccess
}: AssignPermissionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [resourceFilter, setResourceFilter] = useState<string>("all");
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch all active permissions
  const { data: permissionsData, isLoading: isLoadingPermissions } = useGetPermissionsQuery({
    is_active: true,
    page_size: 1000, // Get all permissions
    sort_by: 'code',
    sort_order: 'asc',
  });

  // Assign permission mutation
  const [assignPermission] = useAssignPermissionToRoleMutation();

  // Filter available permissions
  const availablePermissions = useMemo(() => {
    if (!permissionsData?.data) return [];

    return permissionsData.data.filter(permission => {
      // Exclude already assigned permissions
      if (assignedPermissionIds.includes(permission.id)) return false;

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
  }, [permissionsData, assignedPermissionIds, searchTerm, resourceFilter]);

  // Get unique resources for filter (filter out empty values)
  const uniqueResources = useMemo(() => {
    if (!permissionsData?.data) return [];
    const resources = new Set(
      permissionsData.data
        .map(p => p.resource)
        .filter((resource) => resource && resource.trim() !== '')
    );
    return Array.from(resources).sort();
  }, [permissionsData]);

  // Toggle single permission
  const togglePermission = (permissionId: string) => {
    setSelectedPermissionIds(prev =>
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // Select all available permissions
  const selectAll = () => {
    setSelectedPermissionIds(availablePermissions.map(p => p.id));
  };

  // Deselect all permissions
  const deselectAll = () => {
    setSelectedPermissionIds([]);
  };

  // Bulk assign permissions
  const handleBulkAssign = async () => {
    if (selectedPermissionIds.length === 0) return;

    setIsAssigning(true);

    try {
      // Create array of promises for all assignments
      const assignPromises = selectedPermissionIds.map(permissionId =>
        assignPermission({
          roleId,
          data: {
            permission_id: permissionId,
            is_granted: true,
          },
        }).unwrap()
      );

      // Execute all assignments in parallel
      const results = await Promise.allSettled(assignPromises);

      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      // Show appropriate toast message
      if (failures === 0) {
        toast.success(`${successes} permission(s) berhasil di-assign ke role`);
      } else if (successes === 0) {
        toast.error(`Gagal assign semua permissions (${failures} gagal)`);
      } else {
        toast.warning(`${successes} berhasil, ${failures} gagal di-assign`);
      }

      // Reset and close dialog
      setSelectedPermissionIds([]);
      setSearchTerm("");
      setResourceFilter("all");
      setOpen(false);

      // Call success callback
      onSuccess?.();
    } catch (err) {
      console.error("Failed to bulk assign permissions:", err);
      toast.error("Gagal assign permissions");
    } finally {
      setIsAssigning(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setSelectedPermissionIds([]);
      setSearchTerm("");
      setResourceFilter("all");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Assign Permission
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Permission ke Role</DialogTitle>
          <DialogDescription>
            Assign permission ke role <strong>{roleName}</strong>
            {selectedPermissionIds.length > 0 && (
              <span className="ml-2 text-primary font-medium">
                ({selectedPermissionIds.length} dipilih)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search and Filter */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Cari Permission</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nama, kode, atau resource..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resource-filter">Filter Resource</Label>
              <Select value={resourceFilter} onValueChange={setResourceFilter}>
                <SelectTrigger id="resource-filter">
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

          {/* Bulk Selection Buttons */}
          {availablePermissions.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAll}
                disabled={selectedPermissionIds.length === availablePermissions.length}
              >
                <CheckSquare className="mr-2 h-4 w-4" />
                Pilih Semua
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselectAll}
                disabled={selectedPermissionIds.length === 0}
              >
                <Square className="mr-2 h-4 w-4" />
                Batal Pilih
              </Button>
            </div>
          )}

          {/* Permission Selection */}
          <div className="space-y-2">
            <Label htmlFor="permission">
              Pilih Permission
              {availablePermissions.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({availablePermissions.length} tersedia)
                </span>
              )}
            </Label>
            {isLoadingPermissions ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : availablePermissions.length === 0 ? (
              <div className="rounded-md border border-dashed p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchTerm || resourceFilter !== "all"
                    ? "Tidak ada permission yang cocok dengan filter"
                    : "Semua permission sudah di-assign ke role ini"
                  }
                </p>
              </div>
            ) : (
              <div className="max-h-[300px] space-y-2 overflow-y-auto rounded-md border p-4">
                {availablePermissions.map((permission) => (
                  <div
                    key={permission.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selectedPermissionIds.includes(permission.id)}
                    className={`cursor-pointer rounded-md border p-3 transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      selectedPermissionIds.includes(permission.id)
                        ? "border-primary bg-accent"
                        : "border-border"
                    }`}
                    onClick={() => togglePermission(permission.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        togglePermission(permission.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{permission.name}</p>
                          {permission.is_system_permission && (
                            <Badge variant="secondary" className="text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {permission.code}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            {permission.resource}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {permission.action}
                          </Badge>
                          {permission.scope && (
                            <Badge variant="outline" className="text-xs">
                              {permission.scope}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedPermissionIds.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button
            onClick={handleBulkAssign}
            disabled={selectedPermissionIds.length === 0 || isAssigning}
          >
            {isAssigning ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Assigning {selectedPermissionIds.length} permission(s)...</span>
              </>
            ) : (
              `Assign ${selectedPermissionIds.length || ''} Permission${selectedPermissionIds.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
