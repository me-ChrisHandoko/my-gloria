"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, CheckCircle, AlertCircle, School } from "lucide-react";
import { toast } from "sonner";

import {
  useBulkCreateWorkflowRulesMutation,
  useGetPositionsQuery,
  useGetSchoolsQuery,
} from "@/lib/store/services/organizationApi";
import { WORKFLOW_TYPES, WorkflowType, CreateWorkflowRuleStepRequest } from "@/lib/types/organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const stepSchema = z.object({
  step_order: z.number().min(1),
  approver_position_id: z.string().min(1, { message: "Pilih posisi penyetuju" }),
  step_name: z.string().optional().or(z.literal("")).nullable(),
  is_optional: z.boolean().optional(),
});

const bulkCreateSchema = z.object({
  workflow_type: z.enum(["KPI", "CUTI", "REIMBURSE", "LEMBUR", "IZIN", "WORKORDER"], {
    message: "Pilih tipe workflow",
  }),
  position_id: z.string().min(1, { message: "Pilih posisi target" }),
  school_ids: z.array(z.string()).min(1, { message: "Pilih minimal 1 sekolah" }),
  creator_position_id: z.string().optional().or(z.literal("")).nullable(),
  description: z.string().optional().or(z.literal("")),
  priority: z.number().min(1).max(100),
  steps: z.array(stepSchema).optional(),
});

type BulkCreateFormData = z.infer<typeof bulkCreateSchema>;

export default function BulkCreateWorkflowRulesPage() {
  const router = useRouter();
  const [bulkCreateWorkflowRules, { isLoading }] = useBulkCreateWorkflowRulesMutation();
  const [result, setResult] = useState<{ created: number; skipped: number; errors?: string[] } | null>(null);

  const { data: positionsData, isLoading: isLoadingPositions } = useGetPositionsQuery({
    page_size: 100,
    is_active: true,
  });

  const { data: schoolsData, isLoading: isLoadingSchools } = useGetSchoolsQuery({
    page_size: 100,
    is_active: true,
  });

  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<BulkCreateFormData>({
    resolver: zodResolver(bulkCreateSchema),
    mode: "onBlur",
    defaultValues: {
      workflow_type: undefined,
      position_id: "",
      school_ids: [],
      creator_position_id: "",
      description: "",
      priority: 1,
      steps: [],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "steps",
  });

  const selectedSchools = watch("school_ids") || [];

  const addStep = () => {
    append({
      step_order: fields.length + 1,
      approver_position_id: "",
      step_name: "",
      is_optional: false,
    });
  };

  const removeStep = (index: number) => {
    remove(index);
  };

  const moveStepUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
    }
  };

  const moveStepDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
    }
  };

  const toggleSchool = (schoolId: string) => {
    const current = selectedSchools;
    if (current.includes(schoolId)) {
      setValue("school_ids", current.filter(id => id !== schoolId));
    } else {
      setValue("school_ids", [...current, schoolId]);
    }
    trigger("school_ids");
  };

  const selectAllSchools = () => {
    const allIds = schoolsData?.data?.map(s => s.id) || [];
    setValue("school_ids", allIds);
    trigger("school_ids");
  };

  const clearAllSchools = () => {
    setValue("school_ids", []);
    trigger("school_ids");
  };

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

  const onSubmit = async (data: BulkCreateFormData) => {
    try {
      const payload = {
        workflow_type: data.workflow_type,
        position_id: data.position_id,
        school_ids: data.school_ids,
        creator_position_id: data.creator_position_id && data.creator_position_id !== "none"
          ? data.creator_position_id
          : undefined,
        description: data.description || undefined,
        priority: data.priority,
        steps: data.steps?.map((step, index) => ({
          step_order: index + 1,
          approver_position_id: step.approver_position_id,
          step_name: step.step_name || null,
          is_optional: step.is_optional || false,
        })),
      };

      const response = await bulkCreateWorkflowRules(payload).unwrap();
      setResult(response);

      if (response.created > 0) {
        toast.success(`${response.created} aturan workflow berhasil dibuat`);
      }
      if (response.skipped > 0) {
        toast.warning(`${response.skipped} aturan workflow dilewati (sudah ada atau error)`);
      }
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal membuat aturan workflow");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Link href="/workflow/rules">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Create Aturan Workflow</h1>
        <p className="text-muted-foreground">
          Buat aturan workflow untuk beberapa sekolah sekaligus dengan konfigurasi yang sama
        </p>
      </div>

      {/* Result Alert */}
      {result && (
        <Alert variant={result.created > 0 ? "success" : "error"}>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>Hasil Bulk Create</AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="flex gap-4">
              <Badge variant="default" className="bg-green-600">
                {result.created} Berhasil
              </Badge>
              <Badge variant="secondary">
                {result.skipped} Dilewati
              </Badge>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Detail Error:</p>
                <ul className="text-sm list-disc list-inside space-y-1">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... dan {result.errors.length - 5} error lainnya</li>
                  )}
                </ul>
              </div>
            )}
            <div className="mt-3">
              <Link href="/workflow/rules">
                <Button size="sm">Lihat Daftar Aturan</Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>Tipe workflow dan posisi target (akan sama untuk semua sekolah)</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workflow_type">
                Tipe Workflow <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("workflow_type", value as WorkflowType);
                  trigger("workflow_type");
                }}
              >
                <SelectTrigger className={`w-full ${errors.workflow_type ? "border-destructive" : ""}`}>
                  <SelectValue placeholder="Pilih tipe workflow" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WORKFLOW_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {getWorkflowTypeLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.workflow_type && (
                <p className="text-sm text-destructive">{errors.workflow_type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_id">
                Posisi Target <span className="text-destructive">*</span>
              </Label>
              <Select
                onValueChange={(value) => {
                  setValue("position_id", value);
                  trigger("position_id");
                }}
                disabled={isLoadingPositions}
              >
                <SelectTrigger className={`w-full ${errors.position_id ? "border-destructive" : ""}`}>
                  <SelectValue placeholder={isLoadingPositions ? "Memuat..." : "Pilih posisi"} />
                </SelectTrigger>
                <SelectContent>
                  {positionsData?.data?.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name} (Level {position.hierarchy_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.position_id && (
                <p className="text-sm text-destructive">{errors.position_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritas</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={100}
                placeholder="1-100"
                className="w-full"
                {...register("priority", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Urutan prioritas (1 = tertinggi)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="creator_position_id">Pembuat (Creator)</Label>
              <Select
                onValueChange={(value) => {
                  setValue("creator_position_id", value === "none" ? "" : value);
                  trigger("creator_position_id");
                }}
                disabled={isLoadingPositions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingPositions ? "Memuat..." : "Pilih posisi pembuat"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Self (Posisi Target)</SelectItem>
                  {positionsData?.data?.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      {position.name} (Level {position.hierarchy_level})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Posisi yang membuat/mengajukan workflow
              </p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat aturan workflow"
                rows={2}
                className="w-full"
                {...register("description")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pilih Sekolah */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <School className="h-5 w-5" />
                  Pilih Sekolah
                </CardTitle>
                <CardDescription>
                  Pilih sekolah yang akan dibuatkan aturan workflow (sama untuk semua)
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllSchools}>
                  Pilih Semua
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearAllSchools}>
                  Hapus Semua
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingSchools ? (
              <div className="py-8 text-center">
                <LoadingSpinner />
              </div>
            ) : !schoolsData?.data?.length ? (
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">Tidak ada sekolah tersedia</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <Badge variant="outline">
                    {selectedSchools.length} dari {schoolsData.data.length} sekolah dipilih
                  </Badge>
                  {errors.school_ids && (
                    <p className="text-sm text-destructive mt-1">{errors.school_ids.message}</p>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {schoolsData.data.map((school) => (
                    <div
                      key={school.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedSchools.includes(school.id) ? "border-primary bg-primary/5" : ""
                      }`}
                      onClick={() => toggleSchool(school.id)}
                    >
                      <Checkbox
                        checked={selectedSchools.includes(school.id)}
                        onClick={(e) => e.stopPropagation()}
                        onCheckedChange={() => toggleSchool(school.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{school.name}</p>
                        <p className="text-xs text-muted-foreground">{school.code}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Langkah-langkah Persetujuan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Langkah Persetujuan</CardTitle>
                <CardDescription>
                  Tentukan urutan penyetuju workflow (sama untuk semua sekolah)
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={addStep}>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Langkah
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.length === 0 ? (
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground mb-2">Belum ada langkah persetujuan</p>
                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Langkah Pertama
                </Button>
              </div>
            ) : (
              fields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-lg space-y-4 bg-muted/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Step {index + 1}</Badge>
                      {watch(`steps.${index}.is_optional`) && (
                        <Badge variant="outline">Opsional</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStepUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => moveStepDown(index)}
                        disabled={index === fields.length - 1}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>
                        Posisi Penyetuju <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        onValueChange={(value) => {
                          setValue(`steps.${index}.approver_position_id`, value);
                          trigger(`steps.${index}.approver_position_id`);
                        }}
                        disabled={isLoadingPositions}
                      >
                        <SelectTrigger
                          className={`w-full ${
                            errors.steps?.[index]?.approver_position_id
                              ? "border-destructive"
                              : ""
                          }`}
                        >
                          <SelectValue placeholder="Pilih posisi" />
                        </SelectTrigger>
                        <SelectContent>
                          {positionsData?.data?.map((position) => (
                            <SelectItem key={position.id} value={position.id}>
                              {position.name} (Level {position.hierarchy_level})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.steps?.[index]?.approver_position_id && (
                        <p className="text-sm text-destructive">
                          {errors.steps[index]?.approver_position_id?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Nama Langkah</Label>
                      <Input
                        placeholder="Contoh: Persetujuan Manager"
                        className="w-full"
                        {...register(`steps.${index}.step_name`)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Tipe</Label>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id={`steps.${index}.is_optional`}
                          className="h-4 w-4 rounded border-gray-300"
                          {...register(`steps.${index}.is_optional`)}
                        />
                        <Label
                          htmlFor={`steps.${index}.is_optional`}
                          className="cursor-pointer font-normal"
                        >
                          Langkah Opsional
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
            <CardDescription>
              Preview aturan workflow yang akan dibuat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{selectedSchools.length}</p>
                <p className="text-sm text-muted-foreground">Sekolah</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{fields.length}</p>
                <p className="text-sm text-muted-foreground">Langkah Approval</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{selectedSchools.length}</p>
                <p className="text-sm text-muted-foreground">Rules Akan Dibuat</p>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <p className="text-3xl font-bold text-primary">{watch("priority") || 1}</p>
                <p className="text-sm text-muted-foreground">Prioritas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Batal
          </Button>
          <Button type="submit" disabled={isLoading || selectedSchools.length === 0}>
            {isLoading ? (
              <>
                <LoadingSpinner />
                <span className="ml-2">Membuat {selectedSchools.length} Aturan...</span>
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Buat {selectedSchools.length} Aturan Workflow
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
