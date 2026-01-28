"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  useGetRoleByIdQuery,
  useUpdateRoleMutation,
} from "@/lib/store/services/rolesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { PermissionRouteGuard } from "@/components/rbac";

const roleSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" })
    .regex(/^[A-Z0-9_]+$/, { message: "Kode hanya boleh huruf besar, angka, dan underscore" })
    .optional(),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" })
    .optional(),
  hierarchy_level: z.number()
    .min(1, { message: "Level hierarki minimal 1" })
    .max(10, { message: "Level hierarki maksimal 10" })
    .optional(),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

function EditRoleForm({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: role, isLoading: isLoadingData, error } = useGetRoleByIdQuery(id);
  const [updateRole, { isLoading: isUpdating }] = useUpdateRoleMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    if (role) {
      reset({
        code: role.code,
        name: role.name,
        hierarchy_level: role.hierarchy_level,
        description: role.description || "",
        is_active: role.is_active,
      });
    }
  }, [role, reset]);

  const onSubmit = async (data: RoleFormData) => {
    try {
      // Build update payload
      const cleanedData: {
        code?: string;
        name?: string;
        hierarchy_level?: number;
        description?: string | null;
        is_active?: boolean;
      } = {};

      if (data.code !== undefined && data.code !== "") cleanedData.code = data.code;
      if (data.name !== undefined && data.name !== "") cleanedData.name = data.name;
      if (data.hierarchy_level !== undefined) cleanedData.hierarchy_level = data.hierarchy_level;
      if (data.description !== undefined) cleanedData.description = data.description || null;
      if (data.is_active !== undefined) cleanedData.is_active = data.is_active;

      await updateRole({ id, data: cleanedData }).unwrap();
      toast.success("Role berhasil diperbarui");
      router.push(`/access/roles/${id}`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memperbarui role");
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !role) {
    return <Alert variant="error">Gagal memuat data role</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Role</h1>
        <p className="text-muted-foreground">
          {role.name} - Kode: {role.code}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Role */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Role</CardTitle>
            <CardDescription>Data identitas role dan level hierarki</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">
                Kode Role {role.is_system_role && <span className="text-muted-foreground">(Tidak dapat diubah untuk role sistem)</span>}
              </Label>
              <Input
                id="code"
                placeholder="ADMIN, USER, MANAGER"
                className={errors.code ? "border-destructive" : ""}
                disabled={role.is_system_role}
                {...register("code", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }
                })}
              />
              <p className="text-sm text-muted-foreground">
                Gunakan huruf besar, angka, dan underscore
              </p>
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Role</Label>
              <Input
                id="name"
                placeholder="Administrator, User, Manager"
                className={errors.name ? "border-destructive" : ""}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hierarchy_level">Level Hierarki</Label>
              <Input
                id="hierarchy_level"
                type="number"
                min={1}
                max={10}
                placeholder="1-10"
                className={errors.hierarchy_level ? "border-destructive" : ""}
                {...register("hierarchy_level", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Level 1 = tertinggi (Super Admin), Level 10 = terendah (User biasa)
              </p>
              {errors.hierarchy_level && (
                <p className="text-sm text-destructive">{errors.hierarchy_level.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang role ini dan tanggung jawabnya"
                rows={3}
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
                  Role Aktif
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Nonaktifkan jika role sudah tidak digunakan
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

export default function EditRolePage({ params }: PageProps) {
  return (
    <PermissionRouteGuard resource="roles" action="UPDATE">
      <EditRoleForm params={params} />
    </PermissionRouteGuard>
  );
}
