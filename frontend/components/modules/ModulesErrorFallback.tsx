/**
 * Modules Error Fallback Component
 *
 * Displays when server-side fetch fails (not 401)
 */

"use client";

import { AlertTriangle } from "lucide-react";
import { Alert } from "@/components/ui/alert";

interface ModulesErrorFallbackProps {
  error: string;
}

export default function ModulesErrorFallback({ error }: ModulesErrorFallbackProps) {
  return (
    <div className="container mx-auto py-12">
      <Alert variant="error">
        <AlertTriangle className="h-4 w-4" />
        <div>
          <h3 className="font-semibold">Gagal Memuat Data Module</h3>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </Alert>
    </div>
  );
}
