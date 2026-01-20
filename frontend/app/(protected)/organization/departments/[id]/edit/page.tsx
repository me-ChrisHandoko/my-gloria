"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import {
  useGetDepartmentByIdQuery,
  useUpdateDepartmentMutation,
  useGetSchoolsQuery,
  useGetDepartmentsQuery,
  useGetAvailableDepartmentCodesQuery,
} from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const departmentSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" })
    .optional(),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" })
    .optional(),
  school_id: z.string().optional().or(z.literal("")).nullable(),
  parent_id: z.string().optional().or(z.literal("")).nullable(),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditDepartmentPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [codeOpen, setCodeOpen] = useState(false);

  const { data: department, isLoading: isLoadingData, error } = useGetDepartmentByIdQuery(id);
  const [updateDepartment, { isLoading: isUpdating }] = useUpdateDepartmentMutation();

  // Fetch available department codes from data_karyawan
  const { data: codesData, isLoading: isLoadingCodes } = useGetAvailableDepartmentCodesQuery();

  // Fetch schools for dropdown
  const { data: schoolsData, isLoading: isLoadingSchools } = useGetSchoolsQuery({
    page_size: 100,
    is_active: true
  });

  // Fetch departments for parent dropdown
  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsQuery({
    page_size: 100,
    is_active: true
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    mode: "onBlur",
  });

  const watchSchoolId = watch("school_id");
  const watchParentId = watch("parent_id");
  const watchCode = watch("code");

  useEffect(() => {
    if (department) {
      reset({
        code: department.code,
        name: department.name,
        school_id: department.school_id || "",
        parent_id: department.parent_id || "",
        description: department.description || "",
        is_active: department.is_active,
      });
    }
  }, [department, reset]);

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // Build update payload
      const cleanedData: {
        code?: string;
        name?: string;
        description?: string | null;
        is_active?: boolean;
        school_id?: string | null;
        parent_id?: string | null;
      } = {};

      if (data.code !== undefined && data.code !== "") cleanedData.code = data.code;
      if (data.name !== undefined && data.name !== "") cleanedData.name = data.name;
      if (data.description !== undefined) cleanedData.description = data.description || null;
      if (data.is_active !== undefined) cleanedData.is_active = data.is_active;

      // Handle school_id - send empty string to clear (backend converts to null)
      if (data.school_id === "" || data.school_id === "none") {
        cleanedData.school_id = "";
      } else if (data.school_id) {
        cleanedData.school_id = data.school_id;
      }

      // Handle parent_id - send empty string to clear (backend converts to null)
      const originalParentId = department?.parent_id || "";
      if (data.parent_id === "" || data.parent_id === "none") {
        cleanedData.parent_id = "";
      } else if (data.parent_id) {
        cleanedData.parent_id = data.parent_id;
      } else if (originalParentId) {
        // If parent_id is undefined/null but original had a value, clear it
        cleanedData.parent_id = "";
      }

      await updateDepartment({ id, data: cleanedData }).unwrap();
      toast.success("Data departemen berhasil diperbarui");
      router.push(`/organisasi/departemen/${id}`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memperbarui data departemen");
    }
  };

  // Filter parent departments - exclude current department and its children
  // Always include current parent to ensure it's visible in dropdown
  const filteredParentDepartments = departmentsData?.data?.filter(dept => {
    // Exclude current department (can't be its own parent)
    if (dept.id === id) return false;
    // Always include current parent so it shows in dropdown
    if (department?.parent_id && dept.id === department.parent_id) return true;
    // Show root departments (departments without parent)
    if (!dept.parent_id) return true;
    // If school selected, show departments from same school
    if (watchSchoolId && dept.school_id === watchSchoolId) return true;
    return false;
  });

  // Combine YAYASAN with codes from API
  const allCodes = ["YAYASAN", ...(codesData?.codes || [])];

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !department) {
    return <Alert variant="error">Gagal memuat data departemen</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Departemen</h1>
        <p className="text-muted-foreground">
          {department.name} - Kode: {department.code}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Departemen */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Departemen</CardTitle>
            <CardDescription>Data identitas departemen</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Departemen</Label>
              <Popover open={codeOpen} onOpenChange={setCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={codeOpen}
                    className={cn(
                      "w-full justify-between",
                      errors.code ? "border-destructive" : "",
                      !watchCode && "text-muted-foreground"
                    )}
                    disabled={isLoadingCodes}
                  >
                    {isLoadingCodes
                      ? "Memuat..."
                      : watchCode
                        ? watchCode
                        : "Pilih kode departemen..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari kode departemen..." />
                    <CommandList>
                      <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                      <CommandGroup>
                        {allCodes.map((code) => (
                          <CommandItem
                            key={code}
                            value={code}
                            onSelect={(currentValue) => {
                              setValue("code", currentValue);
                              trigger("code");
                              setCodeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                watchCode === code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {code}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-sm text-muted-foreground">
                Pilih dari bidang kerja yang tersedia di data karyawan
              </p>
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Departemen</Label>
              <Input
                id="name"
                placeholder="Nama lengkap departemen"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah</Label>
              <Select
                key={`school-${watchSchoolId || "none"}`}
                onValueChange={(value) => {
                  // Guard: Only accept valid values ("none" or UUID)
                  if (!value || (value !== "none" && value.length !== 36)) {
                    return;
                  }
                  const newValue = value === "none" ? "" : value;
                  setValue("school_id", newValue);
                  trigger("school_id");
                }}
                value={watchSchoolId || "none"}
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
                Kosongkan jika departemen tidak terkait dengan sekolah tertentu
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_id">Parent Departemen</Label>
              <Select
                key={`parent-${watchParentId || "none"}`}
                onValueChange={(value) => {
                  // Guard: Only accept valid values ("none" or UUID)
                  // Radix Select sometimes fires onValueChange with empty string during controlled updates
                  if (!value || (value !== "none" && value.length !== 36)) {
                    return;
                  }
                  const newValue = value === "none" ? "" : value;
                  setValue("parent_id", newValue);
                  trigger("parent_id");
                }}
                value={watchParentId || "none"}
                disabled={isLoadingDepartments}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingDepartments ? "Memuat..." : "Pilih parent"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa parent (Root)</SelectItem>
                  {filteredParentDepartments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Kosongkan jika departemen ini adalah departemen utama (root)
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat tentang departemen ini"
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
                  Departemen Aktif
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Nonaktifkan jika departemen sudah tidak beroperasi
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
