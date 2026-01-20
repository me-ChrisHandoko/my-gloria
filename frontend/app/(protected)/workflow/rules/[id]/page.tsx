"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { GitBranch, Calendar, User, Info, ArrowLeft, Edit, Trash2, ChevronRight, CheckCircle } from "lucide-react";
import { toast } from "sonner";

import {
  useGetWorkflowRuleByIdQuery,
  useDeleteWorkflowRuleMutation,
} from "@/lib/store/services/organizationApi";
import { WorkflowType } from "@/lib/types/organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function WorkflowRuleDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: rule, isLoading, error } = useGetWorkflowRuleByIdQuery(id);
  const [deleteWorkflowRule, { isLoading: isDeleting }] = useDeleteWorkflowRuleMutation();

  const getWorkflowTypeLabel = (type: WorkflowType): string => {
    const labels: Record<WorkflowType, string> = {
      KPI: "KPI - Penilaian Kinerja",
      CUTI: "Cuti - Pengajuan Cuti",
      REIMBURSE: "Reimburse - Penggantian Biaya",
      LEMBUR: "Lembur - Pengajuan Lembur",
      IZIN: "Izin - Permohonan Izin",
      WORKORDER: "Workorder - Perintah Kerja",
    };
    return labels[type] || type;
  };

  const getWorkflowTypeBadgeVariant = (type: WorkflowType): "default" | "secondary" | "success" | "warning" | "destructive" | "outline" => {
    const variants: Record<WorkflowType, "default" | "secondary" | "success" | "warning" | "destructive" | "outline"> = {
      KPI: "default",
      CUTI: "success",
      REIMBURSE: "warning",
      LEMBUR: "secondary",
      IZIN: "outline",
      WORKORDER: "destructive",
    };
    return variants[type] || "default";
  };

  const handleDelete = async () => {
    try {
      await deleteWorkflowRule(id).unwrap();
      toast.success("Aturan workflow berhasil dihapus");
      router.push("/workflow/aturan");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal menghapus aturan workflow");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !rule) {
    return <Alert variant="error">Gagal memuat data aturan workflow</Alert>;
  }

  // Sort steps by step_order
  const sortedSteps = rule.steps ? [...rule.steps].sort((a, b) => a.step_order - b.step_order) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link href="/workflow/aturan">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Detail Aturan Workflow</h1>
            <Badge variant={rule.is_active ? "success" : "secondary"}>
              {rule.is_active ? "Aktif" : "Non-Aktif"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {getWorkflowTypeLabel(rule.workflow_type)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/workflow/aturan/${id}/edit`}>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Hapus
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Konfirmasi Hapus</DialogTitle>
                <DialogDescription>
                  Apakah Anda yakin ingin menghapus aturan workflow ini?
                  Tindakan ini tidak dapat dibatalkan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" disabled={isDeleting}>
                  Batal
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? (
                    <>
                      <LoadingSpinner />
                      <span className="ml-2">Menghapus...</span>
                    </>
                  ) : (
                    "Hapus"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Informasi Dasar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Informasi Dasar
          </CardTitle>
          <CardDescription>Tipe dan posisi target workflow</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label>Tipe Workflow</Label>
            <div>
              <Badge variant={getWorkflowTypeBadgeVariant(rule.workflow_type)}>
                {getWorkflowTypeLabel(rule.workflow_type)}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Posisi Target</Label>
            <p className="text-sm font-medium">{rule.position?.name || "-"}</p>
          </div>

          <div className="space-y-1">
            <Label>Sekolah</Label>
            <div>
              {rule.school ? (
                <Badge variant="outline">{rule.school.name}</Badge>
              ) : (
                <Badge variant="secondary">Global (Semua Sekolah)</Badge>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Prioritas</Label>
            <div>
              <Badge variant="outline">{rule.priority}</Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <div>
              <Badge variant={rule.is_active ? "success" : "secondary"}>
                {rule.is_active ? "Aktif" : "Non-Aktif"}
              </Badge>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Pembuat (Creator)</Label>
            <p className="text-sm">
              {rule.creator_position ? (
                rule.creator_position.name
              ) : (
                <span className="text-muted-foreground">Self (Posisi Target)</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <Label>Total Langkah Approval</Label>
            <div>
              <Badge variant="outline">{rule.total_steps} langkah</Badge>
            </div>
          </div>

          {rule.description && (
            <div className="space-y-1 md:col-span-2">
              <Label>Deskripsi</Label>
              <p className="text-sm">{rule.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rantai Persetujuan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Rantai Persetujuan
          </CardTitle>
          <CardDescription>Alur langkah-langkah persetujuan workflow (multi-level approval)</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedSteps.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">Tidak ada langkah persetujuan</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedSteps.map((step, index) => (
                <div key={step.id} className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                      {step.step_order}
                    </div>
                    {index < sortedSteps.length - 1 && (
                      <div className="w-0.5 h-8 bg-border mt-2" />
                    )}
                  </div>

                  {/* Step content */}
                  <div className="flex-1 pb-4">
                    <div className="p-4 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">
                              {step.step_name || `Langkah ${step.step_order}`}
                            </h4>
                            {step.is_optional && (
                              <Badge variant="outline" className="text-xs">
                                Opsional
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Penyetuju: {step.approver_position?.name || step.approver_position_name || "-"}
                          </p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informasi Tambahan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Informasi Tambahan
          </CardTitle>
          <CardDescription>Metadata dan riwayat perubahan</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Dibuat Pada
            </Label>
            <p className="text-sm">{format(new Date(rule.created_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          <div className="space-y-1">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Terakhir Diperbarui
            </Label>
            <p className="text-sm">{format(new Date(rule.updated_at), "dd MMMM yyyy, HH:mm")}</p>
          </div>

          {rule.created_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dibuat Oleh
              </Label>
              <p className="text-sm">{rule.created_by}</p>
            </div>
          )}

          {rule.modified_by && (
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dimodifikasi Oleh
              </Label>
              <p className="text-sm">{rule.modified_by}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Label component for consistent styling
function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-sm font-medium text-muted-foreground ${className}`}>
      {children}
    </label>
  );
}
