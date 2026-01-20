"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Key, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import {
  useGetPermissionByIdQuery,
  useUpdatePermissionMutation,
} from "@/lib/store/services/permissionsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const permissionSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(100, { message: "Kode maksimal 100 karakter" })
    .optional(),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" })
    .optional(),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  resource: z.string()
    .min(2, { message: "Resource minimal 2 karakter" })
    .max(100, { message: "Resource maksimal 100 karakter" })
    .optional(),
  action: z.string()
    .min(2, { message: "Action minimal 2 karakter" })
    .max(50, { message: "Action maksimal 50 karakter" })
    .optional(),
  scope: z.string()
    .max(50, "Scope maksimal 50 karakter")
    .optional()
    .or(z.literal("")),
  category: z.string()
    .max(50, "Category maksimal 50 karakter")
    .optional()
    .or(z.literal("")),
  group_name: z.string()
    .max(100, "Group name maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  group_icon: z.string()
    .max(50, "Group icon maksimal 50 karakter")
    .optional()
    .or(z.literal("")),
  group_sort_order: z.number()
    .int()
    .min(0)
    .max(9999)
    .optional()
    .or(z.literal(undefined as unknown as number)),
  is_active: z.boolean().optional(),
});

type PermissionFormData = z.infer<typeof permissionSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditPermissionPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: permission, isLoading: isLoadingData, error } = useGetPermissionByIdQuery(id);
  const [updatePermission, { isLoading: isUpdating }] = useUpdatePermissionMutation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<PermissionFormData>({
    resolver: zodResolver(permissionSchema),
    mode: "onBlur",
  });

  const watchAction = watch("action");
  const isSystemPermission = permission?.is_system_permission || false;

  useEffect(() => {
    if (permission) {
      reset({
        code: permission.code,
        name: permission.name,
        description: permission.description || "",
        resource: permission.resource,
        action: permission.action,
        scope: permission.scope || "",
        category: permission.category || "",
        group_name: permission.group_name || "",
        group_icon: permission.group_icon || "",
        group_sort_order: permission.group_sort_order,
        is_active: permission.is_active,
      });
    }
  }, [permission, reset]);

  const onSubmit = async (data: PermissionFormData) => {
    try {
      // Build update payload
      const cleanedData: {
        code?: string;
        name?: string;
        description?: string | null;
        resource?: string;
        action?: string;
        scope?: string | null;
        category?: string | null;
        group_name?: string | null;
        group_icon?: string | null;
        group_sort_order?: number | null;
        is_active?: boolean;
      } = {};

      if (data.code !== undefined && data.code !== "") cleanedData.code = data.code;
      if (data.name !== undefined && data.name !== "") cleanedData.name = data.name;
      if (data.resource !== undefined && data.resource !== "") cleanedData.resource = data.resource;
      if (data.action !== undefined && data.action !== "") cleanedData.action = data.action;
      if (data.is_active !== undefined) cleanedData.is_active = data.is_active;

      // Handle optional fields - convert empty string to null
      if (data.description === "") {
        cleanedData.description = null;
      } else if (data.description) {
        cleanedData.description = data.description;
      }

      if (data.scope === "") {
        cleanedData.scope = null;
      } else if (data.scope) {
        cleanedData.scope = data.scope;
      }

      if (data.category === "") {
        cleanedData.category = null;
      } else if (data.category) {
        cleanedData.category = data.category;
      }

      if (data.group_name === "") {
        cleanedData.group_name = null;
      } else if (data.group_name) {
        cleanedData.group_name = data.group_name;
      }

      if (data.group_icon === "") {
        cleanedData.group_icon = null;
      } else if (data.group_icon) {
        cleanedData.group_icon = data.group_icon;
      }

      if (data.group_sort_order === undefined) {
        cleanedData.group_sort_order = null;
      } else {
        cleanedData.group_sort_order = data.group_sort_order;
      }

      await updatePermission({ id, data: cleanedData }).unwrap();
      toast.success("Data permission berhasil diperbarui");
      router.push(`/akses/permissions/${id}`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memperbarui data permission");
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    );
  }

  if (error || !permission) {
    return (
      <Alert variant="error">
        Gagal memuat data permission: {error ? "Error fetching data" : "Permission not found"}
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Permission</h1>
        <p className="text-muted-foreground">Perbarui data permission: {permission.code}</p>
      </div>

      {/* System Permission Warning */}
      {isSystemPermission && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <strong>System Permission</strong>
            <p className="text-sm">Permission ini adalah system permission. Beberapa field tidak dapat diubah untuk menjaga integritas sistem.</p>
          </div>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Informasi Dasar
            </CardTitle>
            <CardDescription>Data identitas permission</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">
                Kode Permission {!isSystemPermission && <span className="text-destructive">*</span>}
              </Label>
              <Input
                id="code"
                placeholder="USERS_READ"
                className={`w-full ${errors.code ? "border-destructive" : ""}`}
                {...register("code")}
                disabled={isSystemPermission}
                readOnly={isSystemPermission}
              />
              {isSystemPermission && (
                <p className="text-sm text-muted-foreground">
                  Kode system permission tidak dapat diubah
                </p>
              )}
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Permission <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Read Users"
                className={`w-full ${errors.name ? "border-destructive" : ""}`}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang permission ini"
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

        {/* Permission Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detail Permission</CardTitle>
            <CardDescription>Resource, action, dan scope permission</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="resource">
                Resource <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resource"
                placeholder="users"
                className={`w-full ${errors.resource ? "border-destructive" : ""}`}
                {...register("resource")}
                disabled={isSystemPermission}
              />
              {isSystemPermission && (
                <p className="text-sm text-muted-foreground">
                  Resource system permission tidak dapat diubah
                </p>
              )}
              {errors.resource && (
                <p className="text-sm text-destructive">{errors.resource.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">
                Action <span className="text-destructive">*</span>
              </Label>
              <Select
                value={watchAction || permission?.action || ""}
                onValueChange={(value) => {
                  setValue("action", value);
                  trigger("action");
                }}
                disabled={isSystemPermission}
              >
                <SelectTrigger className={`w-full ${errors.action ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Pilih action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="list">List</SelectItem>
                  <SelectItem value="manage">Manage (Full Access)</SelectItem>
                </SelectContent>
              </Select>
              {isSystemPermission && (
                <p className="text-sm text-muted-foreground">
                  Action system permission tidak dapat diubah
                </p>
              )}
              {errors.action && (
                <p className="text-sm text-destructive">{errors.action.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope (Opsional)</Label>
              <Select
                value={watch("scope") || permission?.scope || "none"}
                onValueChange={(value) => {
                  setValue("scope", value === "none" ? "" : value);
                  trigger("scope");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih scope (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada scope</SelectItem>
                  <SelectItem value="own">Own (Data sendiri)</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="global">Global (Semua data)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (Opsional)</Label>
              <Input
                id="category"
                placeholder="user-management"
                className="w-full"
                {...register("category")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="is_active">Status</Label>
              <Select
                value={
                  watch("is_active") !== undefined
                    ? (watch("is_active") ? "active" : "inactive")
                    : (permission?.is_active ? "active" : "inactive")
                }
                onValueChange={(value) => {
                  setValue("is_active", value === "active");
                  trigger("is_active");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Non-Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grouping Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Grouping</CardTitle>
            <CardDescription>Untuk tampilan UI dan navigasi</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="group_name">Group Name (Opsional)</Label>
              <Input
                id="group_name"
                placeholder="User Management"
                className="w-full"
                {...register("group_name")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_icon">Group Icon (Opsional)</Label>
              <Input
                id="group_icon"
                placeholder="Users"
                className="w-full"
                {...register("group_icon")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_sort_order">Group Sort Order (Opsional)</Label>
              <Input
                id="group_sort_order"
                type="number"
                min="0"
                max="9999"
                placeholder="0"
                className="w-full"
                {...register("group_sort_order", {
                  setValueAs: v => v === "" ? undefined : parseInt(v, 10)
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isUpdating || isSystemPermission}>
            {isUpdating ? (
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
