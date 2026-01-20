"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import {
  useCreateWorkflowRuleMutation,
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
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const stepSchema = z.object({
  step_order: z.number().min(1),
  approver_position_id: z.string().min(1, { message: "Pilih posisi penyetuju" }),
  step_name: z.string().optional().or(z.literal("")).nullable(),
  is_optional: z.boolean().optional(),
});

const workflowRuleSchema = z.object({
  workflow_type: z.enum(["KPI", "CUTI", "REIMBURSE", "LEMBUR", "IZIN", "WORKORDER"], {
    message: "Pilih tipe workflow",
  }),
  position_id: z.string().min(1, { message: "Pilih posisi target" }),
  school_id: z.string().optional().or(z.literal("")).nullable(),
  creator_position_id: z.string().optional().or(z.literal("")).nullable(),
  description: z.string().optional().or(z.literal("")),
  priority: z.number().min(1, { message: "Prioritas minimal 1" }).max(100, { message: "Prioritas maksimal 100" }),
  steps: z.array(stepSchema).optional(),
});

type WorkflowRuleFormData = z.infer<typeof workflowRuleSchema>;

export default function CreateWorkflowRulePage() {
  const router = useRouter();
  const [createWorkflowRule, { isLoading }] = useCreateWorkflowRuleMutation();

  // Fetch positions for dropdowns
  const { data: positionsData, isLoading: isLoadingPositions } = useGetPositionsQuery({
    page_size: 100,
    is_active: true,
  });

  // Fetch schools for dropdown
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
  } = useForm<WorkflowRuleFormData>({
    resolver: zodResolver(workflowRuleSchema),
    mode: "onBlur",
    defaultValues: {
      workflow_type: undefined,
      position_id: "",
      school_id: "",
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
    // Re-order remaining steps
    fields.forEach((_, i) => {
      if (i >= index) {
        setValue(`steps.${i}.step_order`, i + 1);
      }
    });
  };

  const moveStepUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1);
      // Update step_order values
      setValue(`steps.${index - 1}.step_order`, index);
      setValue(`steps.${index}.step_order`, index + 1);
    }
  };

  const moveStepDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1);
      // Update step_order values
      setValue(`steps.${index}.step_order`, index + 1);
      setValue(`steps.${index + 1}.step_order`, index + 2);
    }
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

  const onSubmit = async (data: WorkflowRuleFormData) => {
    try {
      const payload: {
        workflow_type: WorkflowType;
        position_id: string;
        school_id?: string | null;
        creator_position_id?: string | null;
        description?: string | null;
        priority?: number;
        steps?: CreateWorkflowRuleStepRequest[];
      } = {
        workflow_type: data.workflow_type,
        position_id: data.position_id,
        priority: data.priority,
      };

      // Handle optional fields
      if (data.school_id && data.school_id !== "global") {
        payload.school_id = data.school_id;
      }
      if (data.creator_position_id && data.creator_position_id !== "none") {
        payload.creator_position_id = data.creator_position_id;
      }
      if (data.description) {
        payload.description = data.description;
      }

      // Process steps with correct step_order
      if (data.steps && data.steps.length > 0) {
        payload.steps = data.steps.map((step, index) => ({
          step_order: index + 1,
          approver_position_id: step.approver_position_id,
          step_name: step.step_name || null,
          is_optional: step.is_optional || false,
        }));
      }

      await createWorkflowRule(payload).unwrap();
      toast.success("Aturan workflow berhasil ditambahkan");
      router.push("/workflow/rules");
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.message || apiError?.data?.error || "Gagal menambahkan aturan workflow");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tambah Aturan Workflow</h1>
        <p className="text-muted-foreground">Tambahkan aturan persetujuan workflow baru dengan multi-level approval</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>Tipe workflow dan posisi target</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {/* Row 1: Tipe Workflow (full width) */}
            <div className="space-y-2 md:col-span-2">
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

            {/* Row 2: Posisi Target & Sekolah */}
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
              <p className="text-sm text-muted-foreground">
                Posisi yang akan menggunakan aturan ini
              </p>
              {errors.position_id && (
                <p className="text-sm text-destructive">{errors.position_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah</Label>
              <Select
                onValueChange={(value) => {
                  setValue("school_id", value === "global" ? "" : value);
                  trigger("school_id");
                }}
                disabled={isLoadingSchools}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={isLoadingSchools ? "Memuat..." : "Pilih sekolah"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (Semua Sekolah)</SelectItem>
                  {schoolsData?.data?.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Pilih sekolah untuk aturan khusus, atau Global untuk semua sekolah
              </p>
            </div>

            {/* Row 3: Pembuat (Creator) & Prioritas */}
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
                Posisi yang membuat/mengajukan workflow. Kosongkan jika self-create.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">
                Prioritas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={100}
                placeholder="1-100"
                className={`w-full ${errors.priority ? "border-destructive" : ""}`}
                {...register("priority", { valueAsNumber: true })}
              />
              <p className="text-sm text-muted-foreground">
                Urutan prioritas (1 = tertinggi)
              </p>
              {errors.priority && (
                <p className="text-sm text-destructive">{errors.priority.message}</p>
              )}
            </div>

            {/* Row 4: Deskripsi (full width) */}
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

        {/* Langkah-langkah Persetujuan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Langkah Persetujuan</CardTitle>
                <CardDescription>
                  Tentukan urutan penyetuju workflow (multi-level approval)
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
                      <p className="text-xs text-muted-foreground">
                        Centang jika langkah ini bisa dilewati
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
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
