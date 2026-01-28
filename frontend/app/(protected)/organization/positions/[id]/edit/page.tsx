"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  useGetPositionByIdQuery,
  useUpdatePositionMutation,
  useGetDepartmentsQuery,
  useGetSchoolsQuery,
} from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { PermissionRouteGuard } from "@/components/rbac";

const positionSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" })
    .optional(),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" })
    .optional(),
  department_id: z.string().optional().or(z.literal("")).nullable(),
  school_id: z.string().optional().or(z.literal("")).nullable(),
  hierarchy_level: z.number()
    .min(1, { message: "Level hierarki minimal 1" })
    .max(10, { message: "Level hierarki maksimal 10" })
    .optional(),
  max_holders: z.number()
    .min(1, { message: "Maksimal pemegang minimal 1" })
    .optional(),
  is_unique: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

type PositionFormData = z.infer<typeof positionSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

function EditPositionForm({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: position, isLoading: isLoadingData, error } = useGetPositionByIdQuery(id);
  const [updatePosition, { isLoading: isUpdating }] = useUpdatePositionMutation();

  // Fetch departments for dropdown (include all, not just active, for edit page)
  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsQuery({
    page_size: 100,
  });

  // Fetch schools for dropdown (include all, not just active, for edit page)
  const { data: schoolsData, isLoading: isLoadingSchools } = useGetSchoolsQuery({
    page_size: 100,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    mode: "onBlur",
  });

  const watchDepartmentId = watch("department_id");
  const watchSchoolId = watch("school_id");

  useEffect(() => {
    if (position) {
      reset({
        code: position.code,
        name: position.name,
        department_id: position.department_id || "",
        school_id: position.school_id || "",
        hierarchy_level: position.hierarchy_level,
        max_holders: position.max_holders || 1,
        is_unique: position.is_unique || false,
        is_active: position.is_active,
      });
    }
  }, [position, reset]);

  const onSubmit = async (data: PositionFormData) => {
    try {
      // Build update payload
      const cleanedData: {
        code?: string;
        name?: string;
        hierarchy_level?: number;
        max_holders?: number;
        is_unique?: boolean;
        is_active?: boolean;
        department_id?: string | null;
        school_id?: string | null;
      } = {};

      if (data.code !== undefined && data.code !== "") cleanedData.code = data.code;
      if (data.name !== undefined && data.name !== "") cleanedData.name = data.name;
      if (data.hierarchy_level !== undefined) cleanedData.hierarchy_level = data.hierarchy_level;
      if (data.max_holders !== undefined) cleanedData.max_holders = data.max_holders;
      if (data.is_unique !== undefined) cleanedData.is_unique = data.is_unique;
      if (data.is_active !== undefined) cleanedData.is_active = data.is_active;

      // Handle department_id - send empty string to clear (backend converts to null)
      if (data.department_id === "" || data.department_id === "none") {
        cleanedData.department_id = "";
      } else if (data.department_id) {
        cleanedData.department_id = data.department_id;
      }

      // Handle school_id - send empty string to clear (backend converts to null)
      if (data.school_id === "" || data.school_id === "none") {
        cleanedData.school_id = "";
      } else if (data.school_id) {
        cleanedData.school_id = data.school_id;
      }

      await updatePosition({ id, data: cleanedData }).unwrap();
      toast.success("Data posisi berhasil diperbarui");
      router.push(`/organisasi/posisi/${id}`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memperbarui data posisi");
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !position) {
    return <Alert variant="error">Gagal memuat data posisi</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Posisi</h1>
        <p className="text-muted-foreground">
          {position.name} - Kode: {position.code}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Posisi */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Posisi</CardTitle>
            <CardDescription>Data identitas posisi</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Posisi</Label>
              <Input
                id="code"
                placeholder="Kode unik posisi"
                {...register("code", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }
                })}
              />
              <p className="text-sm text-muted-foreground">
                Kode posisi sebaiknya tidak diubah
              </p>
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Posisi</Label>
              <Input
                id="name"
                placeholder="Nama lengkap posisi"
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
                {...register("hierarchy_level", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Level 1 = tertinggi (direktur), Level 10 = terendah (staff)
              </p>
              {errors.hierarchy_level && (
                <p className="text-sm text-destructive">{errors.hierarchy_level.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_holders">Maksimal Pemegang</Label>
              <Input
                id="max_holders"
                type="number"
                min={1}
                placeholder="Jumlah maksimal"
                {...register("max_holders", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_id">Departemen</Label>
              <Select
                key={`dept-${watchDepartmentId || "none"}`}
                value={watchDepartmentId || "none"}
                onValueChange={(value) => {
                  // Guard: Only accept valid values ("none" or UUID)
                  // Radix Select sometimes fires onValueChange with empty string during controlled updates
                  if (!value || (value !== "none" && value.length !== 36)) {
                    return;
                  }
                  setValue("department_id", value === "none" ? "" : value);
                  trigger("department_id");
                }}
                disabled={isLoadingDepartments}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingDepartments ? "Memuat..." : "Pilih departemen"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak terkait departemen</SelectItem>
                  {departmentsData?.data?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah</Label>
              <Select
                key={`school-${watchSchoolId || "none"}`}
                value={watchSchoolId || "none"}
                onValueChange={(value) => {
                  // Guard: Only accept valid values ("none" or UUID)
                  // Radix Select sometimes fires onValueChange with empty string during controlled updates
                  if (!value || (value !== "none" && value.length !== 36)) {
                    return;
                  }
                  setValue("school_id", value === "none" ? "" : value);
                  trigger("school_id");
                }}
                disabled={isLoadingSchools}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingSchools ? "Memuat..." : "Pilih sekolah"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak terkait sekolah</SelectItem>
                  {schoolsData?.data?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="is_unique"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register("is_unique")}
                  />
                  <Label htmlFor="is_unique" className="cursor-pointer">
                    Posisi Unik
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    {...register("is_active")}
                  />
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Posisi Aktif
                  </Label>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Posisi unik hanya boleh dipegang oleh satu orang. Nonaktifkan jika posisi sudah tidak digunakan.
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

export default function EditPositionPage({ params }: PageProps) {
  return (
    <PermissionRouteGuard resource="positions" action="UPDATE">
      <EditPositionForm params={params} />
    </PermissionRouteGuard>
  );
}
