"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert } from "@/components/ui/alert";
import { useGetPositionsQuery } from "@/lib/store/services/organizationApi";
import { useAssignPositionToUserMutation } from "@/lib/store/services/usersApi";
import { toast } from "sonner";

interface AssignPositionDialogProps {
  userId: string;
  assignedPositionIds?: string[];
}

export function AssignPositionDialog({ userId, assignedPositionIds = [] }: AssignPositionDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [isPlt, setIsPlt] = useState(false);
  const [skNumber, setSkNumber] = useState<string>("");

  // Fetch available positions
  const { data: positionsData, isLoading: isLoadingPositions } = useGetPositionsQuery();

  // Assign position mutation
  const [assignPosition, { isLoading: isAssigning, error: assignError }] = useAssignPositionToUserMutation();

  // Filter out already assigned positions
  const availablePositions = positionsData?.data?.filter(
    (position) => !assignedPositionIds.includes(position.id)
  ) || [];

  const handleAssign = async () => {
    if (!selectedPositionId || !startDate) return;

    // Get position name for toast message
    const selectedPosition = availablePositions.find(p => p.id === selectedPositionId);
    const positionName = selectedPosition?.name || "Posisi";

    try {
      await assignPosition({
        userId,
        data: {
          position_id: selectedPositionId,
          start_date: new Date(startDate).toISOString(),
          end_date: endDate ? new Date(endDate).toISOString() : undefined,
          is_plt: isPlt,
          sk_number: skNumber || undefined,
        },
      }).unwrap();

      toast.success(`Posisi "${positionName}" berhasil di-assign`);

      // Reset and close dialog
      setSelectedPositionId("");
      setStartDate("");
      setEndDate("");
      setIsPlt(false);
      setSkNumber("");
      setOpen(false);
    } catch (err) {
      console.error("Failed to assign position:", err);
      toast.error("Gagal assign posisi");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Assign Posisi
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Assign Posisi Jabatan</DialogTitle>
          <DialogDescription>
            Pilih posisi jabatan yang ingin di-assign ke user ini
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {assignError && (
            <Alert variant="error">
              {(assignError as any)?.data?.error || "Gagal assign posisi"}
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="position">Posisi Jabatan</Label>
            {isLoadingPositions ? (
              <div className="text-sm text-muted-foreground">Loading positions...</div>
            ) : availablePositions.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Semua posisi sudah di-assign
              </div>
            ) : (
              <Select value={selectedPositionId} onValueChange={setSelectedPositionId}>
                <SelectTrigger id="position" className="w-full">
                  <SelectValue placeholder="Pilih posisi" />
                </SelectTrigger>
                <SelectContent>
                  {availablePositions.map((position) => (
                    <SelectItem key={position.id} value={position.id}>
                      <span>{position.name}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Berakhir</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="skNumber">Nomor SK</Label>
            <Input
              id="skNumber"
              type="text"
              placeholder="Nomor Surat Keputusan"
              value={skNumber}
              onChange={(e) => setSkNumber(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPlt"
              checked={isPlt}
              onCheckedChange={(checked) => setIsPlt(checked as boolean)}
            />
            <Label htmlFor="isPlt" className="cursor-pointer">
              Pelaksana Tugas (PLT)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Batal
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedPositionId || !startDate || isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Posisi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
