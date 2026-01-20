"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Workflow as WorkflowIcon, Calendar, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { useGetWorkflowByIdQuery } from "@/lib/store/services/workflowsApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Alert } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    COMPLETED: "bg-green-500/10 text-green-700 dark:text-green-400",
    RUNNING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    PENDING: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
    FAILED: "bg-red-500/10 text-red-700 dark:text-red-400",
    CANCELLED: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
  };
  return colors[status] || colors.PENDING;
};

const getStatusIcon = (status: string) => {
  const icons: Record<string, React.ReactNode> = {
    COMPLETED: <CheckCircle2 className="h-4 w-4" />,
    RUNNING: <Clock className="h-4 w-4" />,
    PENDING: <Clock className="h-4 w-4" />,
    FAILED: <XCircle className="h-4 w-4" />,
    CANCELLED: <XCircle className="h-4 w-4" />,
  };
  return icons[status] || icons.PENDING;
};

export default function WorkflowInstanceDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();

  const { data: workflow, isLoading, error } = useGetWorkflowByIdQuery(id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !workflow) {
    return <Alert variant="error">Gagal memuat data workflow instance</Alert>;
  }

  const isRunning = workflow.status === "RUNNING" || workflow.status === "PENDING";
  const isCompleted = workflow.completed_at !== null && workflow.completed_at !== undefined;

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
            <h1 className="text-3xl font-bold tracking-tight">Workflow Instance</h1>
            <p className="text-muted-foreground font-mono text-sm">{workflow.request_id}</p>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="flex gap-2">
        <Badge variant="outline" className={`uppercase ${getStatusColor(workflow.status)}`}>
          <span className="mr-1">{getStatusIcon(workflow.status)}</span>
          {workflow.status}
        </Badge>
        {isRunning && (
          <Badge variant="outline" className="animate-pulse">
            In Progress
          </Badge>
        )}
      </div>

      {/* Workflow Information */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Workflow</CardTitle>
          <CardDescription>Detail lengkap workflow instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Request ID:</div>
              <div className="font-mono text-sm">{workflow.request_id}</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Workflow Type:</div>
              <div className="flex items-center gap-2">
                <WorkflowIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{workflow.workflow_type}</span>
              </div>
            </div>
            {workflow.initiator_id && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Initiator ID:</div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono text-sm">{workflow.initiator_id}</span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Status:</div>
              <Badge variant="outline" className={`uppercase ${getStatusColor(workflow.status)}`}>
                <span className="mr-1">{getStatusIcon(workflow.status)}</span>
                {workflow.status}
              </Badge>
            </div>
          </div>

          {(workflow.temporal_workflow_id || workflow.temporal_run_id) && (
            <>
              <Separator />
              <div className="grid gap-4 md:grid-cols-2">
                {workflow.temporal_workflow_id && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground font-medium">Temporal Workflow ID:</div>
                    <div className="font-mono text-xs break-all">{workflow.temporal_workflow_id}</div>
                  </div>
                )}
                {workflow.temporal_run_id && (
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground font-medium">Temporal Run ID:</div>
                    <div className="font-mono text-xs break-all">{workflow.temporal_run_id}</div>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Started At:
              </div>
              <div className="text-sm">
                {format(new Date(workflow.started_at), "dd MMMM yyyy, HH:mm:ss", { locale: localeId })}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                <Calendar className="h-3 w-3" />
                Completed At:
              </div>
              <div className="text-sm">
                {workflow.completed_at ? (
                  format(new Date(workflow.completed_at), "dd MMMM yyyy, HH:mm:ss", { locale: localeId })
                ) : (
                  <Badge variant="outline" className="text-xs">Still Running</Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground font-medium">Created At:</div>
              <div className="text-sm">
                {format(new Date(workflow.created_at), "dd MMMM yyyy, HH:mm:ss", { locale: localeId })}
              </div>
            </div>
            {isCompleted && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Duration:</div>
                <div className="text-sm font-mono">
                  {(() => {
                    const start = new Date(workflow.started_at).getTime();
                    const end = new Date(workflow.completed_at!).getTime();
                    const duration = end - start;
                    const seconds = Math.floor(duration / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);

                    if (hours > 0) {
                      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
                    } else if (minutes > 0) {
                      return `${minutes}m ${seconds % 60}s`;
                    } else {
                      return `${seconds}s`;
                    }
                  })()}
                </div>
              </div>
            )}
          </div>

          {workflow.metadata && Object.keys(workflow.metadata).length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground font-medium">Metadata:</div>
                <div className="text-sm font-mono bg-muted p-3 rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {JSON.stringify(workflow.metadata, null, 2)}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
