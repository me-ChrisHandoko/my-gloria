"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

import {
  useGetKaryawanByNipQuery,
  useUpdateKaryawanMutation,
} from "@/lib/store/services/karyawanApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";

const karyawanSchema = z.object({
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

interface PageProps {
  params: Promise<{ nip: string }>;
}

export default function EditKaryawanPage({ params }: PageProps) {
  const { nip } = use(params);
  const router = useRouter();

  const { data: karyawan, isLoading: isLoadingData, error } = useGetKaryawanByNipQuery(nip);
  const [updateKaryawan, { isLoading: isUpdating }] = useUpdateKaryawanMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<KaryawanFormData>({
    resolver: zodResolver(karyawanSchema),
  });

  useEffect(() => {
    if (karyawan) {
      // Format dates for input fields
      const formData: any = { ...karyawan };

      if (karyawan.tgl_mulai_bekerja) {
        formData.tgl_mulai_bekerja = format(new Date(karyawan.tgl_mulai_bekerja), "yyyy-MM-dd");
      }
      if (karyawan.tgl_tetap) {
        formData.tgl_tetap = format(new Date(karyawan.tgl_tetap), "yyyy-MM-dd");
      }
      if (karyawan.birthdate) {
        formData.birthdate = format(new Date(karyawan.birthdate), "yyyy-MM-dd");
      }

      reset(formData);
    }
  }, [karyawan, reset]);

  const onSubmit = async (data: KaryawanFormData) => {
    try {
      // Remove empty strings and unchanged fields
      const cleanedData = Object.fromEntries(
        Object.entries(data).filter(([_, value]) => value !== "" && value !== null)
      );

      await updateKaryawan({ nip, data: cleanedData }).unwrap();
      toast.success("Data karyawan berhasil diperbarui");
      router.push(`/karyawan/${nip}`);
    } catch (error: any) {
      toast.error(error?.data?.message || "Gagal memperbarui data karyawan");
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !karyawan) {
    return <Alert variant="error">Gagal memuat data karyawan</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Karyawan</h1>
          <p className="text-muted-foreground">
            {karyawan.nama || karyawan.nip} - NIP: {karyawan.nip}
          </p>
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
              <Label>NIP</Label>
              <Input value={karyawan.nip} disabled />
              <p className="text-sm text-muted-foreground">NIP tidak dapat diubah</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input
                id="nama"
                placeholder="Nama lengkap karyawan"
                {...register("nama")}
              />
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
