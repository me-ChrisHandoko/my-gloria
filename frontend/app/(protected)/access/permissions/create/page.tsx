"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Key } from "lucide-react";
import { toast } from "sonner";

import {
  useCreatePermissionMutation,
  useGetPermissionScopesQuery,
  useGetPermissionActionsQuery,
} from "@/lib/store/services/permissionsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const permissionSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(100, { message: "Kode maksimal 100 karakter" })
    .regex(/^[A-Z0-9_:]+$/, { message: "Kode harus uppercase dengan underscore atau colon" }),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  resource: z.string()
    .min(2, { message: "Resource minimal 2 karakter" })
    .max(100, { message: "Resource maksimal 100 karakter" }),
  action: z.string()
    .min(2, { message: "Action minimal 2 karakter" })
    .max(50, { message: "Action maksimal 50 karakter" }),
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
});

type PermissionFormData = z.infer<typeof permissionSchema>;

export default function CreatePermissionPage() {
  const router = useRouter();
  const [createPermission, { isLoading }] = useCreatePermissionMutation();
  const { data: scopes, isLoading: scopesLoading } = useGetPermissionScopesQuery();
  const { data: actions, isLoading: actionsLoading } = useGetPermissionActionsQuery();

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PermissionFormData>({
    resolver: zodResolver(permissionSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      description: "",
      resource: "",
      action: "",
      scope: "",
      category: "",
      group_name: "",
      group_icon: "",
      group_sort_order: undefined,
    },
  });

  const onSubmit = async (data: PermissionFormData) => {
    try {
      // Build payload - remove empty strings and convert to null
      const payload: {
        code: string;
        name: string;
        resource: string;
        action: string;
        description?: string;
        scope?: string;
        category?: string;
        group_name?: string;
        group_icon?: string;
        group_sort_order?: number;
      } = {
        code: data.code, // Already uppercase from onChange handler
        name: data.name,
        resource: data.resource,
        action: data.action,
      };

      if (data.description && data.description !== "") {
        payload.description = data.description;
      }
      if (data.scope && data.scope !== "") {
        payload.scope = data.scope;
      }
      if (data.category && data.category !== "") {
        payload.category = data.category;
      }
      if (data.group_name && data.group_name !== "") {
        payload.group_name = data.group_name;
      }
      if (data.group_icon && data.group_icon !== "") {
        payload.group_icon = data.group_icon;
      }
      if (data.group_sort_order !== undefined) {
        payload.group_sort_order = data.group_sort_order;
      }

      await createPermission(payload).unwrap();
      toast.success("Permission berhasil ditambahkan");
      router.push("/access/permissions");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal menambahkan permission");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Permission</h1>
        <p className="text-muted-foreground">Tambahkan permission baru ke sistem YPK Gloria</p>
      </div>

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
                Kode Permission <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="USER_READ"
                className={`w-full ${errors.code ? "border-destructive" : ""}`}
                {...register("code")}
                onChange={(e) => {
                  const value = e.target.value.toUpperCase();
                  setValue("code", value);
                  trigger("code");
                }}
              />
              <p className="text-sm text-muted-foreground">
                Format: UPPERCASE dengan underscore (RESOURCE_ACTION)
              </p>
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
                placeholder="Read User"
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
                placeholder="user"
                className={`w-full ${errors.resource ? "border-destructive" : ""}`}
                {...register("resource")}
              />
              <p className="text-sm text-muted-foreground">
                Resource yang diatur (contoh: user, roles, departments)
              </p>
              {errors.resource && (
                <p className="text-sm text-destructive">{errors.resource.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">
                Action <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("action", value);
                  trigger("action");
                }}
                disabled={actionsLoading}
              >
                <SelectTrigger className={`w-full ${errors.action ? "border-destructive" : ""}`}>
                  <SelectValue placeholder={actionsLoading ? "Loading..." : "Pilih action"} />
                </SelectTrigger>
                <SelectContent>
                  {actions?.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.action && (
                <p className="text-sm text-destructive">{errors.action.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="scope">Scope (Opsional)</Label>
              <Select
                onValueChange={(value) => {
                  setValue("scope", value === "none" ? "" : value);
                  trigger("scope");
                }}
                disabled={scopesLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={scopesLoading ? "Loading..." : "Pilih scope (opsional)"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada scope</SelectItem>
                  {scopes?.map((scope) => (
                    <SelectItem key={scope.value} value={scope.value}>
                      {scope.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Batasan akses data yang bisa diakses
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category (Opsional)</Label>
              <Input
                id="category"
                placeholder="user-management"
                className="w-full"
                {...register("category")}
              />
              <p className="text-sm text-muted-foreground">
                Kategori untuk pengelompokan permission
              </p>
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
              <p className="text-sm text-muted-foreground">
                Nama grup untuk mengelompokkan permission di UI
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="group_icon">Group Icon (Opsional)</Label>
              <Input
                id="group_icon"
                placeholder="Users"
                className="w-full"
                {...register("group_icon")}
              />
              <p className="text-sm text-muted-foreground">
                Nama icon Lucide React (contoh: Users, Settings, Shield)
              </p>
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
              <p className="text-sm text-muted-foreground">
                Urutan tampilan grup (0-9999, default: 999)
              </p>
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
