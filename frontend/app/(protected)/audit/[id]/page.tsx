"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Calendar, User, Tag, Globe, Monitor, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetAuditLogByIdQuery } from "@/lib/store/services/auditApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

const getActionColor = (action: string) => {
  const colors: Record<string, string> = {
    CREATE: "bg-green-500/10 text-green-700 dark:text-green-400",
    READ: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    UPDATE: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
    APPROVE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    REJECT: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    LOGIN: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    LOGOUT: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    EXPORT: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400",
    IMPORT: "bg-teal-500/10 text-teal-700 dark:text-teal-400",
    ASSIGN: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
    GRANT: "bg-lime-500/10 text-lime-700 dark:text-lime-400",
    REVOKE: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
  };
  return colors[action] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    PERMISSION: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    MODULE: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
    WORKFLOW: "bg-green-500/10 text-green-700 dark:text-green-400",
    SYSTEM_CONFIG: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    USER_MANAGEMENT: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400",
    DATA_CHANGE: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    SECURITY: "bg-red-500/10 text-red-700 dark:text-red-400",
  };
  return colors[category] || "bg-gray-500/10 text-gray-700 dark:text-gray-400";
};

export default function AuditLogDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: auditLog, isLoading, error } = useGetAuditLogByIdQuery(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !auditLog) {
    return <Alert variant="error">Gagal memuat data audit log</Alert>;
  }

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
            <h1 className="text-3xl font-bold tracking-tight">Audit Log Detail</h1>
            <p className="text-muted-foreground text-sm">
              {auditLog.entity_type} - {auditLog.entity_display || auditLog.entity_id}
            </p>
          </div>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex gap-2 flex-wrap">
        <Badge variant="outline" className={`uppercase ${getActionColor(auditLog.action)}`}>
          {auditLog.action}
        </Badge>
        {auditLog.category && (
          <Badge variant="outline" className={`uppercase ${getCategoryColor(auditLog.category)}`}>
            <Tag className="mr-1 h-3 w-3" />
            {auditLog.category}
          </Badge>
        )}
        <Badge variant="outline" className="font-mono">
          {auditLog.module}
        </Badge>
      </div>

      {/* Actor & Target Information */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Actor Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Actor
            </CardTitle>
            <CardDescription>User yang melakukan aksi</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Actor Name:</div>
              <div className="text-sm font-medium">{auditLog.actor_name || "Unknown"}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Actor ID:</div>
              <div className="font-mono text-xs">{auditLog.actor_id}</div>
            </div>
            {auditLog.actor_profile_id && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Actor Profile ID:</div>
                <div className="font-mono text-xs">{auditLog.actor_profile_id}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Target User Card (if exists) */}
        {auditLog.target_user_id && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Target User
              </CardTitle>
              <CardDescription>User yang menjadi target</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Target Name:</div>
                <div className="text-sm font-medium">{auditLog.target_user_name || "Unknown"}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Target User ID:</div>
                <div className="font-mono text-xs">{auditLog.target_user_id}</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Audit Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Audit</CardTitle>
          <CardDescription>Detail lengkap audit log</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Action:</div>
              <Badge variant="outline" className={`uppercase ${getActionColor(auditLog.action)}`}>
                {auditLog.action}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Module:</div>
              <div className="font-mono text-sm">{auditLog.module}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Entity Type:</div>
              <div className="text-sm">{auditLog.entity_type}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Entity ID:</div>
              <div className="font-mono text-xs break-all">{auditLog.entity_id}</div>
            </div>
            {auditLog.entity_display && (
              <div className="space-y-2 md:col-span-2">
                <div className="text-sm text-muted-foreground font-medium">Entity Display:</div>
                <div className="text-sm">{auditLog.entity_display}</div>
              </div>
            )}
            {auditLog.category && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Category:</div>
                <Badge variant="outline" className={`uppercase ${getCategoryColor(auditLog.category)}`}>
                  <Tag className="mr-1 h-3 w-3" />
                  {auditLog.category}
                </Badge>
              </div>
            )}
          </div>

          <Separator />

          {/* Technical Information */}
          <div className="grid gap-4 md:grid-cols-2">
            {auditLog.ip_address && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Globe className="h-3 w-3" />
                  IP Address:
                </div>
                <div className="font-mono text-sm">{auditLog.ip_address}</div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Timestamp:
              </div>
              <div className="text-sm">
                {format(new Date(auditLog.created_at), "dd MMMM yyyy, HH:mm:ss", { locale: localeId })}
              </div>
            </div>
          </div>

          {auditLog.user_agent && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Monitor className="h-3 w-3" />
                  User Agent:
                </div>
                <div className="text-xs bg-muted p-3 rounded break-all">{auditLog.user_agent}</div>
              </div>
            </>
          )}

          {/* Changes Section */}
          {(auditLog.old_values || auditLog.new_values || auditLog.changed_fields) && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="text-sm font-medium flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Data Changes
                </div>
                {auditLog.changed_fields && Array.isArray(auditLog.changed_fields) && auditLog.changed_fields.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Changed Fields:</div>
                    <div className="flex flex-wrap gap-2">
                      {auditLog.changed_fields.map((field, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs font-mono">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {auditLog.old_values && Object.keys(auditLog.old_values).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Old Values:</div>
                    <div className="text-xs font-mono bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {JSON.stringify(auditLog.old_values, null, 2)}
                    </div>
                  </div>
                )}
                {auditLog.new_values && Object.keys(auditLog.new_values).length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">New Values:</div>
                    <div className="text-xs font-mono bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {JSON.stringify(auditLog.new_values, null, 2)}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Metadata Section */}
          {auditLog.metadata && Object.keys(auditLog.metadata).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Metadata:</div>
                <div className="text-xs font-mono bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-y-auto">
                  {JSON.stringify(auditLog.metadata, null, 2)}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
