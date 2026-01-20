"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import {
  useGetWorkflowRuleByIdQuery,
  useUpdateWorkflowRuleMutation,
  useGetPositionsQuery,
  useGetSchoolsQuery,
} from "@/lib/store/services/organizationApi";
import { WORKFLOW_TYPES, WorkflowType, UpdateWorkflowRuleStepRequest } from "@/lib/types/organization";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const stepSchema = z.object({
  id: z.string().optional(),
  step_order: z.number().min(1),
  approver_position_id: z.string().min(1, { message: "Pilih posisi penyetuju" }),
  step_name: z.string().optional().or(z.literal("")).nullable(),
  is_optional: z.boolean().optional(),
});

const workflowRuleSchema = z.object({
  workflow_type: z.enum(["KPI", "CUTI", "REIMBURSE", "LEMBUR", "IZIN", "WORKORDER"]).optional(),
  position_id: z.string().optional(),
  school_id: z.string().optional().or(z.literal("")).nullable(),
  creator_position_id: z.string().optional().or(z.literal("")).nullable(),
  description: z.string().optional().or(z.literal("")),
  priority: z.number().min(1).max(100).optional(),
  is_active: z.boolean().optional(),
  steps: z.array(stepSchema).optional(),
});

type WorkflowRuleFormData = z.infer<typeof workflowRuleSchema>;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditWorkflowRulePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: rule, isLoading: isLoadingData, error } = useGetWorkflowRuleByIdQuery(id);
  const [updateWorkflowRule, { isLoading: isUpdating }] = useUpdateWorkflowRuleMutation();

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
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<WorkflowRuleFormData>({
    resolver: zodResolver(workflowRuleSchema),
    mode: "onBlur",
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: "steps",
  });

  useEffect(() => {
    if (rule) {
      // Sort steps by step_order before setting
      const sortedSteps = rule.steps
        ? [...rule.steps].sort((a, b) => a.step_order - b.step_order).map(step => ({
            id: step.id,
            step_order: step.step_order,
            approver_position_id: step.approver_position_id,
            step_name: step.step_name || "",
            is_optional: step.is_optional,
          }))
        : [];

      reset({
        workflow_type: rule.workflow_type,
        position_id: rule.position_id,
        school_id: rule.school_id || "",
        creator_position_id: rule.creator_position_id || "",
        description: rule.description || "",
        priority: rule.priority,
        is_active: rule.is_active,
        steps: sortedSteps,
      });
    }
  }, [rule, reset]);

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
      const cleanedData: {
        workflow_type?: WorkflowType;
        position_id?: string;
        school_id?: string | null;
        creator_position_id?: string | null;
        description?: string | null;
        priority?: number;
        is_active?: boolean;
        steps?: UpdateWorkflowRuleStepRequest[];
      } = {};

      if (data.workflow_type) cleanedData.workflow_type = data.workflow_type;
      if (data.position_id) cleanedData.position_id = data.position_id;
      if (data.priority !== undefined) cleanedData.priority = data.priority;
      if (data.is_active !== undefined) cleanedData.is_active = data.is_active;

      // Handle school_id
      if (data.school_id === "" || data.school_id === "global") {
        cleanedData.school_id = null;
      } else if (data.school_id) {
        cleanedData.school_id = data.school_id;
      }

      // Handle description
      if (data.description !== undefined) {
        cleanedData.description = data.description || null;
      }

      // Handle creator_position_id
      if (data.creator_position_id === "" || data.creator_position_id === "none") {
        cleanedData.creator_position_id = null;
      } else if (data.creator_position_id) {
        cleanedData.creator_position_id = data.creator_position_id;
      }

      // Process steps with correct step_order
      if (data.steps) {
        cleanedData.steps = data.steps.map((step, index) => ({
          id: step.id,
          step_order: index + 1,
          approver_position_id: step.approver_position_id,
          step_name: step.step_name || null,
          is_optional: step.is_optional || false,
        }));
      }

      await updateWorkflowRule({ id, data: cleanedData }).unwrap();
      toast.success("Aturan workflow berhasil diperbarui");
      router.push(`/workflow/aturan/${id}`);
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string; error?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memperbarui aturan workflow");
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !rule) {
    return <Alert variant="error">Gagal memuat data aturan workflow</Alert>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Aturan Workflow</h1>
        <p className="text-muted-foreground">
          {getWorkflowTypeLabel(rule.workflow_type)}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Informasi Dasar */}
        <Card>
          <CardHeader>
            <CardTitle>Informasi Dasar</CardTitle>
            <CardDescription>Tipe workflow dan posisi target</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="workflow_type">Tipe Workflow</Label>
              <Select
                onValueChange={(value) => {
                  setValue("workflow_type", value as WorkflowType);
                  trigger("workflow_type");
                }}
                defaultValue={rule.workflow_type}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="position_id">Posisi Target</Label>
              <Select
                onValueChange={(value) => {
                  setValue("position_id", value);
                  trigger("position_id");
                }}
                defaultValue={rule.position_id}
                disabled={isLoadingPositions}
              >
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="school_id">Sekolah</Label>
              <Select
                onValueChange={(value) => {
                  setValue("school_id", value === "global" ? "" : value);
                  trigger("school_id");
                }}
                defaultValue={rule.school_id || "global"}
                disabled={isLoadingSchools}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label htmlFor="priority">Prioritas</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={100}
                placeholder="1-100"
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
                defaultValue={rule.creator_position_id || "none"}
                disabled={isLoadingPositions}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  id="is_active"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300"
                  {...register("is_active")}
                />
                <Label htmlFor="is_active" className="cursor-pointer font-normal">
                  Aturan Aktif
                </Label>
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi singkat aturan workflow"
                rows={2}
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
                        defaultValue={field.approver_position_id}
                        disabled={isLoadingPositions}
                      >
                        <SelectTrigger
                          className={
                            errors.steps?.[index]?.approver_position_id
                              ? "border-destructive"
                              : ""
                          }
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
