"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  useCreatePositionMutation,
  useGetDepartmentsQuery,
  useGetSchoolsQuery,
} from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { PermissionRouteGuard } from "@/components/rbac";

const positionSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" }),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
  department_id: z.string().optional().or(z.literal("")).nullable(),
  school_id: z.string().optional().or(z.literal("")).nullable(),
  hierarchy_level: z.number()
    .min(1, { message: "Level hierarki minimal 1" })
    .max(10, { message: "Level hierarki maksimal 10" }),
  max_holders: z.number()
    .min(1, { message: "Maksimal pemegang minimal 1" })
    .optional(),
  is_unique: z.boolean().optional(),
});

type PositionFormData = z.infer<typeof positionSchema>;

function CreatePositionForm() {
  const router = useRouter();
  const [createPosition, { isLoading }] = useCreatePositionMutation();

  // Fetch departments for dropdown
  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsQuery({
    page_size: 100,
    is_active: true
  });

  // Fetch schools for dropdown
  const { data: schoolsData, isLoading: isLoadingSchools } = useGetSchoolsQuery({
    page_size: 100,
    is_active: true
  });

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      department_id: "",
      school_id: "",
      hierarchy_level: 1,
      max_holders: 1,
      is_unique: false,
    },
  });

  const onSubmit = async (data: PositionFormData) => {
    try {
      // Build create payload
      const payload: {
        code: string;
        name: string;
        hierarchy_level: number;
        department_id?: string | null;
        school_id?: string | null;
        max_holders?: number;
        is_unique?: boolean;
      } = {
        code: data.code,
        name: data.name,
        hierarchy_level: data.hierarchy_level,
      };

      // Handle optional fields
      if (data.department_id && data.department_id !== "none") {
        payload.department_id = data.department_id;
      }
      if (data.school_id && data.school_id !== "none") {
        payload.school_id = data.school_id;
      }
      if (data.max_holders) {
        payload.max_holders = data.max_holders;
      }
      if (data.is_unique !== undefined) {
        payload.is_unique = data.is_unique;
      }

      await createPosition(payload).unwrap();
      toast.success("Posisi berhasil ditambahkan");
      router.push("/organization/positions");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal menambahkan posisi");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Posisi</h1>
        <p className="text-muted-foreground">Tambahkan posisi baru ke struktur organisasi YPK Gloria</p>
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
              <Label htmlFor="code">
                Kode Posisi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                placeholder="Kode unik posisi"
                className={errors.code ? "border-destructive" : ""}
                {...register("code", {
                  onChange: (e) => {
                    e.target.value = e.target.value.toUpperCase();
                  }
                })}
              />
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Posisi <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Nama lengkap posisi"
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
              <p className="text-sm text-muted-foreground">
                Berapa banyak orang yang bisa memegang posisi ini
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department_id">Departemen</Label>
              <Select
                onValueChange={(value) => {
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
              <p className="text-sm text-muted-foreground">
                Kosongkan jika posisi tidak terkait dengan departemen tertentu
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah</Label>
              <Select
                onValueChange={(value) => {
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
              <p className="text-sm text-muted-foreground">
                Kosongkan jika posisi tidak terkait dengan sekolah tertentu
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
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
              <p className="text-sm text-muted-foreground">
                Centang jika posisi ini hanya boleh dipegang oleh satu orang
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

export default function CreatePositionPage() {
  return (
    <PermissionRouteGuard resource="positions" action="CREATE">
      <CreatePositionForm />
    </PermissionRouteGuard>
  );
}
