// components/roles/AssignModuleDialog.tsx
"use client";

import { useState, useMemo } from "react";
import { Plus, Search, LayoutGrid, CheckSquare, Square, HelpCircle } from "lucide-react";
import { DynamicIcon } from "@/components/ui/DynamicIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  useGetModulesQuery,
  useAssignModuleToRoleMutation,
} from "@/lib/store/services/modulesApi";
import type { ModuleListResponse, ModuleCategory } from "@/lib/types/module";

interface AssignModuleDialogProps {
  roleId: string;
  roleName: string;
  assignedModuleIds: string[];
  onSuccess: () => void;
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

export function AssignModuleDialog({
  roleId,
  roleName,
  assignedModuleIds,
  onSuccess,
}: AssignModuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedModuleIds, setSelectedModuleIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch all modules (same as /access/modules page)
  const {
    data: modulesResponse,
    isLoading,
    error,
  } = useGetModulesQuery(
    { page: 1, page_size: 1000, is_active: true }, // Get all active modules
    { skip: !open }
  );

  // Assign module mutation
  const [assignModule] = useAssignModuleToRoleMutation();

  // Get all modules from response
  const allModules = useMemo(() => {
    if (!modulesResponse?.data) return [];
    return modulesResponse.data;
  }, [modulesResponse]);

  // Get available modules (not already assigned)
  const availableModules = useMemo(() => {
    return allModules.filter(
      (module: ModuleListResponse) =>
        !assignedModuleIds.includes(module.id) && module.is_active
    );
  }, [allModules, assignedModuleIds]);

  // Apply search and filter
  const filteredModules = useMemo(() => {
    return availableModules.filter((module: ModuleListResponse) => {
      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          module.name.toLowerCase().includes(search) ||
          module.code.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Apply category filter
      if (categoryFilter !== "all" && module.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [availableModules, searchTerm, categoryFilter]);

  // Get unique categories
  const uniqueCategories = useMemo(() => {
    const categories = new Set(availableModules.map((m: ModuleListResponse) => m.category));
    return Array.from(categories).sort();
  }, [availableModules]);

  // Group modules by root/parent hierarchy
  const groupedModules = useMemo(() => {
    // First, separate root modules and child modules
    const rootModules: ModuleListResponse[] = [];
    const childModules: ModuleListResponse[] = [];

    filteredModules.forEach((module: ModuleListResponse) => {
      if (module.parent_id) {
        childModules.push(module);
      } else {
        rootModules.push(module);
      }
    });

    // Create groups: root modules as keys, their children as values
    const groups: Record<string, { root: ModuleListResponse | null; children: ModuleListResponse[] }> = {};

    // Add root modules as group headers
    rootModules.forEach((module) => {
      groups[module.id] = {
        root: module,
        children: []
      };
    });

    // Add child modules to their parent groups
    childModules.forEach((module) => {
      const parentId = module.parent_id!;

      if (groups[parentId]) {
        // Parent exists in available modules
        groups[parentId].children.push(module);
      } else {
        // Parent not available, create orphan group
        if (!groups[`orphan_${parentId}`]) {
          groups[`orphan_${parentId}`] = {
            root: null,
            children: []
          };
        }
        groups[`orphan_${parentId}`].children.push(module);
      }
    });

    return groups;
  }, [filteredModules]);

  // Toggle module selection
  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModuleIds((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  // Select all filtered modules
  const selectAllFiltered = () => {
    setSelectedModuleIds(filteredModules.map((m: ModuleListResponse) => m.id));
  };

  // Deselect all modules
  const deselectAll = () => {
    setSelectedModuleIds([]);
  };

  // Handle assign
  const handleAssign = async () => {
    if (selectedModuleIds.length === 0) return;

    setIsAssigning(true);

    try {
      // Create array of promises for all assignments
      const assignPromises = selectedModuleIds.map((moduleId) =>
        assignModule({
          roleId,
          data: {
            module_id: moduleId,
            permissions: {}, // Default empty permissions
            is_active: true,
          },
        }).unwrap()
      );

      // Execute all assignments in parallel
      const results = await Promise.allSettled(assignPromises);

      // Count successes and failures
      const successes = results.filter((r) => r.status === "fulfilled").length;
      const failures = results.filter((r) => r.status === "rejected").length;

      // Show appropriate toast message
      if (failures === 0) {
        toast.success(`${successes} module(s) berhasil di-assign ke role`);
      } else if (successes === 0) {
        toast.error(`Gagal assign semua modules (${failures} gagal)`);
      } else {
        toast.warning(`${successes} berhasil, ${failures} gagal di-assign`);
      }

      // Reset state and close dialog
      setSelectedModuleIds([]);
      setSearchTerm("");
      setCategoryFilter("all");
      setOpen(false);
      onSuccess();
    } catch (err) {
      console.error("Failed to assign modules:", err);
      toast.error("Gagal assign modules");
    } finally {
      setIsAssigning(false);
    }
  };

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSelectedModuleIds([]);
      setSearchTerm("");
      setCategoryFilter("all");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Assign Module
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Assign Module ke Role
          </DialogTitle>
          <DialogDescription>
            Pilih module yang ingin di-assign ke role <strong>{roleName}</strong>
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <Alert variant="error">Gagal memuat daftar module</Alert>
        ) : (
          <>
            {/* Search and Filter */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="search-module">Cari Module</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-module"
                    placeholder="Nama atau kode module..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-filter">Filter Kategori</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="Semua kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category as string} value={category as string}>
                        {category as string}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bulk Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllFiltered}
                  disabled={
                    selectedModuleIds.length === filteredModules.length ||
                    filteredModules.length === 0
                  }
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  Pilih Semua ({filteredModules.length})
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  disabled={selectedModuleIds.length === 0}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Batal Pilih
                </Button>
              </div>
              {selectedModuleIds.length > 0 && (
                <Badge variant="secondary">
                  {selectedModuleIds.length} module dipilih
                </Badge>
              )}
            </div>

            {/* Module List */}
            <ScrollArea className="h-[350px] rounded-md border p-4">
              {availableModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">
                    Semua Module Sudah Di-assign
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Role ini sudah memiliki semua module yang tersedia
                  </p>
                </div>
              ) : filteredModules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search className="h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Tidak Ada Hasil</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Tidak ada module yang cocok dengan filter Anda
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedModules)
                    .sort(([, a], [, b]) => {
                      // Sort by root module sort_order, orphans at the end
                      const sortA = a.root?.sort_order ?? 999;
                      const sortB = b.root?.sort_order ?? 999;
                      return sortA - sortB;
                    })
                    .map(([groupKey, group]) => {
                      const rootModule = group.root;
                      const isOrphan = !group.root;
                      const groupName = rootModule?.name || "Sub-modules (Parent tidak tersedia)";
                      const groupIcon = rootModule?.icon;
                      const totalInGroup = (rootModule ? 1 : 0) + group.children.length;

                      return (
                        <div key={groupKey} className="border rounded-lg overflow-hidden">
                          {/* Group Header */}
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50">
                            {groupIcon && (
                              <DynamicIcon
                                name={groupIcon}
                                className="h-5 w-5 text-muted-foreground"
                                fallback={<HelpCircle className="h-5 w-5 text-muted-foreground" />}
                              />
                            )}
                            <span className="font-medium">{groupName}</span>
                            {rootModule && (
                              <Badge className={categoryColors[rootModule.category as ModuleCategory] || "bg-gray-100 text-gray-800"}>
                                {rootModule.category}
                              </Badge>
                            )}
                            {isOrphan && (
                              <Badge variant="outline" className="text-orange-600 border-orange-600">
                                Orphan
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              {totalInGroup} module{totalInGroup > 1 ? "s" : ""}
                            </span>
                          </div>

                          {/* Modules in Group */}
                          <div className="p-2 space-y-2">
                            {/* Root Module */}
                            {rootModule && (
                              <div
                                className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                                  selectedModuleIds.includes(rootModule.id)
                                    ? "border-primary bg-accent"
                                    : "border-border bg-muted/30 hover:bg-muted/50"
                                }`}
                                onClick={() => toggleModuleSelection(rootModule.id)}
                              >
                                <Checkbox
                                  checked={selectedModuleIds.includes(rootModule.id)}
                                  onCheckedChange={() => toggleModuleSelection(rootModule.id)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {rootModule.icon && (
                                      <DynamicIcon
                                        name={rootModule.icon}
                                        className="h-4 w-4 text-muted-foreground"
                                        fallback={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
                                      />
                                    )}
                                    <p className="font-medium">{rootModule.name}</p>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 text-blue-600 border-blue-600">
                                      Root
                                    </Badge>
                                  </div>
                                  <p className="font-mono text-xs text-muted-foreground">
                                    {rootModule.code}
                                  </p>
                                  {rootModule.path && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {rootModule.path}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Child Modules */}
                            {group.children.length > 0 && (
                              <div className="pl-4 space-y-2 border-l-2 border-muted ml-2">
                                {group.children
                                  .sort((a, b) => a.sort_order - b.sort_order)
                                  .map((module) => (
                                    <div
                                      key={module.id}
                                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors cursor-pointer ${
                                        selectedModuleIds.includes(module.id)
                                          ? "border-primary bg-accent"
                                          : "border-border hover:bg-muted/50"
                                      }`}
                                      onClick={() => toggleModuleSelection(module.id)}
                                    >
                                      <Checkbox
                                        checked={selectedModuleIds.includes(module.id)}
                                        onCheckedChange={() => toggleModuleSelection(module.id)}
                                        className="mt-0.5"
                                      />
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {module.icon && (
                                            <DynamicIcon
                                              name={module.icon}
                                              className="h-4 w-4 text-muted-foreground"
                                              fallback={<HelpCircle className="h-4 w-4 text-muted-foreground" />}
                                            />
                                          )}
                                          <p className="font-medium">{module.name}</p>
                                        </div>
                                        <p className="font-mono text-xs text-muted-foreground">
                                          {module.code}
                                        </p>
                                        {module.path && (
                                          <p className="text-xs text-muted-foreground mt-1">
                                            {module.path}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={selectedModuleIds.length === 0 || isAssigning}
          >
            {isAssigning ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Assigning...</span>
              </>
            ) : (
              `Assign ${selectedModuleIds.length} Module${
                selectedModuleIds.length > 1 ? "s" : ""
              }`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
