"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save } from "lucide-react";
import { toast } from "sonner";

import { useCreateSchoolMutation, useGetAvailableSchoolCodesQuery } from "@/lib/store/services/organizationApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const schoolSchema = z.object({
  code: z.string()
    .min(1, { message: "Kode sekolah wajib dipilih" })
    .max(50, { message: "Kode maksimal 50 karakter" }),
  name: z.string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
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
});

type SchoolFormData = z.infer<typeof schoolSchema>;

export default function CreateSchoolPage() {
  const router = useRouter();
  const [createSchool, { isLoading }] = useCreateSchoolMutation();
  const { data: availableCodes, isLoading: isLoadingCodes } = useGetAvailableSchoolCodesQuery();

  const {
    register,
    handleSubmit,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    mode: "onBlur",
    defaultValues: {
      code: "",
      name: "",
      lokasi: "",
      address: "",
      phone: "",
      email: "",
      principal: "",
    },
  });

  const onSubmit = async (data: SchoolFormData) => {
    try {
      // Remove empty strings
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== "")
      ) as any;

      await createSchool(cleanedData).unwrap();
      toast.success("Sekolah berhasil ditambahkan");
      router.push("/organization/schools");
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal menambahkan sekolah");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Sekolah</h1>
        <p className="text-muted-foreground">Tambahkan sekolah baru ke sistem YPK Gloria</p>
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
              <Label htmlFor="code">
                Kode Sekolah <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("code", value);
                  trigger("code");
                }}
                disabled={isLoadingCodes}
              >
                <SelectTrigger className={`w-full ${errors.code ? "border-destructive" : ""}`}>
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
              {errors.code && (
                <p className="text-sm text-destructive">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">
                Nama Sekolah <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Nama lengkap sekolah"
                className={errors.name ? "border-destructive" : ""}
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
