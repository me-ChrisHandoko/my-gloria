// components/roles/RoleModulesManagement.tsx
"use client";

import { useState, useMemo } from "react";
import { Trash2, Search, LayoutGrid, Package, Lock, CheckSquare, Square, ChevronsUpDown, ChevronsDownUp, FolderTree, HelpCircle } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
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
import { AssignModuleDialog } from "./AssignModuleDialog";
import {
  useGetRoleModuleAccessesQuery,
  useRevokeModuleFromRoleMutation,
  useGetModulesQuery,
} from "@/lib/store/services/modulesApi";
import type { ModuleListResponse } from "@/lib/types/module";
import { toast } from "sonner";
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { SerializedError } from "@reduxjs/toolkit";
import type { ModuleCategory } from "@/lib/types/module";

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

// Category color mapping
const categoryColors: Record<ModuleCategory, string> = {
  SERVICE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  PERFORMANCE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  QUALITY: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  FEEDBACK: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  TRAINING: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  SYSTEM: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

interface RoleModulesManagementProps {
  roleId: string;
  roleName: string;
  hideHeader?: boolean;
}

// Module Card Component for displaying individual modules
interface ModuleCardProps {
  access: {
    id: string;
    module_id: string;
    module?: {
      id: string;
      code: string;
      name: string;
      category: ModuleCategory;
      icon?: string | null;
      path?: string | null;
      parent_id?: string | null;
      sort_order: number;
      is_active: boolean;
      is_visible: boolean;
    } | null;
    is_active: boolean;
  };
  isSelected: boolean;
  onToggle: () => void;
  onRevoke: () => void;
  isRoot?: boolean;
}

function ModuleCard({ access, isSelected, onToggle, onRevoke, isRoot }: ModuleCardProps) {
  const mod = access.module;
  if (!mod) return null;

  return (
    <div
      className={`flex items-start justify-between gap-2 rounded-md border p-2 transition-colors ${
        isSelected
          ? "border-primary bg-accent"
          : isRoot
          ? "border-border bg-muted/30 hover:bg-muted/50"
          : "border-border hover:bg-muted/50"
      }`}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggle}
          className="mt-0.5 shrink-0"
        />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {mod.icon && (
              <DynamicIcon
                name={mod.icon}
                className="h-4 w-4 text-muted-foreground"
                fallback={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
              />
            )}
            <p className="font-medium text-sm truncate">{mod.name}</p>
            {isRoot && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-600">
                Root
              </Badge>
            )}
            {!mod.is_active && (
              <Badge variant="secondary" className="text-[10px] px-1 py-0">
                Inactive
              </Badge>
            )}
          </div>
          <p className="font-mono text-[10px] text-muted-foreground truncate">
            {mod.code}
          </p>
          {mod.path && (
            <div className="flex items-center gap-1">
              <FolderTree className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-[10px] text-muted-foreground truncate">
                {mod.path}
              </p>
            </div>
          )}
          <div className="flex flex-wrap gap-0.5">
            {!access.is_active && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 text-destructive">
                Access Inactive
              </Badge>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        onClick={onRevoke}
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

export default function RoleModulesManagement({
  roleId,
  roleName,
  hideHeader = false,
}: RoleModulesManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedAccessIds, setSelectedAccessIds] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // Fetch role module accesses
  const {
    data: moduleAccesses,
    isLoading,
    error,
    refetch,
  } = useGetRoleModuleAccessesQuery(roleId);

  // Fetch all modules (for parent lookup when orphaned)
  const { data: allModulesResponse } = useGetModulesQuery({
    page: 1,
    page_size: 1000,
  });

  // Revoke module mutation
  const [revokeModule] = useRevokeModuleFromRoleMutation();
  const [isRevoking, setIsRevoking] = useState(false);

  // Create module lookup map for parent info
  const moduleMap = useMemo(() => {
    const map = new Map<string, ModuleListResponse>();
    if (allModulesResponse?.data) {
      allModulesResponse.data.forEach((mod) => map.set(mod.id, mod));
    }
    return map;
  }, [allModulesResponse]);

  // Get assigned modules
  const assignedModules = useMemo(() => {
    if (!moduleAccesses) return [];
    return moduleAccesses;
  }, [moduleAccesses]);

  // Filter modules
  const filteredModules = useMemo(() => {
    return assignedModules.filter((access) => {
      const mod = access.module;
      if (!mod) return false;

      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          mod.name.toLowerCase().includes(search) ||
          mod.code.toLowerCase().includes(search) ||
          mod.category.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Apply category filter
      if (categoryFilter !== "all" && mod.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [assignedModules, searchTerm, categoryFilter]);

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      assignedModules
        .map((a) => a.module?.category)
        .filter((category): category is ModuleCategory => !!category)
    );
    return Array.from(categories).sort();
  }, [assignedModules]);

  // Group modules by root/parent hierarchy
  const groupedModules = useMemo(() => {
    // First, separate root modules and child modules
    const rootModules: typeof filteredModules = [];
    const childModules: typeof filteredModules = [];

    filteredModules.forEach((access) => {
      const mod = access.module;
      if (!mod) return;

      if (mod.parent_id) {
        childModules.push(access);
      } else {
        rootModules.push(access);
      }
    });

    // Create groups: root modules as keys, their children as values
    // parentInfo is used for orphan groups to show the parent module's name/icon
    const groups: Record<string, {
      root: typeof filteredModules[0] | null;
      children: typeof filteredModules;
      parentInfo?: ModuleListResponse | null;
    }> = {};

    // Add root modules as group headers
    rootModules.forEach((access) => {
      const mod = access.module!;
      groups[mod.id] = {
        root: access,
        children: []
      };
    });

    // Add child modules to their parent groups
    childModules.forEach((access) => {
      const mod = access.module!;
      const parentId = mod.parent_id!;

      if (groups[parentId]) {
        // Parent exists in assigned modules
        groups[parentId].children.push(access);
      } else {
        // Parent not assigned - lookup parent info from all modules
        const orphanKey = `orphan_${parentId}`;
        if (!groups[orphanKey]) {
          // Lookup parent module info from moduleMap
          const parentModule = moduleMap.get(parentId);
          groups[orphanKey] = {
            root: null,
            children: [],
            parentInfo: parentModule || null
          };
        }
        groups[orphanKey].children.push(access);
      }
    });

    // Sort groups by root module sort_order
    return groups;
  }, [filteredModules, moduleMap]);

  // Toggle single module selection (using access id for revoke)
  const toggleModuleSelection = (accessId: string) => {
    setSelectedAccessIds(prev =>
      prev.includes(accessId)
        ? prev.filter(id => id !== accessId)
        : [...prev, accessId]
    );
  };

  // Select all filtered modules
  const selectAllFiltered = () => {
    setSelectedAccessIds(filteredModules.map(a => a.id));
  };

  // Deselect all modules
  const deselectAll = () => {
    setSelectedAccessIds([]);
  };

  // Expand all category groups
  const expandAllGroups = () => {
    setExpandedGroups(Object.keys(groupedModules));
  };

  // Collapse all category groups
  const collapseAllGroups = () => {
    setExpandedGroups([]);
  };

  // Get all access IDs in a group (root + children)
  const getGroupAccessIds = (groupKey: string) => {
    const group = groupedModules[groupKey];
    if (!group) return [];
    const ids: string[] = [];
    if (group.root) ids.push(group.root.id);
    group.children.forEach(a => ids.push(a.id));
    return ids;
  };

  // Select all modules in a specific group
  const selectAllInGroup = (groupKey: string) => {
    const groupAccessIds = getGroupAccessIds(groupKey);
    setSelectedAccessIds(prev => {
      const newIds = new Set([...prev, ...groupAccessIds]);
      return Array.from(newIds);
    });
  };

  // Deselect all modules in a specific group
  const deselectAllInGroup = (groupKey: string) => {
    const groupAccessIds = new Set(getGroupAccessIds(groupKey));
    setSelectedAccessIds(prev => prev.filter(id => !groupAccessIds.has(id)));
  };

  // Check if all modules in a group are selected
  const isAllSelectedInGroup = (groupKey: string) => {
    const groupAccessIds = getGroupAccessIds(groupKey);
    return groupAccessIds.length > 0 &&
           groupAccessIds.every(id => selectedAccessIds.includes(id));
  };

  // Count selected in a group
  const countSelectedInGroup = (groupKey: string) => {
    const groupAccessIds = getGroupAccessIds(groupKey);
    return groupAccessIds.filter(id => selectedAccessIds.includes(id)).length;
  };

  // Get total count in a group
  const getTotalInGroup = (groupKey: string) => {
    return getGroupAccessIds(groupKey).length;
  };

  // Open bulk revoke dialog
  const handleBulkRevokeClick = () => {
    if (selectedAccessIds.length === 0) return;
    setRevokeDialogOpen(true);
  };

  // Handle bulk revoke confirm
  const handleBulkRevokeConfirm = async () => {
    if (selectedAccessIds.length === 0) return;

    setIsRevoking(true);

    try {
      // Create array of promises for all revokes
      const revokePromises = selectedAccessIds.map(accessId =>
        revokeModule({
          roleId,
          accessId,
        }).unwrap()
      );

      // Execute all revokes in parallel
      const results = await Promise.allSettled(revokePromises);

      // Count successes and failures
      const successes = results.filter(r => r.status === 'fulfilled').length;
      const failures = results.filter(r => r.status === 'rejected').length;

      // Show appropriate toast message
      if (failures === 0) {
        toast.success(`${successes} module(s) berhasil dicabut dari role`);
      } else if (successes === 0) {
        toast.error(`Gagal mencabut semua modules (${failures} gagal)`);
      } else {
        toast.warning(`${successes} berhasil, ${failures} gagal dicabut`);
      }

      // Reset state and refetch
      setRevokeDialogOpen(false);
      setSelectedAccessIds([]);
      refetch();
    } catch (err) {
      console.error("Failed to bulk revoke modules:", err);
      toast.error("Gagal mencabut modules");
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
        Gagal memuat data modules: {getErrorMessage(error)}
      </Alert>
    );
  }

  const assignedModuleIds = assignedModules.map((a) => a.module_id);

  return (
    <div className="space-y-6">
      {/* Header with Action - Only show if hideHeader is false */}
      {!hideHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LayoutGrid className="h-5 w-5" />
                  Kelola Modules
                </CardTitle>
                <CardDescription>
                  Assign dan kelola modules untuk role <strong>{roleName}</strong>
                </CardDescription>
              </div>
              <AssignModuleDialog
                roleId={roleId}
                roleName={roleName}
                assignedModuleIds={assignedModuleIds}
                onSuccess={refetch}
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 rounded-md bg-muted p-4">
              <Package className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 text-sm">
                <p className="font-medium">
                  {assignedModules.length} Module Di-assign
                </p>
                <p className="text-muted-foreground">
                  {assignedModules.filter(a => !a.module?.parent_id).length} Root Module • {assignedModules.filter(a => a.module?.parent_id).length} Sub-module
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search-assigned">Cari Module</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search-assigned"
                  placeholder="Nama, kode, atau kategori..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-filter-assigned">Filter Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger id="category-filter-assigned" className="w-full">
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Kategori</SelectItem>
                  {uniqueCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Modules List */}
      {assignedModules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Belum Ada Module</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Role ini belum memiliki module. Klik tombol &quot;Assign Module&quot; untuk menambahkan.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : filteredModules.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Tidak Ada Hasil</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Tidak ada module yang cocok dengan filter Anda
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
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
                <CardTitle className="text-base">Modules by Hierarchy</CardTitle>
                <CardDescription>
                  {Object.keys(groupedModules).length} root modules • {filteredModules.length} total modules
                  {selectedAccessIds.length > 0 && (
                    <span className="text-primary font-medium ml-2">
                      • {selectedAccessIds.length} dipilih
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
                    disabled={selectedAccessIds.length === filteredModules.length}
                    className="h-8"
                  >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    Pilih Semua
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deselectAll}
                    disabled={selectedAccessIds.length === 0}
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
                    disabled={selectedAccessIds.length === 0}
                    className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Cabut {selectedAccessIds.length > 0 ? `(${selectedAccessIds.length})` : ''}
                  </Button>
                </div>

                {/* Expand/Collapse Actions Group */}
                <div className="flex items-center gap-1 rounded-md border bg-background p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={expandAllGroups}
                    disabled={expandedGroups.length === Object.keys(groupedModules).length}
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
              {Object.entries(groupedModules)
                .sort(([, a], [, b]) => {
                  // Sort by root module sort_order, orphans at the end
                  const sortA = a.root?.module?.sort_order ?? 999;
                  const sortB = b.root?.module?.sort_order ?? 999;
                  return sortA - sortB;
                })
                .map(([groupKey, group]) => {
                  const rootModule = group.root?.module;
                  const isOrphan = !group.root;
                  // For orphan groups, use parentInfo from moduleMap lookup
                  const parentInfo = group.parentInfo;
                  const groupName = rootModule?.name || parentInfo?.name || "Sub-modules (Parent tidak diketahui)";
                  const groupIcon = rootModule?.icon || parentInfo?.icon;
                  const groupPath = rootModule?.path || parentInfo?.path;
                  const groupCategory = rootModule?.category || parentInfo?.category;
                  const totalInGroup = getTotalInGroup(groupKey);
                  const selectedInGroup = countSelectedInGroup(groupKey);

                  return (
                    <AccordionItem key={groupKey} value={groupKey} className="border rounded-lg mb-2">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                        {/* Checkbox separate from accordion trigger */}
                        <Checkbox
                          checked={isAllSelectedInGroup(groupKey)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              selectAllInGroup(groupKey);
                            } else {
                              deselectAllInGroup(groupKey);
                            }
                          }}
                          aria-label={`Select all modules in ${groupName}`}
                        />
                        {/* Accordion trigger as flex-1 clickable area */}
                        <AccordionTrigger className="hover:no-underline flex-1 py-0 cursor-pointer">
                          <div className="flex items-center justify-between flex-1">
                            <div className="flex items-center gap-2">
                              {groupIcon && (
                                <DynamicIcon
                                  name={groupIcon}
                                  className="h-5 w-5 text-muted-foreground"
                                  fallback={<HelpCircle className="h-5 w-5 text-muted-foreground" />}
                                />
                              )}
                              <span className="font-medium">{groupName}</span>
                              {groupCategory && (
                                <Badge className={categoryColors[groupCategory as ModuleCategory] || "bg-gray-100 text-gray-800"}>
                                  {groupCategory}
                                </Badge>
                              )}
                              {isOrphan && (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  Parent tidak di-assign
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {groupPath && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {groupPath}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {totalInGroup} module{totalInGroup > 1 ? "s" : ""}
                                {selectedInGroup > 0 && (
                                  <span className="ml-2 text-primary">
                                    • {selectedInGroup} selected
                                  </span>
                                )}
                              </span>
                            </div>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <AccordionContent className="px-4 pb-3">
                        <div className="space-y-3">
                          {/* Root Module (if exists) */}
                          {group.root && (
                            <div className="mb-3">
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                Root Module
                              </p>
                              <ModuleCard
                                access={group.root}
                                isSelected={selectedAccessIds.includes(group.root.id)}
                                onToggle={() => toggleModuleSelection(group.root!.id)}
                                onRevoke={() => {
                                  setSelectedAccessIds([group.root!.id]);
                                  setRevokeDialogOpen(true);
                                }}
                                isRoot
                              />
                            </div>
                          )}

                          {/* Child Modules */}
                          {group.children.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                                <FolderTree className="h-3 w-3" />
                                Sub-modules ({group.children.length})
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                                {group.children
                                  .sort((a, b) => (a.module?.sort_order ?? 0) - (b.module?.sort_order ?? 0))
                                  .map((access) => (
                                    <ModuleCard
                                      key={access.id}
                                      access={access}
                                      isSelected={selectedAccessIds.includes(access.id)}
                                      onToggle={() => toggleModuleSelection(access.id)}
                                      onRevoke={() => {
                                        setSelectedAccessIds([access.id]);
                                        setRevokeDialogOpen(true);
                                      }}
                                    />
                                  ))}
                              </div>
                            </div>
                          )}

                          {/* Only root, no children */}
                          {group.root && group.children.length === 0 && (
                            <p className="text-xs text-muted-foreground italic pl-2">
                              Tidak ada sub-module yang di-assign
                            </p>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Bulk Revoke Confirmation Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Pencabutan Module</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mencabut{" "}
              <strong>{selectedAccessIds.length} module(s)</strong> dari role{" "}
              <strong>{roleName}</strong>?
              <br />
              <br />
              Users dengan role ini tidak akan bisa mengakses module-module ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedAccessIds([])}>
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
                  <span className="ml-2">Mencabut {selectedAccessIds.length} module(s)...</span>
                </>
              ) : (
                `Ya, Cabut ${selectedAccessIds.length} Module(s)`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
