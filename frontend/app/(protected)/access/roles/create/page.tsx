"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { useCreateRoleMutation } from "@/lib/store/services/rolesApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { PermissionRouteGuard } from "@/components/rbac";

const roleSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" })
    .regex(/^[A-Z0-9_]+$/, { message: "Kode hanya boleh huruf besar, angka, dan underscore" }),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
  hierarchy_level: z.number()
    .min(1, { message: "Level hierarki minimal 1" })
    .max(10, { message: "Level hierarki maksimal 10" }),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

type RoleFormData = z.infer<typeof roleSchema>;

function CreateRoleForm() {
  const router = useRouter();
  const [createRole, { isLoading }] = useCreateRoleMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      description: "",
    },
  });

  const onSubmit = async (data: RoleFormData) => {
    try {
      // Remove empty strings and convert to null
      const cleanedData: {
        code: string;
        name: string;
        hierarchy_level: number;
        description?: string;
      } = {
        code: data.code,
        name: data.name,
        hierarchy_level: data.hierarchy_level,
      };

      if (data.description && data.description !== "") {
        cleanedData.description = data.description;
      }

      await createRole(cleanedData).unwrap();
      toast.success("Role berhasil ditambahkan");
      router.push("/access/roles");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal menambahkan role");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Role</h1>
        <p className="text-muted-foreground">Tambahkan role baru ke sistem YPK Gloria</p>
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
                Kode Role <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="ADMIN, USER, MANAGER"
                className={errors.code ? "border-destructive" : ""}
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
              <Label htmlFor="name">
                Nama Role <span className="text-destructive">*</span>
              </Label>
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
              <Label htmlFor="hierarchy_level">
                Level Hierarki <span className="text-destructive">*</span>
              </Label>
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

export default function CreateRolePage() {
  return (
    <PermissionRouteGuard resource="roles" action="CREATE">
      <CreateRoleForm />
    </PermissionRouteGuard>
  );
}
