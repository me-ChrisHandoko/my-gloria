/**
 * API Keys Data Table Component
 *
 * Displays API keys in a table format with actions.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Key, Trash2, Ban, ArrowUpDown, Copy, CheckCircle2, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PermissionGate } from "@/components/rbac";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRevokeApiKeyMutation, useDeleteApiKeyMutation } from "@/lib/store/services/apiKeysApi";
import { displayApiKey, isApiKeyExpired, formatExpiryDate } from "@/lib/types/apikey";
import type { ApiKeyListResponse } from "@/lib/types/apikey";

interface ApiKeysDataTableProps {
  apiKeys: ApiKeyListResponse[];
  sortBy?: string;
  sortOrder?: string;
  onSortChange: (column: string) => void;
}

export default function ApiKeysDataTable({
  apiKeys,
  sortBy,
  sortOrder,
  onSortChange,
}: ApiKeysDataTableProps) {
  const router = useRouter();
  const [revokeApiKey, { isLoading: isRevoking }] = useRevokeApiKeyMutation();
  const [deleteApiKey, { isLoading: isDeleting }] = useDeleteApiKeyMutation();

  const [selectedKey, setSelectedKey] = useState<ApiKeyListResponse | null>(null);
  const [actionType, setActionType] = useState<"revoke" | "delete" | null>(null);

  const handleAction = async () => {
    if (!selectedKey || !actionType) return;

    try {
      if (actionType === "revoke") {
        await revokeApiKey(selectedKey.id).unwrap();
        toast.success("API key berhasil dinonaktifkan");
      } else if (actionType === "delete") {
        await deleteApiKey(selectedKey.id).unwrap();
        toast.success("API key berhasil dihapus");
      }
    } catch (error: unknown) {
      const apiError = error as { data?: { error?: string; message?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal memproses permintaan");
    } finally {
      setSelectedKey(null);
      setActionType(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard");
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => onSortChange(column)}
    >
      {label}
      <ArrowUpDown className="ml-2 h-4 w-4" />
      {sortBy === column && (
        <span className="ml-1 text-xs">({sortOrder === "asc" ? "A-Z" : "Z-A"})</span>
      )}
    </Button>
  );

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <SortableHeader column="name" label="Nama" />
              </TableHead>
              <TableHead>Key</TableHead>
              <TableHead className="text-center">
                <SortableHeader column="usage_count" label="Penggunaan" />
              </TableHead>
              <TableHead>
                <SortableHeader column="last_used_at" label="Terakhir Digunakan" />
              </TableHead>
              <TableHead>
                <SortableHeader column="expires_at" label="Kedaluwarsa" />
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {apiKeys.map((apiKey) => {
              const maskedKey = displayApiKey(apiKey.prefix, apiKey.last_four_chars);
              const expired = isApiKeyExpired(apiKey.expires_at);

              return (
                <TableRow key={apiKey.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      {apiKey.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {maskedKey}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(maskedKey)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{apiKey.usage_count}x</Badge>
                  </TableCell>
                  <TableCell>
                    {apiKey.last_used_at ? (
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(apiKey.last_used_at), {
                          addSuffix: true,
                          locale: localeId,
                        })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Belum pernah</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {apiKey.expires_at ? (
                      <span className={expired ? "text-destructive" : ""}>
                        {formatExpiryDate(apiKey.expires_at)}
                        {expired && " (Expired)"}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Tidak ada</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {apiKey.is_active && !expired ? (
                      <Badge variant="default" className="bg-green-600">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Aktif
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <Ban className="mr-1 h-3 w-3" />
                        {expired ? "Expired" : "Nonaktif"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <PermissionGate resource="api-keys" action="READ" hideOnDenied>
                          <DropdownMenuItem onClick={() => router.push(`/settings/api-keys/${apiKey.id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat Detail
                          </DropdownMenuItem>
                        </PermissionGate>
                        <PermissionGate resource="api-keys" action="UPDATE" hideOnDenied>
                          {apiKey.is_active && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedKey(apiKey);
                                  setActionType("revoke");
                                }}
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Nonaktifkan
                              </DropdownMenuItem>
                            </>
                          )}
                        </PermissionGate>
                        <DropdownMenuSeparator />
                        <PermissionGate resource="api-keys" action="DELETE" hideOnDenied>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => {
                              setSelectedKey(apiKey);
                              setActionType("delete");
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Hapus Permanen
                          </DropdownMenuItem>
                        </PermissionGate>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!selectedKey && !!actionType}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedKey(null);
            setActionType(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "revoke" ? "Nonaktifkan API Key?" : "Hapus API Key?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "revoke" ? (
                <>
                  API key <strong>{selectedKey?.name}</strong> akan dinonaktifkan dan tidak dapat
                  digunakan lagi untuk mengakses API. Anda dapat menghapusnya nanti jika diperlukan.
                </>
              ) : (
                <>
                  API key <strong>{selectedKey?.name}</strong> akan dihapus secara permanen.
                  Tindakan ini tidak dapat dibatalkan.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={actionType === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
              disabled={isRevoking || isDeleting}
            >
              {isRevoking || isDeleting ? "Memproses..." : actionType === "revoke" ? "Nonaktifkan" : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
