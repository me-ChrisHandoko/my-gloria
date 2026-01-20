"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowLeft, Edit, Trash2, Mail, Phone, MapPin, Briefcase } from "lucide-react";

import { useGetKaryawanByNipQuery } from "@/lib/store/services/karyawanApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ nip: string }>;
}

export default function KaryawanDetailPage({ params }: PageProps) {
  const { nip } = use(params);
  const router = useRouter();

  const { data: karyawan, isLoading, error } = useGetKaryawanByNipQuery(nip);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !karyawan) {
    return <Alert variant="error">Gagal memuat data karyawan</Alert>;
  }

  const isAktif = karyawan.status_aktif?.toLowerCase() === "aktif";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{karyawan.nama || karyawan.nip}</h1>
            <p className="text-muted-foreground">NIP: {karyawan.nip}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/karyawan/${nip}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Hapus
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div>
        <Badge variant={isAktif ? "success" : "secondary"} className="text-sm">
          {karyawan.status_aktif || "Unknown"}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informasi Pribadi */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pribadi</CardTitle>
            <CardDescription>Data pribadi karyawan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Nama Lengkap:</span>
              </div>
              <div>{karyawan.nama || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Jenis Kelamin:</span>
              </div>
              <div>{karyawan.jenis_kelamin || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Tanggal Lahir:</span>
              </div>
              <div>
                {karyawan.birthdate
                  ? format(new Date(karyawan.birthdate), "dd MMMM yyyy", { locale: id })
                  : "-"}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span className="font-medium">Email:</span>
              </div>
              <div>{karyawan.email || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span className="font-medium">No. Ponsel:</span>
              </div>
              <div>{karyawan.no_ponsel || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span className="font-medium">Lokasi:</span>
              </div>
              <div>{karyawan.lokasi || "-"}</div>
            </div>
          </CardContent>
        </Card>

        {/* Informasi Pekerjaan */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Pekerjaan</CardTitle>
            <CardDescription>Data kepegawaian</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="h-4 w-4" />
                <span className="font-medium">Bagian Kerja:</span>
              </div>
              <div>{karyawan.bagian_kerja || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Bidang Kerja:</span>
              </div>
              <div>{karyawan.bidang_kerja || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Jenis Karyawan:</span>
              </div>
              <div>{karyawan.jenis_karyawan || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Status Kepegawaian:</span>
              </div>
              <div>{karyawan.status || "-"}</div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Tanggal Mulai Bekerja:</span>
              </div>
              <div>
                {karyawan.tgl_mulai_bekerja
                  ? format(new Date(karyawan.tgl_mulai_bekerja), "dd MMMM yyyy", { locale: id })
                  : "-"}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Tanggal Tetap:</span>
              </div>
              <div>
                {karyawan.tgl_tetap
                  ? format(new Date(karyawan.tgl_tetap), "dd MMMM yyyy", { locale: id })
                  : "-"}
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Waktu Kerja Kependidikan:</span>
              </div>
              <div>{karyawan.waktu_kerja_kependidikan || "-"}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Info */}
      {karyawan.rfid && (
        <Card>
          <CardHeader>
            <CardTitle>Informasi Tambahan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">RFID:</div>
              <div className="font-mono">{karyawan.rfid}</div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
