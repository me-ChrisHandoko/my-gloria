"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

import { useCreateKaryawanMutation } from "@/lib/store/services/employeesApi";
import type { CreateKaryawanRequest } from "@/lib/types/employees";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const karyawanSchema = z.object({
  nip: z.string().min(1, "NIP wajib diisi").max(15, "NIP maksimal 15 karakter"),
  nama: z.string().optional(),
  jenis_kelamin: z.string().optional(),
  tgl_mulai_bekerja: z.string().optional(),
  tgl_tetap: z.string().optional(),
  status: z.string().optional(),
  waktu_kerja_kependidikan: z.string().optional(),
  bagian_kerja: z.string().optional(),
  lokasi: z.string().optional(),
  bidang_kerja: z.string().optional(),
  jenis_karyawan: z.string().optional(),
  status_aktif: z.string().optional(),
  no_ponsel: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  birthdate: z.string().optional(),
  rfid: z.string().optional(),
});

type KaryawanFormData = z.infer<typeof karyawanSchema>;

export default function CreateKaryawanPage() {
  const router = useRouter();
  const [createKaryawan, { isLoading }] = useCreateKaryawanMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<KaryawanFormData>({
    resolver: zodResolver(karyawanSchema),
  });

  const onSubmit = async (data: KaryawanFormData) => {
    try {
      // Remove empty strings
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== "")
      ) as unknown as CreateKaryawanRequest;

      await createKaryawan(cleanedData).unwrap();
      toast.success("Karyawan berhasil ditambahkan");
      router.push("/employees");
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal menambahkan karyawan");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tambah Karyawan</h1>
          <p className="text-muted-foreground">Tambahkan karyawan baru ke sistem</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>Data identitas karyawan</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nip">
                NIP <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nip"
                placeholder="Nomor Induk Pegawai"
                {...register("nip")}
              />
              {errors.nip && (
                <p className="text-sm text-destructive">{errors.nip.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input
                id="nama"
                placeholder="Nama lengkap karyawan"
                {...register("nama")}
              />
              {errors.nama && (
                <p className="text-sm text-destructive">{errors.nama.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
              <Input
                id="jenis_kelamin"
                placeholder="L/P"
                {...register("jenis_kelamin")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthdate">Tanggal Lahir</Label>
              <Input
                id="birthdate"
                type="date"
                {...register("birthdate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="no_ponsel">No. Ponsel</Label>
              <Input
                id="no_ponsel"
                placeholder="08xxxxxxxxxx"
                {...register("no_ponsel")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lokasi">Lokasi</Label>
              <Input
                id="lokasi"
                placeholder="Lokasi kerja"
                {...register("lokasi")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfid">RFID</Label>
              <Input
                id="rfid"
                placeholder="Kode RFID"
                {...register("rfid")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Informasi Kepegawaian */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Kepegawaian</CardTitle>
            <CardDescription>Data pekerjaan dan status kepegawaian</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="bagian_kerja">Bagian Kerja</Label>
              <Input
                id="bagian_kerja"
                placeholder="Bagian/Departemen"
                {...register("bagian_kerja")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bidang_kerja">Bidang Kerja</Label>
              <Input
                id="bidang_kerja"
                placeholder="Bidang pekerjaan"
                {...register("bidang_kerja")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jenis_karyawan">Jenis Karyawan</Label>
              <Input
                id="jenis_karyawan"
                placeholder="Tetap/Kontrak/Honorer"
                {...register("jenis_karyawan")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status Kepegawaian</Label>
              <Input
                id="status"
                placeholder="Status"
                {...register("status")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_aktif">Status Aktif</Label>
              <Input
                id="status_aktif"
                placeholder="AKTIF/NONAKTIF"
                {...register("status_aktif")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waktu_kerja_kependidikan">Waktu Kerja Kependidikan</Label>
              <Input
                id="waktu_kerja_kependidikan"
                placeholder="Waktu kerja"
                {...register("waktu_kerja_kependidikan")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tgl_mulai_bekerja">Tanggal Mulai Bekerja</Label>
              <Input
                id="tgl_mulai_bekerja"
                type="date"
                {...register("tgl_mulai_bekerja")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tgl_tetap">Tanggal Tetap</Label>
              <Input
                id="tgl_tetap"
                type="date"
                {...register("tgl_tetap")}
              />
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
