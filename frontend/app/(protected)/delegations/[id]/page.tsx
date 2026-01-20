"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, GitBranch, UserCheck, Users, Calendar, FileText } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetDelegationByIdQuery } from "@/lib/store/services/delegationsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

const getDelegationTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    APPROVAL: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    PERMISSION: "bg-green-500/10 text-green-700 dark:text-green-400",
    WORKFLOW: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  };
  return colors[type] || colors.WORKFLOW;
};

export default function DelegationDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: delegation, isLoading, error } = useGetDelegationByIdQuery(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !delegation) {
    return <Alert variant="error">Gagal memuat data delegasi</Alert>;
  }

  const isExpired = delegation.effective_until && new Date(delegation.effective_until) < new Date();
  const isNotYetActive = new Date(delegation.effective_from) > new Date();

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
            <h1 className="text-3xl font-bold tracking-tight">Detail Delegasi</h1>
            <p className="text-muted-foreground text-sm">
              {delegation.delegator_info?.name || delegation.delegator_info?.email} → {delegation.delegate_info?.name || delegation.delegate_info?.email}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/delegasi/${id}/edit`)}
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

      {/* Status Badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant={delegation.is_active && !isExpired && !isNotYetActive ? "success" : "secondary"}>
          {isExpired ? "Expired" : isNotYetActive ? "Belum Aktif" : delegation.is_active ? "Aktif" : "Non-Aktif"}
        </Badge>
        <Badge variant="outline" className={`uppercase ${getDelegationTypeColor(delegation.type)}`}>
          <GitBranch className="mr-1 h-3 w-3" />
          {delegation.type}
        </Badge>
        {!delegation.effective_until && (
          <Badge variant="outline">Permanent</Badge>
        )}
      </div>

      {/* Delegation Parties */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Delegator Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserCheck className="h-5 w-5" />
              Delegator
            </CardTitle>
            <CardDescription>Pemberi delegasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Email:</div>
              <div className="text-sm">{delegation.delegator_info?.email}</div>
            </div>
            {delegation.delegator_info?.name && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Nama:</div>
                <div className="text-sm font-medium">{delegation.delegator_info.name}</div>
              </div>
            )}
            {delegation.delegator_info?.positions && delegation.delegator_info.positions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Posisi:</div>
                <div className="space-y-1">
                  {delegation.delegator_info.positions.map((pos, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {pos.position_name}
                      {pos.department_name && ` - ${pos.department_name}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delegate Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Delegate
            </CardTitle>
            <CardDescription>Penerima delegasi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Email:</div>
              <div className="text-sm">{delegation.delegate_info?.email}</div>
            </div>
            {delegation.delegate_info?.name && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Nama:</div>
                <div className="text-sm font-medium">{delegation.delegate_info.name}</div>
              </div>
            )}
            {delegation.delegate_info?.positions && delegation.delegate_info.positions.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Posisi:</div>
                <div className="space-y-1">
                  {delegation.delegate_info.positions.map((pos, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {pos.position_name}
                      {pos.department_name && ` - ${pos.department_name}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delegation Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Delegasi</CardTitle>
          <CardDescription>Detail lengkap delegasi</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Tipe Delegasi:</div>
              <Badge variant="outline" className={`uppercase ${getDelegationTypeColor(delegation.type)}`}>
                {delegation.type}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Status:</div>
              <Badge variant={delegation.is_active && !isExpired && !isNotYetActive ? "success" : "secondary"}>
                {isExpired ? "Expired" : isNotYetActive ? "Belum Aktif" : delegation.is_active ? "Aktif" : "Non-Aktif"}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Berlaku Dari:
              </div>
              <div className="text-sm">
                {format(new Date(delegation.effective_from), "dd MMMM yyyy, HH:mm", { locale: localeId })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Berlaku Sampai:
              </div>
              <div className="text-sm">
                {delegation.effective_until ? (
                  format(new Date(delegation.effective_until), "dd MMMM yyyy, HH:mm", { locale: localeId })
                ) : (
                  <Badge variant="outline" className="text-xs">Permanent</Badge>
                )}
              </div>
            </div>
          </div>

          {delegation.reason && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  Alasan Delegasi:
                </div>
                <div className="text-sm bg-muted p-3 rounded">{delegation.reason}</div>
              </div>
            </>
          )}

          {delegation.context && Object.keys(delegation.context).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Context:</div>
                <div className="text-sm font-mono bg-muted p-3 rounded whitespace-pre-wrap">
                  {JSON.stringify(delegation.context, null, 2)}
                </div>
              </div>
            </>
          )}

          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Created At:</div>
              <div className="text-sm">{new Date(delegation.created_at).toLocaleString("id-ID")}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Last Updated:</div>
              <div className="text-sm">{new Date(delegation.updated_at).toLocaleString("id-ID")}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
