"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateModuleMutation,
  useGetModulesQuery,
} from "@/lib/store/services/modulesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const moduleSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" }),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
  category: z.enum(["SERVICE", "PERFORMANCE", "QUALITY", "FEEDBACK", "TRAINING", "SYSTEM"], {
    required_error: "Kategori harus dipilih",
  }),
  icon: z.string().optional().or(z.literal("")),
  path: z.string().optional().or(z.literal("")),
  parent_id: z.string().optional().or(z.literal("")),
  sort_order: z.number().int().min(0).optional(),
  is_visible: z.boolean().optional(),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

export default function CreateModulePage() {
  const router = useRouter();
  const [createModule, { isLoading }] = useCreateModuleMutation();

  // Fetch root modules for parent dropdown
  const { data: modulesData, isLoading: isLoadingModules } = useGetModulesQuery({
    page_size: 100,
    is_active: true,
    parent_id: "null", // Only root modules
  });

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      icon: "",
      path: "",
      parent_id: "",
      sort_order: 0,
      is_visible: true,
      description: "",
    },
  });

  const watchCategory = watch("category");
  const watchIsVisible = watch("is_visible");

  const onSubmit = async (data: ModuleFormData) => {
    try {
      // Build payload
      const payload: any = {
        code: data.code,
        name: data.name,
        category: data.category,
      };

      if (data.icon && data.icon !== "") payload.icon = data.icon;
      if (data.path && data.path !== "") payload.path = data.path;
      if (data.parent_id && data.parent_id !== "") payload.parent_id = data.parent_id;
      if (data.sort_order !== undefined) payload.sort_order = data.sort_order;
      if (data.is_visible !== undefined) payload.is_visible = data.is_visible;
      if (data.description && data.description !== "") payload.description = data.description;

      await createModule(payload).unwrap();
      toast.success("Module berhasil ditambahkan");
      router.push("/access/modules");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal menambahkan module");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Module</h1>
        <p className="text-muted-foreground">Tambahkan module baru ke sistem YPK Gloria</p>
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
                onValueChange={(value) => {
                  setValue("parent_id", value === "none" ? "" : value);
                  trigger("parent_id");
                }}
                disabled={isLoadingModules}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingModules ? "Memuat..." : "Pilih parent (opsional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa parent (Root Module)</SelectItem>
                  {modulesData?.data?.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name} ({module.code})
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
                  defaultChecked
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
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Menyimpan...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
