"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateDepartmentMutation,
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
import { cn } from "@/lib/utils";

const departmentSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" }),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
  school_id: z.string().optional().or(z.literal("")),
  parent_id: z.string().optional().or(z.literal("")),
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter")
    .optional()
    .or(z.literal("")),
});

type DepartmentFormData = z.infer<typeof departmentSchema>;

export default function CreateDepartmentPage() {
  const router = useRouter();
  const [createDepartment, { isLoading }] = useCreateDepartmentMutation();
  const [codeOpen, setCodeOpen] = useState(false);

  // Fetch available department codes from data_karyawan
  const { data: codesData, isLoading: isLoadingCodes } = useGetAvailableDepartmentCodesQuery();

  // Fetch schools for dropdown
  const { data: schoolsData, isLoading: isLoadingSchools } = useGetSchoolsQuery({
    page_size: 100,
    is_active: true
  });

  // Fetch departments for parent dropdown (only root departments)
  const { data: departmentsData, isLoading: isLoadingDepartments } = useGetDepartmentsQuery({
    page_size: 100,
    is_active: true
  });

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      school_id: "",
      parent_id: "",
      description: "",
    },
  });

  const watchSchoolId = watch("school_id");
  const watchCode = watch("code");

  const onSubmit = async (data: DepartmentFormData) => {
    try {
      // Remove empty strings and convert to null
      const cleanedData: {
        code: string;
        name: string;
        school_id?: string;
        parent_id?: string;
        description?: string;
      } = {
        code: data.code,
        name: data.name,
      };

      if (data.school_id && data.school_id !== "") {
        cleanedData.school_id = data.school_id;
      }
      if (data.parent_id && data.parent_id !== "") {
        cleanedData.parent_id = data.parent_id;
      }
      if (data.description && data.description !== "") {
        cleanedData.description = data.description;
      }

      await createDepartment(cleanedData).unwrap();
      toast.success("Departemen berhasil ditambahkan");
      router.push("/organization/departments");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal menambahkan departemen");
    }
  };

  // Filter parent departments based on selected school
  const filteredParentDepartments = departmentsData?.data?.filter(dept => {
    // If no school selected, show all root departments
    if (!watchSchoolId) return !dept.parent_id;
    // If school selected, show departments from same school or general departments
    return (!dept.parent_id) && (!dept.school_id || dept.school_id === watchSchoolId);
  });

  // Combine YAYASAN with codes from API
  const allCodes = ["YAYASAN", ...(codesData?.codes || [])];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Departemen</h1>
        <p className="text-muted-foreground">Tambahkan departemen baru ke sistem YPK Gloria</p>
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
              <Label htmlFor="code">
                Kode Departemen <span className="text-destructive">*</span>
              </Label>
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
              <Label htmlFor="name">
                Nama Departemen <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Nama lengkap departemen"
                className={errors.name ? "border-destructive" : ""}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah (Opsional)</Label>
              <Select
                onValueChange={(value) => {
                  setValue("school_id", value === "none" ? "" : value);
                  trigger("school_id");
                  // Reset parent when school changes
                  setValue("parent_id", "");
                }}
                disabled={isLoadingSchools}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingSchools ? "Memuat..." : "Pilih sekolah (opsional)"} />
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
              <Label htmlFor="parent_id">Parent Departemen (Opsional)</Label>
              <Select
                onValueChange={(value) => {
                  setValue("parent_id", value === "none" ? "" : value);
                  trigger("parent_id");
                }}
                disabled={isLoadingDepartments}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingDepartments ? "Memuat..." : "Pilih parent (opsional)"} />
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
