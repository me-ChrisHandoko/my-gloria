"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import {
  useGetSchoolByIdQuery,
  useUpdateSchoolMutation,
  useGetAvailableSchoolCodesQuery,
} from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { PermissionRouteGuard } from "@/components/rbac";

const schoolSchema = z.object({
  code: z.string()
    .min(2, { message: "Kode minimal 2 karakter" })
    .max(50, { message: "Kode maksimal 50 karakter" })
    .optional(),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" })
    .optional(),
  lokasi: z.string()
    .min(1, { message: "Lokasi wajib dipilih" })
    .max(100, { message: "Lokasi maksimal 100 karakter" }),
  address: z.string().optional().or(z.literal("")),
  phone: z.string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .optional()
    .or(z.literal("")),
  email: z.string()
    .email("Email tidak valid")
    .max(100, "Email maksimal 100 karakter")
    .optional()
    .or(z.literal("")),
  principal: z.string()
    .max(255, "Nama kepala sekolah maksimal 255 karakter")
    .optional()
    .or(z.literal("")),
  is_active: z.boolean().optional(),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

function EditSchoolForm({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: school, isLoading: isLoadingData, error } = useGetSchoolByIdQuery(id);
  const [updateSchool, { isLoading: isUpdating }] = useUpdateSchoolMutation();
  const { data: availableCodes, isLoading: isLoadingCodes } = useGetAvailableSchoolCodesQuery();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    mode: "onBlur",
  });

  useEffect(() => {
    if (school) {
      reset({
        code: school.code,
        name: school.name,
        lokasi: school.lokasi || "",
        address: school.address || "",
        phone: school.phone || "",
        email: school.email || "",
        principal: school.principal || "",
        is_active: school.is_active,
      });
      // Set lokasi value for Select component
      if (school.lokasi) {
        setValue("lokasi", school.lokasi);
      }
    }
  }, [school, reset, setValue]);

  const onSubmit = async (data: SchoolFormData) => {
    try {
      // Remove empty strings and unchanged fields
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== "" && value !== null)
      );

      await updateSchool({ id, data: cleanedData }).unwrap();
      toast.success("Data sekolah berhasil diperbarui");
      router.push(`/organisasi/sekolah/${id}`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal memperbarui data sekolah");
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !school) {
    return <Alert variant="error">Gagal memuat data sekolah</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Sekolah</h1>
        <p className="text-muted-foreground">
          {school.name} - Kode: {school.code}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Sekolah */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Sekolah</CardTitle>
            <CardDescription>Data identitas dan kontak sekolah</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Kode Sekolah</Label>
              <Select
                onValueChange={(value) => {
                  setValue("code", value);
                  trigger("code");
                }}
                defaultValue={school.code}
                disabled={isLoadingCodes}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingCodes ? "Memuat..." : "Pilih kode sekolah"} />
                </SelectTrigger>
                <SelectContent>
                  {availableCodes?.codes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Kode sekolah sebaiknya tidak diubah
              </p>
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama Sekolah</Label>
              <Input
                id="name"
                placeholder="Nama lengkap sekolah"
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lokasi">
                Lokasi <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("lokasi", value);
                  trigger("lokasi");
                }}
                defaultValue={school.lokasi || undefined}
              >
                <SelectTrigger className={`w-full ${errors.lokasi ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Pilih lokasi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Barat">Barat</SelectItem>
                  <SelectItem value="Timur">Timur</SelectItem>
                </SelectContent>
              </Select>
              {errors.lokasi && (
                <p className="text-sm text-destructive">{errors.lokasi.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="principal">Kepala Sekolah</Label>
              <Input
                id="principal"
                placeholder="Nama kepala sekolah"
                {...register("principal")}
              />
              {errors.principal && (
                <p className="text-sm text-destructive">{errors.principal.message}</p>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Alamat Lengkap</Label>
              <Input
                id="address"
                placeholder="Alamat lengkap sekolah"
                {...register("address")}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input
                id="phone"
                placeholder="0812xxxxxxxx"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@sekolah.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
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
                  Sekolah Aktif
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Nonaktifkan jika sekolah sudah tidak beroperasi
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

export default function EditSchoolPage({ params }: PageProps) {
  return (
    <PermissionRouteGuard resource="schools" action="UPDATE">
      <EditSchoolForm params={params} />
    </PermissionRouteGuard>
  );
}
