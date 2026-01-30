/**
 * Create API Key Dialog Component
 *
 * Dialog for creating new API keys with form validation.
 * Shows the created key in a separate dialog (key is only shown once!).
 */

"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Key, Plus, Copy, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useCreateApiKeyMutation } from "@/lib/store/services/apiKeysApi";
import type { ApiKeyCreatedResponse } from "@/lib/types/apikey";

const createApiKeySchema = z.object({
  name: z
    .string()
    .min(2, { message: "Nama minimal 2 karakter" })
    .max(255, { message: "Nama maksimal 255 karakter" }),
  description: z
    .string()
    .max(500, { message: "Deskripsi maksimal 500 karakter" })
    .optional()
    .or(z.literal("")),
  allowed_ips: z.string().optional(),
  expires_days: z.string().optional(),
});

type CreateApiKeyFormData = z.infer<typeof createApiKeySchema>;

interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateApiKeyDialog({ open, onOpenChange }: CreateApiKeyDialogProps) {
  const [createApiKey, { isLoading }] = useCreateApiKeyMutation();
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedResponse | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateApiKeyFormData>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      description: "",
      allowed_ips: "",
      expires_days: "never",
    },
  });

  const onSubmit = async (data: CreateApiKeyFormData) => {
    try {
      const requestData: {
        name: string;
        description?: string;
        allowed_ips?: string[];
        expires_at?: string;
      } = {
        name: data.name,
      };

      if (data.description && data.description !== "") {
        requestData.description = data.description;
      }

      // Transform allowed_ips string to array
      if (data.allowed_ips && data.allowed_ips.trim() !== "") {
        const ips = data.allowed_ips
          .split(",")
          .map((ip) => ip.trim())
          .filter((ip) => ip.length > 0);
        if (ips.length > 0) {
          requestData.allowed_ips = ips;
        }
      }

      // Transform expires_days to expires_at date
      if (data.expires_days && data.expires_days !== "never") {
        const days = parseInt(data.expires_days);
        if (!isNaN(days)) {
          const date = new Date();
          date.setDate(date.getDate() + days);
          requestData.expires_at = date.toISOString();
        }
      }

      const result = await createApiKey(requestData).unwrap();
      setCreatedKey(result.data);
      reset();
    } catch (error: unknown) {
      const apiError = error as { data?: { error?: string; message?: string } };
      toast.error(apiError?.data?.error || apiError?.data?.message || "Gagal membuat API key");
    }
  };

  const handleCopyKey = () => {
    if (createdKey?.key) {
      navigator.clipboard.writeText(createdKey.key);
      setCopied(true);
      toast.success("API key disalin ke clipboard");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleClose = () => {
    setCreatedKey(null);
    setShowKey(false);
    setCopied(false);
    reset();
    onOpenChange(false);
  };

  // Show created key dialog
  if (createdKey) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              API Key Berhasil Dibuat
            </DialogTitle>
            <DialogDescription>
              Simpan API key ini dengan aman. Key hanya ditampilkan sekali dan tidak dapat dilihat
              lagi setelah dialog ini ditutup.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Alert variant="error">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>PENTING:</strong> Salin dan simpan key ini sekarang! Anda tidak akan dapat
                melihatnya lagi.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Nama</Label>
              <p className="text-sm font-medium">{createdKey.name}</p>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={createdKey.key}
                    readOnly
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowKey(!showKey)}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" onClick={handleCopyKey}>
                  {copied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Salin
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-medium">Cara penggunaan di n8n:</p>
              <div className="space-y-1 text-muted-foreground">
                <p>1. Buka HTTP Request node</p>
                <p>2. Tambahkan Header:</p>
                <code className="block bg-background p-2 rounded mt-1">
                  X-API-Key: {showKey ? createdKey.key : "gla_****"}
                </code>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleClose}>Saya Sudah Menyimpan Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Create form dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Buat API Key Baru
          </DialogTitle>
          <DialogDescription>
            API key digunakan untuk mengakses data via integrasi eksternal seperti n8n, webhook,
            atau aplikasi pihak ketiga.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              Nama <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Contoh: n8n Integration, Webhook Production"
              className={errors.name ? "border-destructive" : ""}
              {...register("name")}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea
              id="description"
              placeholder="Deskripsi singkat tentang penggunaan key ini"
              rows={2}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowed_ips">IP yang Diizinkan (Opsional)</Label>
            <Input
              id="allowed_ips"
              placeholder="Contoh: 192.168.1.1, 10.0.0.1"
              {...register("allowed_ips")}
            />
            <p className="text-xs text-muted-foreground">
              Pisahkan dengan koma. Kosongkan untuk mengizinkan semua IP.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expires_days">Masa Berlaku</Label>
            <select
              id="expires_days"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              {...register("expires_days")}
            >
              <option value="never">Tidak ada batas waktu</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="180">180 hari (6 bulan)</option>
              <option value="365">365 hari (1 tahun)</option>
            </select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span className="ml-2">Membuat...</span>
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Buat API Key
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
