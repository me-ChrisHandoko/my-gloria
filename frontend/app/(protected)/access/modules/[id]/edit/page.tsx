"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  useGetModuleByIdQuery,
  useUpdateModuleMutation,
  useGetModulesQuery,
} from "@/lib/store/services/modulesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";

const moduleSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" })
    .optional(),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" })
    .optional(),
  category: z.enum(["SERVICE", "PERFORMANCE", "QUALITY", "FEEDBACK", "TRAINING", "SYSTEM"]).optional(),
  icon: z.string().optional().or(z.literal("")),
  path: z.string().optional().or(z.literal("")),
  parent_id: z.string().optional().or(z.literal("")).nullable(),
  sort_order: z.number().int().min(0).optional(),
  is_visible: z.boolean().optional(),
  is_active: z.boolean().optional(),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditModulePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: module, isLoading: isLoadingData, error } = useGetModuleByIdQuery(id);
  const [updateModule, { isLoading: isUpdating }] = useUpdateModuleMutation();

  // Fetch root modules for parent dropdown
  const { data: modulesData, isLoading: isLoadingModules } = useGetModulesQuery({
    page_size: 100,
    is_active: true,
    parent_id: "null", // Only root modules
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    mode: "onBlur",
  });

  const watchCategory = watch("category");
  const watchParentId = watch("parent_id");
  const watchIsVisible = watch("is_visible");

  useEffect(() => {
    if (module) {
      reset({
        code: module.code,
        name: module.name,
        category: module.category,
        icon: module.icon || "",
        path: module.path || "",
        parent_id: module.parent_id || "",
        sort_order: module.sort_order,
        is_visible: module.is_visible,
        is_active: module.is_active,
        description: module.description || "",
      });
    }
  }, [module, reset]);

  const onSubmit = async (data: ModuleFormData) => {
    try {
      // Build update payload - only include changed fields
      const cleanedData: {
        code?: string;
        name?: string;
        category?: "SERVICE" | "PERFORMANCE" | "QUALITY" | "FEEDBACK" | "TRAINING" | "SYSTEM";
        icon?: string | null;
        path?: string | null;
        parent_id?: string | null;
        sort_order?: number;
        is_visible?: boolean;
        is_active?: boolean;
        description?: string | null;
      } = {};

      if (data.code !== undefined && data.code !== "") cleanedData.code = data.code;
      if (data.name !== undefined && data.name !== "") cleanedData.name = data.name;
      if (data.category !== undefined) cleanedData.category = data.category;
      if (data.icon !== undefined) cleanedData.icon = data.icon || null;
      if (data.path !== undefined) cleanedData.path = data.path || null;
      if (data.description !== undefined) cleanedData.description = data.description || null;
      if (data.sort_order !== undefined) cleanedData.sort_order = data.sort_order;
      if (data.is_visible !== undefined) cleanedData.is_visible = data.is_visible;
      if (data.is_active !== undefined) cleanedData.is_active = data.is_active;

      // Handle parent_id - send empty string to clear (backend converts to null)
      const originalParentId = module?.parent_id || "";
      if (data.parent_id === "" || data.parent_id === "none") {
        cleanedData.parent_id = "";
      } else if (data.parent_id) {
        cleanedData.parent_id = data.parent_id;
      } else if (originalParentId) {
        // If parent_id is undefined/null but original had a value, clear it
        cleanedData.parent_id = "";
      }

      await updateModule({ id, data: cleanedData }).unwrap();
      toast.success("Module berhasil diperbarui");
      router.push(`/akses/modules/${id}`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memperbarui module");
    }
  };

  // Filter parent modules - exclude current module
  const filteredParentModules = modulesData?.data?.filter(mod => {
    // Exclude current module (can't be its own parent)
    if (mod.id === id) return false;
    // Always include current parent so it shows in dropdown
    if (module?.parent_id && mod.id === module.parent_id) return true;
    return true;
  });

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !module) {
    return <Alert variant="error">Gagal memuat data module</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Module</h1>
        <p className="text-muted-foreground">
          {module.name} - Kode: {module.code}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Module */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Module</CardTitle>
            <CardDescription>Data identitas module</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">
                Kode Module <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="Contoh: MOD_SERVICE_001"
                className={`w-full ${errors.code ? "border-destructive" : ""}`}
                {...register("code")}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Module <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Nama lengkap module"
                className={`w-full ${errors.name ? "border-destructive" : ""}`}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">
                Kategori <span className="text-destructive">*</span>
              </Label>
              <Select
                key={`category-${watchCategory || "none"}`}
                onValueChange={(value) => {
                  setValue("category", value as any);
                  trigger("category");
                }}
                value={watchCategory}
              >
                <SelectTrigger className={`w-full ${errors.category ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SERVICE">SERVICE</SelectItem>
                  <SelectItem value="PERFORMANCE">PERFORMANCE</SelectItem>
                  <SelectItem value="QUALITY">QUALITY</SelectItem>
                  <SelectItem value="FEEDBACK">FEEDBACK</SelectItem>
                  <SelectItem value="TRAINING">TRAINING</SelectItem>
                  <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                </SelectContent>
              </Select>
              {errors.category && (
                <p className="text-sm text-destructive">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent Module (Opsional)</Label>
              <Select
                key={`parent-${watchParentId || "none"}`}
                onValueChange={(value) => {
                  if (!value || (value !== "none" && value.length !== 36)) {
                    return;
                  }
                  const newValue = value === "none" ? "" : value;
                  setValue("parent_id", newValue);
                  trigger("parent_id");
                }}
                value={watchParentId || "none"}
                disabled={isLoadingModules}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingModules ? "Memuat..." : "Pilih parent (opsional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa parent (Root Module)</SelectItem>
                  {filteredParentModules?.map((mod) => (
                    <SelectItem key={mod.id} value={mod.id}>
                      {mod.name} ({mod.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Kosongkan jika module ini adalah module utama (root)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Icon (Opsional)</Label>
              <Input
                id="icon"
                placeholder="Contoh: Box, Settings, Users"
                className="w-full"
                {...register("icon")}
              />
              <p className="text-sm text-muted-foreground">
                Nama icon dari Lucide React
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="path">Path URL (Opsional)</Label>
              <Input
                id="path"
                placeholder="Contoh: /dashboard/service"
                className="w-full"
                {...register("path")}
              />
              <p className="text-sm text-muted-foreground">
                Path URL untuk akses module ini
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sort_order">Urutan Tampilan</Label>
              <Input
                id="sort_order"
                type="number"
                min="0"
                placeholder="0"
                className="w-full"
                {...register("sort_order", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Angka lebih kecil akan tampil lebih dulu
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 pt-8">
                <input
                  id="is_visible"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  {...register("is_visible")}
                />
                <Label htmlFor="is_visible" className="cursor-pointer">
                  Module Terlihat di Menu
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Centang jika module ini harus muncul di navigasi
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang module ini"
                rows={3}
                className="w-full"
                {...register("description")}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-2">
                <input
                  id="is_active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  {...register("is_active")}
                />
                <Label htmlFor="is_active" className="cursor-pointer">
                  Module Aktif
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Nonaktifkan jika module sudah tidak digunakan
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isUpdating}>
            {isUpdating ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
